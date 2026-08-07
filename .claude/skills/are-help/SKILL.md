---
name: are-help
description: Show available ARE commands and usage guide
disable-model-invocation: true
---

<objective>
Display the complete ARE command reference.

**First**: Read `.claude/ARE-VERSION` → store as `$VERSION`. Show the user: `agents-reverse-engineer v$VERSION`

**Then**: Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<reference>
# agents-reverse-engineer (ARE) Command Reference

**ARE** generates AI-friendly documentation for codebases, creating structured summaries optimized for AI assistants.

## Quick Start

1. `/are-generate` — Generate documentation for the codebase
2. `/are-update` — Keep docs in sync after code changes
3. `/are-dashboard` — View costs and telemetry

Configuration (`.agents-reverse-engineer/config.yaml`) is created automatically during installation.

## Commands Reference

### `/are-discover`
Discover files that would be analyzed for documentation.

Shows included files, excluded files with reasons, and generates a `GENERATION-PLAN.md` execution plan.

**Options:**
| Flag | Description |
|------|-------------|
| `[path]` | Target directory (default: current directory) |
| `--debug` | Show verbose debug output |
| `--trace` | Enable concurrency tracing to `.agents-reverse-engineer/traces/` |
**Usage:**
- `/are-discover` — Discover files and generate execution plan

**CLI:**
```bash
npx agents-reverse-engineer discover
npx agents-reverse-engineer discover ./src
```

---

### `/are-generate`
Generate comprehensive documentation for the codebase.

**Options:**
| Flag | Description |
|------|-------------|
| `[path]` | Target directory (default: current directory) |
| `--concurrency N` | Number of concurrent AI calls (default: auto) |
| `--dry-run` | Show what would be generated without writing |
| `--eval` | Namespace output by backend.model for comparison |
| `--fail-fast` | Stop on first file analysis failure |
| `--debug` | Show AI prompts and backend details |
| `--trace` | Enable concurrency tracing to `.agents-reverse-engineer/traces/` |
**Usage:**
- `/are-generate` — Generate docs
- `/are-generate --dry-run` — Preview without writing
- `/are-generate --eval` — Generate variant docs for comparison
- `/are-generate --concurrency 3` — Limit parallel AI calls

**CLI:**
```bash
npx agents-reverse-engineer generate
npx agents-reverse-engineer generate --dry-run
npx agents-reverse-engineer generate ./my-project --concurrency 3
npx agents-reverse-engineer generate --debug --trace
```

**How it works:**
1. Discovers files, applies filters, analyzes each file via concurrent AI calls, writes `.sum` summary files
2. Generates `AGENTS.md` for each directory (post-order traversal) and writes `CLAUDE.md` pointers

---

### `/are-update`
Incrementally update documentation for changed files.

**Options:**
| Flag | Description |
|------|-------------|
| `[path]` | Target directory (default: current directory) |
| `--uncommitted` | Include staged but uncommitted changes |
| `--dry-run` | Show what would be updated without writing |
| `--eval` | Namespace output by backend.model for comparison |
| `--concurrency N` | Number of concurrent AI calls (default: auto) |
| `--fail-fast` | Stop on first file analysis failure |
| `--debug` | Show AI prompts and backend details |
| `--trace` | Enable concurrency tracing to `.agents-reverse-engineer/traces/` |
**Usage:**
- `/are-update` — Update docs for committed changes
- `/are-update --uncommitted` — Include uncommitted changes

**CLI:**
```bash
npx agents-reverse-engineer update
npx agents-reverse-engineer update --uncommitted
npx agents-reverse-engineer update --dry-run
npx agents-reverse-engineer update ./my-project --concurrency 3
```

---

### `/are-specify` (Experimental)
Generate a project specification from AGENTS.md documentation.

Collects all AGENTS.md files, synthesizes them via AI, and writes a comprehensive project specification. Auto-runs `generate` if no AGENTS.md files exist.

**Options:**
| Flag | Description |
|------|-------------|
| `[path]` | Target directory (default: current directory) |
| `--output <path>` | Custom output path (default: specs/SPEC.md) |
| `--multi-file` | Split specification into multiple files |
| `--force` | Overwrite existing specification |
| `--dry-run` | Show input statistics without making AI calls |
| `--debug` | Show AI prompts and backend details |
| `--trace` | Enable concurrency tracing to `.agents-reverse-engineer/traces/` |
**Usage:**
- `/are-specify` — Generate specification
- `/are-specify --dry-run` — Preview without calling AI
- `/are-specify --output ./docs/spec.md --force` — Custom output path

**CLI:**
```bash
npx agents-reverse-engineer specify
npx agents-reverse-engineer specify --dry-run
npx agents-reverse-engineer specify --output ./docs/spec.md --force
npx agents-reverse-engineer specify --multi-file
```

---

### `/are-rebuild` (Experimental)
Reconstruct a project from specification documents.

Reads spec files from `specs/`, partitions them into ordered rebuild units, processes each via AI, and writes generated source files to an output directory. Supports checkpoint-based session continuity for resumable long-running rebuilds.

**Options:**
| Flag | Description |
|------|-------------|
| `[path]` | Target directory (default: current directory) |
| `--output <path>` | Output directory (default: rebuild/) |
| `--force` | Wipe output directory and start fresh |
| `--dry-run` | Show rebuild plan without making AI calls |
| `--concurrency N` | Number of concurrent AI calls (default: auto) |
| `--fail-fast` | Stop on first failure |
| `--debug` | Show AI prompts and backend details |
| `--trace` | Enable concurrency tracing to `.agents-reverse-engineer/traces/` |
**Usage:**
- `/are-rebuild --dry-run` — Preview rebuild plan
- `/are-rebuild --output ./out --force` — Rebuild to custom directory

**CLI:**
```bash
npx agents-reverse-engineer rebuild --dry-run
npx agents-reverse-engineer rebuild --output ./out --force
npx agents-reverse-engineer rebuild --concurrency 3
```

**How it works:**
1. Reads all spec files from `specs/` directory
2. Partitions specs into ordered rebuild units (from Build Plan phases or top-level headings)
3. Processes units in order: sequentially between groups, concurrently within each group
4. Accumulates context (export signatures) after each group for dependent phases
5. Writes generated source files via `===FILE:===` delimited output parsing

**Exit codes:** 0 (success), 1 (partial failure), 2 (total failure)

---

### `/are-clean`
Remove all generated documentation artifacts.

**Options:**
| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be deleted without deleting |

**What gets deleted:**
- `.agents-reverse-engineer/GENERATION-PLAN.md`
- All `*.sum` files (including eval variant `.sum` files)
- All `AGENTS.md` and `AGENTS.*.md` variant files
- Pointers: `CLAUDE.md`

**Usage:**
- `/are-clean --dry-run` — Preview deletions
- `/are-clean` — Delete all artifacts

**CLI:**
```bash
npx agents-reverse-engineer clean --dry-run
npx agents-reverse-engineer clean
```

---

### `/are-dashboard` (Experimental)
Show telemetry dashboard with cost analysis, token usage, and trace timelines.

**Options:**
| Flag | Description |
|------|-------------|
| `--run <id>` | Per-entry drill-down for a specific run (partial timestamp match) |
| `--trace <id>` | ASCII timeline from trace file (partial timestamp match) |
| `--trends` | Cost & usage trends across all runs |
| `--format html` | Self-contained HTML report with Chart.js charts |
| `--format json` | Raw data as JSON |

**Usage:**
- `/are-dashboard` — Show run summary table
- `/are-dashboard --run 2026-02-14` — Drill into a specific run
- `/are-dashboard --trace 2026-02-14` — Show execution timeline
- `/are-dashboard --trends` — Cost trends over time

**CLI:**
```bash
npx agents-reverse-engineer dashboard
npx agents-reverse-engineer dashboard --run 2026-02-14
npx agents-reverse-engineer dashboard --trace 2026-02-14
npx agents-reverse-engineer dashboard --trends
npx agents-reverse-engineer dashboard --format html > report.html
```

---

### `/are-help`
Show this command reference.

## CLI Installation

Install ARE commands to your AI assistant:

```bash
npx agents-reverse-engineer install              # Interactive mode
npx agents-reverse-engineer install --runtime claude -g  # Global Claude
npx agents-reverse-engineer install --runtime codex -g   # Global Codex
npx agents-reverse-engineer install --runtime claude -l  # Local project
npx agents-reverse-engineer install --runtime all -g     # All runtimes
```

**Install/Uninstall Options:**
| Flag | Description |
|------|-------------|
| `--runtime <name>` | Target: `claude`, `codex`, `opencode`, `gemini`, `all` |
| `-g, --global` | Install to global config directory |
| `-l, --local` | Install to current project directory |
| `--force` | Overwrite existing files (install only) |

## Configuration

**File:** `.agents-reverse-engineer/config.yaml`

```yaml
# Exclusion patterns
exclude:
  patterns:
    - "**/*.test.ts"
    - "**/__mocks__/**"
  vendorDirs:
    - node_modules
    - dist
    - .git
  binaryExtensions:
    - .png
    - .jpg
    - .pdf

# Options
options:
  followSymlinks: false
  maxFileSize: 100000

# Output settings
output:
  colors: true
```

## Generated Files

### Per Source File

**`*.sum`** — File summaries with YAML frontmatter + detailed prose.

```yaml
---
file_type: service
generated_at: 2025-01-15T10:30:00Z
content_hash: abc123...
purpose: Handles user authentication and session management
public_interface: [login(), logout(), refreshToken(), AuthService]
dependencies: [express, jsonwebtoken, ./user-model]
patterns: [singleton, factory, observer]
related_files: [./types.ts, ./middleware.ts]
---

<300-500 word summary covering implementation, patterns, edge cases>
```

### Per Directory

**`AGENTS.md`** — Directory overview synthesized from `.sum` files. Groups files by purpose and links to subdirectories.

### Pointer Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project entry point — imports root AGENTS.md |

## Common Workflows

**Initial documentation:**
```
/are-generate
```

**After code changes:**
```
/are-update
```

**Full regeneration:**
```
/are-clean
/are-generate
```

**Preview before generating:**
```
/are-discover                   # Check files and exclusions
/are-generate --dry-run         # Preview generation
```

## Tips

- **Custom exclusions**: Edit `.agents-reverse-engineer/config.yaml` to skip files
- **Context loading**: Install creates a hook that auto-loads AGENTS.md context when reading project files
- **Total session costs**: Use `npx ccusage@latest` (https://github.com/ryoppippi/ccusage) to see ALL Claude Code session costs, not just ARE subprocesses

## Resources

- **Repository:** https://github.com/GeoloeG-IsT/agents-reverse-engineer
- **Update:** `npx agents-reverse-engineer install --force`
</reference>
