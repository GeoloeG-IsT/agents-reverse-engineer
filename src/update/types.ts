/**
 * Types for incremental update workflow
 */
import type { FileChange } from '../change-detection/types.js';

/**
 * Result of orphan cleanup
 */
export interface CleanupResult {
  /** .sum files that were deleted */
  deletedSumFiles: string[];
  /** AGENTS.md files that were deleted (from empty directories) */
  deletedAgentsMd: string[];
}

/**
 * Options for the update command
 */
export interface UpdateOptions {
  /** Include uncommitted changes (staged + working directory) */
  includeUncommitted?: boolean;
  /** Suppress output except errors */
  quiet?: boolean;
  /** Show detailed output */
  verbose?: boolean;
  /** Dry run - show what would change without making changes */
  dryRun?: boolean;
  /** Override token budget */
  budget?: number;
}

/**
 * Result of an update run
 */
export interface UpdateResult {
  /** Files that were analyzed (added or modified) */
  analyzedFiles: string[];
  /** Files that were skipped (unchanged) */
  skippedFiles: string[];
  /** Cleanup result (deleted .sum and AGENTS.md files) */
  cleanup: CleanupResult;
  /** Directories whose AGENTS.md was regenerated */
  regeneratedDirs: string[];
  /** Git commit hash at start of update */
  baseCommit: string;
  /** Git commit hash at end of update */
  currentCommit: string;
  /** Token budget used */
  tokensUsed: number;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Progress callback for update operations
 */
export interface UpdateProgress {
  /** Called when a file is about to be processed */
  onFileStart?: (path: string, status: 'analyzing' | 'skipping') => void;
  /** Called when a file is done processing */
  onFileDone?: (path: string, status: 'analyzed' | 'skipped' | 'error') => void;
  /** Called when cleanup deletes a file */
  onCleanup?: (path: string, type: 'sum' | 'agents-md') => void;
  /** Called when a directory AGENTS.md is regenerated */
  onDirRegenerate?: (path: string) => void;
}
