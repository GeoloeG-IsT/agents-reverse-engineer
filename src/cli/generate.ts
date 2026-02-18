/**
 * CLI generate command
 *
 * Creates and executes a documentation generation plan by:
 * 1. Discovering files to analyze
 * 2. Detecting file types and creating analysis tasks
 * 3. Resolving an AI CLI backend
 * 4. Running concurrent AI analysis via CommandRunner
 * 5. Producing .sum files, AGENTS.md, and companion CLAUDE.md per directory
 *
 * With --dry-run, shows the plan without making any AI calls.
 */

import os from 'node:os';
import * as path from 'node:path';
import pc from 'picocolors';
import { loadConfig, findProjectRoot } from '../config/loader.js';
import { createLogger } from '../output/logger.js';
import { consoleLogger, safeTimestamp } from '../core/index.js';
import { discoverFiles } from '../discovery/run.js';
import { createOrchestrator, type GenerationPlan } from '../orchestration/orchestrator.js';
import { buildExecutionPlan } from '../generation/executor.js';
import {
  AIService,
  AIServiceError,
  createBackendRegistry,
  resolveBackend,
  getInstallInstructions,
} from '../ai/index.js';
import { CommandRunner, ProgressLog, createTraceWriter, cleanupOldTraces } from '../orchestration/index.js';

/**
 * Options for the generate command.
 */
export interface GenerateOptions {
  /** Force full regeneration (skip nothing) */
  force?: boolean;
  /** Dry run - show plan without generating */
  dryRun?: boolean;
  /** Number of concurrent AI calls */
  concurrency?: number;
  /** Stop on first file analysis failure */
  failFast?: boolean;
  /** Show AI prompts and backend details */
  debug?: boolean;
  /** Enable concurrency tracing to .agents-reverse-engineer/traces/ */
  trace?: boolean;
  /** Override AI model (e.g., "sonnet", "opus") */
  model?: string;
  /** Override AI backend (e.g., "claude", "codex", "opencode", "gemini") */
  backend?: string;
  /** Eval mode: namespace output by backend.model for comparison */
  eval?: boolean;
}

/**
 * Format the generation plan for display.
 */
function formatPlan(plan: GenerationPlan): string {
  const lines: string[] = [];

  lines.push(`\n=== Generation Plan ===\n`);

  // File summary
  lines.push(`Files to analyze: ${plan.files.length}`);
  if (plan.skippedFiles && plan.skippedFiles.length > 0) {
    lines.push(`Files skipped:    ${plan.skippedFiles.length} (existing .sum)`);
  }
  lines.push(`Tasks to execute: ${plan.tasks.length}`);
  if (plan.skippedDirs && plan.skippedDirs.length > 0) {
    lines.push(`Dirs skipped:     ${plan.skippedDirs.length} (existing AGENTS.md)`);
  }
  lines.push('');

  // Complexity
  lines.push('Complexity:');
  lines.push(`  Files: ${plan.complexity.fileCount}`);
  lines.push(`  Directory depth: ${plan.complexity.directoryDepth}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate command - discovers files, plans analysis, and executes AI-driven
 * documentation generation.
 *
 * Default behavior: resolves an AI CLI backend, builds an execution plan,
 * and runs concurrent AI analysis via the CommandRunner. Produces .sum files,
 * AGENTS.md per directory, and CLAUDE.md pointers.
 *
 * @param targetPath - Directory to generate documentation for
 * @param options - Command options (concurrency, failFast, debug, etc.)
 */
export async function generateCommand(
  targetPath: string,
  options: GenerateOptions
): Promise<void> {
  const absolutePath = await findProjectRoot(path.resolve(targetPath));
  const logger = createLogger({ colors: true });

  logger.info(`Generating documentation plan for: ${absolutePath}`);

  // Create trace writer (moved earlier to use in config loading and discovery)
  const tracer = createTraceWriter(absolutePath, options.trace ?? false);
  if (options.trace && tracer.filePath) {
    console.error(pc.dim(`[trace] Writing to ${tracer.filePath}`));
  }

  // Load configuration
  const config = await loadConfig(absolutePath, {
    tracer,
    debug: options.debug,
  });

  // Discover files
  logger.info('Discovering files...');

  const filterResult = await discoverFiles(absolutePath, config, {
    tracer,
    debug: options.debug,
  });

  // Create discovery result for orchestrator
  const discoveryResult = {
    files: filterResult.included,
    excluded: filterResult.excluded.map(e => ({ path: e.path, reason: e.reason })),
  };

  logger.info(`Found ${discoveryResult.files.length} files to analyze`);

  // Create generation plan
  logger.info('Creating generation plan...');
  const orchestrator = createOrchestrator(
    config,
    absolutePath,
    { tracer, debug: options.debug }
  );

  // Compute preliminary variant before plan creation so skip filtering
  // checks eval-namespaced artifacts (e.g., file.ts.claude.sonnet.sum)
  const preliminaryVariant = options.eval
    ? `${options.backend ?? config.ai.backend}.${options.model ?? config.ai.model}`
    : undefined;

  const plan = await orchestrator.createPlan(discoveryResult, {
    force: options.force,
    variant: preliminaryVariant,
  });

  // Report skip stats
  if (plan.skippedFiles && plan.skippedFiles.length > 0) {
    logger.info(`Skipping ${plan.skippedFiles.length} files (existing .sum)`);
  }
  if (plan.skippedDirs && plan.skippedDirs.length > 0) {
    logger.info(`Skipping ${plan.skippedDirs.length} directories (existing AGENTS.md)`);
  }

  // Early exit if nothing to do
  if (plan.files.length === 0 && plan.tasks.length === 0) {
    logger.info('All files already documented. Nothing to do.');
    return;
  }

  // Display plan
  console.log(formatPlan(plan));

  // ---------------------------------------------------------------------------
  // Dry-run: show execution plan summary without making AI calls
  // ---------------------------------------------------------------------------

  if (options.dryRun) {
    // Dry-run doesn't resolve backend, so compute variant from config defaults
    const dryRunVariant = options.eval ? `${options.backend ?? config.ai.backend}.${options.model ?? config.ai.model}` : undefined;
    const executionPlan = buildExecutionPlan(plan, absolutePath, dryRunVariant);
    const dirCount = Object.keys(executionPlan.directoryFileMap).length;

    console.log(pc.bold('\n--- Dry Run Summary ---\n'));
    console.log(`  Files to analyze:     ${pc.cyan(String(executionPlan.fileTasks.length))}`);
    if (plan.skippedFiles && plan.skippedFiles.length > 0) {
      console.log(`  Files skipped:        ${pc.yellow(String(plan.skippedFiles.length))}`);
    }
    console.log(`  Directories:          ${pc.cyan(String(dirCount))}`);
    if (plan.skippedDirs && plan.skippedDirs.length > 0) {
      console.log(`  Dirs skipped:         ${pc.yellow(String(plan.skippedDirs.length))}`);
    }
    console.log(`  Estimated AI calls:   ${pc.cyan(String(executionPlan.tasks.length))}`);
    console.log('');
    if (executionPlan.fileTasks.length > 0) {
      console.log(pc.dim('Files to process:'));
      for (const task of executionPlan.fileTasks) {
        console.log(pc.dim(`  ${task.path}`));
      }
      console.log('');
    }
    if (plan.skippedFiles && plan.skippedFiles.length > 0) {
      console.log(pc.dim('Files skipped (existing .sum):'));
      for (const f of plan.skippedFiles) {
        console.log(pc.dim(`  ${f}`));
      }
      console.log('');
    }
    console.log(pc.dim('No AI calls made (dry run).'));
    return;
  }

  // ---------------------------------------------------------------------------
  // Resolve backend and run AI analysis
  // ---------------------------------------------------------------------------

  // Resolve AI CLI backend
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

  // Resolve effective model (CLI flag > config)
  const effectiveModel = options.model ?? config.ai.model;

  // Compute eval variant
  const variant = options.eval ? `${backend.name}.${effectiveModel}` : undefined;

  // Debug: log backend info
  if (options.debug) {
    console.log(pc.dim(`[debug] Backend: ${backend.name}`));
    console.log(pc.dim(`[debug] CLI command: ${backend.cliCommand}`));
    console.log(pc.dim(`[debug] Model: ${effectiveModel}`));
    if (variant) {
      console.log(pc.dim(`[debug] Eval variant: ${variant}`));
    }
  }

  if (variant) {
    console.log(pc.cyan(`[eval] Variant: ${variant}`));
    console.log(pc.dim(`[eval] Output files: *.${variant}.sum, AGENTS.${variant}.md`));
  }

  // Create AI service
  const aiService = new AIService(backend, {
    timeoutMs: config.ai.timeoutMs,
    maxRetries: config.ai.maxRetries,
    model: effectiveModel,
    command: 'generate',
    telemetry: { keepRuns: config.ai.telemetry.keepRuns },
  }, consoleLogger);
  aiService.setSubprocessCwd(os.tmpdir());

  if (options.debug) {
    aiService.setDebug(true);
  }

  // Build execution plan
  const executionPlan = buildExecutionPlan(plan, absolutePath, variant);

  // Determine concurrency
  const concurrency = options.concurrency ?? config.ai.concurrency;

  // Enable subprocess output logging alongside tracing
  if (options.trace) {
    const logDir = path.join(
      absolutePath, '.agents-reverse-engineer', 'subprocess-logs',
      safeTimestamp(),
    );
    aiService.setSubprocessLogDir(logDir);
    console.error(pc.dim(`[trace] Subprocess logs → ${logDir}`));
  }

  // Create progress log for tail -f monitoring
  const progressLog = ProgressLog.create(absolutePath, 'generate', backend.name, effectiveModel);
  progressLog.write(`=== ARE Generate (${new Date().toISOString()}) ===`);
  progressLog.write(`Project: ${absolutePath}`);
  const skippedCount = plan.skippedFiles?.length ?? 0;
  const skipInfo = skippedCount > 0 ? ` | Skipped: ${skippedCount}` : '';
  progressLog.write(`Files: ${executionPlan.fileTasks.length} | Directories: ${executionPlan.directoryTasks.length}${skipInfo}`);
  progressLog.write('');

  // Create command runner
  const runner = new CommandRunner(aiService, {
    concurrency,
    failFast: options.failFast,
    debug: options.debug,
    tracer,
    progressLog,
    variant,
  });

  // Execute the two-phase pipeline
  const summary = await runner.executeGenerate(executionPlan, {
    skippedFiles: skippedCount,
    skippedDirs: executionPlan.skippedDirs?.length ?? 0,
  });

  // Write telemetry run log
  await aiService.finalize(absolutePath);

  // Finalize trace, progress log, and clean up old trace files
  await progressLog.finalize();
  await tracer.finalize();
  if (options.trace) {
    await cleanupOldTraces(absolutePath);
  }

  // Determine exit code from RunSummary
  //   0: all files succeeded
  //   1: some files failed (partial failure)
  //   2: no files succeeded (total failure)
  if (summary.filesProcessed === 0 && summary.filesFailed > 0) {
    process.exit(2);
  } else if (summary.filesFailed > 0) {
    process.exit(1);
  }
  // Exit code 0 -- all files succeeded (or no files to process)
}
