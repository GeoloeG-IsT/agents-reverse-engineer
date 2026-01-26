/**
 * File type detector
 *
 * Detects file type using a three-tier strategy:
 * 1. File name patterns (tests, configs) - most specific
 * 2. Parent directory name - fast path for standard structures
 * 3. Content analysis - fallback for edge cases
 */

import path from 'node:path';
import type { FileType } from '../types.js';
import { DIRECTORY_PATTERNS, detectFromContent } from './patterns.js';

/**
 * File name patterns that override directory detection
 * These are checked first because they're the most specific indicators
 */
const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.[jt]sx?$/,
];

const CONFIG_FILE_PATTERNS = [
  /\.config\.[jt]s$/,
  /\.config\.m?[jt]s$/,
  /rc\.[jt]s$/,
  /rc\.m?[jt]s$/,
  /\.json$/,
  /\.ya?ml$/,
];

/**
 * Detect file type using directory-first strategy with content fallback.
 *
 * Detection order:
 * 1. File name patterns (tests, configs) - most specific
 * 2. Parent directory name - fast path for standard structures
 * 3. Content analysis - fallback for edge cases
 *
 * @param filePath - Path to the file (relative or absolute)
 * @param content - File content for fallback detection
 * @returns Detected FileType
 */
export function detectFileType(filePath: string, content: string): FileType {
  const fileName = path.basename(filePath);

  // 1. File name patterns take precedence
  if (TEST_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return 'test';
  }

  if (CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return 'config';
  }

  // 2. Directory-based detection
  const dirPath = path.dirname(filePath);
  const pathParts = dirPath.split(path.sep);

  // Check each directory level (inner to outer)
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const dirName = pathParts[i].toLowerCase();
    if (dirName && DIRECTORY_PATTERNS[dirName]) {
      return DIRECTORY_PATTERNS[dirName];
    }
  }

  // 3. Content-based fallback
  return detectFromContent(content);
}
