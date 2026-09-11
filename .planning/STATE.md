# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Documentation that stays fresh automatically via git-diff-based updates
**Current focus:** v4.0 Project Reconstruction

## Current Position

Phase: 11 (Rebuild Command)
Plan: 2 of 2
Status: Phase complete
Last activity: 2026-09-11 - Completed quick task 001: Extend are-context-loader hook to Bash/Edit/Write/Agent tools so nested AGENTS.md is loaded (issue #14)

Progress: [████████████████████████] 100% (v4.0 -- 2/2 plans)

## Performance Metrics

**v1.0 Milestone:**
- Total plans completed: 26
- Total execution time: 89 min
- Average duration: 3 min per plan
- Timeline: 8 days (2026-01-25 -> 2026-02-02)

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Discovery | 5/5 | 15 min | 3 min |
| 2. Documentation Generation | 6/6 | 21 min | 4 min |
| 3. Incremental Updates | 5/5 | 11 min | 2 min |
| 4. Integration & Commands | 5/5 | 16 min | 3 min |
| 5. Installation Workflow | 5/5 | 26 min | 5 min |

**v2.0 Progress:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 6. AI Service Foundation | 3/3 | 8 min | 3 min |
| 7. Orchestration & Commands | 3/3 | 8 min | 3 min |
| 8. Full Telemetry | 3/3 | 9 min | 3 min |
| 9. Quality Improvements | 3/3 | 8 min | 3 min |

**v2.0 Totals:**
- Plans completed: 12
- Total execution time: 33 min
- Average duration: 3 min per plan

**v3.0 Progress:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 10. Specify Command | 3/3 | 13 min | 4 min |

**v3.0 Totals:**
- Plans completed: 3
- Total execution time: 13 min
- Average duration: 4 min per plan

**v4.0 Progress:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11. Rebuild Command | 2/2 | 7 min | 4 min |

## Accumulated Context

### Decisions

Key decisions are logged in PROJECT.md Key Decisions table.
v1.0 decisions archived in milestones/v1.0-ROADMAP.md.

v2.0 decisions:
- Tool drives LLM via CLI subprocess (full control over orchestration, telemetry, error handling)
- JSON log files for telemetry (human-readable, one file per run)
- runSubprocess always resolves -- callers decide how to handle errors via SubprocessResult fields
- AIServiceError uses string literal union codes for typed error branching
- DEFAULT_RETRY_OPTIONS omits isRetryable/onRetry since those are caller-specific
- isCommandOnPath exported from claude.ts for reuse by stub backends (avoids premature utility module)
- resolveBackend is the single entry point for all backend selection (auto and explicit)
- Rate-limit detection uses case-insensitive stderr substring matching (rate limit, 429, too many requests, overloaded)
- Telemetry records both successful and failed calls (error entries have zero tokens but actual latency)
- Config ai section uses nested .default({}) for full backward compatibility
- runPool returns sparse results array indexed by task position for easy correlation
- ProgressReporter ETA uses sliding window of 10 recent completions (not global average)
- executeUpdate runs only file analysis phase -- directory AGENTS.md regeneration is caller responsibility
- extractPurpose takes first non-header non-empty line from AI response, truncated to 120 chars
- Dry-run builds execution plan without backend resolution (works without AI CLI installed)
- Deprecated CLI flags (--execute, --stream) print notice to stderr to preserve JSON output on stdout
- Update command delegates to CommandRunner.executeUpdate (not inline pool logic)
- AGENTS.md regeneration after executeUpdate uses separate ProgressReporter for directory events
- Discover command returns normally (no process.exit(0)) for consistency and testability
- Prefix matching in lookupPricing sorts keys longest-first to avoid ambiguity between model ID prefixes
- Config pricing overrides spread over defaults before lookup so overrides always win
- formatTokens uses parseFloat to strip trailing zeros (1.0M becomes 1M)
- thinking field defaults to "not supported" until backends provide it
- filesRead attached post-call via setFilesReadOnLastEntry (caller knows context, not AIService)
- Root document tasks leave filesRead empty (aggregated content, no single source file)
- costAvailable is true if any entry has costSource !== "unavailable" (any-match semantics)
- pricingOverrides and costThresholdUsd optional on AIServiceOptions for backward compatibility
- costThresholdUsd on CommandRunOptions (display-layer concern) passed through to printSummary
- Unknown model warning uses console.error (stderr) and warnedModels Set for once-per-model dedup
- DEFAULT_MODEL_PRICING exported from AI barrel for consumer access to pricing table
- Line-anchored regex (^[ \t]*export) to skip commented-out exports without AST parsing
- missingFromCode uses partial match (iface.includes(exportName)) since publicInterface contains signatures
- Single-pass density prompt adaptation (not multi-pass Chain of Density) for cost efficiency
- Contents section links files without descriptions -- full description lives in .sum only
- Findability validator uses case-sensitive string.includes for symbol matching
- checkCodeVsCode operates on caller-scoped file groups to avoid cross-module false positives
- formatReportForCli uses plain text only (no picocolors) keeping the reporter pure and testable
- Inconsistency report prints to stderr to not interfere with JSON output on stdout
- Old .sum cache reads happen before Phase 1 pool processing to capture pre-overwrite state

v3.0 decisions:
- collectAgentsDocs returns Array<{ relativePath, content }> (pre-read content) so callers skip manual readFile loops
- SKIP_DIRS in collector.ts is module-private (not exported) to keep API surface minimal
- SPEC_SYSTEM_PROMPT enforces 9-section conceptual structure (not folder-mirroring or file path prescription)
- SpecExistsError thrown (not process.exit) so callers control error presentation
- Multi-file split on top-level '# ' headings with slugified filenames; pre-heading content to 00-preamble.md
- Atomic conflict detection in multi-file mode: all target files checked before any writes
- Extended timeout uses Math.max(config.ai.timeoutMs, 600_000) for 10min minimum on spec generation
- No language-specific metadata (readPackageSection removed) -- tool stays language-agnostic
- Debug output goes to stderr (console.error) to keep stdout clean for piping
- Auto-generate fallback: when no AGENTS.md found, invoke generateCommand() then re-collect (skipped in dry-run)

v4.0 decisions:
- Zod schema for checkpoint validation on disk load (consistent with config schema pattern)
- Build Plan phases as primary spec partition strategy; top-level headings as fallback
- Architecture + Public API Surface sections injected as context prefix in each rebuild unit
- Dual output format support: ===FILE:=== delimiters (primary) and fenced code blocks (fallback)
- CheckpointManager uses static factory methods (load/createFresh) instead of constructor overloading
- Spec drift detection checks both individual hash values and file count (added/removed files)
- 15min minimum timeout for rebuild (Math.max 900_000) matching specify command pattern
- Standalone executeRebuild function (not method on CommandRunner) avoids modifying runner.ts
- Best-effort regex export extraction acceptable since full spec always included in every prompt
- Order-grouped execution: Map<number, RebuildUnit[]> sorted keys, sequential groups, concurrent within

### Pending Todos

- **OpenCode plugin development**: Create `.opencode/plugin/` based hook for SessionEnd (deferred from v1.0, not in v2.0 scope)
- **Thinking content support**: Raise issue in AI assistant repository requesting thinking/reasoning content in `--output-format json` output. Infrastructure is ready in telemetry layer (TelemetryEntry.thinking field); just needs backend wiring when CLI adds support.

### Roadmap Evolution

- Phase 10 added (2026-02-09): Specify Command -- produce specification artifacts from AGENTS.md for project reconstruction
- Phase 11 added (2026-02-09): Rebuild Command -- reconstruct project from specs/ into rebuild/ with checkpoint-based multi-session progress tracking

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Extend are-context-loader hook to Bash/Edit/Write/Agent tools so nested AGENTS.md is loaded (issue #14) | 2026-09-11 | b1334b1 | [001-extend-are-context-loader-hook-to-bash-e](./quick/001-extend-are-context-loader-hook-to-bash-e/) |

## Session Continuity

Last session: 2026-09-11
Stopped at: Completed quick task 001 (are-context-loader multi-tool extension, issue #14)
Resume file: None
