/**
 * Change detection module
 *
 * Provides git-based change detection for incremental updates.
 * Detects added, modified, deleted, and renamed files.
 */
export {
  isGitRepo,
  getCurrentCommit,
  getChangedFiles,
  computeContentHash,
} from './detector.js';

export type {
  ChangeType,
  FileChange,
  ChangeDetectionResult,
  ChangeDetectionOptions,
} from './types.js';
