<div align="center">

# AGENTS REVERSE ENGINEER (ARE)

**Reverse engineer your codebase into AI-friendly documentation.**

**Generate `.sum` files and `AGENTS.md` for Claude Code, OpenCode, and any AI assistant that supports `AGENTS.md`.**

[![npm version](https://img.shields.io/npm/v/agents-reverse-engineer?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/agents-reverse-engineer)
[![npm downloads](https://img.shields.io/npm/dw/agents-reverse-engineer?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/agents-reverse-engineer)
[![GitHub stars](https://img.shields.io/github/stars/GeoloeG-IsT/agents-reverse-engineer?style=for-the-badge&logo=github&color=181717)](https://github.com/GeoloeG-IsT/agents-reverse-engineer)
[![Last commit](https://img.shields.io/github/last-commit/GeoloeG-IsT/agents-reverse-engineer?style=for-the-badge&logo=github&color=181717)](https://github.com/GeoloeG-IsT/agents-reverse-engineer/commits)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

<br>

```bash
npx agents-reverse-engineer@latest
```

<img src="assets/demo-install.gif" alt="ARE interactive installer demo" width="700">

<br>

_"Finally, my AI assistant actually understands my codebase structure."_

<br>

[Why This Exists](#why-this-exists) · [How It Works](#how-it-works) · [Commands](#commands) · [Generated Docs](#generated-documentation)

<br>

### Works with

[<img src="https://img.shields.io/badge/Claude_Code-F97316?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude Code">](https://claude.ai/claude-code)
[<img src="https://img.shields.io/badge/Codex-FFFFFF?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJibGFjayIgZD0iTTIyLjI4MiA5LjgyMWE2IDYgMCAwIDAtLjUxNi00LjkxYTYuMDUgNi4wNSAwIDAgMC02LjUxLTIuOUE2LjA2NSA2LjA2NSAwIDAgMCA0Ljk4MSA0LjE4YTYgNiAwIDAgMC0zLjk5OCAyLjlhNi4wNSA2LjA1IDAgMCAwIC43NDMgNy4wOTdhNS45OCA1Ljk4IDAgMCAwIC41MSA0LjkxMWE2LjA1IDYuMDUgMCAwIDAgNi41MTUgMi45QTYgNiAwIDAgMCAxMy4yNiAyNGE2LjA2IDYuMDYgMCAwIDAgNS43NzItNC4yMDZhNiA2IDAgMCAwIDMuOTk3LTIuOWE2LjA2IDYuMDYgMCAwIDAtLjc0Ny03LjA3M00xMy4yNiAyMi40M2E0LjQ4IDQuNDggMCAwIDEtMi44NzYtMS4wNGwuMTQxLS4wODFsNC43NzktMi43NThhLjguOCAwIDAgMCAuMzkyLS42ODF2LTYuNzM3bDIuMDIgMS4xNjhhLjA3LjA3IDAgMCAxIC4wMzguMDUydjUuNTgzYTQuNTA0IDQuNTA0IDAgMCAxLTQuNDk0IDQuNDk0TTMuNiAxOC4zMDRhNC40NyA0LjQ3IDAgMCAxLS41MzUtMy4wMTRsLjE0Mi4wODVsNC43ODMgMi43NTlhLjc3Ljc3IDAgMCAwIC43OCAwbDUuODQzLTMuMzY5djIuMzMyYS4wOC4wOCAwIDAgMS0uMDMzLjA2Mkw5Ljc0IDE5Ljk1YTQuNSA0LjUgMCAwIDEtNi4xNC0xLjY0Nk0yLjM0IDcuODk2YTQuNSA0LjUgMCAwIDEgMi4zNjYtMS45NzNWMTEuNmEuNzcuNzcgMCAwIDAgLjM4OC42NzdsNS44MTUgMy4zNTRsLTIuMDIgMS4xNjhhLjA4LjA4IDAgMCAxLS4wNzEgMGwtNC44My0yLjc4NkE0LjUwNCA0LjUwNCAwIDAgMSAyLjM0IDcuODcyem0xNi41OTcgMy44NTVsLTUuODMzLTMuMzg3TDE1LjExOSA3LjJhLjA4LjA4IDAgMCAxIC4wNzEgMGw0LjgzIDIuNzkxYTQuNDk0IDQuNDk0IDAgMCAxLS42NzYgOC4xMDV2LTUuNjc4YS43OS43OSAwIDAgMC0uNDA3LS42NjdtMi4wMS0zLjAyM2wtLjE0MS0uMDg1bC00Ljc3NC0yLjc4MmEuNzguNzggMCAwIDAtLjc4NSAwTDkuNDA5IDkuMjNWNi44OTdhLjA3LjA3IDAgMCAxIC4wMjgtLjA2MWw0LjgzLTIuNzg3YTQuNSA0LjUgMCAwIDEgNi42OCA0LjY2em0tMTIuNjQgNC4xMzVsLTIuMDItMS4xNjRhLjA4LjA4IDAgMCAxLS4wMzgtLjA1N1Y2LjA3NWE0LjUgNC41IDAgMCAxIDcuMzc1LTMuNDUzbC0uMTQyLjA4TDguNzA0IDUuNDZhLjguOCAwIDAgMC0uMzkzLjY4MXptMS4wOTctMi4zNjVsMi42MDItMS41bDIuNjA3IDEuNXYyLjk5OWwtMi41OTcgMS41bC0yLjYwNy0xLjVaIi8+PC9zdmc+&logoColor=black" alt="Codex">](https://github.com/openai/codex)
[<img src="https://img.shields.io/badge/Gemini_CLI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini CLI">](https://github.com/google-gemini/gemini-cli)
[<img src="https://img.shields.io/badge/OpenCode-000000?style=for-the-badge&logo=github&logoColor=white" alt="OpenCode">](https://github.com/anomalyco/opencode)
[<img src="https://img.shields.io/badge/Any_AGENTS.md_tool-6B7280?style=for-the-badge" alt="Any AGENTS.md tool">](#)

</div>

---

## Why This Exists

AI coding assistants are powerful, but they don't know your codebase. Every session starts fresh. You explain the same architecture, the same patterns, the same file locations — over and over.

Some assistants offer built-in initialization (e.g. Claude Code's `/init`), but these features are shallow — they produce a thin top-level summary that falls short on large brownfield projects with deep module hierarchies. Worse, there is no associated update mechanism: as the codebase evolves, the generated context silently drifts out of date.

**agents-reverse-engineer** fixes that. It generates rich, multi-level documentation that AI assistants actually read — and keeps it in sync:

- **`.sum` files** — Per-file summaries with purpose, exports, dependencies
- **`AGENTS.md`** — Per-directory overviews with file organization (standard format)
- **`CLAUDE.md`** / **`GEMINI.md`** / **`OPENCODE.md`** — Runtime-specific project entry points
- **Incremental updates** — Git-aware change detection regenerates only what changed

The result: Your AI assistant understands your codebase from the first message — and stays accurate as it grows.

---

## Who This Is For

Developers using AI coding assistants (Claude Code, Codex, OpenCode, Gemini CLI, or any tool supporting `AGENTS.md`) who want their assistant to actually understand their project structure — without manually writing documentation or repeating context every session.

---

## Getting Started

### 1. Install Commands

```bash
npx agents-reverse-engineer@latest
```

The interactive installer prompts you to:

1. **Select runtime** — Claude Code, Codex, OpenCode, Gemini CLI, or all
2. **Select location** — Global (`~/.claude/`, `~/.agents/`, etc.) or local (`./.claude/`, `./.agents/`, etc.)

This installs:

- **Commands** — `/are-init`, `/are-discover`, `/are-generate`, `/are-update`, `/are-specify`, `/are-plan`, `/are-implement`, `/are-clean`, `/are-dashboard`
- **Codex context rules** — local install writes `./AGENTS.override.md`; global install writes `~/.codex/AGENTS.override.md` with lazy AGENTS hierarchy loading guidance

### 2. Initialize Configuration

After installation, create the configuration file in your AI assistant:

```bash
/are-init
```

This creates `.agents-reverse-engineer/config.yaml` with default settings.

### 3. Generate Documentation

In your AI assistant:

```
/are-discover
/are-generate
```

The assistant creates the plan and generates all documentation.

### Non-Interactive Installation

```bash
# Install for Claude Code globally
npx agents-reverse-engineer@latest --runtime claude -g

# Install for Codex globally
npx agents-reverse-engineer@latest --runtime codex -g

# Install for all runtimes locally
npx agents-reverse-engineer@latest --runtime all -l
```

### Uninstall

```bash
npx agents-reverse-engineer@latest uninstall
```

Removes:

- Command files (`/are-*` commands)
- ARE permissions from settings.json
- `.agents-reverse-engineer` folder (local installs only)

Use `--runtime` and `-g`/`-l` flags for specific targets.

### Checking Version

```bash
npx agents-reverse-engineer@latest --version
```

---

## How It Works

### 1. Install Commands

```bash
npx agents-reverse-engineer@latest
```

Interactive installer installs commands and hooks for your chosen runtime(s).

**Runtimes:** Claude Code, Codex, OpenCode, Gemini CLI (or all at once)

---

### 2. Initialize Configuration

```
/are-init
```

Creates `.agents-reverse-engineer/config.yaml` with exclusion patterns and options.

---

### 3. Discover & Plan

```
/are-discover
```

Scans your codebase (respecting `.gitignore`), detects file types, and creates `GENERATION-PLAN.md` with all files to analyze.

Uses **post-order traversal** — deepest directories first, so child documentation exists before parent directories are documented.

---

### 4. Generate (in your AI assistant)

```
/are-generate
```

Your AI assistant executes the plan:

1. **File Analysis** — Creates `.sum` file for each source file
2. **Directory Docs** — Creates `AGENTS.md` and `CLAUDE.md` pointer for each directory

---

### 5. Update Incrementally

```
/are-update
```

Only regenerates documentation for files that changed since last run.

---

### 6. Generate Specification (Experimental)

```
/are-specify
```

Synthesizes all AGENTS.md documentation into a single project specification document (`specs/SPEC.md`). Use `--multi-file` to split into separate files, or `--dry-run` to preview without calling the AI.

---

### 7. Plan Comparison (A/B Test) (Experimental)

```
are plan "Add user authentication with JWT"
```

Runs AI planning **twice** on the same task — once with ARE documentation and once without — then compares output quality (detail, file references, actionable steps). Use `--eval` for blind AI quality scoring.

---

### 8. Implement Comparison (A/B Test) (Experimental)

```
are implement "Add user authentication with JWT"
```

Requires a prior `are plan` run. Executes the AI plans in isolated git worktrees, extracts implementation metrics (files created, lines changed, commits), and optionally runs test/build/lint. Use `--eval` for blind AI quality evaluation.

```bash
are implement "Add auth" --run-tests --run-build --eval
are implement --list                    # List saved comparisons
are implement --show 2026-02-16         # View a comparison
```

---

## Commands

| Command                         | Description                                      |
| ------------------------------- | ------------------------------------------------ |
| `are`                           | Interactive installer (default)                  |
| `are install`                   | Install with prompts                             |
| `are install --runtime <rt> -g` | Install to runtime globally                      |
| `are install --runtime <rt> -l` | Install to runtime locally                       |
| `are uninstall`                 | Uninstall (remove files/hooks)                   |
| `are init`                      | Create configuration file                        |
| `are discover`                  | Scan files and create GENERATION-PLAN.md         |
| `are generate`                  | Generate all documentation                       |
| `are update`                    | Update changed files only                        |
| `are specify`                   | Generate project specification (experimental)                   |
| `are rebuild`                   | Reconstruct project from specs (experimental)                   |
| `are plan "<task>"`             | Compare AI planning with vs without docs (experimental)         |
| `are implement "<task>"`        | Compare AI implementation with vs without docs (experimental)   |
| `are clean`                     | Remove all generated docs                        |
| `are dashboard`                 | Show telemetry dashboard (costs, tokens, traces) (experimental) |

**Runtimes:** `claude`, `codex`, `opencode`, `gemini`, `all`

### General CLI Options

| Flag                 | Description                                                   | Applies to                                                    |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| `--model <name>`     | AI model to use (e.g., sonnet, opus, haiku)                   | generate, update, specify, rebuild                            |
| `--backend <name>`   | AI backend (claude, codex, gemini, opencode, auto)            | generate, update, specify, rebuild                            |
| `--concurrency <n>`  | Number of concurrent AI calls (default: auto)                 | generate, update, rebuild                                     |
| `--dry-run`          | Show plan without writing files                               | generate, update, specify, rebuild, clean                     |
| `--force`            | Overwrite existing files                                      | init, install, generate, specify, rebuild                     |
| `--fail-fast`        | Stop on first file analysis failure                           | generate, update, rebuild                                     |
| `--show-excluded`    | Show excluded files during discovery                          | discover                                                      |
| `--uncommitted`      | Include uncommitted changes                                   | update                                                        |
| `--eval`             | Run AI quality evaluator on both results                      | plan, implement                                               |
| `--eval-model <m>`   | Model for AI evaluator (defaults to --model)                  | plan, implement                                               |
| `--task-slug <slug>` | Override auto-generated task slug                             | plan, implement                                               |
| `--plan-id <id>`     | Reference existing plan by ID                                 | implement                                                     |
| `--list`             | List saved comparisons                                        | plan, implement                                               |
| `--show <id>`        | Show a previous comparison by ID                              | plan, implement                                               |
| `--run-tests`        | Run test suite and extract metrics                            | implement                                                     |
| `--run-build`        | Run build and check success                                   | implement                                                     |
| `--run-lint`         | Run linter and extract metrics                                | implement                                                     |
| `--debug`            | Show AI prompts and backend details                           | discover, generate, update, specify, rebuild, plan, implement |
| `--trace`            | Enable concurrency tracing (.agents-reverse-engineer/traces/) | generate, update, specify, rebuild                            |
| `--run <id>`         | Show per-entry detail for a specific run                      | dashboard                                                     |
| `--trends`           | Show cost & usage trends across runs                          | dashboard                                                     |
| `--format <fmt>`     | Output format: table (default), json, html                    | dashboard                                                     |

### AI Assistant Commands

| Command          | Description                                 | Supported Runtimes              |
| ---------------- | ------------------------------------------- | ------------------------------- |
| `/are-init`      | Initialize config and commands              | Claude, Codex, OpenCode, Gemini |
| `/are-discover`  | Rediscover and regenerate plan              | Claude, Codex, OpenCode, Gemini |
| `/are-generate`  | Generate all documentation                  | Claude, Codex, OpenCode, Gemini |
| `/are-update`    | Update changed files only                   | Claude, Codex, OpenCode, Gemini |
| `/are-specify`   | Generate project specification (experimental)              | Claude, Codex, OpenCode, Gemini |
| `/are-rebuild`   | Reconstruct project from specs (experimental)              | Claude, Codex, OpenCode, Gemini |
| `/are-plan`      | Compare planning with vs without docs (experimental)       | Claude, Codex, OpenCode, Gemini |
| `/are-implement` | Compare implementation with vs without docs (experimental) | Claude, Codex, OpenCode, Gemini |
| `/are-clean`     | Remove all generated docs                                  | Claude, Codex, OpenCode, Gemini |
| `/are-dashboard` | Show telemetry dashboard (experimental)                    | Claude, Codex, OpenCode, Gemini |

---

## Telemetry Dashboard (Experimental)

ARE logs telemetry for every run (costs, tokens, latency, traces). Use the dashboard to analyze costs and performance.

```bash
are dashboard                           # Summary table of all runs
are dashboard --run 2026-02-14          # Per-entry drill-down for a run
are dashboard --trace 2026-02-14        # ASCII Gantt timeline of execution
are dashboard --trends                  # Cost trends over time
are dashboard --format html > report.html  # Self-contained HTML report with charts
```

In your AI assistant: `/are-dashboard`, `/are-dashboard --trends`, etc.

**Tip:** For total session costs (not just ARE), use [ccusage](https://github.com/ryoppippi/ccusage):

- Claude Code: `npx ccusage@latest`
- Codex: `npx @ccusage/codex@latest`
- OpenCode: `npx @ccusage/opencode@latest`

---

## Generated Documentation

### `.sum` Files (Per File)

```yaml
---
file_type: service
generated_at: 2026-01-30T12:00:00Z
---

## Purpose
Handles user authentication via JWT tokens.

## Public Interface
- `authenticate(token: string): User`
- `generateToken(user: User): string`

## Dependencies
- jsonwebtoken: Token signing/verification
- ./user-repository: User data access

## Implementation Notes
Tokens expire after 24 hours. Refresh handled by client.
```

### `AGENTS.md` (Per Directory)

Directory overview with:

- Description of the directory's role
- Files grouped by purpose (Types, Services, Utils, etc.)
- Subdirectories with brief descriptions

### Pointer Files

- **`CLAUDE.md`** — Imports `AGENTS.md` for Claude Code (auto-loaded per directory)

### Root Overview

- **`AGENTS.md`** — Root directory overview (universal format)

---

## Configuration

Edit `.agents-reverse-engineer/config.yaml`:

```yaml
# File and directory exclusions
exclude:
  patterns: [] # Custom glob patterns (e.g., ["*.log", "temp/**"])
  vendorDirs: # Directories to skip
    - node_modules
    - dist
    - .git
  binaryExtensions: # File types to skip
    - .png
    - .jpg
    - .pdf

# Discovery options
options:
  followSymlinks: false # Follow symbolic links during traversal
  maxFileSize: 1048576 # Max file size in bytes (1MB default)

# Output formatting
output:
  colors: true # Use colors in terminal output

# AI service configuration
ai:
  backend: auto # Backend: 'claude', 'codex', 'gemini', 'opencode', 'auto'
  model: sonnet # Model identifier (backend-specific), e.g. sonnet, opus, fable
  # upgradeModel: opus # Model for specify/rebuild (default: upgrades sonnet → opus)
  timeoutMs: 300000 # Subprocess timeout in ms (5 minutes)
  maxRetries: 3 # Max retries for transient errors
  concurrency: 10 # Parallel AI calls (1-20, auto-detected from CPU/RAM)

  telemetry:
    keepRuns: 50 # Number of run logs to keep
```

### Key Config Options

**Model (`ai.model` / `ai.upgradeModel`)**

- `ai.model` — model used by all commands (backend-specific name, e.g. `sonnet`, `opus`, `fable`, or a full model ID like `claude-opus-5`)
- `ai.upgradeModel` — model used by `are specify` and `are rebuild`, which benefit from a stronger model
- When `ai.upgradeModel` is unset, the default `model: sonnet` is upgraded to `opus` for those commands; any other `ai.model` value is used as-is
- The `--model` CLI flag overrides both

**Concurrency (`ai.concurrency`)**

- Default: Auto-detected from CPU cores and available memory
- Range: `1-20`
- Lower values recommended for resource-constrained environments
- Higher values speed up generation but use more memory

**Timeout (`ai.timeoutMs`)**

- Default: `300000` (5 minutes)
- AI subprocess timeout for each file analysis
- Increase for very large files or slow connections

---

## Requirements

- **Node.js 18+**
- **AI Coding Assistant** — One of:
  - [Claude Code](https://claude.ai/claude-code) (full support)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli) (full support)
  - [OpenCode](https://github.com/opencode-ai/opencode) (AGENTS.md supported)
  - Any assistant supporting `AGENTS.md` format

---

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all input is valued.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## License

MIT
