<div align="center">

# AGENTS REVERSE ENGINEER (ARE)

**Reverse engineer your codebase into AI-friendly documentation.**

**Generate `.sum` files, `AGENTS.md`, and root docs for Claude Code, OpenCode, and any AI assistant that supports `AGENTS.md`.**

[![npm version](https://img.shields.io/npm/v/agents-reverse-engineer?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/agents-reverse-engineer)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

<br>

```bash
npx agents-reverse-engineer init --integration
```

**Works on Mac, Windows, and Linux.**

<br>

_"Finally, my AI assistant actually understands my codebase structure."_

_"No more explaining the same architecture in every conversation."_

<br>

[Why This Exists](#why-this-exists) · [How It Works](#how-it-works) · [Commands](#commands) · [Generated Docs](#generated-documentation)

</div>

---

## Why This Exists

AI coding assistants are powerful, but they don't know your codebase. Every session starts fresh. You explain the same architecture, the same patterns, the same file locations — over and over.

**agents-reverse-engineer** fixes that. It generates documentation that AI assistants actually read:

- **`.sum` files** — Per-file summaries with purpose, exports, dependencies
- **`AGENTS.md`** — Per-directory overviews with file organization (standard format)
- **`CLAUDE.md`** — Project entry point for Claude Code
- **`CODEX.md`** — Project entry point for OpenCode *(coming soon)*

The result: Your AI assistant understands your codebase from the first message.

---

## Who This Is For

Developers using AI coding assistants (Claude Code, OpenCode, Gemini CLI, or any tool supporting `AGENTS.md`) who want their assistant to actually understand their project structure — without manually writing documentation or repeating context every session.

---

## Getting Started

```bash
npx agents-reverse-engineer init --integration
```

This creates:

1. **Config** — `.agents-reverse-engineer/config.yaml`
2. **Commands** — `.claude/commands/are/` for Claude Code (other runtimes coming soon)

Then discover your files and create the plan:

```bash
npx are discover --plan
```

Finally, in your AI assistant:

```
/are:generate
```

The assistant reads the plan and generates all documentation.

> **Note:** The generated `AGENTS.md` files work with any AI assistant that supports this format. The `/are:*` commands currently target Claude Code, with OpenCode and Gemini CLI support planned.

### Staying Updated

```bash
npx agents-reverse-engineer@latest init --integration
```

---

## How It Works

### 1. Initialize

```bash
are init --integration
```

Creates configuration and Claude Code commands in your project.

---

### 2. Discover & Plan

```bash
are discover --plan
```

Scans your codebase (respecting `.gitignore`), detects file types, and creates `GENERATION-PLAN.md` with all files to analyze.

Uses **post-order traversal** — deepest directories first, so child documentation exists before parent directories are documented.

---

### 3. Generate (in your AI assistant)

```
/are:generate
```

Your AI assistant executes the plan:

1. **File Analysis** — Creates `.sum` file for each source file
2. **Directory Docs** — Creates `AGENTS.md` for each directory
3. **Root Docs** — Creates `CLAUDE.md`, `ARCHITECTURE.md`, `STACK.md`

---

### 4. Update Incrementally

```
/are:update
```

Only regenerates documentation for files that changed since last run.

---

## Commands

| Command                        | Description                      |
| ------------------------------ | -------------------------------- |
| `are init`                     | Create configuration file        |
| `are init --integration`       | Also create Claude Code commands |
| `are discover`                 | List files that will be analyzed |
| `are discover --plan`          | Create GENERATION-PLAN.md        |
| `are discover --show-excluded` | Show excluded files with reasons |

### AI Assistant Commands

| Command         | Description                    | Supported Runtimes |
| --------------- | ------------------------------ | ------------------ |
| `/are:init`     | Initialize config and commands | Claude Code        |
| `/are:generate` | Generate all documentation     | Claude Code        |
| `/are:update`   | Update changed files only      | Claude Code        |
| `/are:discover` | Rediscover and regenerate plan | Claude Code        |
| `/are:clean`    | Remove all generated docs      | Claude Code        |

> OpenCode and Gemini CLI command support coming soon.

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

### Root Documents

- **`CLAUDE.md`** — Project entry point for Claude Code (auto-loaded)
- **`AGENTS.md`** — Root directory overview (universal format)
- **`ARCHITECTURE.md`** — System design overview (generated for complex projects)
- **`STACK.md`** — Technology stack from package.json

---

## Configuration

Edit `.agents-reverse-engineer/config.yaml`:

```yaml
exclude:
  patterns: [] # Custom glob patterns
  vendorDirs: # Directories to skip
    - node_modules
    - dist
    - .git
  binaryExtensions: # File types to skip
    - .png
    - .jpg

options:
  followSymlinks: false
  maxFileSize: 1048576 # 1MB
```

---

## Requirements

- **Node.js 18+**
- **AI Coding Assistant** — One of:
  - [Claude Code](https://claude.ai/claude-code) (full support)
  - [OpenCode](https://github.com/opencode-ai/opencode) (AGENTS.md supported)
  - Any assistant supporting `AGENTS.md` format

---

## License

MIT
