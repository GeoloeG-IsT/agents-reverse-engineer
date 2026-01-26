---
description: Generate AI-friendly documentation for the entire codebase
agent: build
---

Generate comprehensive documentation for this codebase using agents-reverse.

Run: `npx agents-reverse generate $ARGUMENTS`

Arguments supported:
- `--budget N` - Override token budget
- `--dry-run` - Show plan without writing files
- `--verbose` - Show detailed output

After completion, summarize:
- Number of files analyzed
- Token budget used
- Location of generated AGENTS.md files
