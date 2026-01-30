---
description: Incrementally update documentation for changed files
agent: build
---

Update documentation for files that changed since last run.

Run: `npx are update $ARGUMENTS`

Arguments supported:
- `--uncommitted` - Include staged but uncommitted changes
- `--dry-run` - Show plan without writing files
- `--verbose` - Show detailed output

After completion, summarize:
- Files updated
- Files unchanged
- Any orphaned docs cleaned up
