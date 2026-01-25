# Roadmap: Agents Reverse

## Overview

Agents Reverse delivers auto-updating codebase documentation for AI coding assistants. The journey progresses from file discovery (knowing what to analyze) through documentation generation (producing summaries and AGENTS.md files) to incremental updates (the core differentiator via git diff) to integration (making it usable in real workflows). Each phase builds on the previous, delivering a coherent capability that can be verified independently.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Discovery** - Identify which files to analyze, exclude noise
- [ ] **Phase 2: Documentation Generation** - Produce .sum files and AGENTS.md hierarchy
- [ ] **Phase 3: Incremental Updates** - Update only changed files via git diff detection
- [ ] **Phase 4: Integration & Commands** - Commands, hooks, and multi-tool support

## Phase Details

### Phase 1: Foundation & Discovery
**Goal**: Users can run the tool and it correctly identifies which files to analyze
**Depends on**: Nothing (first phase)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. Running the tool on a repo skips files matching .gitignore patterns
  2. Binary files (images, executables, archives) are automatically excluded
  3. Vendor directories (node_modules, vendor, .git, etc.) are excluded by default
  4. User can add custom exclusion patterns via configuration file
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md - Initialize TypeScript project and config schema
- [x] 01-02-PLAN.md - Create discovery types and directory walker
- [x] 01-03-PLAN.md - Implement file filters (gitignore, binary, vendor, custom)
- [x] 01-04-PLAN.md - Create config loader and terminal logger
- [x] 01-05-PLAN.md - Create CLI commands (init, discover)

### Phase 2: Documentation Generation
**Goal**: Users get complete documentation hierarchy from file summaries to root AGENTS.md
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05
**Success Criteria** (what must be TRUE):
  1. Every analyzed source file has a corresponding .sum file with useful summary
  2. Every directory containing analyzed files has an AGENTS.md describing contents
  3. Project root has CLAUDE.md that points to AGENTS.md for Anthropic compatibility
  4. Large repositories complete without cost explosion (token budgets enforced)
  5. Supplementary docs (ARCHITECTURE.md, STACK.md) generated when codebase warrants them
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Incremental Updates
**Goal**: Users can update documentation incrementally based on what changed since last run
**Depends on**: Phase 2
**Requirements**: UPD-01, UPD-02, UPD-03, UPD-04
**Success Criteria** (what must be TRUE):
  1. Tool stores git hash after each generation run
  2. Running update only re-analyzes files changed since stored hash
  3. Changes to files automatically update parent directory AGENTS.md files
  4. Renamed or moved files are detected and handled without orphaning old summaries
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Integration & Commands
**Goal**: Users can invoke the tool via commands and automate updates via hooks
**Depends on**: Phase 3
**Requirements**: INT-01, INT-02, INT-03, INT-04
**Success Criteria** (what must be TRUE):
  1. User can run /ar:generate in Claude Code to analyze entire project
  2. User can run /ar:update in Claude Code to incrementally update changed files
  3. End-of-session hook automatically triggers update when session ends
  4. Tool works in other AI coding assistants (OpenCode, etc.) via compatible integration
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Discovery | 5/5 | ✓ Complete | 2026-01-26 |
| 2. Documentation Generation | 0/TBD | Not started | - |
| 3. Incremental Updates | 0/TBD | Not started | - |
| 4. Integration & Commands | 0/TBD | Not started | - |

---
*Roadmap created: 2025-01-25*
*Phase 1 planned: 2025-01-25*
*Phase 1 complete: 2026-01-26*
*Depth: quick (3-5 phases)*
*Total v1 requirements: 17*
