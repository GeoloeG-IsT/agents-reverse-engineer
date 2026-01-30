# Requirements: Agents Reverse

**Defined:** 2025-01-25
**Core Value:** Documentation that stays fresh automatically via git-diff-based updates

## v1 Requirements

### File Discovery

- [x] **DISC-01**: Respect .gitignore patterns when traversing directories
- [x] **DISC-02**: Automatically detect and exclude binary files
- [x] **DISC-03**: Exclude common vendor directories (node_modules, vendor, .git, etc.)
- [x] **DISC-04**: Support custom exclusion patterns via configuration

### Documentation Generation

- [x] **GEN-01**: Generate `.sum` summary file for each analyzed source file
- [x] **GEN-02**: Generate `AGENTS.md` file in each directory describing contents and sub-structure
- [x] **GEN-03**: Generate `CLAUDE.md` at project root as pointer to AGENTS.md
- [x] **GEN-04**: Enforce token budgets to prevent cost explosion on large repos
- [x] **GEN-05**: Generate content-driven supplementary docs (ARCHITECTURE.md, STACK.md) when relevant

### Incremental Updates

- [x] **UPD-01**: Store git hash after each generation run for change detection
- [x] **UPD-02**: Re-analyze only files that changed since last stored hash
- [x] **UPD-03**: Propagate updates up the directory tree to parent AGENTS.md files
- [x] **UPD-04**: Handle renamed and moved files gracefully via git rename detection

### Integration

- [x] **INT-01**: Provide `/are:generate` command for full project analysis in Claude Code
- [x] **INT-02**: Provide `/are:update` command for incremental updates in Claude Code
- [x] **INT-03**: Integrate with Claude Code end-of-session hook for automatic updates
- [x] **INT-04**: Support multi-tool integration (OpenCode and other AI coding assistants)

## v2 Requirements

### Enhanced Analysis

- **ENH-01**: AST-based code structure extraction for deeper understanding
- **ENH-02**: Cross-reference detection between files
- **ENH-03**: Dependency graph visualization

### Advanced Filtering

- **FILT-01**: Intelligent detection of generated/auto-generated files
- **FILT-02**: Size-based filtering with configurable limits
- **FILT-03**: Language-specific ignore patterns

### Quality Improvements

- **QUAL-01**: Level-specific summarization strategies to prevent quality degradation
- **QUAL-02**: Preserved anchor terms for searchability
- **QUAL-03**: Summary quality metrics and validation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time file watching | Complexity vs value; git-diff-based is sufficient |
| External LLM API calls | Host tool handles LLM; no separate API keys |
| GUI/web interface | CLI/command-based tool for v1 |
| Standalone CLI | Designed as skill/plugin for host tools |
| Full codebase flattening | Anti-pattern per research; hierarchical is better |
| Auto-commit generated docs | User should control git commits |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISC-01 | Phase 1 | Complete |
| DISC-02 | Phase 1 | Complete |
| DISC-03 | Phase 1 | Complete |
| DISC-04 | Phase 1 | Complete |
| GEN-01 | Phase 2 | Complete |
| GEN-02 | Phase 2 | Complete |
| GEN-03 | Phase 2 | Complete |
| GEN-04 | Phase 2 | Complete |
| GEN-05 | Phase 2 | Complete |
| UPD-01 | Phase 3 | Complete |
| UPD-02 | Phase 3 | Complete |
| UPD-03 | Phase 3 | Complete |
| UPD-04 | Phase 3 | Complete |
| INT-01 | Phase 4 | Complete |
| INT-02 | Phase 4 | Complete |
| INT-03 | Phase 4 | Complete |
| INT-04 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2025-01-25*
*Last updated: 2026-01-26 - PROJECT COMPLETE (all 17 v1 requirements delivered)*
