---
phase: 03-incremental-updates
plan: 05
subsystem: cli
tags: [update-command, cli, incremental, generation-integration]

depends:
  requires: [03-04]
  provides: [update-cli-command, cli-update-integration]
  affects: []

tech-stack:
  added: []
  patterns: [command-pattern, progress-display, generation-integration]

files:
  key-files:
    created:
      - src/cli/update.ts
    modified:
      - src/cli/index.ts

decisions:
  - id: verbose-console-direct
    choice: Use console.log for verbose output
    rationale: Logger interface lacks verbose method, direct console is simpler

metrics:
  duration: 4 min
  completed: 2026-01-26
---

# Phase 03 Plan 05: CLI Update Command Summary

**One-liner:** Update CLI command with status markers, cleanup display, and token budget usage via generation workflow integration.

## What Was Built

### Update CLI Command (src/cli/update.ts)
Created the `ar update` command that provides incremental documentation updates:

1. **Generation Workflow Integration**
   - Imports `detectFileType` from generation/detection for file type detection
   - Uses `buildPrompt` from generation/prompts for prompt construction
   - Calls `writeSumFile` from generation/writers to create .sum files
   - Calls `writeAgentsMd` from generation/writers to regenerate AGENTS.md

2. **Progress Display**
   - Status markers: `+` (added/green), `M` (modified/yellow), `R` (renamed/blue), `=` (skipped/dim)
   - Per-file checkmarks for success, X for failures
   - Shows token count per analyzed file in verbose mode

3. **Cleanup Reporting**
   - Lists deleted .sum files for removed source files
   - Lists deleted AGENTS.md from empty directories
   - Yellow highlighting for cleanup section

4. **Budget Tracking**
   - Counts tokens for each analyzed file
   - Displays total token usage vs budget in final summary

5. **Edge Case Handling**
   - First run detection with hint to use `ar generate`
   - "No changes detected" message with last run info
   - Dry run support shows plan without writing files

### CLI Router Integration (src/cli/index.ts)
- Added import for `updateCommand` and `UpdateCommandOptions`
- Added `update [path]` to commands in USAGE
- Updated options to show `--dry-run` and `--budget` apply to update
- Added `--uncommitted` flag documentation (update only)
- Added update case to command switch
- Added examples: `ar update`, `ar update --uncommitted --verbose`

## Key Implementation Details

```typescript
// Generation module integration in analyzeFile:
const fileType = detectFileType(filePath, content);
const prompt = buildPrompt({ filePath: change.path, content, fileType });
await writeSumFile(filePath, sumContent);

// AGENTS.md regeneration:
await writeAgentsMd(dirPath, projectRoot);
```

The update command follows the same pattern as generate but operates incrementally on changed files only, using content hash verification from the update orchestrator to skip unchanged files.

## Commits

| Hash | Description |
|------|-------------|
| 1fe1184 | feat(03-05): create update CLI command with generation workflow |
| 8031819 | feat(03-05): integrate update command into CLI router |

## Deviations from Plan

### Implementation Adjustment

**1. Verbose output via console.log instead of logger**
- **Issue:** Logger interface lacks `verbose` method
- **Resolution:** Used direct console.log with verbose flag check
- **Impact:** None - achieves same behavior

## Verification Results

- [x] `npm run build` completes without TypeScript errors
- [x] `node dist/cli/index.js --help` shows update command
- [x] `node dist/cli/index.js update --dry-run` runs without error
- [x] Update command shows appropriate message for first run
- [x] `grep` confirms writeSumFile and writeAgentsMd integration

## Next Phase Readiness

Phase 3 (Incremental Updates) is now complete:
- 03-01: State database layer (complete)
- 03-02: Change detection (complete)
- 03-03: Orphan cleanup (complete)
- 03-04: Update orchestrator (complete)
- 03-05: CLI update command (complete)

Ready for Phase 4 (Polish & Documentation).
