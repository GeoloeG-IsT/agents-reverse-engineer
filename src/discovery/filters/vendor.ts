/**
 * Vendor directory filter for file discovery.
 *
 * Excludes files within common vendor/dependency directories that typically
 * contain third-party code not relevant for documentation purposes.
 */

import path from 'node:path';
import type { FileFilter } from '../types.js';

/**
 * Default vendor directories to exclude.
 * These are common directories containing third-party code, build output,
 * or generated files that should not be analyzed.
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
] as const;

/**
 * Creates a vendor filter that excludes files within specified directories.
 *
 * @param vendorDirs - Array of directory names to exclude. Files within
 *                     any of these directories (at any nesting level) will
 *                     be excluded.
 * @returns A FileFilter that checks if a path is within a vendor directory
 *
 * @example
 * ```typescript
 * const filter = createVendorFilter(['node_modules', 'vendor']);
 * filter.shouldExclude('/project/node_modules/lodash/index.js'); // true
 * filter.shouldExclude('/project/src/utils.js'); // false
 * ```
 */
export function createVendorFilter(vendorDirs: string[]): FileFilter {
  // Convert to Set for O(1) lookup
  const vendorSet = new Set(vendorDirs);

  return {
    name: 'vendor',

    shouldExclude(absolutePath: string): boolean {
      // Split path by separator and check if any segment matches vendor dirs
      const segments = absolutePath.split(path.sep);

      for (const segment of segments) {
        if (vendorSet.has(segment)) {
          return true;
        }
      }

      return false;
    },
  };
}
