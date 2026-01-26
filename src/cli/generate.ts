/**
 * CLI generate command
 *
 * Creates a documentation generation plan by:
 * 1. Discovering files to analyze
 * 2. Detecting file types
 * 3. Creating analysis tasks with prompts
 * 4. Tracking token budget
 *
 * The actual analysis is performed by the host LLM using the generated prompts.
 */

import * as path from 'node:path';
import { loadConfig } from '../config/loader.js';
import { createLogger } from '../output/logger.js';
import { walkDirectory } from '../discovery/walker.js';
import {
  applyFilters,
  createGitignoreFilter,
  createVendorFilter,
  createBinaryFilter,
  createCustomFilter,
} from '../discovery/filters/index.js';
import { createOrchestrator, type GenerationPlan } from '../generation/orchestrator.js';

/**
 * Options for the generate command.
 */
export interface GenerateOptions {
  /** Suppress output except errors */
  quiet?: boolean;
  /** Show detailed task breakdown */
  verbose?: boolean;
  /** Dry run - show plan without generating */
  dryRun?: boolean;
  /** Override token budget */
  budget?: number;
}

/**
 * Format file type distribution for display.
 */
function formatTypeDistribution(plan: GenerationPlan): string {
  const typeCounts = new Map<string, number>();

  for (const file of plan.files) {
    const count = typeCounts.get(file.fileType) ?? 0;
    typeCounts.set(file.fileType, count + 1);
  }

  return Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `  ${type}: ${count}`)
    .join('\n');
}

/**
 * Format the generation plan for display.
 */
function formatPlan(plan: GenerationPlan): string {
  const lines: string[] = [];

  lines.push(`\n=== Generation Plan ===\n`);

  // File summary
  lines.push(`Files to analyze: ${plan.files.length}`);
  lines.push(`Tasks to execute: ${plan.tasks.length}`);
  lines.push('');

  // File type distribution
  lines.push('File types:');
  lines.push(formatTypeDistribution(plan));
  lines.push('');

  // Budget
  lines.push('Token budget:');
  lines.push(`  Total: ${plan.budget.total.toLocaleString()}`);
  lines.push(`  Estimated: ${plan.budget.estimated.toLocaleString()}`);
  lines.push(`  Remaining: ${plan.budget.remaining.toLocaleString()}`);
  lines.push('');

  // Complexity
  lines.push('Complexity:');
  lines.push(`  Files: ${plan.complexity.fileCount}`);
  lines.push(`  Directory depth: ${plan.complexity.directoryDepth}`);
  if (plan.complexity.architecturalPatterns.length > 0) {
    lines.push(`  Patterns: ${plan.complexity.architecturalPatterns.join(', ')}`);
  }
  lines.push('');

  // Supplementary docs
  lines.push('Supplementary docs:');
  lines.push(`  ARCHITECTURE.md: ${plan.generateArchitecture ? 'yes' : 'no'}`);
  lines.push(`  STACK.md: ${plan.generateStack ? 'yes' : 'no'}`);
  lines.push('');

  // Skipped files
  if (plan.skippedFiles.length > 0) {
    lines.push(`Skipped (budget): ${plan.skippedFiles.length} files`);
    if (plan.skippedFiles.length <= 5) {
      for (const file of plan.skippedFiles) {
        lines.push(`  - ${file}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate command - creates documentation generation plan.
 *
 * This command:
 * 1. Discovers files to analyze
 * 2. Detects file types
 * 3. Creates analysis tasks (prompts)
 * 4. Reports budget and plan
 *
 * The actual analysis is performed by the host LLM using the generated prompts.
 */
export async function generateCommand(
  targetPath: string,
  options: GenerateOptions
): Promise<void> {
  const absolutePath = path.resolve(targetPath);
  const logger = createLogger({
    colors: true,
    verbose: options.verbose ?? false,
    quiet: options.quiet ?? false,
    showExcluded: false,
  });

  logger.info(`Generating documentation plan for: ${absolutePath}`);

  // Load configuration
  const config = await loadConfig(absolutePath);

  // Override budget if specified
  if (options.budget) {
    config.generation.tokenBudget = options.budget;
  }

  // Discover files
  logger.info('Discovering files...');

  // Create filters in order (same as discover command)
  const gitignoreFilter = await createGitignoreFilter(absolutePath);
  const vendorFilter = createVendorFilter(config.exclude.vendorDirs);
  const binaryFilter = createBinaryFilter({
    maxFileSize: config.options.maxFileSize,
    additionalExtensions: config.exclude.binaryExtensions,
  });
  const customFilter = createCustomFilter(config.exclude.patterns, absolutePath);
  const filters = [gitignoreFilter, vendorFilter, binaryFilter, customFilter];

  // Walk directory
  const files = await walkDirectory({
    cwd: absolutePath,
    followSymlinks: config.options.followSymlinks,
  });

  // Apply filters
  const filterResult = await applyFilters(files, filters);

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
    discoveryResult.files.length
  );
  const plan = await orchestrator.createPlan(discoveryResult);

  // Display plan
  if (!options.quiet) {
    console.log(formatPlan(plan));
  }

  if (options.dryRun) {
    logger.info('Dry run complete. No files written.');
    return;
  }

  // Output task instructions for the host LLM
  console.log('\n=== Ready for Analysis ===\n');
  console.log(`This plan contains ${plan.tasks.length} analysis tasks.`);
  console.log('The host LLM will process each file and generate summaries.');
  console.log('\nTo proceed, the host should:');
  console.log('1. Read each file and its prompt');
  console.log('2. Generate summaries following the prompt guidelines');
  console.log('3. Write .sum files alongside source files');
  console.log('4. Generate AGENTS.md for each directory');
  console.log('5. Generate CLAUDE.md at the project root');

  if (plan.generateArchitecture) {
    console.log('6. Generate ARCHITECTURE.md (complexity threshold met)');
  }
  if (plan.generateStack) {
    console.log('7. Generate STACK.md (package.json found)');
  }

  // Summary
  const budgetReport = orchestrator.getBudgetReport();
  logger.info(`\nPlan ready. Estimated tokens: ${budgetReport.used.toLocaleString()}`);
}
