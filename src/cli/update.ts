/**
 * CLI update command
 *
 * Updates documentation incrementally based on git changes since last run.
 * Integrates with generation module to analyze changed files and update .sum files.
 * Regenerates AGENTS.md for affected directories.
 */
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import pc from 'picocolors';
import { loadConfig } from '../config/loader.js';
import { createLogger } from '../output/logger.js';
import {
  createUpdateOrchestrator,
  type UpdatePlan,
} from '../update/index.js';
import { detectFileType } from '../generation/detection/detector.js';
import { countTokens } from '../generation/budget/index.js';
import { buildPrompt } from '../generation/prompts/index.js';
import { writeSumFile, type SumFileContent } from '../generation/writers/sum.js';
import { writeAgentsMd } from '../generation/writers/agents-md.js';
import { computeContentHash, type FileChange } from '../change-detection/index.js';

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Include uncommitted changes (staged + working directory) */
  uncommitted?: boolean;
  /** Suppress output except errors */
  quiet?: boolean;
  /** Show detailed output */
  verbose?: boolean;
  /** Dry run - show plan without making changes */
  dryRun?: boolean;
  /** Override token budget */
  budget?: number;
}

/**
 * Result of analyzing a single file.
 */
interface FileAnalysisResult {
  path: string;
  success: boolean;
  tokensUsed: number;
  error?: string;
}

/**
 * Format cleanup results for display.
 */
function formatCleanup(plan: UpdatePlan): string[] {
  const lines: string[] = [];

  if (plan.cleanup.deletedSumFiles.length > 0) {
    lines.push(pc.yellow('Cleanup (deleted .sum files):'));
    for (const file of plan.cleanup.deletedSumFiles) {
      lines.push(`  ${pc.red('-')} ${file}`);
    }
  }

  if (plan.cleanup.deletedAgentsMd.length > 0) {
    lines.push(pc.yellow('Cleanup (deleted AGENTS.md from empty dirs):'));
    for (const file of plan.cleanup.deletedAgentsMd) {
      lines.push(`  ${pc.red('-')} ${file}`);
    }
  }

  return lines;
}

/**
 * Format the update plan for display.
 */
function formatPlan(plan: UpdatePlan, verbose: boolean): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(pc.bold('=== Update Plan ==='));
  lines.push('');

  // Baseline info
  if (plan.isFirstRun) {
    lines.push(pc.yellow('First run detected. Use "are generate" for initial documentation.'));
    lines.push('');
  } else {
    lines.push(`Base commit: ${pc.dim(plan.baseCommit.slice(0, 7))}`);
    lines.push(`Current commit: ${pc.dim(plan.currentCommit.slice(0, 7))}`);
    lines.push('');
  }

  // Summary
  const analyzeCount = plan.filesToAnalyze.length;
  const skipCount = plan.filesToSkip.length;
  const cleanupCount = plan.cleanup.deletedSumFiles.length + plan.cleanup.deletedAgentsMd.length;

  if (analyzeCount === 0 && skipCount === 0 && cleanupCount === 0) {
    lines.push(pc.green('No changes detected since last run.'));
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`Files to analyze: ${pc.cyan(String(analyzeCount))}`);
  lines.push(`Files unchanged: ${pc.dim(String(skipCount))}`);
  if (cleanupCount > 0) {
    lines.push(`Cleanup actions: ${pc.yellow(String(cleanupCount))}`);
  }
  lines.push('');

  // File list with status markers
  if (plan.filesToAnalyze.length > 0) {
    lines.push(pc.cyan('Files to analyze:'));
    for (const file of plan.filesToAnalyze) {
      const status = file.status === 'added' ? pc.green('+') :
                    file.status === 'renamed' ? pc.blue('R') :
                    pc.yellow('M');
      lines.push(`  ${status} ${file.path}`);
      if (file.status === 'renamed' && file.oldPath) {
        lines.push(`    ${pc.dim(`(was: ${file.oldPath})`)}`);
      }
    }
    lines.push('');
  }

  // Show skipped files in verbose mode
  if (verbose && plan.filesToSkip.length > 0) {
    lines.push(pc.dim('Files unchanged (skipped):'));
    for (const file of plan.filesToSkip) {
      lines.push(`  ${pc.dim('=')} ${pc.dim(file)}`);
    }
    lines.push('');
  }

  // Cleanup
  lines.push(...formatCleanup(plan));

  // Affected directories
  if (plan.affectedDirs.length > 0 && verbose) {
    lines.push('');
    lines.push(pc.cyan('Directories for AGENTS.md regeneration:'));
    for (const dir of plan.affectedDirs) {
      lines.push(`  ${dir}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Analyze a single changed file and generate its .sum file.
 *
 * Uses the generation module's prompt builder and sum writer.
 * Note: This generates a placeholder summary since the actual LLM analysis
 * requires host integration. The prompt is generated for potential future use.
 */
async function analyzeFile(
  projectRoot: string,
  change: FileChange,
  verbose: boolean
): Promise<FileAnalysisResult> {
  const filePath = path.join(projectRoot, change.path);

  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8');
    const tokens = countTokens(content);

    // Detect file type and build prompt
    const fileType = detectFileType(filePath, content);
    const prompt = buildPrompt({
      filePath: change.path,
      content,
      fileType,
    });

    // Generate summary content
    // In a full implementation, this would call an LLM with the prompt.
    // For now, we create a structured summary placeholder that captures
    // the file's purpose and key elements.
    const sumContent: SumFileContent = {
      summary: `## Purpose\n\nFile at \`${change.path}\`.\n\n## Analysis Pending\n\nThis summary was generated during incremental update. Full analysis requires LLM integration.`,
      metadata: {
        purpose: `File at ${change.path}`,
        publicInterface: [],
        dependencies: [],
        patterns: [],
      },
      fileType,
      generatedAt: new Date().toISOString(),
    };

    // Write .sum file
    await writeSumFile(filePath, sumContent);

    if (verbose) {
      console.log(`  ${pc.green('\u2713')} ${change.path} (${tokens} tokens)`);
    }

    return {
      path: change.path,
      success: true,
      tokensUsed: tokens,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (verbose) {
      console.log(`  ${pc.red('\u2717')} ${change.path}: ${errorMsg}`);
    }

    return {
      path: change.path,
      success: false,
      tokensUsed: 0,
      error: errorMsg,
    };
  }
}

/**
 * Regenerate AGENTS.md for affected directories.
 *
 * Reads existing .sum files in each directory and creates/updates AGENTS.md.
 */
async function regenerateAgentsMd(
  projectRoot: string,
  directories: string[],
  verbose: boolean
): Promise<void> {
  for (const dir of directories) {
    const dirPath = dir === '.' ? projectRoot : path.join(projectRoot, dir);
    try {
      await writeAgentsMd(dirPath, projectRoot);
      if (verbose) {
        console.log(`  ${pc.green('\u2713')} AGENTS.md: ${dir || '.'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (verbose) {
        console.log(`  ${pc.yellow('!')} AGENTS.md: ${dir || '.'}: ${errorMsg}`);
      }
    }
  }
}

/**
 * Update command - incrementally updates documentation based on git changes.
 *
 * This command:
 * 1. Checks git repository status
 * 2. Detects files changed since last run
 * 3. Cleans up orphaned .sum files
 * 4. Analyzes changed files and generates .sum files
 * 5. Regenerates AGENTS.md for affected directories
 * 6. Records update state for next run
 */
export async function updateCommand(
  targetPath: string,
  options: UpdateCommandOptions
): Promise<void> {
  const absolutePath = path.resolve(targetPath);
  const verbose = options.verbose ?? false;
  const quiet = options.quiet ?? false;
  const logger = createLogger({
    colors: true,
    verbose,
    quiet,
    showExcluded: false,
  });

  logger.info(`Checking for updates in: ${absolutePath}`);

  // Load configuration
  const config = await loadConfig(absolutePath);

  // Override budget if specified
  if (options.budget) {
    config.generation.tokenBudget = options.budget;
  }

  // Create orchestrator
  const orchestrator = createUpdateOrchestrator(config, absolutePath);

  try {
    // Prepare update plan
    const plan = await orchestrator.preparePlan({
      includeUncommitted: options.uncommitted,
      dryRun: options.dryRun,
    });

    // Display plan
    if (!quiet) {
      console.log(formatPlan(plan, verbose));
    }

    // Handle first run
    if (plan.isFirstRun) {
      console.log(pc.yellow('Hint: Run "are generate" first to create initial documentation.'));
      console.log(pc.yellow('Then run "are update" after making changes.'));
      return;
    }

    // Handle no changes
    if (plan.filesToAnalyze.length === 0 &&
        plan.cleanup.deletedSumFiles.length === 0 &&
        plan.cleanup.deletedAgentsMd.length === 0) {
      const lastRun = await orchestrator.getLastRun();
      if (lastRun) {
        console.log(pc.dim(`Last run: ${lastRun.completed_at}`));
        console.log(pc.dim(`Commit: ${lastRun.commit_hash.slice(0, 7)}`));
      }
      return;
    }

    if (options.dryRun) {
      logger.info('Dry run complete. No files written.');
      return;
    }

    // === Execute the update workflow ===

    let totalTokens = 0;
    let filesAnalyzed = 0;
    let filesFailed = 0;

    // Step 1: Analyze changed files and generate .sum files
    if (plan.filesToAnalyze.length > 0) {
      console.log('');
      console.log(pc.bold('=== Analyzing Changed Files ==='));

      for (const change of plan.filesToAnalyze) {
        const result = await analyzeFile(absolutePath, change, verbose);

        if (result.success) {
          filesAnalyzed++;
          totalTokens += result.tokensUsed;

          // Update state for this file
          const contentHash = await computeContentHash(
            path.join(absolutePath, change.path)
          );
          await orchestrator.recordFileAnalyzed(
            change.path,
            contentHash,
            plan.currentCommit
          );
        } else {
          filesFailed++;
        }
      }
    }

    // Step 2: Regenerate AGENTS.md for affected directories
    if (plan.affectedDirs.length > 0) {
      console.log('');
      console.log(pc.bold('=== Regenerating AGENTS.md ==='));
      await regenerateAgentsMd(absolutePath, plan.affectedDirs, verbose);
    }

    // Step 3: Record completed run
    const filesSkipped = plan.filesToSkip.length;
    await orchestrator.recordRun(
      plan.currentCommit,
      filesAnalyzed,
      filesSkipped
    );

    // Summary
    console.log('');
    console.log(pc.bold('=== Update Complete ==='));
    console.log(`  Files analyzed: ${pc.green(String(filesAnalyzed))}`);
    if (filesFailed > 0) {
      console.log(`  Files failed: ${pc.red(String(filesFailed))}`);
    }
    console.log(`  Files skipped: ${pc.dim(String(filesSkipped))}`);
    console.log(`  Directories updated: ${pc.cyan(String(plan.affectedDirs.length))}`);
    console.log(`  Token budget used: ${pc.yellow(totalTokens.toLocaleString())} / ${config.generation.tokenBudget.toLocaleString()}`);

  } finally {
    orchestrator.close();
  }
}
