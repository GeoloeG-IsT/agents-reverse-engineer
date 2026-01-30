/**
 * Configuration loader for agents-reverse
 *
 * Loads and validates configuration from `.agents-reverse/config.yaml`.
 * Returns sensible defaults when no config file exists.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { ZodError } from 'zod';
import { ConfigSchema, Config } from './schema.js';
import { DEFAULT_VENDOR_DIRS, DEFAULT_BINARY_EXTENSIONS, DEFAULT_MAX_FILE_SIZE } from './defaults.js';

/** Directory name for agents-reverse-engineer configuration */
export const CONFIG_DIR = '.agents-reverse-engineer';

/** Configuration file name */
export const CONFIG_FILE = 'config.yaml';

/**
 * Error thrown when configuration parsing or validation fails
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Load configuration from `.agents-reverse/config.yaml`.
 *
 * If the file doesn't exist, returns default configuration.
 * If the file exists but is invalid, throws a ConfigError with details.
 *
 * @param root - Root directory containing `.agents-reverse/` folder
 * @returns Validated configuration object with all defaults applied
 * @throws ConfigError if the config file exists but is invalid
 *
 * @example
 * ```typescript
 * const config = await loadConfig('/path/to/project');
 * console.log(config.exclude.vendorDirs);
 * ```
 */
export async function loadConfig(root: string): Promise<Config> {
  const configPath = path.join(root, CONFIG_DIR, CONFIG_FILE);

  try {
    const content = await readFile(configPath, 'utf-8');
    const raw = parse(content);

    try {
      return ConfigSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues
          .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
          .join('\n');
        throw new ConfigError(
          `Invalid configuration in ${configPath}:\n${issues}`,
          configPath,
          err
        );
      }
      throw err;
    }
  } catch (err) {
    // File not found - return defaults
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return ConfigSchema.parse({});
    }

    // Re-throw ConfigError as-is
    if (err instanceof ConfigError) {
      throw err;
    }

    // YAML parse error
    throw new ConfigError(
      `Failed to parse ${configPath}: ${(err as Error).message}`,
      configPath,
      err as Error
    );
  }
}

/**
 * Check if a configuration file exists.
 *
 * @param root - Root directory to check
 * @returns true if `.agents-reverse/config.yaml` exists
 *
 * @example
 * ```typescript
 * if (!await configExists('.')) {
 *   console.log('Run `are init` to create configuration');
 * }
 * ```
 */
export async function configExists(root: string): Promise<boolean> {
  const configPath = path.join(root, CONFIG_DIR, CONFIG_FILE);
  try {
    await access(configPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a default configuration file with helpful comments.
 *
 * Creates the `.agents-reverse/` directory if it doesn't exist.
 * The generated file includes comments explaining each option.
 *
 * @param root - Root directory where `.agents-reverse/` will be created
 *
 * @example
 * ```typescript
 * await writeDefaultConfig('/path/to/project');
 * // Creates /path/to/project/.agents-reverse/config.yaml
 * ```
 */
export async function writeDefaultConfig(root: string): Promise<void> {
  const configDir = path.join(root, CONFIG_DIR);
  const configPath = path.join(configDir, CONFIG_FILE);

  // Create directory if needed
  await mkdir(configDir, { recursive: true });

  // Generate config content with comments
  const configContent = `# agents-reverse configuration
# https://github.com/GeoloeG-IsT/agents-reverse

# Exclusion rules for files and directories
exclude:
  # Custom glob patterns to exclude (e.g., ["*.log", "temp/**"])
  patterns: []

  # Vendor directories to exclude from analysis
  # These are typically package managers, build outputs, or version control
  vendorDirs:
${DEFAULT_VENDOR_DIRS.map((dir) => `    - ${dir}`).join('\n')}

  # Binary file extensions to exclude from analysis
  # These files cannot be meaningfully analyzed as text
  binaryExtensions:
${DEFAULT_BINARY_EXTENSIONS.map((ext) => `    - ${ext}`).join('\n')}

# Discovery options
options:
  # Whether to follow symbolic links during traversal
  followSymlinks: false

  # Maximum file size in bytes (files larger than this are skipped)
  # Default: ${DEFAULT_MAX_FILE_SIZE} (1MB)
  maxFileSize: ${DEFAULT_MAX_FILE_SIZE}

# Output formatting options
output:
  # Whether to use colors in terminal output
  colors: true

  # Whether to show verbose output (each file as processed)
  verbose: true
`;

  await writeFile(configPath, configContent, 'utf-8');
}
