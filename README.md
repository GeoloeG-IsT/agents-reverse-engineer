# agents-reverse-engineer

Reverse engineer your codebase into AI-friendly documentation.

Generate `.sum` files, `AGENTS.md`, and root documentation (`CLAUDE.md`, `ARCHITECTURE.md`, `STACK.md`) that help AI coding assistants understand and work with your project.

## Installation

```bash
# Global install
npm install -g agents-reverse-engineer

# Or use npx (no install needed)
npx agents-reverse-engineer
```

## Quick Start

### 1. Initialize in your project

```bash
cd your-project
are init --integration
```

This creates:
- `.agents-reverse-engineer/config.yaml` - Configuration file
- `.claude/commands/are/` - Claude Code commands (with `--integration`)

### 2. Discover files and create plan

```bash
are discover --plan
```

This scans your codebase and creates `.agents-reverse-engineer/GENERATION-PLAN.md` with all files to analyze.

### 3. Generate documentation (in Claude Code)

```
/are:generate
```

Claude Code reads the plan and generates:
- `.sum` files for each source file
- `AGENTS.md` for each directory
- `CLAUDE.md`, `ARCHITECTURE.md`, `STACK.md` at project root

## Commands

| Command | Description |
|---------|-------------|
| `are init` | Create configuration file |
| `are init --integration` | Also create Claude Code commands |
| `are discover` | List files that will be analyzed |
| `are discover --plan` | Create GENERATION-PLAN.md |
| `are discover --show-excluded` | Show excluded files with reasons |

## Configuration

Edit `.agents-reverse-engineer/config.yaml`:

```yaml
exclude:
  patterns: []           # Custom glob patterns to exclude
  vendorDirs:            # Directories to skip
    - node_modules
    - dist
    - .git
  binaryExtensions:      # File types to skip
    - .png
    - .jpg

options:
  followSymlinks: false
  maxFileSize: 1048576   # 1MB

output:
  colors: true
  verbose: true
```

## Generated Documentation

### `.sum` files (per file)
YAML frontmatter + markdown summary of each source file:
- Purpose
- Public interface (exports)
- Dependencies
- Implementation notes

### `AGENTS.md` (per directory)
Directory overview with:
- Description
- Files grouped by purpose
- Subdirectories summary

### Root documents
- `CLAUDE.md` - Project entry point for Claude
- `ARCHITECTURE.md` - System design overview
- `STACK.md` - Technology stack from package.json

## Requirements

- Node.js 18+
- [Claude Code](https://claude.ai/claude-code) for documentation generation

## How It Works

1. **Discovery**: CLI scans your codebase, respecting `.gitignore` and config exclusions
2. **Planning**: Creates execution plan with post-order traversal (deepest directories first)
3. **Generation**: Claude Code executes the plan, creating documentation files
4. **Update**: Run `/are:update` to incrementally update changed files

## License

MIT
