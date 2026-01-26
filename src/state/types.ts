/**
 * State types for tracking file generation
 */
import type Database from 'better-sqlite3';

/**
 * Record of a file's generation state
 */
export interface FileRecord {
  /** Relative path from project root */
  path: string;
  /** SHA-256 hash of file content */
  content_hash: string;
  /** ISO timestamp when .sum was generated (null if not yet generated) */
  sum_generated_at: string | null;
  /** Commit hash when file was last analyzed */
  last_analyzed_commit: string | null;
}

/**
 * Record of a generation/update run
 */
export interface RunRecord {
  /** Auto-incremented ID */
  id: number;
  /** Git commit hash at run time */
  commit_hash: string;
  /** ISO timestamp when run completed */
  completed_at: string;
  /** Number of files analyzed in this run */
  files_analyzed: number;
  /** Number of files skipped (unchanged) */
  files_skipped: number;
}

/**
 * Interface for state database operations
 */
export interface StateDatabase {
  /** Get file record by path */
  getFile(path: string): FileRecord | undefined;
  /** Insert or update file record */
  upsertFile(record: FileRecord): void;
  /** Delete file record */
  deleteFile(path: string): void;
  /** Get all file records */
  getAllFiles(): FileRecord[];
  /** Get the most recent run record */
  getLastRun(): RunRecord | undefined;
  /** Insert a new run record */
  insertRun(run: Omit<RunRecord, 'id'>): number;
  /** Close the database connection */
  close(): void;
  /** Get the underlying database for transactions */
  getDb(): Database.Database;
}
