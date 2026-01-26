/**
 * Git change detection and content hashing
 *
 * Uses simple-git for git operations and Node.js crypto for hashing.
 */
import { simpleGit } from 'simple-git';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { FileChange, ChangeDetectionResult, ChangeDetectionOptions } from './types.js';

/**
 * Check if a path is inside a git repository.
 */
export async function isGitRepo(projectRoot: string): Promise<boolean> {
  const git = simpleGit(projectRoot);
  return git.checkIsRepo();
}

/**
 * Get the current HEAD commit hash.
 */
export async function getCurrentCommit(projectRoot: string): Promise<string> {
  const git = simpleGit(projectRoot);
  const hash = await git.revparse(['HEAD']);
  return hash.trim();
}

/**
 * Detect files changed since a base commit.
 *
 * Uses git diff with --name-status and -M for rename detection.
 * Optionally includes uncommitted changes (staged + working directory).
 */
export async function getChangedFiles(
  projectRoot: string,
  baseCommit: string,
  options: ChangeDetectionOptions = {}
): Promise<ChangeDetectionResult> {
  const git = simpleGit(projectRoot);
  const currentCommit = await getCurrentCommit(projectRoot);
  const changes: FileChange[] = [];

  // Get committed changes from baseCommit to HEAD
  const diff = await git.diff([
    '--name-status',
    '-M', // Detect renames (50% similarity threshold)
    baseCommit,
    'HEAD',
  ]);

  // Parse diff output
  // Format: STATUS\tFILE (or STATUS\tOLD\tNEW for renames)
  const lines = diff.trim().split('\n').filter(line => line.length > 0);

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const status = parts[0];
    const filePath = parts[parts.length - 1]; // Last part is always the (new) path

    if (status === 'A') {
      changes.push({ path: filePath, status: 'added' });
    } else if (status === 'M') {
      changes.push({ path: filePath, status: 'modified' });
    } else if (status === 'D') {
      changes.push({ path: filePath, status: 'deleted' });
    } else if (status.startsWith('R')) {
      // Rename: R100 old new (R followed by similarity percentage)
      const oldPath = parts[1];
      changes.push({
        path: filePath,
        status: 'renamed',
        oldPath,
      });
    }
  }

  // Optionally include uncommitted changes
  if (options.includeUncommitted) {
    const status = await git.status();

    // Modified but not staged
    for (const file of status.modified) {
      if (!changes.some(c => c.path === file)) {
        changes.push({ path: file, status: 'modified' });
      }
    }

    // Staged for deletion
    for (const file of status.deleted) {
      if (!changes.some(c => c.path === file)) {
        changes.push({ path: file, status: 'deleted' });
      }
    }

    // Untracked files (new files not yet added)
    for (const file of status.not_added) {
      if (!changes.some(c => c.path === file)) {
        changes.push({ path: file, status: 'added' });
      }
    }

    // Staged files (new or modified)
    for (const file of status.staged) {
      if (!changes.some(c => c.path === file)) {
        changes.push({ path: file, status: 'added' });
      }
    }
  }

  return {
    currentCommit,
    baseCommit,
    changes,
    includesUncommitted: options.includeUncommitted ?? false,
  };
}

/**
 * Compute SHA-256 hash of a file's content.
 *
 * @param filePath - Absolute path to the file
 * @returns Hex-encoded SHA-256 hash
 */
export async function computeContentHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}
