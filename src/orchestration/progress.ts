/**
 * Streaming build-log progress reporter with ETA calculation.
 *
 * Outputs one line per event (start, done, fail, dir-done)
 * using `console.log` for atomic, non-corrupting concurrent output.
 * Each line shows progress counter, status, file path, timing, and
 * token counts using colored output via `picocolors`.
 *
 * ETA is computed via a moving average of the last 10 completion times,
 * displayed after 2 or more files have completed.
 *
 * Optionally mirrors all output to a timestamped plain-text progress log file
 * (`.agents-reverse-engineer/progress-{cmd}-{backend}-{model}-{ts}.log`)
 * via {@link ProgressLog}, enabling real-time monitoring when running
 * inside buffered environments (e.g. Claude Code's Bash tool).
 *
 * @module
 */

import { open, mkdir, readdir, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import * as path from 'node:path';
import pc from 'picocolors';
import type { RunSummary } from './types.js';
import { safeTimestamp } from '../core/utils.js';

// ---------------------------------------------------------------------------
// ANSI stripping
// ---------------------------------------------------------------------------

/** Strip ANSI escape sequences from a string for plain-text output. */
function stripAnsi(str: string): string {
  // Matches all common ANSI escape codes (SGR, cursor, erase, etc.)
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ---------------------------------------------------------------------------
// ProgressLog
// ---------------------------------------------------------------------------

/** Directory for progress log files (relative to project root) */
const PROGRESS_DIR = '.agents-reverse-engineer';

/** Default number of progress log files to retain */
const DEFAULT_KEEP_COUNT = 20;

/**
 * Plain-text progress log file writer.
 *
 * Mirrors console progress output to a timestamped file in
 * `.agents-reverse-engineer/` without ANSI escape codes, enabling
 * real-time monitoring via Glob + Read when running inside
 * buffered environments (e.g. Claude Code's Bash tool).
 *
 * Uses promise-chain serialization (same pattern as {@link TraceWriter})
 * to handle concurrent writes from multiple pool workers safely.
 *
 * @example
 * ```typescript
 * const log = ProgressLog.create('/project', 'generate', 'claude', 'sonnet');
 * log.write('=== ARE Generate (2026-02-09) ===');
 * log.write('[1/10] ANALYZING src/index.ts');
 * await log.finalize();
 * ```
 */
export class ProgressLog {
  private writeQueue: Promise<void> = Promise.resolve();
  private fd: FileHandle | null = null;

  constructor(private readonly filePath: string) {}

  /**
   * Create a ProgressLog for a project root with a timestamped filename.
   *
   * Filename follows the same convention as run logs:
   * `progress-{command}-{backend}-{model}-{timestamp}.log`
   *
   * @param projectRoot - Absolute path to the project root directory
   * @param command - CLI command name (e.g. 'generate', 'update')
   * @param backend - Backend name (e.g. 'claude', 'gemini'); defaults to 'none'
   * @param model - Model name (e.g. 'sonnet', 'opus'); defaults to 'default'
   * @returns A new ProgressLog instance
   */
  static create(
    projectRoot: string,
    command: string,
    backend: string = 'none',
    model: string = 'default',
  ): ProgressLog {
    const safeCommand = command.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeBackend = backend.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeModel = model.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = safeTimestamp();
    const filename = `progress-${safeCommand}-${safeBackend}-${safeModel}-${timestamp}.log`;

    const log = new ProgressLog(
      path.join(projectRoot, PROGRESS_DIR, filename),
    );

    // Fire-and-forget cleanup of old progress logs
    ProgressLog.cleanup(projectRoot).catch(() => { /* non-critical */ });

    return log;
  }

  /**
   * Get the path of the most recent progress log file.
   *
   * Reads the directory for `progress-*.log` files and returns the
   * most recent one (sorted lexicographically by filename, which
   * contains an ISO timestamp).
   *
   * @param projectRoot - Absolute path to the project root directory
   * @returns Absolute path to the latest progress log, or null if none exist
   */
  static async getLatestPath(projectRoot: string): Promise<string | null> {
    const dir = path.join(projectRoot, PROGRESS_DIR);
    try {
      const entries = await readdir(dir);
      const progressFiles = entries.filter(
        (name) => name.startsWith('progress-') && name.endsWith('.log'),
      );
      if (progressFiles.length === 0) return null;
      progressFiles.sort();
      return path.join(dir, progressFiles[progressFiles.length - 1]);
    } catch {
      return null;
    }
  }

  /**
   * Remove old progress log files, keeping only the most recent ones.
   *
   * Same retention pattern as {@link cleanupOldLogs} in telemetry.
   *
   * @param projectRoot - Absolute path to the project root directory
   * @param keepCount - Number of most recent progress logs to retain
   * @returns Number of files deleted
   */
  static async cleanup(
    projectRoot: string,
    keepCount: number = DEFAULT_KEEP_COUNT,
  ): Promise<number> {
    const dir = path.join(projectRoot, PROGRESS_DIR);
    let entries: string[];
    try {
      const allEntries = await readdir(dir);
      entries = allEntries.filter(
        (name) => name.startsWith('progress-') && name.endsWith('.log'),
      );
    } catch {
      return 0;
    }

    // Sort newest-first (lexicographic on ISO timestamp filenames)
    entries.sort();
    entries.reverse();

    const toDelete = entries.slice(keepCount);
    for (const filename of toDelete) {
      try {
        await unlink(path.join(dir, filename));
      } catch {
        // Non-critical -- stale progress logs are harmless
      }
    }

    return toDelete.length;
  }

  /**
   * Append a line to the progress log file.
   *
   * On first call, creates the parent directory and opens the file
   * in truncate mode ('w'). Subsequent writes append to the open handle.
   * Write failures are silently swallowed (non-critical telemetry).
   */
  write(line: string): void {
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!this.fd) {
          await mkdir(path.dirname(this.filePath), { recursive: true });
          this.fd = await open(this.filePath, 'w');
        }
        await this.fd.write(line + '\n');
      })
      .catch(() => { /* non-critical -- progress log loss is acceptable */ });
  }

  /** Flush all pending writes and close the file handle. */
  async finalize(): Promise<void> {
    await this.writeQueue;
    if (this.fd) {
      await this.fd.close();
      this.fd = null;
    }
  }
}

// ---------------------------------------------------------------------------
// ProgressReporter
// ---------------------------------------------------------------------------

/**
 * Streaming build-log progress reporter.
 *
 * Create one instance per command run. Call the event methods as files
 * are processed. Call {@link printSummary} at the end of the run.
 *
 * @example
 * ```typescript
 * const reporter = new ProgressReporter(fileCount);
 * reporter.onFileStart('src/index.ts');
 * reporter.onFileDone('src/index.ts', 1200, 500, 300, 'sonnet');
 * reporter.printSummary(summary);
 * ```
 */
export class ProgressReporter {
  /** Total number of file tasks in this run */
  private readonly totalFiles: number;

  /** Number of files that have started processing */
  private started: number = 0;

  /** Number of files completed successfully */
  private completed: number = 0;

  /** Number of files that failed */
  private failed: number = 0;

  /** Sliding window of recent completion durations for ETA */
  private readonly completionTimes: number[] = [];

  /** Maximum window size for ETA moving average */
  private readonly windowSize: number = 10;

  /** Total number of directory tasks in this run */
  private totalDirectories: number = 0;

  /** Number of directory tasks that have started */
  private dirStarted: number = 0;

  /** Number of directory tasks completed */
  private dirCompleted: number = 0;

  /** Sliding window of recent directory completion durations for ETA */
  private readonly dirCompletionTimes: number[] = [];

  /** Optional file-based progress log for tail -f monitoring */
  private readonly progressLog: ProgressLog | null;

  /**
   * Create a new progress reporter.
   *
   * @param totalFiles - Total number of file tasks to process
   * @param totalDirectories - Total number of directory tasks to process
   * @param progressLog - Optional progress log for file-based output mirroring
   */
  constructor(totalFiles: number, totalDirectories: number = 0, progressLog?: ProgressLog) {
    this.totalFiles = totalFiles;
    this.totalDirectories = totalDirectories;
    this.progressLog = progressLog ?? null;
  }

  /**
   * Log the start of file analysis.
   *
   * Output format: `[X/Y] ANALYZING path`
   *
   * @param filePath - Relative path to the file being analyzed
   */
  onFileStart(filePath: string): void {
    this.started++;
    const line = `${pc.dim(`[${this.started}/${this.totalFiles}]`)} ${pc.cyan('ANALYZING')} ${filePath}`;
    console.log(line);
    this.progressLog?.write(stripAnsi(line));
  }

  /**
   * Log the successful completion of file analysis.
   *
   * Output format: `[X/Y] DONE path Xs in/out tok ~Ns remaining`
   *
   * Records the completion time for ETA calculation.
   *
   * @param filePath - Relative path to the completed file
   * @param durationMs - Wall-clock duration of the AI call
   * @param tokensIn - Number of input tokens consumed (non-cached)
   * @param tokensOut - Number of output tokens generated
   * @param model - Model identifier used for this call
   * @param cacheReadTokens - Number of cache read input tokens
   */
  onFileDone(
    filePath: string,
    durationMs: number,
    tokensIn: number,
    tokensOut: number,
    model: string,
    cacheReadTokens = 0,
    cacheCreationTokens = 0,
  ): void {
    this.completed++;

    // Record completion time for ETA
    this.completionTimes.push(durationMs);
    if (this.completionTimes.length > this.windowSize) {
      this.completionTimes.shift();
    }

    const counter = pc.dim(`[${this.completed + this.failed}/${this.totalFiles}]`);
    const time = pc.dim(`${(durationMs / 1000).toFixed(1)}s`);
    // Total prompt size = non-cached + cache read + cache creation tokens
    const totalIn = tokensIn + cacheReadTokens + cacheCreationTokens;
    const tokens = pc.dim(`${totalIn}/${tokensOut} tok`);
    const modelLabel = pc.dim(model);
    const eta = this.formatETA();

    const line = `${counter} ${pc.green('DONE')} ${filePath} ${time} ${tokens} ${modelLabel}${eta}`;
    console.log(line);
    this.progressLog?.write(stripAnsi(line));
  }

  /**
   * Log a file analysis failure.
   *
   * Output format: `[X/Y] FAIL path error`
   *
   * @param filePath - Relative path to the failed file
   * @param error - Error message describing the failure
   */
  onFileError(filePath: string, error: string): void {
    this.failed++;

    const line = `${pc.dim(`[${this.completed + this.failed}/${this.totalFiles}]`)} ${pc.red('FAIL')} ${filePath} ${pc.dim(error)}`;
    console.log(line);
    this.progressLog?.write(stripAnsi(line));
  }

  /**
   * Log the start of directory AGENTS.md generation.
   *
   * Output format: `[dir X/Y] ANALYZING dirPath/AGENTS.md`
   *
   * @param dirPath - Path to the directory
   */
  onDirectoryStart(dirPath: string): void {
    this.dirStarted++;
    const line = `${pc.dim(`[dir ${this.dirStarted}/${this.totalDirectories}]`)} ${pc.cyan('ANALYZING')} ${dirPath}/AGENTS.md`;
    console.log(line);
    this.progressLog?.write(stripAnsi(line));
  }

  /**
   * Log the completion of directory AGENTS.md generation.
   *
   * Output format: `[dir X/Y] DONE dirPath/AGENTS.md Xs in/out tok model ~ETA`
   *
   * @param dirPath - Path to the directory
   * @param durationMs - Wall-clock duration of the AI call
   * @param tokensIn - Number of input tokens consumed (non-cached)
   * @param tokensOut - Number of output tokens generated
   * @param model - Model identifier used for this call
   * @param cacheReadTokens - Number of cache read input tokens
   */
  onDirectoryDone(
    dirPath: string,
    durationMs: number,
    tokensIn: number,
    tokensOut: number,
    model: string,
    cacheReadTokens = 0,
    cacheCreationTokens = 0,
  ): void {
    this.dirCompleted++;

    // Record completion time for directory ETA
    this.dirCompletionTimes.push(durationMs);
    if (this.dirCompletionTimes.length > this.windowSize) {
      this.dirCompletionTimes.shift();
    }

    const counter = pc.dim(`[dir ${this.dirCompleted}/${this.totalDirectories}]`);
    const time = pc.dim(`${(durationMs / 1000).toFixed(1)}s`);
    // Total prompt size = non-cached + cache read + cache creation tokens
    const totalIn = tokensIn + cacheReadTokens + cacheCreationTokens;
    const tokens = pc.dim(`${totalIn}/${tokensOut} tok`);
    const modelLabel = pc.dim(model);
    const eta = this.formatDirectoryETA();

    const line = `${counter} ${pc.blue('DONE')} ${dirPath}/AGENTS.md ${time} ${tokens} ${modelLabel}${eta}`;
    console.log(line);
    this.progressLog?.write(stripAnsi(line));
  }

  /**
   * Print the end-of-run summary.
   *
   * Shows files processed, token counts, files read with unique dedup,
   * time elapsed, errors, and retries.
   *
   * @param summary - Aggregated run summary
   */
  printSummary(summary: RunSummary): void {
    const elapsed = (summary.totalDurationMs / 1000).toFixed(1);

    const lines: string[] = [];
    lines.push('');
    lines.push(pc.bold('=== Run Summary ==='));
    lines.push(`  ARE version:     ${summary.version}`);
    lines.push(`  Files processed: ${pc.green(String(summary.filesProcessed))}`);
    if (summary.filesFailed > 0) {
      lines.push(`  Files failed:    ${pc.red(String(summary.filesFailed))}`);
    }
    if (summary.filesSkipped > 0) {
      lines.push(`  Files skipped:   ${pc.yellow(String(summary.filesSkipped))}`);
    }
    if (summary.dirsProcessed != null && summary.dirsProcessed > 0) {
      lines.push(`  Dirs processed:  ${pc.green(String(summary.dirsProcessed))}`);
    }
    if (summary.dirsFailed != null && summary.dirsFailed > 0) {
      lines.push(`  Dirs failed:     ${pc.red(String(summary.dirsFailed))}`);
    }
    if (summary.dirsSkipped != null && summary.dirsSkipped > 0) {
      lines.push(`  Dirs skipped:    ${pc.yellow(String(summary.dirsSkipped))}`);
    }
    lines.push(`  Total calls:     ${summary.totalCalls}`);
    lines.push(`  Tokens:          ${summary.totalInputTokens} in / ${summary.totalOutputTokens} out`);
    lines.push(`  Cached:          ${summary.totalCacheReadTokens} read in / ${summary.totalCacheCreationTokens} created in`);
    const totalIn = summary.totalInputTokens + summary.totalCacheReadTokens + summary.totalCacheCreationTokens;
    lines.push(`  Total:           ${totalIn} in / ${summary.totalOutputTokens} out`);

    if (summary.totalFilesRead > 0) {
      lines.push(`  Files read:      ${summary.totalFilesRead} (${summary.uniqueFilesRead} unique)`);
    }

    lines.push(`  Total time:      ${elapsed}s`);
    lines.push(`  Errors:          ${summary.errorCount}`);
    if (summary.retryCount > 0) {
      lines.push(`  Retries:         ${summary.retryCount}`);
    }

    for (const line of lines) {
      console.log(line);
      this.progressLog?.write(stripAnsi(line));
    }
  }

  // -------------------------------------------------------------------------
  // ETA calculation
  // -------------------------------------------------------------------------

  /**
   * Compute and format the estimated time remaining.
   *
   * Uses a moving average of the last 10 completion times.
   * Returns an empty string if fewer than 2 completions have occurred.
   *
   * @returns Formatted ETA string like ` ~12s remaining` or ` ~2m 30s remaining`
   */
  private formatETA(): string {
    if (this.completionTimes.length < 2) return '';

    const avg =
      this.completionTimes.reduce((a, b) => a + b, 0) /
      this.completionTimes.length;
    const remaining = this.totalFiles - this.completed - this.failed;

    if (remaining <= 0) return '';

    const etaMs = avg * remaining;
    const seconds = Math.round(etaMs / 1000);

    if (seconds < 60) {
      return pc.dim(` ~${seconds}s remaining`);
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return pc.dim(` ~${minutes}m ${secs}s remaining`);
  }

  /**
   * Compute and format the estimated time remaining for directory tasks.
   *
   * Uses a moving average of the last 10 directory completion times.
   * Returns an empty string if fewer than 2 completions have occurred.
   */
  private formatDirectoryETA(): string {
    if (this.dirCompletionTimes.length < 2) return '';

    const avg =
      this.dirCompletionTimes.reduce((a, b) => a + b, 0) /
      this.dirCompletionTimes.length;
    const remaining = this.totalDirectories - this.dirCompleted;

    if (remaining <= 0) return '';

    const etaMs = avg * remaining;
    const seconds = Math.round(etaMs / 1000);

    if (seconds < 60) {
      return pc.dim(` ~${seconds}s remaining`);
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return pc.dim(` ~${minutes}m ${secs}s remaining`);
  }
}
