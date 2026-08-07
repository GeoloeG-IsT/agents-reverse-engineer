/**
 * CLI rebuild command
 *
 * Reconstructs a project from specification files by:
 * 1. Reading spec files from specs/ directory
 * 2. Partitioning into ordered rebuild units
 * 3. Resolving an AI CLI backend
 * 4. Running the rebuild orchestrator with checkpoint-based session continuity
 * 5. Writing generated source files to an output directory
 *
 * With --dry-run, shows the rebuild plan without making any AI calls.
 */

import os from 'node:os';
import * as path from 'node:path';
import pc from 'picocolors';
import { loadConfig, findProjectRoot } from '../config/loader.js';
import { DEFAULT_AI_MODEL, DEFAULT_UPGRADE_MODEL } from '../config/defaults.js';
import { consoleLogger } from '../core/logger.js';
import {
  AIService,
  AIServiceError,
  createBackendRegistry,
  resolveBackend,
  getInstallInstructions,
} from '../ai/index.js';
import { ProgressLog, createTraceWriter, cleanupOldTraces } from '../orchestration/index.js';
import {
  readSpecFiles,
  partitionSpec,
  CheckpointManager,
  executeRebuild,
} from '../rebuild/index.js';

/**
 * Options for the rebuild command.
 */
export interface RebuildOptions {
  /** Custom output directory (default: rebuild/) */
  output?: string;
  /** Wipe output directory and start fresh */
  force?: boolean;
  /** Show plan without executing */
  dryRun?: boolean;
  /** Override worker pool size */
  concurrency?: number;
  /** Stop on first failure */
  failFast?: boolean;
  /** Verbose subprocess logging */
  debug?: boolean;
  /** Enable NDJSON tracing */
  trace?: boolean;
  /** Override AI model (defaults to "opus" for rebuild) */
  model?: string;
  /** Override AI backend (e.g., "claude", "codex", "opencode", "gemini") */
  backend?: string;
}

/**
 * Rebuild command - reconstructs a project from specification files via
 * AI-driven code generation with checkpoint-based session continuity.
 *
 * @param targetPath - Directory containing specs/ to rebuild from
 * @param options - Command options (output, force, dryRun, concurrency, etc.)
 */
export async function rebuildCommand(
  targetPath: string,
  options: RebuildOptions,
): Promise<void> {
  const absolutePath = await findProjectRoot(path.resolve(targetPath));
  const outputDir = options.output
    ? path.resolve(options.output)
    : path.join(absolutePath, 'rebuild');

  // Create trace writer
  const tracer = createTraceWriter(absolutePath, options.trace ?? false);
  if (options.trace && tracer.filePath) {
    console.error(pc.dim(`[trace] Writing to ${tracer.filePath}`));
  }

  // Load configuration
  const config = await loadConfig(absolutePath, {
    tracer,
    debug: options.debug,
  });

  // Read spec files early (before backend resolution)
  const specFiles = await readSpecFiles(absolutePath);

  // Partition specs into rebuild units
  const units = partitionSpec(specFiles);

  // -------------------------------------------------------------------------
  // Dry-run mode: show rebuild plan without making AI calls
  // -------------------------------------------------------------------------

  if (options.dryRun) {
    console.log(pc.bold('\n--- Dry Run Summary ---\n'));
    console.log(`  Spec files:        ${pc.cyan(String(specFiles.length))}`);
    console.log(`  Rebuild units:     ${pc.cyan(String(units.length))}`);
    console.log(`  Output directory:  ${pc.cyan(outputDir)}`);
    console.log('');
    console.log(pc.dim('Rebuild units:'));
    for (const unit of units) {
      console.log(pc.dim(`  ${unit.order}. ${unit.name}`));
    }

    // Check for existing checkpoint
    const unitNames = units.map((u) => u.name);
    const { manager: checkpoint, isResume } = await CheckpointManager.load(
      outputDir,
      specFiles,
      unitNames,
    );
    if (isResume) {
      const pending = checkpoint.getPendingUnits();
      console.log('');
      console.log(pc.yellow(`Checkpoint found: ${units.length - pending.length} of ${units.length} modules already complete.`));
      console.log(pc.yellow(`Would resume with ${pending.length} remaining modules.`));
    }

    console.log('');
    console.log(pc.dim('No AI calls made (dry run).'));
    return;
  }

  // -------------------------------------------------------------------------
  // Handle --force warning
  // -------------------------------------------------------------------------

  if (options.force) {
    console.log(pc.yellow(`Forcing fresh rebuild: output directory will be wiped (${outputDir})`));
  }

  // -------------------------------------------------------------------------
  // Resolve backend and create AI service
  // -------------------------------------------------------------------------

  const registry = createBackendRegistry();
  let backend;
  try {
    backend = await resolveBackend(registry, options.backend ?? config.ai.backend);
  } catch (error) {
    if (error instanceof AIServiceError && error.code === 'CLI_NOT_FOUND') {
      console.error(pc.red('Error: No AI CLI found.\n'));
      console.error(getInstallInstructions(registry));
      process.exit(2);
    }
    throw error;
  }

  // Provision backend-specific resources (e.g., OpenCode agent config)
  await backend.ensureProjectConfig?.(absolutePath);

  // Resolve effective model: CLI flag > ai.upgradeModel > upgraded ai.model
  // Rebuild benefits from the best model; upgrade the default model unless
  // the user configured ai.upgradeModel or a non-default ai.model
  const effectiveModel = options.model
    ?? config.ai.upgradeModel
    ?? (config.ai.model === DEFAULT_AI_MODEL ? DEFAULT_UPGRADE_MODEL : config.ai.model);

  // Debug: log backend info
  if (options.debug) {
    console.error(pc.dim(`[debug] Backend: ${backend.name}`));
    console.error(pc.dim(`[debug] CLI command: ${backend.cliCommand}`));
    console.error(pc.dim(`[debug] Model: ${effectiveModel}`));
  }

  // Create AI service with extended timeout (rebuild modules are large)
  const aiService = new AIService(backend, {
    timeoutMs: Math.max(config.ai.timeoutMs, 900_000), // 15min minimum
    maxRetries: config.ai.maxRetries,
    model: effectiveModel,
    command: 'rebuild',
    telemetry: { keepRuns: config.ai.telemetry.keepRuns },
  }, consoleLogger);
  aiService.setSubprocessCwd(os.tmpdir());

  if (options.debug) {
    aiService.setDebug(true);
  }

  // Enable subprocess output logging alongside tracing
  if (options.trace) {
    const logDir = path.join(
      absolutePath, '.agents-reverse-engineer', 'subprocess-logs',
      new Date().toISOString().replace(/[:.]/g, '-'),
    );
    aiService.setSubprocessLogDir(logDir);
    console.error(pc.dim(`[trace] Subprocess logs -> ${logDir}`));
  }

  // Create progress log for tail -f monitoring
  const progressLog = ProgressLog.create(absolutePath, 'rebuild', backend.name, effectiveModel);
  progressLog.write(`=== ARE Rebuild (${new Date().toISOString()}) ===`);
  progressLog.write(`Project: ${absolutePath}`);
  progressLog.write(`Output: ${outputDir}`);
  progressLog.write(`Rebuild units: ${units.length}`);
  progressLog.write('');

  // Determine concurrency
  const concurrency = options.concurrency ?? config.ai.concurrency;

  // -------------------------------------------------------------------------
  // Execute rebuild
  // -------------------------------------------------------------------------

  console.log(pc.bold(`Rebuilding project from ${specFiles.length} spec file(s)...`));
  console.log(pc.dim(`Output directory: ${outputDir}`));
  console.log(pc.dim(`Rebuild units: ${units.length}`));
  console.log('');

  const result = await executeRebuild(aiService, absolutePath, {
    outputDir,
    concurrency,
    failFast: options.failFast,
    force: options.force,
    debug: options.debug,
    tracer,
    progressLog,
  });

  // -------------------------------------------------------------------------
  // Finalize telemetry, trace, and progress log
  // -------------------------------------------------------------------------

  await aiService.finalize(absolutePath);
  await progressLog.finalize();
  await tracer.finalize();
  if (options.trace) {
    await cleanupOldTraces(absolutePath);
  }

  // -------------------------------------------------------------------------
  // Print summary and set exit code
  // -------------------------------------------------------------------------

  console.log('');
  console.log(pc.bold('Rebuild complete:'));
  console.log(`  Modules processed: ${pc.green(String(result.modulesProcessed))}`);
  if (result.modulesSkipped > 0) {
    console.log(`  Modules skipped:   ${pc.yellow(String(result.modulesSkipped))} (already complete)`);
  }
  if (result.modulesFailed > 0) {
    console.log(`  Modules failed:    ${pc.red(String(result.modulesFailed))}`);
  }
  console.log(`  Output directory:  ${pc.cyan(outputDir)}`);

  if (result.modulesProcessed === 0 && result.modulesFailed > 0) {
    process.exit(2);
  } else if (result.modulesFailed > 0) {
    process.exit(1);
  }
}
