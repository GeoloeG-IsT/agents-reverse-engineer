# Project Research Summary

**Project:** Agents Reverse
**Domain:** AI-Powered Codebase Documentation Tooling
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

Agents Reverse is a recursive codebase documentation generator designed specifically for AI coding assistants. The research reveals a clear market gap: while tools like Repomix, GSD, and BMAD generate excellent initial documentation, **none provide git-diff-based incremental updates to maintain freshness automatically**. This is the core differentiator. The tool generates hierarchical AGENTS.md files (per-directory) and file-level .sum summaries using a bottom-up approach, then keeps them fresh via git hook triggers.

The recommended approach is to build a TypeScript/Node.js skill for Claude Code (primary integration) with clean separation between core processing logic and infrastructure concerns (git, LLM, filesystem). The architecture centers on three core components: Tree Walker (directory traversal), File Analyzer (individual file summaries), and Summary Aggregator (bottom-up rollup). The critical insight from stack research: **we don't call LLMs directly** — the host tool (Claude Code, OpenCode) handles LLM orchestration; our job is file system work, markdown generation, and providing the right interface via SKILL.md files.

The biggest risks identified are: (1) token budget explosion on large repositories requiring aggressive filtering and budgeting from day one, (2) summary quality degradation as information propagates up the directory tree requiring anchor term preservation, and (3) git diff-based staleness detection breaking on renames/moves requiring robust edge case handling. Mitigation strategies are well-documented in PITFALLS.md and must be addressed in Core Architecture phase, not bolted on later.

## Key Findings

### Recommended Stack

**Core insight:** This is a skill/plugin system for AI coding tools, not a standalone CLI application. Integration is via SKILL.md files (Claude Code) or plugin definitions (OpenCode), not traditional command-line parsing. The stack prioritizes native TypeScript/ESM for compatibility, markdown-based skill files for zero-dependency integration, and git-aware operations for diff-based updates.

**Core technologies:**
- **TypeScript 5.5+ / Node.js 22+**: Native ESM with emerging TypeScript support; required by chokidar v5 if file watching is added
- **tsx 4.21+ / tsup 8.5+**: Development execution (tsx) and distribution bundling (tsup); faster and more ESM-compatible than ts-node/webpack
- **fast-glob 3.3.3 / ignore 7.0.5**: Pattern-based file discovery (10-20% faster than node-glob) and gitignore parsing (spec-compliant, used by eslint/prettier)
- **simple-git 3.x**: Git operations for diff detection, staged file awareness, and commit metadata; full TypeScript support
- **gray-matter 4.0.3**: YAML frontmatter parsing for SKILL.md files; battle-tested across static site generators
- **zod 4.3+**: Runtime validation for configuration and frontmatter; required peer dependency of MCP SDK anyway

**Critical anti-pattern:** Do NOT add `@anthropic-ai/sdk` or similar LLM client libraries. The host tool handles all LLM calls; our code does file system work and returns structured output.

### Expected Features

Research reveals that documentation freshness is the killer differentiator in this market. Most competitors generate excellent initial documentation but fail to maintain it as code evolves. Swimm has patented auto-sync for human-focused docs, but no tool has nailed git-diff-based incremental updates for AI agent context.

**Must have (table stakes):**
- File-level .sum generation — every tool does file summaries; baseline expectation
- Per-directory AGENTS.md — hierarchical structure matching codebase layout
- Root CLAUDE.md pointer — Anthropic compatibility from day one
- Token counting per file — essential for LLM context management
- Gitignore respect + custom exclusions — don't document node_modules, build artifacts
- CLI interface with /ar:generate and /ar:update — simple command surface

**Should have (competitive advantage):**
- **Git-diff-based incremental updates** — THE differentiator; no competitor does this well; only update changed files
- **Bottom-up recursive analysis** — file summaries aggregate to directory summaries maintaining semantic accuracy
- **Session hooks (end-of-session triggers)** — automatic doc updates when developer finishes work; novel UX
- **Staleness detection & alerts** — proactively flag when docs drift from code
- **MCP server integration** — let AI tools query documentation directly during generation

**Defer (v2+):**
- Semantic code understanding (AST, dependencies) — complex; GSD/Sourcegraph do this; focus on freshness first
- Multi-model support (Ollama, etc.) — Claude focus first, expand later
- Parallel agent processing — performance optimization after correctness proven
- Web interface — CLI-first audience; adds maintenance burden

### Architecture Approach

The standard architecture follows a three-layer pattern: Orchestration Layer (CLI, hooks, state), Core Processing Layer (walker, analyzer, aggregator), and Infrastructure Layer (git, LLM, filesystem). The critical pattern is **bottom-up recursive processing** — process leaf files first, then aggregate summaries upward to parent directories until reaching root. This ensures each directory summary has full context from children and enables natural parallelization at the sibling level.

**Major components:**
1. **Tree Walker** — Traverses directory structure depth-first, builds file tree from root, respects gitignore and exclusion patterns
2. **File Analyzer** — Generates summaries for individual files via LLM calls; produces {filename}.sum with compact descriptions
3. **Summary Aggregator** — Combines child .sum files into parent AGENTS.md via LLM synthesis; maintains hierarchy
4. **State Manager** — Tracks processed files, git hashes, update status; enables incremental updates
5. **Git Integration** — Detects changes via diff, tracks commit hashes, computes changed paths since last processing
6. **Hook Dispatcher** — Triggers documentation updates from git events (post-commit, post-merge) with proper fallbacks

**Key architectural decisions from research:**
- State-driven incremental updates: track git hash per file/directory; on update, diff against stored hash, only reprocess changed paths and their ancestors
- Parallel sibling processing: process files/directories at same level concurrently (configurable concurrency to respect rate limits)
- Separation of concerns: CLI is thin wrapper over core; infrastructure abstracted via interfaces for testing

### Critical Pitfalls

1. **Token Budget Explosion on Large Repositories** — Bottom-up summarization compounds token requirements exponentially. A 10,000-file repo can exceed 50M tokens before summarization. **Prevention:** Aggressive file filtering BEFORE LLM processing; hard token budgets per level (max 2,000 tokens/file, 5,000/directory); streaming/chunked processing; early-exit conditions. **Address in:** Core Architecture phase — token budget system must be foundational.

2. **Summary Quality Degradation Up the Tree** — Each summarization pass loses domain-specific terminology and relationships. Root AGENTS.md becomes vague abstractions ("utilities and helpers") instead of actionable context. **Prevention:** Preserve anchor terms (function names, key concepts) across all levels; different summarization strategies per level; include explicit "For AI assistants" sections with concrete file references; verify against "Can an AI find the right file?" test. **Address in:** Summary Generation phase — define quality metrics before implementing.

3. **Incomplete File Exclusion Leading to Noise/Cost Explosion** — Binary files, generated code, lock files, data files get processed, wasting tokens and adding noise. .gitignore is insufficient (designed for version control, not documentation relevance). **Prevention:** Layer multiple exclusion mechanisms (gitignore + doc-specific exclusions + binary detection + generated code detection + size-based limits); make configurable via .agentsignore; default to strict exclusion (opt-in not opt-out). **Address in:** File Discovery phase — must be bulletproof before LLM processing.

4. **Git Diff-Based Staleness Detection Breaks on Renames/Moves** — Git's rename detection is heuristic (>50% content match). Renames+modifications may appear as delete+add, orphaning old summaries and losing historical context. **Prevention:** Never rely solely on git diff output; handle delete+add pairs with similarity checking; track AGENTS.md files independently; implement orphan detection; when in doubt, regenerate. **Address in:** Incremental Update phase — needs comprehensive edge case tests.

5. **Git Hook Unreliability Across Environments** — Hooks live in .git/hooks/ (not version-controlled), can be bypassed (--no-verify), don't work in all Git UIs, vary by developer setup. **Prevention:** Hooks are convenience, not the only mechanism; provide multiple triggers (hooks + CLI + CI + watch mode); include hook installation in setup; detect stale docs independently; fail gracefully when hooks don't fire. **Address in:** Integration phase — design with fallbacks from start.

6. **Token Counting Inaccuracy Across Models** — Different providers use different tokenizers (tiktoken for OpenAI, custom for Anthropic, SentencePiece for LLaMA). Wrong tokenizer can undercount by 20-30%, causing context overflow. **Prevention:** Use provider-specific tokenizers; add 10-15% safety margin; validate against actual API responses; make token strategy configurable. **Address in:** LLM Integration phase.

## Implications for Roadmap

Based on research, suggested phase structure with clear dependency chain and risk mitigation:

### Phase 1: Foundation & File Discovery
**Rationale:** Must establish file filtering and exclusion before any LLM processing. This phase addresses Pitfall #3 (incomplete exclusion) which directly impacts cost and quality. No value in generating summaries until we can reliably identify which files to process.

**Delivers:**
- Project initialization and configuration system
- Gitignore parsing and respect
- Custom exclusion patterns (.agentsignore)
- Binary file detection (by header, not just extension)
- Generated code detection (DO NOT EDIT markers, common paths)
- File discovery engine with filtering
- Token counting infrastructure with provider-specific tokenizers

**Features from FEATURES.md:**
- Gitignore/exclusion patterns (table stakes)
- Token counting per file (table stakes)
- Configurable file filtering (table stakes)

**Stack elements:**
- fast-glob for pattern-based discovery
- ignore for gitignore parsing
- zod for configuration validation

**Avoids pitfalls:**
- #3: Incomplete file exclusion (primary mitigation)
- #6: Token counting inaccuracy (establish correct approach early)

### Phase 2: Core Architecture & State Management
**Rationale:** Before implementing any summarization logic, need solid foundation for state tracking and incremental updates. This phase establishes the token budget system (Pitfall #1) and state-driven architecture that enables all future phases.

**Delivers:**
- State management system (.agents-reverse/state.json)
- Git integration for diff detection
- File hash tracking per path
- Token budget enforcement system
- Tree walker with bottom-up traversal
- Processing scheduler (leaf-first ordering)
- Error recovery and resume capability

**Architecture components:**
- State Manager (tracker.ts, store.ts)
- Git Integration (git.ts wrapper around simple-git)
- Tree Walker (walker.ts with depth-first traversal)

**Stack elements:**
- simple-git for git operations
- Zod for state validation
- TypeScript with strict configuration

**Avoids pitfalls:**
- #1: Token budget explosion (hard limits enforced)
- #4: Git diff staleness detection (robust implementation from start)

### Phase 3: File Analysis & Summary Generation
**Rationale:** With filtering and state established, implement file-level summarization. This is the first LLM integration point and must address quality concerns (Pitfall #2) from the start.

**Delivers:**
- File Analyzer component
- LLM interface abstraction
- {filename}.sum generation
- Anchor term preservation strategy
- Quality verification ("Can AI find this file?" test)
- Support for Claude via host tool (not direct API)

**Features from FEATURES.md:**
- File-level .sum generation (table stakes)
- Root CLAUDE.md pointer (table stakes)

**Architecture components:**
- File Analyzer (analyzer.ts)
- LLM Interface (llm/interface.ts — but mediated through host tool)

**Avoids pitfalls:**
- #2: Summary quality degradation (quality metrics defined)
- #6: Token counting inaccuracy (validated against actual usage)

### Phase 4: Directory Aggregation & Hierarchy
**Rationale:** Build on file summaries to create per-directory AGENTS.md files. This implements the bottom-up aggregation pattern and produces the primary deliverable for AI assistants.

**Delivers:**
- Summary Aggregator component
- Per-directory AGENTS.md generation
- Bottom-up synthesis algorithm
- Different summarization strategies per level (file vs directory vs root)
- Hierarchical structure matching codebase

**Features from FEATURES.md:**
- Per-directory AGENTS.md (table stakes + differentiator)
- Bottom-up recursive analysis (differentiator)

**Architecture components:**
- Summary Aggregator (aggregator.ts)

**Avoids pitfalls:**
- #2: Summary quality degradation (level-specific strategies)

### Phase 5: Incremental Updates & Git Diff
**Rationale:** With full generation working, add the core differentiator: git-diff-based incremental updates. This phase has highest complexity and most edge cases (Pitfall #4).

**Delivers:**
- Changed path detection via git diff
- Ancestor directory identification
- Selective regeneration (only changed files + affected directories)
- Rename/move detection and handling
- Orphan detection for stale AGENTS.md
- Update command (/ar:update)

**Features from FEATURES.md:**
- Git-diff-based incremental updates (THE differentiator)

**Avoids pitfalls:**
- #4: Git rename detection failure (comprehensive edge case handling)

**Needs deeper research:** Yes — git rename detection edge cases, similarity heuristics, directory move handling

### Phase 6: Integration & Automation
**Rationale:** Make the tool usable in real workflows. Hook integration is the natural trigger for incremental updates but must be designed with fallbacks (Pitfall #5).

**Delivers:**
- Git hook installation (post-commit, post-merge)
- Hook management commands
- Multiple trigger mechanisms (hooks + CLI + CI support)
- Staleness detection independent of hooks
- Session-end trigger exploration
- SKILL.md files for Claude Code integration

**Features from FEATURES.md:**
- Session hooks (end-of-session triggers) (should-have)
- Staleness detection & alerts (should-have)
- CLI interface (table stakes)

**Stack elements:**
- SKILL.md files in .claude/skills/
- Hook scripts in .git/hooks/

**Avoids pitfalls:**
- #5: Git hook unreliability (multiple fallback mechanisms)

**Needs deeper research:** No — git hooks are well-documented; SKILL.md pattern established

### Phase 7: Enhancement & Polish
**Rationale:** After core functionality proven, add convenience features and quality-of-life improvements.

**Delivers:**
- Progress indication for large repos
- Multiple output formats support
- Content-driven supplementary docs
- Tool-agnostic output (AGENTS.md + CLAUDE.md variants)
- Dry-run mode for exploration
- User section preservation in AGENTS.md

**Features from FEATURES.md:**
- Tool-agnostic output (should-have)
- Multiple output formats (should-have if time permits)

**Needs deeper research:** No — standard patterns

### Phase Ordering Rationale

1. **File Discovery first** because all subsequent phases depend on knowing which files to process; establishing correct filtering prevents wasted work
2. **State Management before Summarization** because incremental updates require tracking; cheaper to establish state infrastructure early than retrofit
3. **File Analysis before Directory Aggregation** because bottom-up pattern requires leaf summaries exist before parent processing
4. **Full Generation before Incremental Updates** because incremental requires baseline; must prove full generation works before optimizing
5. **Integration after Core Features** because hooks/automation only valuable once core functionality proven
6. **Enhancement last** because quality-of-life features depend on stable foundation

**Dependency chain:**
```
Phase 1 (File Discovery)
    ↓
Phase 2 (State & Git) ← required for Phase 5
    ↓
Phase 3 (File Analysis)
    ↓
Phase 4 (Directory Aggregation)
    ↓
Phase 5 (Incremental Updates) ← depends on Phases 2, 3, 4
    ↓
Phase 6 (Integration) ← enhances Phase 5
    ↓
Phase 7 (Enhancement)
```

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 5 (Incremental Updates):** Complex git diff edge cases; rename detection heuristics; directory move handling; needs investigation of git plumbing commands and similarity algorithms

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** File discovery with glob patterns is well-documented; binary detection has established approaches
- **Phase 2:** Git integration via simple-git has extensive examples; state management is standard JSON persistence
- **Phase 3:** LLM integration patterns established by GSD/BMAD projects
- **Phase 4:** Bottom-up aggregation confirmed by CodeWiki research as correct approach
- **Phase 6:** Git hooks and SKILL.md files have official documentation
- **Phase 7:** Enhancement features are straightforward implementations

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official documentation for all core dependencies; MCP SDK, tsx, fast-glob verified; integration pattern (SKILL.md) confirmed by Anthropic docs |
| Features | MEDIUM | WebSearch verified with multiple sources; official AGENTS.md spec and Claude Code docs cross-referenced; gap is lack of direct competitor comparison (couldn't test Swimm/Mintlify) |
| Architecture | HIGH | Bottom-up pattern validated by academic research (CodeWiki); component separation confirmed by Autodoc/GSD codebases; hook patterns from official Git docs |
| Pitfalls | HIGH | Token explosion confirmed by Repomix data; git rename issues documented in Git 2.19+ release notes; quality degradation confirmed by academic summarization research |

**Overall confidence:** HIGH

Research is based on verifiable sources (official documentation, academic papers, open-source implementations) rather than speculation. The few MEDIUM areas reflect practical validation gaps (can't test commercial tools directly) rather than technical uncertainty.

### Gaps to Address

**Gap 1: LLM Provider Integration Details**
- Research assumes host tool (Claude Code) handles LLM calls via SKILL.md
- **Resolution:** Verify during Phase 3 planning that SKILL.md files can trigger file analysis; may need to explore MCP server alternative if skill pattern insufficient
- **Risk:** LOW — SKILL.md pattern is documented; worst case is MCP server (also documented)

**Gap 2: Git Rename Detection Edge Cases**
- Research identifies the problem (similarity heuristics) but doesn't have exhaustive edge case catalog
- **Resolution:** During Phase 5 planning, use `/gsd:research-phase` to investigate git plumbing commands (diff-tree, ls-files) and build edge case test matrix
- **Risk:** MEDIUM — core to incremental updates; must get right

**Gap 3: Token Budget Calibration**
- Research provides guidelines (2K per file, 5K per directory) but these are estimates
- **Resolution:** During Phase 1-2 execution, measure actual token usage on sample repositories; adjust budgets based on empirical data
- **Risk:** LOW — easy to tune once infrastructure exists

**Gap 4: Summary Quality Metrics**
- Research identifies the problem (quality degradation) and suggests verification approach ("Can AI find the file?") but doesn't define concrete metrics
- **Resolution:** During Phase 3 planning, define measurable quality criteria (e.g., "summary must include at least 3 concrete function/class names" or "must enable file location within 2 questions")
- **Risk:** MEDIUM — subjective quality is hard to measure; need empirical validation

**Gap 5: Hook Reliability Across Git Clients**
- Research identifies hook unreliability but doesn't catalog which Git UIs support hooks
- **Resolution:** During Phase 6 testing, verify hook behavior across git CLI, GitHub Desktop, GitKraken, VS Code Git integration; document limitations
- **Risk:** LOW — fallback mechanisms (CLI command, CI) mitigate

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK v1.25.3](https://github.com/modelcontextprotocol/typescript-sdk/releases) — Integration architecture, zod dependency
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) — SKILL.md pattern, integration approach
- [AGENTS.md Official Specification](https://agents.md/) — Output format standard
- [GitHub Blog: AGENTS.md Lessons](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) — Best practices from 2,500+ repos
- [CodeWiki Research Paper](https://arxiv.org/abs/2510.24428) — Bottom-up hierarchical decomposition validation
- [Git Directory Rename Detection](https://git-scm.com/docs/directory-rename-detection/2.22.0) — Rename handling pitfalls
- [Token Counting Guide 2025](https://www.propelcode.ai/blog/token-counting-tiktoken-anthropic-gemini-guide-2025) — Provider-specific tokenizer differences

### Secondary (MEDIUM confidence)
- [GSD Repository](https://github.com/glittercowboy/get-shit-done) — Parallel agent patterns, orchestration
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) — Multi-agent coordination, step-file architecture
- [Repomix](https://repomix.com/) — Token counting reports, large repo data
- [Autodoc by Context Labs](https://github.com/context-labs/autodoc) — Depth-first traversal, model selection
- [Swimm Auto-sync Blog](https://swimm.io/blog/how-does-swimm-s-auto-sync-feature-work/) — Auto-sync approach (patented)
- [Factory.ai Context Window Research](https://factory.ai/news/context-window-problem) — Token budget optimization
- [Kinde: AI Context Windows Engineering](https://kinde.com/learn/ai-for-software-engineering/best-practice/ai-context-windows-engineering-around-token-limits-in-large-codebases/) — Large codebase token management

### Tertiary (LOW confidence - validate before use)
- [OpenCode Plugin Architecture](https://deepwiki.com/anomalyco/opencode/8.3-mcp-server-development) — Alternative integration path
- [jyn.dev: Pre-commit Hooks Are Broken](https://jyn.dev/pre-commit-hooks-are-fundamentally-broken/) — Hook reliability concerns
- Various Medium articles on AI codebase analysis — Pattern observations

---
*Research completed: 2026-01-25*
*Ready for roadmap: YES*
