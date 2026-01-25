/**
 * Discovery types for the agents-reverse file discovery system.
 * 
 * This module defines the core interfaces and types used by the directory
 * walker and filter chain for file discovery operations.
 */

import type { Stats } from 'node:fs';

/**
 * Interface for file filters in the discovery pipeline.
 * 
 * Filters are applied to each file discovered by the walker to determine
 * whether it should be included or excluded from analysis. Filters can be
 * synchronous or asynchronous.
 * 
 * Examples: GitignoreFilter, BinaryFilter, VendorFilter, CustomPatternFilter
 */
export interface FileFilter {
  /** Name of the filter for logging which filter excluded a file */
  readonly name: string;
  
  /**
   * Determine whether a file should be excluded from discovery.
   * 
   * @param path - Absolute path to the file
   * @param stats - Optional file stats (for size-based filtering, etc.)
   * @returns true if the file should be excluded, false to include
   */
  shouldExclude(path: string, stats?: Stats): Promise<boolean> | boolean;
}

/**
 * Record of an excluded file with reason and responsible filter.
 */
export interface ExcludedFile {
  /** Absolute path to the excluded file */
  path: string;
  /** Human-readable reason for exclusion */
  reason: string;
  /** Name of the filter that excluded this file */
  filter: string;
}

/**
 * Result of running the discovery and filter chain.
 */
export interface FilterResult {
  /** Files that passed all filters and should be analyzed */
  included: string[];
  /** Files that were excluded with reasons */
  excluded: ExcludedFile[];
}

/**
 * Options for the directory walker.
 */
export interface WalkerOptions {
  /** Root directory to walk (absolute path) */
  cwd: string;
  
  /** 
   * Whether to follow symbolic links.
   * Default: false (per CONTEXT.md - skip symlinks by default)
   */
  followSymlinks?: boolean;
  
  /**
   * Whether to include dotfiles (files starting with .).
   * Default: true (include dotfiles for analysis)
   */
  dot?: boolean;
}
