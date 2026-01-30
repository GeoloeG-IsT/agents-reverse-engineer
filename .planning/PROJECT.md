# Agents Reverse

## What This Is

A lightweight, open-source tool that generates and maintains agent-friendly documentation for brownfield codebases. It recursively analyzes a project bottom-up — from file summaries to directory overviews — creating AGENTS.md files that help AI coding assistants understand the codebase. Works as commands within Claude Code, OpenCode, and similar tools.

## Core Value

Documentation that stays fresh automatically. When code changes, docs update — solving doc drift.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Recursive file analysis (bottom-up from leaves to root)
- [ ] Generate `.sum` file for each analyzed file
- [ ] Generate `AGENTS.md` per directory describing contents and sub-structure
- [ ] Generate `CLAUDE.md` as pointer to `AGENTS.md` for Anthropic compatibility
- [ ] Content-driven supplementary docs (ARCHITECTURE.md, STACK.md, etc. when relevant)
- [ ] `/are:generate` command for full project analysis
- [ ] `/are:update` command for incremental updates
- [ ] End-of-session hook integration for automatic updates
- [ ] Git diff-based change detection (track hash between runs)
- [ ] Language agnostic analysis (LLM figures out the language)
- [ ] Works on any repository size

### Out of Scope

- External LLM API calls — uses host tool (Claude Code, etc.) for analysis
- Language-specific parsers — relies on LLM understanding
- GUI or web interface — CLI/command only for v1
- Proprietary/commercial features — fully open source

## Context

**Problem**: AI coding assistants struggle with brownfield codebases because context docs either don't exist or go stale quickly. Manually maintaining docs is tedious and gets deprioritized.

**Solution approach**: Leverage the LLM-powered host tool to analyze code recursively, generating structured documentation at every level. Hook into session lifecycle to keep docs current automatically via git diff.

**Ecosystem compatibility**:
- AGENTS.md is the standard format used by multiple tools
- CLAUDE.md is Anthropic-specific (points to AGENTS.md)
- Designed to complement tools like SpecKit, BMAD, and GSD

**Repository structure**: Following patterns from GSD and BMAD for commands, hooks, and configuration.

## Constraints

- **Integration**: Must work within Claude Code's command/hook system (and equivalent in OpenCode, etc.)
- **No external deps**: Analysis happens via host tool, no separate API keys required
- **Visible artifacts**: .sum files and AGENTS.md are committed, not hidden

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One file per LLM call | Keeps context focused, works for any repo size | — Pending |
| Host tool does analysis | No external API needed, leverages existing agent | — Pending |
| Visible .sum files | Serve as context for agents AND human reference | — Pending |
| CLAUDE.md as pointer | Anthropic compatibility without duplication | — Pending |
| Git diff for updates | Natural integration, tracks what actually changed | — Pending |

---
*Last updated: 2025-01-25 after initialization*
