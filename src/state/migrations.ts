/**
 * Schema migrations using SQLite user_version pragma
 */
import type Database from 'better-sqlite3';

/** Current schema version */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Apply schema migrations from `fromVersion` to `toVersion`.
 * Uses transaction for atomicity.
 */
export function migrateSchema(
  db: Database.Database,
  fromVersion: number,
  toVersion: number
): void {
  const migrate = db.transaction(() => {
    if (fromVersion < 1) {
      // Initial schema
      db.exec(`
        CREATE TABLE files (
          path TEXT PRIMARY KEY,
          content_hash TEXT NOT NULL,
          sum_generated_at TEXT,
          last_analyzed_commit TEXT
        )
      `);

      db.exec(`
        CREATE TABLE runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          commit_hash TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          files_analyzed INTEGER NOT NULL,
          files_skipped INTEGER NOT NULL
        )
      `);

      // Index for faster queries by commit
      db.exec(`
        CREATE INDEX idx_runs_commit ON runs(commit_hash)
      `);
    }

    // Future migrations would go here:
    // if (fromVersion < 2) { ... }

    db.pragma(`user_version = ${toVersion}`);
  });

  migrate();
}
