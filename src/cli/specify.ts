/**
 * CLI specify command
 *
 * Generates a project specification from AGENTS.md documentation by:
 * 1. Loading configuration
 * 2. Collecting all AGENTS.md files (auto-generating if none exist)
 * 3. Building a synthesis prompt from the collected docs
 * 4. Resolving an AI CLI backend and calling the AI service
 * 5. Writing the specification to disk (single or multi-file)
 *
 * With --dry-run, shows input statistics without making any AI calls.
 */

import os from 'node:os';
import * as path from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import pc from 'picocolors';
import { loadConfig, findProjectRoot } from '../config/loader.js';
import { DEFAULT_AI_MODEL, DEFAULT_UPGRADE_MODEL } from '../config/defaults.js';
import { consoleLogger } from '../core/logger.js';
import { collectAgentsDocs, collectAnnexFiles } from '../generation/collector.js';
import { buildSpecPrompt, writeSpec, SpecExistsError } from '../specify/index.js';
import {
  AIService,
  AIServiceError,
  createBackendRegistry,
  resolveBackend,
  getInstallInstructions,
} from '../ai/index.js';
import { ProgressLog, createTraceWriter, cleanupOldTraces } from '../orchestration/index.js';
import { generateCommand } from './generate.js';

/**
 * Options for the specify command.
 */
export interface SpecifyOptions {
  /** Custom output path (default: specs/SPEC.md) */
  output?: string;
  /** Overwrite existing specs */
  force?: boolean;
  /** Show plan without calling AI */
  dryRun?: boolean;
  /** Split output into multiple files */
  multiFile?: boolean;
  /** Show verbose debug info */
  debug?: boolean;
  /** Enable tracing */
  trace?: boolean;
  /** Override AI model (defaults to "opus" for specify) */
  model?: string;
  /** Override AI backend (e.g., "claude", "codex", "opencode", "gemini") */
  backend?: string;
}

/**
 * Specify command - collects AGENTS.md documentation, synthesizes it via AI,
 * and writes a comprehensive project specification.
 *
 * @param targetPath - Directory to generate specification for
 * @param options - Command options (output, force, dryRun, multiFile, debug, trace)
 */
export async function specifyCommand(
  targetPath: string,
  options: SpecifyOptions,
): Promise<void> {
  const absolutePath = await findProjectRoot(path.resolve(targetPath));
  const outputPath = options.output
    ? path.resolve(options.output)
    : path.join(absolutePath, 'specs', 'SPEC.md');

  // Early exit if spec file(s) already exist (avoids waiting for AI call)
  if (!options.force && !options.dryRun) {
    const conflicts: string[] = [];
    if (options.multiFile) {
      const outputDir = path.dirname(outputPath);
      try {
        const entries = await readdir(outputDir);
        for (const entry of entries) {
          if (entry.endsWith('.md')) {
            conflicts.push(path.join(outputDir, entry));
          }
        }
      } catch {
        // Directory doesn't exist — no conflicts
      }
    } else {
      try {
        await access(outputPath, constants.F_OK);
        conflicts.push(outputPath);
      } catch {
        // File doesn't exist — no conflict
      }
    }

    if (conflicts.length > 0) {
      const list = conflicts.map((p) => `  - ${p}`).join('\n');
      console.error(pc.red(`Spec file(s) already exist:\n${list}\nUse --force to overwrite.`));
      process.exit(1);
    }
  }

  // Load configuration
  const config = await loadConfig(absolutePath, { debug: options.debug });

  // Collect AGENTS.md files
  let docs = await collectAgentsDocs(absolutePath);

  // ---------------------------------------------------------------------------
  // Dry-run mode: show summary without calling AI or generating
  // ---------------------------------------------------------------------------

  // Collect annex files for reproduction-critical content
  let annexFiles = await collectAnnexFiles(absolutePath);

  if (options.dryRun) {
    const totalChars = docs.reduce((sum, d) => sum + d.content.length, 0)
      + annexFiles.reduce((sum, d) => sum + d.content.length, 0);
    const estimatedTokensK = Math.ceil(totalChars / 4) / 1000;

    console.log(pc.bold('\n--- Dry Run Summary ---\n'));
    console.log(`  AGENTS.md files:   ${pc.cyan(String(docs.length))}`);
    console.log(`  Annex files:       ${pc.cyan(String(annexFiles.length))}`);
    console.log(`  Total input:       ${pc.cyan(`~${estimatedTokensK}K tokens`)}`);
    console.log(`  Output:            ${pc.cyan(outputPath)}`);
    console.log(`  Mode:              ${pc.cyan(options.multiFile ? 'multi-file' : 'single-file')}`);
    console.log('');
    console.log(pc.dim('No AI calls made (dry run).'));

    if (docs.length === 0) {
      console.log('');
      console.log(pc.yellow('Warning: No AGENTS.md files found. Run `are generate` first or omit --dry-run to auto-generate.'));
    } else if (estimatedTokensK > 150) {
      console.log('');
      console.log(pc.yellow('Warning: Input exceeds 150K tokens. Consider using a model with extended context.'));
    }

    return;
  }

  // Auto-generate if no AGENTS.md files exist
  if (docs.length === 0) {
    console.log(pc.yellow('No AGENTS.md files found. Running generate first...'));
    await generateCommand(targetPath, {
      debug: options.debug,
      trace: options.trace,
    });
    docs = await collectAgentsDocs(absolutePath);
    annexFiles = await collectAnnexFiles(absolutePath);
    if (docs.length === 0) {
      console.error(pc.red('Error: No AGENTS.md files found after generation. Cannot proceed.'));
      process.exit(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Resolve backend and run AI synthesis
  // ---------------------------------------------------------------------------

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
  // Specify benefits from the best model; upgrade the default model unless
  // the user configured ai.upgradeModel or a non-default ai.model
  const effectiveModel = options.model
    ?? config.ai.upgradeModel
    ?? (config.ai.model === DEFAULT_AI_MODEL ? DEFAULT_UPGRADE_MODEL : config.ai.model);

  // Create trace writer
  const tracer = createTraceWriter(absolutePath, options.trace ?? false);
  if (options.trace && tracer.filePath) {
    console.error(pc.dim(`[trace] Writing to ${tracer.filePath}`));
  }

  // Debug: log backend info
  if (options.debug) {
    console.error(pc.dim(`[debug] Backend: ${backend.name}`));
    console.error(pc.dim(`[debug] CLI command: ${backend.cliCommand}`));
    console.error(pc.dim(`[debug] Model: ${effectiveModel}`));
  }

  // Create AI service with extended timeout (spec generation takes longer)
  const aiService = new AIService(backend, {
    timeoutMs: Math.max(config.ai.timeoutMs, 900_000),
    maxRetries: config.ai.maxRetries,
    model: effectiveModel,
    command: 'specify',
    telemetry: { keepRuns: config.ai.telemetry.keepRuns },
  }, consoleLogger);
  aiService.setSubprocessCwd(os.tmpdir());

  if (options.debug) {
    aiService.setDebug(true);
  }

  // Wire tracer into AIService for subprocess/retry trace events
  if (options.trace) {
    aiService.setTracer(tracer);
    const logDir = path.join(
      absolutePath, '.agents-reverse-engineer', 'subprocess-logs',
      new Date().toISOString().replace(/[:.]/g, '-'),
    );
    aiService.setSubprocessLogDir(logDir);
    console.error(pc.dim(`[trace] Subprocess logs → ${logDir}`));
  }

  // Build prompt from collected docs and annex files
  const prompt = buildSpecPrompt(docs, annexFiles.length > 0 ? annexFiles : undefined);

  if (options.debug) {
    console.error(pc.dim(`[debug] System prompt: ${prompt.system.length} chars`));
    console.error(pc.dim(`[debug] User prompt: ${prompt.user.length} chars`));
  }

  // Create progress log for tail -f monitoring
  const progressLog = ProgressLog.create(absolutePath, 'specify', backend.name, effectiveModel);
  progressLog.write(`=== ARE Specify (${new Date().toISOString()}) ===`);
  progressLog.write(`Project: ${absolutePath}`);
  progressLog.write(`AGENTS.md files: ${docs.length}`);
  progressLog.write(`Annex files: ${annexFiles.length}`);
  progressLog.write('');

  console.log(pc.bold('Generating specification...'));
  console.log(pc.dim('This may take several minutes depending on project size.'));
  progressLog.write('Generating specification...');

  tracer.emit({ type: 'phase:start', phase: 'specify', taskCount: 1, concurrency: 1 });
  const specifyStart = Date.now();

  const response = await aiService.call({
    prompt: prompt.user,
    systemPrompt: prompt.system,
    taskLabel: 'specify',
  });

  tracer.emit({
    type: 'phase:end',
    phase: 'specify',
    durationMs: Date.now() - specifyStart,
    tasksCompleted: 1,
    tasksFailed: 0,
  });

  // ---------------------------------------------------------------------------
  // Write output
  // ---------------------------------------------------------------------------

  try {
    const writtenFiles = await writeSpec(response.text, {
      outputPath,
      force: options.force ?? false,
      multiFile: options.multiFile ?? false,
    });

    console.log('');
    console.log(pc.green(pc.bold('Specification written successfully:')));
    for (const file of writtenFiles) {
      console.log(pc.green(`  ${file}`));
      progressLog.write(`Written: ${file}`);
    }
  } catch (error) {
    if (error instanceof SpecExistsError) {
      progressLog.write(`Error: ${error.message}`);
      await progressLog.finalize();
      console.error(pc.red(error.message));
      process.exit(1);
    }
    throw error;
  }

  // ---------------------------------------------------------------------------
  // Finalize telemetry
  // ---------------------------------------------------------------------------

  const { summary } = await aiService.finalize(absolutePath);

  const summaryLine = `Tokens: ${summary.totalInputTokens} in / ${summary.totalOutputTokens} out` +
    ` | Duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s` +
    ` | Output: ${outputPath}`;
  console.log('');
  console.log(pc.dim(summaryLine));
  progressLog.write(summaryLine);
  await progressLog.finalize();
  await tracer.finalize();
  if (options.trace) {
    await cleanupOldTraces(absolutePath);
  }
}
