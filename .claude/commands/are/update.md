---
name: are:update
description: Incrementally update documentation for changed files
argument-hint: "[--uncommitted] [--dry-run] [--verbose]"
---

Update documentation for files that changed since last run.

<execution>
Run the agents-reverse-engineer update command:

```bash
npx are update $ARGUMENTS
```

After completion, summarize:
- Files updated
- Files unchanged
- Any orphaned docs cleaned up

Use `--uncommitted` to include staged but uncommitted changes.
</execution>
