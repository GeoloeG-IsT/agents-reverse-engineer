# Phase 4: Integration & Commands - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Slash commands (/are:generate, /are:update) and end-of-session hooks for AI coding assistants. Multi-tool support for any compatible assistant (Claude Code, OpenCode, etc.).

</domain>

<decisions>
## Implementation Decisions

### Command design
- Command names: `/are:generate` and `/are:update` as specified in roadmap
- Show preview before analyzing large codebases (file count, estimated time, then ask to proceed)
- Full CLI parity — support all CLI flags: --budget, --verbose, --dry-run, etc.
- Markdown-optimized output format for AI assistant context (headers, bullets, code blocks)

### Hook behavior
- Trigger on session close AND manual trigger available (both methods)
- Show full error details if hook encounters errors during update
- Pre-check git status, skip hook entirely if no changes since last update
- Config toggle in `.agents-reverse.yaml` for permanent disable, `ARE_DISABLE_HOOK=1` env var for temporary disable

### Multi-tool support
- Generic detection for any compatible AI assistant with slash commands
- Detect environment via config file presence (`.claude/`, `.opencode/`, etc.)
- `/are:init` generates integration files for detected environment
- Generate integration files for ALL detected assistants (not just primary)

### User feedback
- Per-file progress updates during generation/update: "Analyzing src/index.ts..."
- Detailed completion summary: stats + list of generated files + any warnings
- `--verbose` flag controls error detail level (user-friendly by default, full debug with flag)
- Gentle reminder when docs get stale after X uncommitted changes

### Claude's Discretion
- Exact threshold for "large codebase" preview trigger
- Threshold for "stale docs" reminder (number of changes)
- Integration file format and structure for each AI assistant
- Progress update frequency (every file vs batched)

</decisions>

<specifics>
## Specific Ideas

- Preview should show file count and estimated time, then ask "Proceed? [Y/n]"
- Markdown output should render nicely in chat context (not terminal-style tables)
- Hook should be completely invisible when nothing changed (no output at all)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-integration-commands*
*Context gathered: 2026-01-26*
