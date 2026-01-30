/**
 * `are discover` command - Discover files to analyze
 *
 * Walks a directory tree and applies filters (gitignore, vendor, binary, custom)
 * to identify files suitable for analysis.
 */

import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { walkDirectory } from '../discovery/walker.js';
import {
  applyFilters,
  createGitignoreFilter,
  createVendorFilter,
  createBinaryFilter,
  createCustomFilter,
} from '../discovery/filters/index.js';
import { loadConfig } from '../config/loader.js';
import { createLogger, type Logger } from '../output/logger.js';
import { createOrchestrator } from '../generation/orchestrator.js';
import { buildExecutionPlan, formatExecutionPlanAsMarkdown } from '../generation/executor.js';
import type { DiscoveryResult } from '../types/index.js';

/**
 * Options for the discover command.
 */
export interface DiscoverOptions {
  /**
   * Suppress output except errors.
   * @default false
   */
  quiet: boolean;

  /**
   * Show each excluded file with reason.
   * @default false
   */
  showExcluded: boolean;

  /**
   * Show verbose output (each file as discovered).
   * Derived: true unless quiet is set.
   * @default true
   */
  verbose: boolean;

  /**
   * Generate GENERATION-PLAN.md file.
   * @default false
   */
  plan: boolean;
}

/**
 * Execute the `are discover` command.
 *
 * Discovers files in the target directory, applying all configured filters
 * (gitignore, vendor, binary, custom patterns).
 *
 * @param targetPath - Directory to scan (defaults to current working directory)
 * @param options - Command options
 *
 * @example
 * ```typescript
 * await discoverCommand('.', {
 *   quiet: false,
 *   showExcluded: true,
 *   verbose: true,
 * });
 * ```
 */
export async function discoverCommand(
  targetPath: string,
  options: DiscoverOptions
): Promise<void> {
  // Resolve to absolute path (default to cwd)
  const resolvedPath = path.resolve(targetPath || process.cwd());

  // Load configuration (uses defaults if no config file)
  const config = await loadConfig(resolvedPath);

  // Create logger with options derived from CLI flags and config
  const logger = createLogger({
    verbose: options.quiet ? false : (options.verbose ?? config.output.verbose),
    quiet: options.quiet,
    colors: config.output.colors,
    showExcluded: options.showExcluded,
  });

  // Verify target path exists
  try {
    await access(resolvedPath, constants.R_OK);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      logger.error(`Directory not found: ${resolvedPath}`);
      process.exit(1);
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      logger.error(`Permission denied: ${resolvedPath}`);
      process.exit(1);
    }
    throw error;
  }

  logger.info(`Discovering files in ${resolvedPath}...`);
  logger.info('');

  // Create filters in order (per DISC requirements)
  const gitignoreFilter = await createGitignoreFilter(resolvedPath);
  const vendorFilter = createVendorFilter(config.exclude.vendorDirs);
  const binaryFilter = createBinaryFilter({
    maxFileSize: config.options.maxFileSize,
    additionalExtensions: config.exclude.binaryExtensions,
  });
  const customFilter = createCustomFilter(config.exclude.patterns, resolvedPath);

  const filters = [gitignoreFilter, vendorFilter, binaryFilter, customFilter];

  // Walk directory
  const files = await walkDirectory({
    cwd: resolvedPath,
    followSymlinks: config.options.followSymlinks,
  });

  // Apply filters
  const result = await applyFilters(files, filters);

  // Log results
  // Make paths relative for cleaner output
  const relativePath = (absPath: string): string =>
    path.relative(resolvedPath, absPath);

  // Show each included file in verbose mode
  for (const file of result.included) {
    logger.file(relativePath(file));
  }

  // Show each excluded file if --show-excluded
  for (const excluded of result.excluded) {
    logger.excluded(relativePath(excluded.path), excluded.reason, excluded.filter);
  }

  // Always show summary (unless quiet)
  logger.summary(result.included.length, result.excluded.length);

  // Generate GENERATION-PLAN.md if --plan flag is set
  if (options.plan) {
    logger.info('');
    logger.info('Generating execution plan...');

    // Create discovery result for orchestrator
    const discoveryResult: DiscoveryResult = {
      files: result.included,
      excluded: result.excluded.map(e => ({ path: e.path, reason: e.reason })),
    };

    // Create orchestrator and build generation plan
    const orchestrator = createOrchestrator(config, resolvedPath, discoveryResult.files.length);
    const generationPlan = await orchestrator.createPlan(discoveryResult);

    // Build execution plan with post-order traversal
    const executionPlan = buildExecutionPlan(generationPlan, resolvedPath);

    // Format as markdown
    const markdown = formatExecutionPlanAsMarkdown(executionPlan);

    // Write to .agents-reverse-engineer/GENERATION-PLAN.md
    const configDir = path.join(resolvedPath, '.agents-reverse-engineer');
    const planPath = path.join(configDir, 'GENERATION-PLAN.md');

    try {
      await mkdir(configDir, { recursive: true });
      await writeFile(planPath, markdown, 'utf8');
      logger.info(`Created ${path.relative(resolvedPath, planPath)}`);
    } catch (err) {
      logger.error(`Failed to write plan: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Exit with code 0 on success
  process.exit(0);
}
