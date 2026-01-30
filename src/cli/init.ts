/**
 * `are init` command - Create default configuration
 *
 * Creates the `.agents-reverse/config.yaml` file with documented defaults.
 * Warns if configuration already exists.
 */

import path from 'node:path';
import { configExists, writeDefaultConfig, CONFIG_DIR, CONFIG_FILE } from '../config/loader.js';
import { createLogger, type LoggerOptions } from '../output/logger.js';

/**
 * Options for the init command.
 */
export interface InitOptions {
  /**
   * Run in interactive mode (reserved for future --interactive flag).
   * @default false
   */
  interactive?: boolean;
  /**
   * Generate integration files for detected AI assistant environments.
   * @default false
   */
  integration?: boolean;
}

/**
 * Execute the `are init` command.
 *
 * Creates a default configuration file at `.agents-reverse/config.yaml`.
 * If the file already exists, logs a warning and returns without modification.
 *
 * @param root - Root directory where config will be created
 * @param options - Command options
 *
 * @example
 * ```typescript
 * await initCommand('.', { interactive: false });
 * // Creates .agents-reverse/config.yaml in current directory
 * ```
 */
export async function initCommand(root: string, options: InitOptions): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const configPath = path.join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);

  const logger = createLogger({
    verbose: true,
    quiet: false,
    colors: true,
    showExcluded: false,
  });

  try {
    // Check if config already exists
    if (await configExists(resolvedRoot)) {
      logger.warn(`Config already exists at ${configPath}`);
      logger.info('Edit the file to customize exclusions and options.');
      return;
    }

    // Create default config
    await writeDefaultConfig(resolvedRoot);

    logger.info(`Created configuration at ${configPath}`);
    logger.info('');
    logger.info('Edit the file to customize:');
    logger.info('  - exclude.patterns: Add custom glob patterns to exclude');
    logger.info('  - exclude.vendorDirs: Modify vendor directories list');
    logger.info('  - options.maxFileSize: Adjust large file threshold');

    // Handle integration file generation
    if (options.integration) {
      const { generateIntegrationFiles } = await import('../integration/generate.js');
      const results = await generateIntegrationFiles(resolvedRoot);

      if (results.length === 0) {
        logger.info('');
        logger.info('No AI assistant environments detected.');
        logger.info('Integration files will be created when .claude/ or .opencode/ exists.');
      } else {
        for (const result of results) {
          logger.info('');
          logger.info(`${result.environment} integration:`);
          if (result.filesCreated.length > 0) {
            logger.info(`  Created: ${result.filesCreated.join(', ')}`);
          }
          if (result.filesSkipped.length > 0) {
            logger.info(`  Skipped (already exist): ${result.filesSkipped.join(', ')}`);
          }
          if (result.environment === 'claude') {
            logger.info('');
            logger.info('Note: Add SessionEnd hook to .claude/settings.json manually:');
            logger.info('  "hooks": { "SessionEnd": [".claude/hooks/ar-session-end.js"] }');
          }
        }
      }
    } else {
      logger.info('');
      logger.info('Run with --integration to set up AI assistant commands');
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;

    // Permission error
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      logger.error(`Permission denied: Cannot create ${configPath}`);
      logger.info('Check that you have write permissions to this directory.');
      process.exit(1);
    }

    // Other error
    logger.error(`Failed to create configuration: ${error.message}`);
    process.exit(1);
  }
}
