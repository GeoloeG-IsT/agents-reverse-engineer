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
import type { Logger } from '../core/logger.js';
import { nullLogger } from '../core/logger.js';
import { DEFAULT_VENDOR_DIRS, DEFAULT_BINARY_EXTENSIONS, DEFAULT_MAX_FILE_SIZE, DEFAULT_EXCLUDE_PATTERNS, getDefaultConcurrency } from './defaults.js';
import type { ITraceWriter } from '../orchestration/trace.js';
import { createBackendRegistry, detectAvailableBackends } from '../ai/registry.js';

/**
 * Quote a string value for YAML output if it contains characters that
 * would be misinterpreted (e.g. `*` is the YAML alias indicator).
 */
function yamlScalar(value: string): string {
  // Characters that require quoting: *, {, }, [, ], ?, :, #, &, !, |, >, etc.
  if (/[*{}\[\]?,:#&!|>'"%@`]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Directory name for agents-reverse-engineer configuration */
export const CONFIG_DIR = '.agents-reverse-engineer';

/** Configuration file name */
export const CONFIG_FILE = 'config.yaml';

/**
 * Walk up from `startDir` looking for an existing `.agents-reverse-engineer/` directory.
 * Returns the directory containing it, or `startDir` if none found.
 */
export async function findProjectRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  while (true) {
    try {
      await access(path.join(current, CONFIG_DIR), constants.F_OK);
      return current;
    } catch {
      // not found here, try parent
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDir);
}

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
 * @param options - Optional configuration loading options
 * @param options.tracer - Trace writer for emitting config:loaded events
 * @param options.debug - Enable debug output for configuration loading
 * @returns Validated configuration object with all defaults applied
 * @throws ConfigError if the config file exists but is invalid
 *
 * @example
 * ```typescript
 * const config = await loadConfig('/path/to/project');
 * console.log(config.exclude.vendorDirs);
 * ```
 */
export async function loadConfig(
  root: string,
  options?: { tracer?: ITraceWriter; debug?: boolean; logger?: Logger }
): Promise<Config> {
  const configPath = path.join(root, CONFIG_DIR, CONFIG_FILE);

  try {
    const content = await readFile(configPath, 'utf-8');
    const raw = parse(content);

    try {
      const config = ConfigSchema.parse(raw);

      // Emit trace event
      options?.tracer?.emit({
        type: 'config:loaded',
        configPath: path.relative(root, configPath),
        model: config.ai.model,
        concurrency: config.ai.concurrency,
      });

      // Debug output
      if (options?.debug) {
        const log = options.logger ?? nullLogger;
        log.debug(`[debug] Config loaded from: ${path.relative(root, configPath)}`);
        log.debug(`[debug] Model: ${config.ai.model}, Concurrency: ${config.ai.concurrency}`);
      }

      return config;
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
      const config = ConfigSchema.parse({});

      // Emit trace event for defaults
      options?.tracer?.emit({
        type: 'config:loaded',
        configPath: '(defaults)',
        model: config.ai.model,
        concurrency: config.ai.concurrency,
      });

      // Debug output
      if (options?.debug) {
        const log = options.logger ?? nullLogger;
        log.debug(`[debug] Config file not found, using defaults`);
        log.debug(`[debug] Model: ${config.ai.model}, Concurrency: ${config.ai.concurrency}`);
      }

      return config;
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
 * Default model for each backend, used when generating config.yaml.
 *
 * These are the most sensible default models for each backend:
 * - Claude: 'sonnet' (native alias for the current Sonnet model)
 * - Codex: 'gpt-5.3-codex' (latest Codex model)
 * - Gemini: 'gemini-3-flash-preview' (fast, capable model)
 * - OpenCode: 'anthropic/claude-sonnet-4-5' (fully-qualified format)
 */
const BACKEND_DEFAULT_MODELS: Record<string, string> = {
  claude: 'sonnet',
  codex: 'gpt-5-codex-mini',
  gemini: 'gemini-3-flash-preview',
  opencode: 'anthropic/claude-sonnet-4-5',
};

/**
 * Get the default model for a given backend name.
 *
 * @param backend - Backend name (claude, codex, gemini, opencode)
 * @returns Default model string for that backend, or 'auto' if unknown
 */
export function getDefaultModelForBackend(backend: string): string {
  return BACKEND_DEFAULT_MODELS[backend] ?? 'auto';
}

/**
 * Detect available AI backends and return the best default backend/model pair.
 *
 * Priority order: Claude > Codex > Gemini > OpenCode (matches registry order).
 * If no backends are detected, falls back to `backend: 'auto'`, `model: 'sonnet'`.
 *
 * @returns Object with `backend` and `model` strings for config.yaml
 */
export async function getDefaultBackendConfig(): Promise<{ backend: string; model: string }> {
  const registry = createBackendRegistry();
  const available = await detectAvailableBackends(registry);

  if (available.length === 0) {
    return { backend: 'auto', model: 'auto' };
  }

  const best = available[0];
  const model = BACKEND_DEFAULT_MODELS[best.name] ?? 'sonnet';

  return { backend: best.name, model };
}

/**
 * Write a default configuration file with helpful comments.
 *
 * Creates the `.agents-reverse/` directory if it doesn't exist.
 * The generated file includes comments explaining each option.
 *
 * @param root - Root directory where `.agents-reverse/` will be created
 * @param options - Optional backend/model to write as defaults (auto-detected if omitted)
 *
 * @example
 * ```typescript
 * await writeDefaultConfig('/path/to/project');
 * // Creates /path/to/project/.agents-reverse/config.yaml
 *
 * await writeDefaultConfig('/path/to/project', { backend: 'codex', model: 'gpt-5.3-codex' });
 * // Creates config with Codex defaults
 * ```
 */
export async function writeDefaultConfig(
  root: string,
  options?: { backend?: string; model?: string },
): Promise<void> {
  const configDir = path.join(root, CONFIG_DIR);
  const configPath = path.join(configDir, CONFIG_FILE);

  // Create directory if needed
  await mkdir(configDir, { recursive: true });

  // Generate config content with comments
  const configContent = `# agents-reverse-engineer configuration
# See: https://github.com/GeoloeG-IsT/agents-reverse-engineer

# ============================================================================
# FILE & DIRECTORY EXCLUSIONS
# ============================================================================
exclude:
  # Custom glob patterns to exclude (e.g., ["*.log", "temp/**"])
  # Default patterns exclude AI-generated documentation files
  patterns:
${DEFAULT_EXCLUDE_PATTERNS.map((pattern) => `    - ${yamlScalar(pattern)}`).join('\n')}

  # Vendor directories to exclude from analysis
  # These are typically package managers, build outputs, or version control
  vendorDirs:
${DEFAULT_VENDOR_DIRS.map((dir) => `    - ${dir}`).join('\n')}

  # Binary file extensions to exclude from analysis
  # These files cannot be meaningfully analyzed as text
  binaryExtensions:
${DEFAULT_BINARY_EXTENSIONS.map((ext) => `    - ${ext}`).join('\n')}

# ============================================================================
# DISCOVERY OPTIONS
# ============================================================================
options:
  # Whether to follow symbolic links during traversal
  followSymlinks: false

  # Maximum file size in bytes (files larger than this are skipped)
  # Default: ${DEFAULT_MAX_FILE_SIZE} (1MB)
  maxFileSize: ${DEFAULT_MAX_FILE_SIZE}

# ============================================================================
# OUTPUT FORMATTING
# ============================================================================
output:
  # Whether to use colors in terminal output
  colors: true

# ============================================================================
# GENERATION SETTINGS
# ============================================================================
generation:
  # Target compression ratio for .sum files (0.1-1.0)
  # - 0.10 = very concise (aggressive compression, ~10% of source size)
  # - 0.25 = standard (default, ~25% of source size)
  # - 0.50 = detailed (verbose, ~50% of source size)
  # Lower values produce more compact summaries but may omit some details.
  # The annex mechanism bypasses compression for reproduction-critical content.
  compressionRatio: 0.25

# ============================================================================
# AI SERVICE CONFIGURATION
# ============================================================================
ai:
  # AI CLI backend to use
  # Options: 'claude', 'codex', 'gemini', 'opencode', 'auto' (auto-detect from PATH)
  backend: ${options?.backend ?? 'auto'}

  # Model identifier (backend-specific)
  # Claude:   sonnet | opus | haiku | fable | best | sonnet[1m] | opus[1m]
  #           fable[1m] | opusplan | default, or a full model ID such as
  #           claude-opus-5, claude-sonnet-5, claude-fable-5, claude-haiku-4-5
  # Codex:    gpt-5.3-codex | gpt-5.2-codex | gpt-5.1-codex-max | gpt-5.1-codex
  #           gpt-5-codex | gpt-5-codex-mini
  # Gemini:   gemini-3-pro-preview | gemini-3-flash-preview
  #           gemini-2.5-pro | gemini-2.5-flash
  # OpenCode: provider/model format — e.g. anthropic/claude-sonnet-4-5,
  #           openai/gpt-5, google/gemini-2.5, groq/..., ollama/...
  model: ${options?.model ?? 'auto'}

  # Model for \`are specify\` and \`are rebuild\` — these commands benefit from a
  # stronger model. When unset, the default \`model: sonnet\` is upgraded to
  # \`opus\`; any other \`model\` value is used as-is.
  # upgradeModel: opus

  # Subprocess timeout in milliseconds
  # Default: 300,000ms (5 minutes)
  # Increase for very large files or slow connections
  timeoutMs: 300000

  # Maximum number of retries for transient errors
  # Default: 3
  maxRetries: 3

  # Number of concurrent AI calls (parallelism)
  # Range: 1-20, Default: auto-detected from CPU cores and available memory
  # Current machine default: ${getDefaultConcurrency()}
  # Uncomment to override:
  # concurrency: ${getDefaultConcurrency()}

  # Telemetry settings
  telemetry:
    # Number of most recent run logs to keep on disk
    # Logs stored in .agents-reverse-engineer/logs/
    keepRuns: 50
`;

  await writeFile(configPath, configContent, 'utf-8');
}
