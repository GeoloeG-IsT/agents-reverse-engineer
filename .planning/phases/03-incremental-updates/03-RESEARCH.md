# Phase 3: Incremental Updates - Research

**Researched:** 2026-01-26
**Domain:** State persistence, Git change detection, SQLite for Node.js
**Confidence:** HIGH

## Summary

This phase implements incremental documentation updates by detecting which files changed since the last generation run. The approach uses SQLite for state persistence (storing file hashes and generation metadata), simple-git for change detection (already a project dependency), and content hashing for detecting changes outside git.

The core workflow is:
1. Store state (commit hash, file content hashes, generation timestamps) in `.agents-reverse/state.db`
2. On `update` command, query git for files changed since stored hash
3. Re-analyze only changed files, delete orphaned .sum files, regenerate affected AGENTS.md files

**Primary recommendation:** Use better-sqlite3 for synchronous SQLite access with WAL mode, simple-git's `diffSummary()` with `--name-status` for change detection including renames, and Node.js built-in `crypto.createHash('sha256')` for content hashing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.x | SQLite database for state storage | Fastest synchronous SQLite for Node.js, full transaction support, production-ready |
| simple-git | ^3.27 | Git operations for change detection | Already in project, type-safe, comprehensive diff support |
| crypto (built-in) | Node.js | Content hashing | No external dependency, SHA-256 is fast on modern CPUs with hardware acceleration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | ^7.x | TypeScript types | Always (strict TypeScript project) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | Node.js built-in SQLite | Built-in is experimental (Node 22.5+), requires --experimental-sqlite flag, not production-ready |
| better-sqlite3 | sql.js | sql.js is for browser/WASM, slower for Node.js server-side |
| SHA-256 | xxHash | xxHash is 10x faster but non-cryptographic; SHA-256 is fast enough with hardware acceleration and provides stronger guarantees |

**Installation:**
```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── state/                    # NEW: State management
│   ├── types.ts             # State types (FileState, RunState)
│   ├── database.ts          # SQLite wrapper with schema migrations
│   ├── migrations.ts        # Schema version migrations
│   └── index.ts             # Exports
├── change-detection/         # NEW: Git change detection
│   ├── types.ts             # Change types (ChangeType, FileChange)
│   ├── detector.ts          # Change detection logic
│   └── index.ts             # Exports
├── update/                   # NEW: Update orchestration
│   ├── types.ts             # Update types
│   ├── orchestrator.ts      # Update workflow orchestration
│   └── index.ts             # Exports
└── cli/
    ├── update.ts            # NEW: Update command
    └── index.ts             # Add update command routing
```

### Pattern 1: SQLite State Management
**What:** Use SQLite with user_version pragma for schema versioning
**When to use:** All state persistence operations
**Example:**
```typescript
// Source: better-sqlite3 official docs
import Database from 'better-sqlite3';

export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Performance optimization

  // Check schema version and migrate
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version < CURRENT_SCHEMA_VERSION) {
    migrateSchema(db, version, CURRENT_SCHEMA_VERSION);
  }

  return db;
}

// Migration pattern
function migrateSchema(db: Database.Database, from: number, to: number): void {
  const migration = db.transaction(() => {
    if (from < 1) {
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
          files_analyzed INTEGER,
          files_skipped INTEGER
        )
      `);
    }
    db.pragma(`user_version = ${to}`);
  });
  migration();
}
```

### Pattern 2: Git Change Detection with Renames
**What:** Use simple-git diffSummary with --name-status to detect changes including renames
**When to use:** Detecting what changed since last run
**Example:**
```typescript
// Source: simple-git official README
import { simpleGit, DiffResult, DiffResultNameStatusFile } from 'simple-git';

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renames
}

async function getChangedFiles(
  projectRoot: string,
  sinceCommit: string,
  includeUncommitted: boolean
): Promise<FileChange[]> {
  const git = simpleGit(projectRoot);
  const changes: FileChange[] = [];

  // Get committed changes since hash
  const diff = await git.diffSummary([
    '--name-status',
    '-M',  // Detect renames (50% similarity threshold)
    sinceCommit,
    'HEAD'
  ]) as DiffResult;

  for (const file of diff.files) {
    const f = file as DiffResultNameStatusFile;
    switch (f.status) {
      case 'A':
        changes.push({ path: f.file, status: 'added' });
        break;
      case 'M':
        changes.push({ path: f.file, status: 'modified' });
        break;
      case 'D':
        changes.push({ path: f.file, status: 'deleted' });
        break;
      case 'R':
        changes.push({
          path: f.file,
          status: 'renamed',
          oldPath: f.from
        });
        break;
    }
  }

  // Optionally include uncommitted changes
  if (includeUncommitted) {
    const status = await git.status();
    for (const file of status.modified) {
      if (!changes.some(c => c.path === file)) {
        changes.push({ path: file, status: 'modified' });
      }
    }
    for (const file of status.not_added) {
      changes.push({ path: file, status: 'added' });
    }
    for (const file of status.deleted) {
      changes.push({ path: file, status: 'deleted' });
    }
  }

  return changes;
}
```

### Pattern 3: Content Hashing for Non-Git Changes
**What:** Hash file content to detect changes outside git workflow
**When to use:** Detecting changes even when git state is unknown or for staged files
**Example:**
```typescript
// Source: Node.js crypto documentation
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

async function computeContentHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function hasFileChanged(
  currentHash: string,
  storedHash: string | null
): boolean {
  return storedHash === null || currentHash !== storedHash;
}
```

### Pattern 4: Orphan Cleanup
**What:** Delete .sum and AGENTS.md files when source files are removed
**When to use:** During update when detecting deleted/renamed files
**Example:**
```typescript
import { unlink, readdir, stat, rmdir } from 'node:fs/promises';
import * as path from 'node:path';

interface CleanupResult {
  deletedSumFiles: string[];
  deletedAgentsMd: string[];
}

async function cleanupOrphans(
  projectRoot: string,
  deletedFiles: string[]
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedSumFiles: [],
    deletedAgentsMd: [],
  };

  // Delete .sum files for deleted source files
  for (const file of deletedFiles) {
    const sumPath = path.join(projectRoot, `${file}.sum`);
    try {
      await unlink(sumPath);
      result.deletedSumFiles.push(sumPath);
    } catch {
      // .sum didn't exist, ignore
    }
  }

  // Check directories that had files deleted
  const affectedDirs = new Set(deletedFiles.map(f => path.dirname(f)));
  for (const dir of affectedDirs) {
    const dirPath = path.join(projectRoot, dir);
    await cleanupEmptyDirectoryDocs(dirPath, result);
  }

  return result;
}

async function cleanupEmptyDirectoryDocs(
  dirPath: string,
  result: CleanupResult
): Promise<void> {
  try {
    const entries = await readdir(dirPath);

    // Check if directory still has any source files (not .sum, not AGENTS.md)
    const hasSourceFiles = entries.some(e =>
      !e.endsWith('.sum') &&
      e !== 'AGENTS.md' &&
      e !== 'CLAUDE.md'
    );

    if (!hasSourceFiles) {
      // Remove AGENTS.md from empty directory
      const agentsPath = path.join(dirPath, 'AGENTS.md');
      try {
        await unlink(agentsPath);
        result.deletedAgentsMd.push(agentsPath);
      } catch {
        // Didn't exist
      }
    }
  } catch {
    // Directory doesn't exist
  }
}
```

### Anti-Patterns to Avoid
- **Storing state in JSON files:** JSON lacks atomic writes and becomes slow for large repos. SQLite with WAL mode provides ACID guarantees and handles concurrent access.
- **Parsing git diff output manually:** Use simple-git's parsed responses (diffSummary) rather than raw diff strings.
- **Using MD5 for content hashing:** MD5 is both slower on modern hardware (no hardware acceleration) and cryptographically broken. Use SHA-256.
- **Tracking rename chains:** Don't try to maintain file identity across renames. Treat rename as delete old + add new - simpler and reliable.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite access | Custom file-based storage | better-sqlite3 | ACID guarantees, concurrent access, WAL performance |
| Git diff parsing | Regex on git output | simple-git diffSummary | Handles edge cases (spaces in names, binary files, renames) |
| Content hashing | Custom checksum | crypto.createHash | Hardware-accelerated, battle-tested implementation |
| Schema migrations | Manual SQL versioning | user_version pragma with migration functions | Reliable version tracking built into SQLite |

**Key insight:** Git is complex - files can have spaces, unicode names, or unusual characters. simple-git handles all edge cases; hand-rolled parsing will miss them.

## Common Pitfalls

### Pitfall 1: Stale Baseline After Failed Run
**What goes wrong:** Run starts, crashes partway through, leaves partial state
**Why it happens:** State updated incrementally without transaction
**How to avoid:** Wrap entire update in SQLite transaction; only commit on success
**Warning signs:** Some files have new .sum files but state shows old commit hash

### Pitfall 2: Rename Detection Threshold
**What goes wrong:** File renamed AND heavily modified is seen as delete + add, not rename
**Why it happens:** Git's -M flag uses 50% similarity by default
**How to avoid:** Accept this behavior (per CONTEXT.md decision). Document that rename + heavy edit = delete old + regenerate new.
**Warning signs:** Old .sum file deleted, new one generated (this is correct behavior)

### Pitfall 3: Concurrent Updates
**What goes wrong:** Two update commands run simultaneously, corrupt state
**Why it happens:** SQLite without proper locking
**How to avoid:** Use SQLite exclusive transaction at start; fail fast if locked
**Warning signs:** "database is locked" errors

### Pitfall 4: Missing Parent Directory Updates
**What goes wrong:** File changes but parent AGENTS.md not regenerated
**Why it happens:** Only updating .sum files, forgetting directory docs
**How to avoid:** Track affected directories during update, regenerate their AGENTS.md files at the end
**Warning signs:** Directory AGENTS.md shows old file descriptions

### Pitfall 5: Git Not Available
**What goes wrong:** Tool crashes when git isn't installed or not in a git repo
**Why it happens:** simple-git throws when git unavailable
**How to avoid:** Check git availability and repo status upfront; provide clear error message
**Warning signs:** "git not found" or "not a git repository" errors

## Code Examples

Verified patterns from official sources:

### Getting Current Commit Hash
```typescript
// Source: simple-git README - revparse
import { simpleGit } from 'simple-git';

async function getCurrentCommitHash(projectRoot: string): Promise<string> {
  const git = simpleGit(projectRoot);
  return git.revparse(['HEAD']);
}
```

### Checking if Path is Git Repository
```typescript
// Source: simple-git README - checkIsRepo
import { simpleGit } from 'simple-git';

async function isGitRepo(projectRoot: string): Promise<boolean> {
  const git = simpleGit(projectRoot);
  return git.checkIsRepo();
}
```

### SQLite Prepared Statements
```typescript
// Source: better-sqlite3 API docs
import Database from 'better-sqlite3';

interface FileRecord {
  path: string;
  content_hash: string;
  sum_generated_at: string | null;
}

class StateDatabase {
  private db: Database.Database;
  private getFileStmt: Database.Statement<[string], FileRecord | undefined>;
  private upsertFileStmt: Database.Statement<[string, string, string | null]>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Prepared statements for performance
    this.getFileStmt = this.db.prepare(
      'SELECT path, content_hash, sum_generated_at FROM files WHERE path = ?'
    );
    this.upsertFileStmt = this.db.prepare(`
      INSERT INTO files (path, content_hash, sum_generated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        content_hash = excluded.content_hash,
        sum_generated_at = excluded.sum_generated_at
    `);
  }

  getFile(path: string): FileRecord | undefined {
    return this.getFileStmt.get(path);
  }

  upsertFile(path: string, hash: string, generatedAt: string | null): void {
    this.upsertFileStmt.run(path, hash, generatedAt);
  }

  close(): void {
    this.db.close();
  }
}
```

### Transaction Wrapper for Update
```typescript
// Source: better-sqlite3 API docs - transaction
import Database from 'better-sqlite3';

function performUpdate(
  db: Database.Database,
  changes: FileChange[],
  analyzeFn: (path: string) => Promise<void>
): void {
  const update = db.transaction(async () => {
    for (const change of changes) {
      if (change.status === 'deleted') {
        // Handle deletion
        db.prepare('DELETE FROM files WHERE path = ?').run(change.path);
      } else {
        // Analyze and update
        await analyzeFn(change.path);
      }
    }

    // Update run record
    db.prepare(`
      INSERT INTO runs (commit_hash, completed_at, files_analyzed, files_skipped)
      VALUES (?, ?, ?, ?)
    `).run(currentCommit, new Date().toISOString(), analyzed, skipped);
  });

  update(); // Automatically commits on success, rolls back on error
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-sqlite3 (async) | better-sqlite3 (sync) | 2019 | 11.7x faster for single-row operations |
| MD5 content hash | SHA-256 | 2020s | Hardware acceleration makes SHA-256 faster on modern CPUs |
| Experimental Node SQLite | better-sqlite3 | 2024 | Built-in SQLite requires Node 22.5+ and --experimental-sqlite flag |

**Deprecated/outdated:**
- Node.js built-in SQLite: Still experimental, not production-ready (requires `--experimental-sqlite` flag)
- sql.js: Primarily for browser environments, slower than better-sqlite3 for Node.js

## Open Questions

Things that couldn't be fully resolved:

1. **Parallel file analysis with SQLite**
   - What we know: SQLite with WAL supports concurrent reads, one writer
   - What's unclear: Best approach for parallel LLM calls while updating state
   - Recommendation: Use single SQLite connection, batch state updates after all analysis completes

2. **Large repo performance**
   - What we know: SQLite handles millions of rows well with proper indexing
   - What's unclear: At what scale does diffSummary become slow?
   - Recommendation: Start simple, add pagination/chunking if performance issues arise

## Sources

### Primary (HIGH confidence)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - Installation, API, WAL mode, transactions
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) - Prepared statements, transactions
- [simple-git README](https://github.com/steveukx/git-js) - diff, diffSummary, status, revparse methods
- [simple-git TypeScript types](node_modules/simple-git/dist/typings/) - DiffResult, StatusResult, DiffNameStatus enum
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) - createHash for SHA-256
- [Git diff documentation](https://git-scm.com/docs/git-diff) - -M flag for rename detection
- [Git diffcore documentation](https://git-scm.com/docs/gitdiffcore) - Rename detection algorithm

### Secondary (MEDIUM confidence)
- [LogRocket SQLite article](https://blog.logrocket.com/using-built-in-sqlite-module-node-js/) - Node.js built-in SQLite status (experimental)
- [SQLite Forum](https://www.sqliteforum.com/) - Schema migration patterns with user_version
- [better-sqlite3-migrations](https://github.com/BlackGlory/better-sqlite3-migrations) - Migration utility pattern

### Tertiary (LOW confidence)
- WebSearch for xxHash vs SHA-256 performance - Verified with official benchmarks showing SHA-256 is fast with hardware acceleration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - better-sqlite3 and simple-git are established, well-documented libraries already in use or easily integrated
- Architecture: HIGH - Patterns derived from official documentation and project's existing structure
- Pitfalls: HIGH - Based on documented SQLite/git behaviors and common integration issues

**Research date:** 2026-01-26
**Valid until:** 60 days (stable domain, libraries mature)
