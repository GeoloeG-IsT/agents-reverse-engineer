/**
 * Update orchestrator
 *
 * Coordinates incremental documentation updates:
 * 1. Check git repository status
 * 2. Get last run from state database
 * 3. Detect changed files since last run
 * 4. Clean up orphaned .sum files
 * 5. Prepare analysis tasks for changed files
 * 6. Track affected directories for AGENTS.md regeneration
 * 7. Persist new state after successful completion
 */
import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Config } from '../config/schema.js';
import type { StateDatabase, FileRecord, RunRecord } from '../state/index.js';
import { openDatabase } from '../state/index.js';
import {
  isGitRepo,
  getCurrentCommit,
  getChangedFiles,
  computeContentHash,
  type FileChange,
} from '../change-detection/index.js';
import { cleanupOrphans, getAffectedDirectories } from './orphan-cleaner.js';
import type {
  UpdateOptions,
  CleanupResult,
} from './types.js';

/** State directory name (relative to project root) */
const STATE_DIR = '.agents-reverse-engineer';
/** State database filename */
const STATE_DB = 'state.db';

/**
 * Result of update preparation (before analysis).
 */
export interface UpdatePlan {
  /** Files to analyze (added or modified) */
  filesToAnalyze: FileChange[];
  /** Files to skip (unchanged based on content hash) */
  filesToSkip: string[];
  /** Cleanup result (files to delete) */
  cleanup: CleanupResult;
  /** Directories that need AGENTS.md regeneration */
  affectedDirs: string[];
  /** Base commit (from last run or initial) */
  baseCommit: string;
  /** Current commit */
  currentCommit: string;
  /** Whether this is first run (no prior state) */
  isFirstRun: boolean;
}

/**
 * Orchestrates incremental documentation updates.
 */
export class UpdateOrchestrator {
  private config: Config;
  private projectRoot: string;
  private db: StateDatabase | null = null;

  constructor(config: Config, projectRoot: string) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Get path to state database.
   */
  private getDbPath(): string {
    return path.join(this.projectRoot, STATE_DIR, STATE_DB);
  }

  /**
   * Ensure state directory exists and open database.
   */
  async openState(): Promise<StateDatabase> {
    if (this.db) return this.db;

    // Ensure state directory exists
    const stateDir = path.join(this.projectRoot, STATE_DIR);
    await mkdir(stateDir, { recursive: true });

    this.db = openDatabase(this.getDbPath());
    return this.db;
  }

  /**
   * Close database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check prerequisites for update.
   *
   * @throws Error if not in a git repository
   */
  async checkPrerequisites(): Promise<void> {
    const isRepo = await isGitRepo(this.projectRoot);
    if (!isRepo) {
      throw new Error(
        `Not a git repository: ${this.projectRoot}\n` +
        'The update command requires a git repository for change detection.'
      );
    }
  }

  /**
   * Prepare update plan without executing analysis.
   *
   * @param options - Update options
   * @returns Update plan with files to analyze and cleanup actions
   */
  async preparePlan(options: UpdateOptions = {}): Promise<UpdatePlan> {
    await this.checkPrerequisites();
    const db = await this.openState();

    // Get current commit
    const currentCommit = await getCurrentCommit(this.projectRoot);

    // Get last run to determine base commit
    const lastRun = db.getLastRun();
    const isFirstRun = !lastRun;
    const baseCommit = lastRun?.commit_hash ?? currentCommit;

    // If first run or same commit, no committed changes
    let changes: FileChange[] = [];
    if (!isFirstRun && baseCommit !== currentCommit) {
      const result = await getChangedFiles(
        this.projectRoot,
        baseCommit,
        { includeUncommitted: options.includeUncommitted }
      );
      changes = result.changes;
    } else if (options.includeUncommitted) {
      // Even if no committed changes, check uncommitted
      const result = await getChangedFiles(
        this.projectRoot,
        currentCommit, // Use current as base (no committed diff)
        { includeUncommitted: true }
      );
      changes = result.changes;
    }

    // Separate files by status for different handling
    const filesToAnalyze = changes.filter(
      c => c.status === 'added' || c.status === 'modified' || c.status === 'renamed'
    );
    const deletedOrRenamed = changes.filter(
      c => c.status === 'deleted' || c.status === 'renamed'
    );

    // Filter out files that haven't actually changed (content hash match)
    const actuallyChanged: FileChange[] = [];
    const filesToSkip: string[] = [];

    for (const change of filesToAnalyze) {
      if (change.status === 'added') {
        // New files are always analyzed
        actuallyChanged.push(change);
      } else {
        // For modified/renamed, check content hash
        const filePath = path.join(this.projectRoot, change.path);
        try {
          const currentHash = await computeContentHash(filePath);
          const stored = db.getFile(change.path);

          if (!stored || stored.content_hash !== currentHash) {
            actuallyChanged.push(change);
          } else {
            filesToSkip.push(change.path);
          }
        } catch {
          // File can't be read - skip it
          filesToSkip.push(change.path);
        }
      }
    }

    // Cleanup orphans (deleted and renamed old paths)
    const cleanup = await cleanupOrphans(
      this.projectRoot,
      deletedOrRenamed,
      options.dryRun ?? false
    );

    // Get directories affected by changes (for AGENTS.md regeneration)
    const affectedDirs = Array.from(getAffectedDirectories(actuallyChanged));

    return {
      filesToAnalyze: actuallyChanged,
      filesToSkip,
      cleanup,
      affectedDirs,
      baseCommit,
      currentCommit,
      isFirstRun,
    };
  }

  /**
   * Update state for a successfully analyzed file.
   *
   * @param relativePath - Relative path to the file
   * @param contentHash - SHA-256 hash of file content
   * @param currentCommit - Current git commit hash
   */
  async recordFileAnalyzed(
    relativePath: string,
    contentHash: string,
    currentCommit: string
  ): Promise<void> {
    const db = await this.openState();
    db.upsertFile({
      path: relativePath,
      content_hash: contentHash,
      sum_generated_at: new Date().toISOString(),
      last_analyzed_commit: currentCommit,
    });
  }

  /**
   * Remove file from state (for deleted files).
   */
  async removeFileState(relativePath: string): Promise<void> {
    const db = await this.openState();
    db.deleteFile(relativePath);
  }

  /**
   * Record a completed update run.
   *
   * @param commitHash - Git commit hash at completion
   * @param filesAnalyzed - Number of files analyzed
   * @param filesSkipped - Number of files skipped
   * @returns Run ID
   */
  async recordRun(
    commitHash: string,
    filesAnalyzed: number,
    filesSkipped: number
  ): Promise<number> {
    const db = await this.openState();
    return db.insertRun({
      commit_hash: commitHash,
      completed_at: new Date().toISOString(),
      files_analyzed: filesAnalyzed,
      files_skipped: filesSkipped,
    });
  }

  /**
   * Get last run information.
   */
  async getLastRun(): Promise<RunRecord | undefined> {
    const db = await this.openState();
    return db.getLastRun();
  }

  /**
   * Check if this is the first run (no prior state).
   */
  async isFirstRun(): Promise<boolean> {
    const db = await this.openState();
    return !db.getLastRun();
  }
}

/**
 * Create an update orchestrator.
 */
export function createUpdateOrchestrator(
  config: Config,
  projectRoot: string
): UpdateOrchestrator {
  return new UpdateOrchestrator(config, projectRoot);
}
