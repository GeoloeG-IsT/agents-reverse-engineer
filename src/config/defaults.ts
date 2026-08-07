/**
 * Default configuration values for agents-reverse
 */

import os from 'node:os';

/** Multiplier applied to CPU core count for default concurrency */
const CONCURRENCY_MULTIPLIER = 5;

/** Minimum default concurrency */
const MIN_CONCURRENCY = 2;

/** Maximum default concurrency (matches schema .max(20)) */
const MAX_CONCURRENCY = 20;

/** Heap budget per subprocess in GB (matches NODE_OPTIONS --max-old-space-size=512) */
const SUBPROCESS_HEAP_GB = 0.512;

/** Fraction of total system memory to allocate to subprocesses */
const MEMORY_FRACTION = 0.5;

/**
 * Compute the default concurrency based on available CPU cores and system memory.
 *
 * Formula: clamp(cores * 5, MIN, min(memCap, MAX))
 * - cores: os.availableParallelism() or os.cpus().length
 * - memCap: floor(totalMemGB * 0.5 / 0.512) — use at most 50% of RAM for subprocesses
 *
 * @returns Default concurrency value (integer between MIN_CONCURRENCY and MAX_CONCURRENCY)
 */
export function getDefaultConcurrency(): number {
  const cores = typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : (os.cpus().length || MIN_CONCURRENCY);

  const totalMemGB = os.totalmem() / (1024 ** 3);
  const memCap = totalMemGB > 1
    ? Math.floor((totalMemGB * MEMORY_FRACTION) / SUBPROCESS_HEAP_GB)
    : Infinity;

  const computed = cores * CONCURRENCY_MULTIPLIER;
  return Math.max(MIN_CONCURRENCY, Math.min(computed, memCap, MAX_CONCURRENCY));
}

/**
 * Default AI model when none is configured (backend-specific alias).
 */
export const DEFAULT_AI_MODEL = 'sonnet';

/**
 * Model that `are specify` and `are rebuild` upgrade to when `ai.model` is
 * left at the default — those commands benefit from a stronger model.
 * Overridable via `ai.upgradeModel` in config.yaml.
 */
export const DEFAULT_UPGRADE_MODEL = 'opus';

/**
 * Default vendor directories to exclude from analysis.
 * These are typically package managers, build outputs, or version control directories.
 */
export const DEFAULT_VENDOR_DIRS = [
  'node_modules',
  'vendor',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  'venv',
  '.venv',
  'target',
  '.cargo',
  '.gradle',
  // AI assistant tooling directories
  '.agents-reverse-engineer',
  '.agents',
  '.planning',
  '.claude',
  '.codex',
  '.opencode',
  '.gemini',
] as const;

/**
 * Default file patterns to exclude from analysis.
 * These patterns use gitignore syntax and are matched by the custom filter.
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  // AI assistant documentation files
  'AGENTS.md',
  'AGENTS.override.md',
  'CLAUDE.md',
  'OPENCODE.md',
  'GEMINI.md',
  '**/AGENTS.md',
  '**/AGENTS.override.md',
  '**/CLAUDE.md',
  '**/OPENCODE.md',
  '**/GEMINI.md',
  '*.local.md',
  '**/*.local.md',
  // Eval variant AGENTS files (e.g., AGENTS.claude.haiku.md)
  'AGENTS.*.md',
  '**/AGENTS.*.md',
  // Lock files (not useful for documentation, can be very large)
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'Gemfile.lock',
  'Cargo.lock',
  'poetry.lock',
  'composer.lock',
  'go.sum',
  // Dotfiles and generated artifacts (path.extname returns '' for dotfiles,
  // so these must be matched as glob patterns, not binary extensions)
  '.gitignore',
  '.gitattributes',
  '.gitkeep',
  '.env',
  '**/.env',
  '**/.env.*',
  '*.log',
  '*.sum',
  '**/*.sum',
  '**/SKILL.md',
] as const;

/**
 * Default binary file extensions to exclude from analysis.
 * These files cannot be meaningfully analyzed as text.
 */
export const DEFAULT_BINARY_EXTENSIONS = [
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  // Media
  '.mp3',
  '.mp4',
  '.wav',
  // Documents
  '.pdf',
  // Fonts
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  // Compiled
  '.class',
  '.pyc',
] as const;

/**
 * Default maximum file size in bytes (1MB).
 * Files larger than this will be skipped with a warning.
 */
export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024;

/**
 * Default compression ratio for .sum files (0.25 = 25% of source size).
 * This produces balanced summaries that preserve important details while
 * reducing token usage. Lower values enable aggressive compression.
 */
export const DEFAULT_COMPRESSION_RATIO = 0.25;

/**
 * Default configuration object matching the schema structure.
 * This is used when no config file is present or for missing fields.
 */
export const DEFAULT_CONFIG = {
  exclude: {
    patterns: [...DEFAULT_EXCLUDE_PATTERNS],
    vendorDirs: [...DEFAULT_VENDOR_DIRS],
    binaryExtensions: [...DEFAULT_BINARY_EXTENSIONS],
  },
  options: {
    followSymlinks: false,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
  },
  output: {
    colors: true,
  },
  generation: {
    compressionRatio: DEFAULT_COMPRESSION_RATIO,
  },
} as const;
