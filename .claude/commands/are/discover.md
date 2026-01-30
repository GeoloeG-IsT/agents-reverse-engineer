---
name: are:discover
description: Discover files and create execution plan (GENERATION-PLAN.md)
argument-hint: "[path] [--show-excluded]"
---

Discover files to analyze and create the GENERATION-PLAN.md for documentation generation.

<execution>
## Run Discovery with Plan Generation

```bash
npx are discover --plan $ARGUMENTS
```

This will:
1. Discover all files matching configuration filters
2. Generate `.agents-reverse-engineer/GENERATION-PLAN.md` using **post-order traversal** (deepest directories first)

### Common Options

- `--show-excluded` - Show excluded files with reasons (gitignore, vendor, binary, custom pattern)
- `--quiet` - Only show the summary count
- `--plan` - Generate GENERATION-PLAN.md file (included by default in this command)

## Output

Report:
- Number of files discovered
- Path to GENERATION-PLAN.md
- Suggest running `/are:generate` to execute the plan
</execution>
