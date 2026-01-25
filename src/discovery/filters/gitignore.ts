/**
 * Gitignore pattern filter for file discovery.
 *
 * Uses the `ignore` library to parse and match .gitignore patterns.
 * This filter loads the root .gitignore file and checks paths against
 * the patterns to determine exclusion.
 */

import ignore, { type Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileFilter } from '../types.js';

/**
 * Creates a gitignore filter that excludes files matching .gitignore patterns.
 *
 * @param root - The root directory containing the .gitignore file
 * @returns A FileFilter that checks paths against gitignore patterns
 *
 * @example
 * ```typescript
 * const filter = await createGitignoreFilter('/path/to/project');
 * if (filter.shouldExclude('/path/to/project/dist/bundle.js')) {
 *   console.log('File is gitignored');
 * }
 * ```
 */
export async function createGitignoreFilter(root: string): Promise<FileFilter> {
  const ig: Ignore = ignore();
  const normalizedRoot = path.resolve(root);

  // Load .gitignore from root if it exists
  const gitignorePath = path.join(normalizedRoot, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore file, filter will pass everything through
  }

  return {
    name: 'gitignore',

    shouldExclude(absolutePath: string): boolean {
      // Convert to relative path (ignore library requires relative paths)
      const relativePath = path.relative(normalizedRoot, absolutePath);

      // If path is outside root (starts with ..) or is empty, don't exclude
      if (!relativePath || relativePath.startsWith('..')) {
        return false;
      }

      // CRITICAL: The ignore library treats paths differently based on trailing slash
      // We check the path as-is (for files) - directory handling would need trailing slash
      // Since our walker returns files only, we don't append slash here
      return ig.ignores(relativePath);
    },
  };
}
