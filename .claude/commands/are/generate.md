---
name: are:generate
description: Generate AI-friendly documentation for the entire codebase
argument-hint: "[--budget N] [--dry-run] [--verbose]"
---

Generate comprehensive documentation for this codebase using agents-reverse-engineer.

<execution>
Run the agents-reverse-engineer generate command:

```bash
npx are generate $ARGUMENTS
```

After completion, summarize:
- Number of files analyzed
- Token budget used
- Any files skipped due to budget
- Location of generated CLAUDE.md and AGENTS.md files

If budget concerns arise, suggest `--budget N` to adjust.
</execution>
