/**
 * Terminal logger for agents-reverse
 *
 * Provides colored output with verbose/quiet modes.
 * Output format follows CONTEXT.md human-readable specification.
 */

import pc from 'picocolors';

/**
 * Logger interface for discovery output.
 *
 * All methods respect the configured verbosity levels.
 */
export interface Logger {
  /** Log an informational message */
  info(message: string): void;

  /** Log a discovered file (verbose mode only) */
  file(path: string): void;

  /** Log an excluded file (--show-excluded mode only) */
  excluded(path: string, reason: string, filter: string): void;

  /** Log discovery summary (always shown unless quiet) */
  summary(included: number, excluded: number): void;

  /** Log a warning message */
  warn(message: string): void;

  /** Log an error message (always shown) */
  error(message: string): void;
}

/**
 * Options for creating a logger instance.
 */
export interface LoggerOptions {
  /**
   * Show verbose output (each file as discovered).
   * @default true per CONTEXT.md
   */
  verbose: boolean;

  /**
   * Suppress all output except errors.
   * @default false
   */
  quiet: boolean;

  /**
   * Use colors in terminal output.
   * @default true
   */
  colors: boolean;

  /**
   * Show each excluded file (with --show-excluded flag).
   * @default false
   */
  showExcluded: boolean;
}

/**
 * Color functions type - either picocolors or identity functions
 */
interface ColorFunctions {
  green: (s: string) => string;
  dim: (s: string) => string;
  red: (s: string) => string;
  bold: (s: string) => string;
  yellow: (s: string) => string;
}

/**
 * Identity function for no-color mode
 */
const identity = (s: string): string => s;

/**
 * No-color formatter that returns strings unchanged
 */
const noColor: ColorFunctions = {
  green: identity,
  dim: identity,
  red: identity,
  bold: identity,
  yellow: identity,
};

/**
 * Create a logger instance with the given options.
 *
 * Output format per CONTEXT.md (human-readable):
 * - file: green "  +" prefix + relative path
 * - excluded: dim "  -" prefix + path + reason (when shown)
 * - summary: bold count + dim excluded count
 * - warn: yellow "Warning:" prefix
 * - error: red "Error:" prefix
 *
 * @param options - Logger configuration
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const log = createLogger({
 *   verbose: true,
 *   quiet: false,
 *   colors: true,
 *   showExcluded: false,
 * });
 *
 * log.file('src/index.ts');
 * log.summary(42, 10);
 * ```
 */
export function createLogger(options: LoggerOptions): Logger {
  const { verbose, quiet, colors, showExcluded } = options;

  // Select color functions based on colors option
  const c: ColorFunctions = colors ? pc : noColor;

  return {
    info(message: string): void {
      if (quiet) return;
      console.log(message);
    },

    file(path: string): void {
      if (quiet) return;
      if (!verbose) return;
      console.log(c.green('  +') + ' ' + path);
    },

    excluded(path: string, reason: string, filter: string): void {
      if (quiet) return;
      if (!showExcluded) return;
      console.log(c.dim('  -') + ' ' + path + c.dim(` (${reason}: ${filter})`));
    },

    summary(included: number, excluded: number): void {
      if (quiet) return;
      console.log(
        c.bold(`\nDiscovered ${included} files`) +
          c.dim(` (${excluded} excluded)`)
      );
    },

    warn(message: string): void {
      if (quiet) return;
      console.warn(c.yellow('Warning: ') + message);
    },

    error(message: string): void {
      // Error is always shown, even in quiet mode
      console.error(c.red('Error: ') + message);
    },
  };
}

/**
 * Create a silent logger that produces no output.
 *
 * Useful for testing or programmatic usage.
 *
 * @returns Logger instance with all no-op methods
 */
export function createSilentLogger(): Logger {
  const noop = (): void => {};
  return {
    info: noop,
    file: noop,
    excluded: noop,
    summary: noop,
    warn: noop,
    error: noop,
  };
}
