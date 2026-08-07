# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.18] - 2026-08-07

### Added
- **`ai.upgradeModel` config option** — New optional setting in `config.yaml` that sets the model used by `are specify` and `are rebuild` (commands that benefit from a stronger model). When unset, the previous behavior is preserved: the default `model: sonnet` is upgraded to `opus`, and any other `model` value is used as-is. The `--model` CLI flag still overrides both
- **`DEFAULT_AI_MODEL` / `DEFAULT_UPGRADE_MODEL` constants** — Model names (`sonnet`, `opus`) are now defined once in `src/config/defaults.ts` instead of being hardcoded in `specify.ts` and `rebuild.ts`

### Changed
- **Refreshed Claude model documentation** — The generated `config.yaml` template and README now list the current Claude CLI model aliases (`sonnet | opus | haiku | fable | best | sonnet[1m] | opus[1m] | fable[1m] | opusplan | default`) and full model IDs (`claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-haiku-4-5`), replacing the outdated `sonnet[1m] | opusplan` / `claude-opus-4-6` list
- **README config reference** — Added a "Model" entry to Key Config Options documenting `ai.model` and `ai.upgradeModel` resolution order
- **Regenerated AGENTS.md/CLAUDE.md documentation** across the source tree (installer, integration, plan, implement, views modules)
- **Blog and site updates** — Updated availability and HTML structure for articles 05–09

## [1.2.17] - 2026-02-25

### Changed
- **Separated target directory from project root in CLI commands** — The `discover`, `generate`, and `update` commands now resolve `targetDir` (the directory to scan) and `projectRoot` (where config, logs, and telemetry live) independently, instead of conflating them via `findProjectRoot()`. This allows running commands on subdirectories (e.g., `are generate src/`) while still locating `config.yaml`, `.agents-reverse-engineer/` logs, traces, and telemetry at the project root
- **Config and artifact paths use project root** — `loadConfig()`, `ProgressLog.create()`, trace writers, subprocess log directories, telemetry finalization, and `GENERATION-PLAN.md` output now consistently write to the project root, while file discovery and documentation generation operate on the user-specified target directory

## [1.2.16] - 2026-02-25

### Changed
- **CLAUDE.md pointer files only written for Claude backend** — The `generate` and `update` commands now conditionally write `CLAUDE.md` pointer files only when the active backend is `claude`, preventing unnecessary artifact creation when using Codex, Gemini, or OpenCode backends
- **`backendName` option added to `CommandRunOptions`** — New optional `backendName` field propagated from CLI commands to the orchestration runner, enabling backend-specific artifact gating

## [1.2.15] - 2026-02-25

### Added
- **Auto-initialize project during installation** — The installer now automatically creates `config.yaml`, updates `.gitignore`, and configures `.vscode/settings.json` during install, eliminating the need for a separate `are init` step
- **`getDefaultModelForBackend()` utility** — New exported function in `src/config/loader.ts` that returns the default model string for a given backend name, exposed via the core programmatic API
- **`.npm-cache` gitignore pattern** — The `.gitignore` management now includes `.npm-cache` alongside `*.sum` in the `# agents-reverse-engineer` section

### Changed
- **Simplified post-install next steps** — Removed the `are init` step from the next steps banner since initialization is now automatic (steps renumbered from 7 to 6)
- **Updated default Codex model** — Changed default Codex model from `gpt-5.3-codex` to `gpt-5-codex-mini`

## [1.2.14] - 2026-02-25

### Added
- **Backend auto-detection for `are init`** — The init command now detects available AI CLI backends on PATH (Claude, Codex, Gemini, OpenCode) and configures the best available backend and model as defaults in `config.yaml`, instead of always defaulting to `auto`
- **`detectAvailableBackends()` registry function** — New function in `src/ai/registry.ts` that checks all registered backends for availability and returns those found on PATH, preserving priority order (Claude > Codex > Gemini > OpenCode)
- **`getDefaultBackendConfig()` config helper** — New function in `src/config/loader.ts` that returns the optimal backend/model pair based on detected CLI availability, with sensible model defaults per backend

### Fixed
- **Codex command prefix in installer banner and templates** — Changed Codex command prefix from `/are-` to `$are-` in post-install next steps and integration templates for consistency with Codex's skill invocation syntax

## [1.2.13] - 2026-02-24

### Added
- **Project-local `.npmrc` for npm cache isolation** — Local installs now create a `.npmrc` with `cache=.agents-reverse-engineer/.npm-cache` to avoid global `~/.npm` permission issues (EACCES) and keep ARE command execution reproducible across environments
- **`.npmrc` cleanup on uninstall** — Uninstaller removes the ARE-managed section from `.npmrc` (delimited by `BEGIN/END` markers), deleting the file entirely if no other content remains

### Changed
- **Shared formatting utilities for comparison views** — Extracted duplicated `pad()` and `formatDelta()` functions from four view files into `src/views/format-utils.ts`, reducing code duplication by ~80 lines while preserving ANSI-aware width calculations

## [1.2.12] - 2026-02-18

### Changed
- **AIService integration for plan and implement executors** — Refactored `plan/executor.ts` and `implement/executor.ts` to use `AIService` instead of raw `runSubprocess` + `ClaudeBackend`, gaining automatic retry logic, telemetry logging, and subprocess tracing for A/B test runs
- **Expanded allowed tools for A/B test runs** — Plan execution now permits `Task`, `WebSearch`, and `WebFetch` tools in addition to `Read`, `Glob`, `Grep`, `Bash`; implementation execution adds `Task`, `WebSearch`, `WebFetch`, and `TodoWrite` for richer agentic workflows
- **Per-call CWD override in AIService** — Added `cwd` option to `AICallOptions` so individual AI calls (e.g., worktree-scoped runs) can override the service-level subprocess working directory
- **Dynamic `--allowedTools` flag in Claude backend** — Claude backend now conditionally passes `--allowedTools` when specified (agentic mode) or `--tools ''` when not, replacing the previous always-disabled-tools approach

## [1.2.11] - 2026-02-18

### Changed
- **Per-worktree baseline refs for implementation metrics** — `are implement` now captures each worktree's HEAD individually after artifact stripping, instead of using the merge-base between branches, ensuring metrics measure only actual AI implementation changes
- **OpenCode cost calculation uses shared pricing module** — Removed duplicated pricing constants and `calculateCostFromTokens` from the OpenCode backend, now imports `getModelPricing` and `computeCost` from `cost-calculator.ts` for single-source-of-truth pricing

## [1.2.10] - 2026-02-17

### Added
- **Worktree cleanup in `are clean`** — The clean command now detects and removes ARE-related git worktrees (both registered and orphaned `/tmp` directories), with dry-run support and summary counts
- **Worktree path output after plan/implement** — `are plan` and `are implement` now print worktree paths at completion for easy inspection of results

### Changed
- **Worktrees preserved after plan/implement** — Worktrees are no longer automatically cleaned up on completion or abort; use `are clean` to remove them when done inspecting
- **Claude backend handles additional error subtypes** — Response schema now accepts `error_max_turns`, `error_during_execution`, `error_max_budget_usd`, and `error_max_structured_output_retries` subtypes, with `result` field treated as optional to prevent crashes on error responses

## [1.2.9] - 2026-02-17

### Added
- **VHS demo installation scripts** — New `scripts/demo-install.tape` VHS tape file and `scripts/fake-npx.sh` helper for recording terminal demo GIFs of the installer, with accompanying `scripts/README.md` documentation
- **Demo installation GIF** — Added `assets/demo-install.gif` and embedded it in the README for a visual preview of the installation experience
- **Branch base reference for cumulative metrics** — `are implement` now captures the Git fork-point SHA before AI execution and passes it to metric extraction, ensuring cumulative diffs across multi-session runs are measured correctly
- **AGENTS.md and CLAUDE.md for new modules** — Added documentation files for `src/plan/`, `src/plan/views/`, `src/implement/`, `src/implement/views/`, `src/installer/frames/`, `src/quality/inconsistency/`, `src/quality/phantom-paths/`, and `src/rebuild/`
- **Comprehensive documentation regeneration** — Updated all existing AGENTS.md files across the codebase (74 files) with enriched descriptions, behavioral contracts, and v1.2.8 version tags

### Changed
- **Implementation max turns increased from 50 to 100** — Allows longer AI implementation sessions to complete more complex tasks without hitting the turn limit
- **Metric extraction uses base ref instead of HEAD~1** — Implementation metrics now diff against the branch fork point rather than the previous commit, capturing all cumulative changes accurately

### Fixed
- **Demo script timing** — Adjusted sleep durations in the VHS demo installation tape for smoother recording pacing

## [1.2.8] - 2026-02-17

### Changed
- **Experimental labels for newer commands** — `specify`, `rebuild`, `plan`, `implement`, and `dashboard` are now marked as `(experimental)` in CLI help output, README command tables, slash command documentation, skill descriptions, and installer templates
- **Expanded Bash permissions** — Added additional allowed Bash commands to `.claude/settings.local.json` for smoother local development

## [1.2.7] - 2026-02-17

### Added
- **Blog post 02** — Published second blog post to the project documentation site

### Changed
- **README.md improvements** — Added Codex badge, expanded "Why This Exists" section to contrast with shallow built-in init commands, highlighted incremental update capability, and improved table formatting
- **Cleaned up local settings** — Removed excessive permission entries from `.claude/settings.local.json`

### Fixed
- **Installer left-pane text alignment** — Centered the version string and tagline in the split-pane installer layout for better visual balance

## [1.2.6] - 2026-02-17

### Added
- **Split-pane installer layout** — New `SplitPaneLayout` provides a dual-pane terminal interface during installation, rendering prompts in the right pane for a cleaner, more organized experience
- **Golden circle spinner** — Rotating golden circle animation using 36 pre-rendered frames to indicate progress during installation and uninstallation workflows
- **`disable-model-invocation` flag for skills** — All SKILL.md files and the skill template now include a `disable-model-invocation` flag, allowing skills to opt out of AI model calls

### Changed
- **Installer UI refactored for split-pane rendering** — Installation and uninstallation workflows updated to use the new layout and spinner, with result displays adapted for the right pane

## [1.2.5] - 2026-02-17

### Added
- **Worktree reuse for `are implement`** — When a plan exists, `are implement` now reuses the existing plan branches via `reuseWorktreePair()` instead of recreating them, preserving committed `PLAN.md` files and any prior plan branch state
- **Plan-less implementation mode** — `are implement` can now run without a prior `are plan`. When no matching plan is found, it creates fresh worktrees from HEAD and strips ARE artifacts from the without-docs worktree, allowing direct task-based A/B comparison
- **Read plans from worktree branches** — New `readPlanFromWorktree()` function reads `PLAN.md` directly from the worktree branch, with fallback to local disk storage for backward compatibility with plans created before branch commits were introduced

### Changed
- **Plan storage path on branches** — `commitPlanToWorktree` now writes to `.agents-reverse-engineer/plans/<id>/PLAN.md` (matching the local disk layout) instead of `PLAN.md` at the worktree root, enabling lookup by comparison ID
- **Implementation prompts adapt to plan availability** — `buildImplementationPrompt` now handles plan-less runs gracefully, instructing the AI to explore the codebase when no plan is provided
- **Worktree cleanup before branch deletion** — `createWorktreePair` now removes any existing worktrees referencing the target branches before deleting them, preventing "branch is checked out" errors on force-recreate

## [1.2.4] - 2026-02-17

### Fixed
- **Plan text not committed to worktree branches** — `are plan` created branches (`are/plan/with-docs/<slug>` and `are/plan/without-docs/<slug>`) but never committed the generated plans to them. Plans were only saved to `.agents-reverse-engineer/plans/` on `main`. Now each branch receives a `PLAN.md` commit with the generated plan before worktree cleanup

## [1.2.3] - 2026-02-17

### Changed
- **`--plan-id` infers task description from stored plan** — When using `are implement --plan-id <id>`, the task description is now loaded automatically from the stored plan, so it no longer needs to be passed explicitly on the command line
- **Improved error message for missing task** — The error when no task description is provided now suggests `--plan-id <id>` as an alternative, with updated usage examples

## [1.2.2] - 2026-02-16

### Added
- **`--plan-id` option for `are implement`** — New `--plan-id <id>` flag allows referencing existing plans by their unique ID (shown on `are plan` completion) instead of relying on auto-generated task slugs. Plan list view now displays the ID column instead of date, and comparison output shows a ready-to-copy `are implement` command with the plan ID
- **Implementation execution skill** — Added `are-implement` slash command skill (`SKILL.md`) for executing A/B implementation comparisons directly from Claude Code

### Changed
- **Plan list view shows ID instead of date** — The `are plan --list` table now displays the plan ID column (useful for `--plan-id`) replacing the previous date column
- **Plan comparison footer improved** — Comparison output now displays the plan ID and a suggested `are implement` command for quick follow-up

## [1.2.1] - 2026-02-16

### Added
- **A/B implementation comparison command** — New `are implement` CLI command that executes AI-generated plans in isolated git worktrees (with and without ARE docs), extracts implementation metrics (files created, lines changed, commits), and optionally runs test/build/lint suites. Includes AI-driven quality evaluation, result storage, and structured comparison views
- **Model identifier documentation in config** — Default `config.yaml` now includes backend-specific model identifier examples for Claude, Codex, Gemini, and OpenCode
- **Skill and version updates** — Updated all skill templates with improved command execution patterns and pinned versioning via `ARE-VERSION`

### Fixed
- **Subprocess stdin stream leak** — `runSubprocess` now always closes the stdin stream after writing input, preventing potential resource leaks during AI backend calls
- **Buffer overflow in long-running agentic sessions** — Increased `maxBuffer` from 10MB to 100MB for subprocess output, preventing crashes during multi-turn agentic exploration sessions
- **Agentic exploration timeout too aggressive** — Increased timeout from 10 to 20 minutes to accommodate longer AI exploration sessions in plan execution
- **Timeout detection false positives** — Improved timeout detection logic to more reliably distinguish actual timeouts from other subprocess failures
- **Diagnostic logging on plan execution failure** — Added detailed diagnostic output when `executePlanRun` fails, showing subprocess exit code, signal, and stderr for easier debugging
- **Missing `ps` permission** — Added `ps` command to `settings.local.json` permissions for Claude Code
- **Repository link in default config** — Corrected the repository URL in default config comments

### Changed
- **README updated for new commands** — Added documentation for `are plan` and `are implement` commands, including CLI flags (`--eval`, `--eval-model`, `--task-slug`, `--list`, `--show`, `--run-tests`, `--run-build`, `--run-lint`) and slash command references
- **CONTRIBUTING.md updated** — Added `plan/` and `implement/` modules to the source tree overview

## [1.2.0] - 2026-02-16

### Added
- **A/B plan comparison command** — New `are plan` CLI command that runs AI planning tasks in two isolated Git worktrees (one with ARE documentation, one without) and evaluates the quality difference. Includes metrics extraction, structured evaluation prompts, result storage, and comparison views for measuring the impact of ARE-generated docs on AI planning quality
- **Git worktree permission** — Added `git worktree` to installer permissions for Claude Code settings, enabling worktree-based isolation used by the plan comparison feature

## [1.1.4] - 2026-02-16

### Added
- **Timestamped progress log files** — Progress logs now use timestamped filenames (`progress-{cmd}-{backend}-{model}-{ts}.log`) instead of a single `progress.log`, preventing stale data from previous runs. New `ProgressLog.getLatestPath()` method finds the most recent log, and `ProgressLog.cleanup()` retains only the 20 most recent files
- **Project file cleanup helpers** — New `src/installer/project-files.ts` module with `ensureGitignoreEntry()`, `removeGitignoreEntry()`, `ensureVscodeExclude()`, and `removeVscodeExclude()` functions for managing ARE entries in `.gitignore` and `.vscode/settings.json` using JSONC-safe edits

### Changed
- **Progress monitoring uses Glob + Read** — Command templates now use Glob to find the latest `progress-*.log` file and Read to poll it, replacing the fixed `progress.log` path. Stale progress log deletion step removed from all templates (auto-cleanup handles retention)
- **Command templates pin `npx agents-reverse-engineer@$VERSION`** — All command templates now read the version from `ARE-VERSION` and use it in the `npx` invocation, ensuring the installed version is used instead of resolving `@latest`
- **Uninstaller cleans up project files** — Local uninstall now removes ARE entries from `.gitignore` and `*.sum` exclusion from `.vscode/settings.json`, with results shown in uninstall summary
- **Init logic extracted to reusable module** — `.gitignore` and `.vscode/settings.json` management moved from `cli/init.ts` into `installer/project-files.ts` for reuse by both init and uninstall
- **Removed `progress.log` permission from uninstall** — `rm -f .agents-reverse-engineer/progress.log*` removed from `ARE_PERMISSIONS` list (no longer needed with timestamped logs)

## [1.1.3] - 2026-02-16

### Added
- **Subprocess working directory isolation** — AI subprocesses now run in `os.tmpdir()` instead of the project directory, preventing AI CLIs from discovering project-level context files (e.g., `CLAUDE.md`) that waste cache tokens on unnecessary context loading. New `setSubprocessCwd()` method on `AIService` and `SubprocessProvider`, wired into `generate`, `update`, `specify`, and `rebuild` commands
- **Detailed token and cache statistics in progress summary** — Progress reporting now shows separate lines for direct tokens (`in / out`), cached tokens (`read in / created in`), and combined totals, replacing the previous condensed format that only showed cache stats when cache reads were non-zero

## [1.1.2] - 2026-02-16

### Fixed
- **`npx are` commands fail outside ARE repo** — All command templates, skill files, installer permissions, and Codex prefix rules now use `npx agents-reverse-engineer` instead of `npx are`. The `are` binary is a bin alias inside the `agents-reverse-engineer` package — `npx` resolves by package name, so `npx are` only worked within the ARE repo itself (where `node_modules/.bin/are` exists) and failed with "could not determine executable to run" in any other project

## [1.1.1] - 2026-02-15

### Added
- **Dashboard skill and settings registered** — Added `/are-dashboard` skill file and `dashboard` Bash permission to Claude Code settings for native IDE integration
- **New `src/dashboard/` documentation** — Generated `AGENTS.md`, `CLAUDE.md`, and `AGENTS.claude.sonnet.md` for the dashboard module and its `views/` subdirectory

### Changed
- **Variant-aware skip filtering in generate command** — `--eval` mode now computes a preliminary `backend.model` variant and passes it to `createPlan()`, so skip checks correctly look for variant-namespaced artifacts (e.g., `file.ts.claude.sonnet.sum`, `AGENTS.claude.sonnet.md`) instead of the default filenames
- **Regenerated documentation across all modules** — Updated `AGENTS.md`, `CLAUDE.md`, and `AGENTS.claude.sonnet.md` files across 30+ directories with improved content

### Removed
- **Gemini CLI command templates** — Deleted `.gemini/ARE-VERSION` and all `.gemini/commands/are-*.toml` files (Gemini CLI commands no longer maintained as separate TOML files)

## [1.1.0] - 2026-02-15

### Added
- **`dashboard` command** — New `are dashboard` CLI command with telemetry analysis views: run summary table, per-entry drill-down (`--run <id>`), ASCII Gantt timeline from trace files (`--trace <id>`), cost & usage trends (`--trends`), and self-contained HTML report generation with Chart.js (`--format html`). Includes cost calculator, log/trace readers, and multiple view renderers (`src/dashboard/`)
- **Dashboard registered in installer and help** — `dashboard` command template added to all platform configs with full documentation in `/are-help`, including CLI examples and option reference
- **Multi-backend model reference in config template** — Default `config.yaml` now documents model identifiers for all four backends (Claude: `sonnet`/`opus`/`haiku`/`claude-opus-4-6`, Codex: `gpt-5.3-codex`/`gpt-5-codex-mini`, Gemini: `gemini-3-pro-preview`/`gemini-2.5-flash`, OpenCode: `provider/model` format)
- **Claude Sonnet documentation variant** — Generated `AGENTS.claude.sonnet.md` files across all project directories for Claude Sonnet-specific documentation consumption
- **Gemini 2.5 Flash documentation variant** — Generated `AGENTS.gemini.gemini-2.5-flash.md` files across all project directories
- **ccusage cost tracking hints** — Help and command templates now reference `ccusage` packages for viewing total session costs per runtime (Claude Code, Codex, OpenCode)

### Changed
- **AI model default switched from Gemini 3.0 Flash to Gemini 2.5 Flash** — Updated `config.yaml` model reference to use `gemini-2.5-flash`
- **Version banner suppressed for piped output** — `dashboard` command with `--format html` or `--format json` no longer prints the version banner, allowing clean pipe-to-file output
- **Config exclusion patterns expanded** — Added logs, subprocess logs, traces, and `GENERATION-PLAN.md` to `.gitignore`

### Removed
- **Gemini runtime hook and settings files** — Deleted `.gemini/hooks/are-check-update.js`, `.gemini/hooks/are-context-loader.js`, and `.gemini/settings.json` (Gemini CLI hooks no longer maintained separately)

## [1.0.1] - 2026-02-14

### Added
- **Gemini CLI integration files** — Added command templates (`.gemini/commands/are-*.toml`), hooks (`are-check-update.js`, `are-context-loader.js`), settings, and `ARE-VERSION` tracking file for the Gemini runtime

### Changed
- **Gemini backend prompt delivery switched from stdin to `-p` argument** — Prompt text is now passed as the value of the `-p` flag (`-p <prompt>`) instead of via stdin, matching Gemini CLI's expected interface where `-p`/`--prompt` requires the prompt as its argument. System prompt is folded into the prompt using XML tags since Gemini CLI has no `--system-prompt` flag. `composeStdinInput()` now returns an empty string

## [1.0.0] - 2026-02-14

### Added
- **Comprehensive backend integration guide** — New `docs/HOWTO-add-a-new-backend.md` with step-by-step instructions for adding a new AI CLI backend to ARE
- **Full AGENTS.md and CLAUDE.md documentation across all modules** — Generated 93 documentation files covering every source directory, providing AI-navigable context for the entire codebase
- **medium.com added to WebFetch permissions** — Expanded allowed domains in Claude Code settings

### Changed
- **Gemini backend promoted from experimental stub to full production** — Complete rewrite of `src/ai/backends/gemini.ts` with Zod schema validation for JSON output parsing, model alias resolution (ARE aliases like `sonnet`/`opus` mapped to Gemini equivalents), and token metrics extraction from `stats.models`
- **Command path utility refactored to shared module** — Extracted `isCommandOnPath()` from Claude backend into `src/ai/backends/common.ts`, used by all backends (Claude, Codex, Gemini, OpenCode) for consistent PATH detection
- **Skills enhanced with `--eval` option** — Generate and update skill files now support `--eval` flag for variant-specific output comparison

## [0.9.10] - 2026-02-14

### Added
- **Eval mode for variant-specific output** — New `--eval` flag namespaces output by `backend.model` for side-by-side comparison of documentation generated by different AI backends, with variant-specific paths for AGENTS.md and `.sum` files across 20 modified source files
- **Claude Code hooks and skills** — Added `are-check-update.js` update hook, `are-context-loader.js` context injection hook, and full set of Claude Code skill files (`are-init`, `are-discover`, `are-generate`, `are-update`, `are-specify`, `are-clean`, `are-rebuild`, `are-help`) under `.claude/skills/`
- **Blog site with 12 articles** — Added static blog site with uniquely styled articles and GitHub Pages deployment, including LinkedIn post versions trimmed to 3000-character limit

### Changed
- **AI service configuration updated** — Updated compression settings and model configuration in `config.yaml`
- **Additional directories added to exclusion list** — Expanded exclusion patterns in `config.yaml` to ignore more non-source directories during discovery

### Fixed
- **Repository link corrected** — Updated repository URL in configuration file and blog footer to point to correct GitHub location
- **Git status permission added** — Added `git status` command to allowed permissions in Claude Code settings

### Removed
- **Obsolete AGENTS.md and CLAUDE.md files** — Cleaned up 60 generated documentation files across `src/`, `.github/workflows/`, `hooks/`, and `scripts/` directories, eliminating outdated self-referential documentation

## [0.9.9] - 2026-02-13

### Added
- **Codex context-rule installation for AGENTS hierarchy loading** — `install --runtime codex` now writes a managed `AGENTS.override.md` rule file in both scopes: local installs create `./AGENTS.override.md` and global installs create `~/.codex/AGENTS.override.md`, so assistants load nearest `AGENTS.override.md`/`AGENTS.md` plus parent directories while working in a repo.

### Changed
- **Safe overwrite behavior for context rules** — `--force` now overwrites `AGENTS.override.md` only when the file contains ARE's managed marker, preventing accidental replacement of user-authored override files.
- **Codex uninstall now cleans up managed context rules** — `uninstall --runtime codex` now removes installer-managed `AGENTS.override.md` files (local and global) in addition to deleting `.codex/rules/are.rules`.
- **Discovery defaults now ignore context-rule files** — `AGENTS.override.md` and `**/AGENTS.override.md` are now excluded by default in `DEFAULT_EXCLUDE_PATTERNS` so installer-managed rules are not analyzed as source docs.

## [0.9.8] - 2026-02-13

### Added
- **Project-local npm cache configuration for npx reliability** — Added root `.npmrc` with `cache=.agents-reverse-engineer/.npm-cache` and updated `.gitignore` to exclude `.agents-reverse-engineer/.npm-cache/`, preventing failures caused by broken or permission-denied global `~/.npm` caches.

### Changed
- **Repository Codex model default updated** — Updated `.agents-reverse-engineer/config.yaml` to use `ai.model: gpt-5-nano` instead of `gpt-4o` for Codex runs in this project.

### Fixed
- **Codex response parsing no longer leaks reasoning content** — `src/ai/backends/codex.ts` now extracts output from `item.completed` entries where `item.type === "agent_message"` and ignores `reasoning` items, preventing thinking text from being written into generated `.sum`/`AGENTS.md` files.
- **Codex token usage is now captured from CLI events** — `src/ai/backends/codex.ts` now reads `turn.completed.usage` fields (`input_tokens`, `cached_input_tokens`, `output_tokens`) and reports normalized input/output/cache token counts instead of always logging zeros.

## [0.9.7] - 2026-02-13

### Changed
- **Codex subprocesses no longer force project-local `CODEX_HOME`** - ARE now runs Codex CLI with the ambient environment instead of auto-overriding `CODEX_HOME` to `./.codex` when that directory exists. This prevents auth context mismatches where the interactive Codex session is logged in but ARE subprocesses were routed to an unauthenticated local Codex home.
- **Bump skill now allows untracked files during release checks** - Release validation now treats untracked files as acceptable and only blocks when tracked/staged changes exist, matching real workflows where generated artifacts may be present but not committed.

## [0.9.6] - 2026-02-13

### Added
- **Codex install-time command exceptions via rules file** - `install --runtime codex` now creates `.codex/rules/are.rules` (or `~/.codex/rules/are.rules` for global installs) with `prefix_rule` entries for `npx are` commands and progress-log polling helpers (`rm -f .agents-reverse-engineer/progress.log`, `sleep`)

### Changed
- **Codex uninstall now removes installer-managed rules** - `uninstall --runtime codex` deletes the generated `are.rules` file and cleans empty `.codex/rules` directories
- **Installer path resolution now models Codex config root explicitly** - added `resolveCodexConfigPath()` to separate Codex CLI config location (`.codex`/`~/.codex`) from ARE skill installation paths (`.agents`/`~/.agents`)

## [0.9.5] - 2026-02-12

### Added
- **Repository-local `bump` skill under `.agents`** — Added `.agents/skills/bump/SKILL.md` to automate version validation, changelog extraction from commits, tagging, and GitHub release creation directly in the Codex `.agents` skill layout

### Changed
- **Removed forced npm cache overrides from update-check hooks** — `hooks/are-check-update.js` and `hooks/opencode-are-check-update.js` no longer inject `npm_config_cache` into detached update-check subprocesses
- **Codex templates no longer prepend `NPM_CONFIG_CACHE`** — `src/integration/templates.ts` now emits plain `npx are` / `npx agents-reverse-engineer` commands for Codex skills instead of forcing `.agents-reverse-engineer/.npm-cache`
- **Codex backend no longer hardcodes read-only sandbox flag** — `src/ai/backends/codex.ts` removed the forced `--sandbox read-only` argument so sandbox behavior follows Codex CLI defaults/configuration

## [0.9.4] - 2026-02-12

### Changed
- **Codex paths and docs moved to `.agents` layout** - Updated path handling and documentation references for Codex integrations to use the `.agents` directory structure

### Removed
- **Outdated OpenCode backend test file** - Removed stale OpenCode backend test coverage no longer aligned with current backend behavior

## [0.9.3] - 2026-02-12

### Added
- **Subprocess environment overrides for AI backends** — `runSubprocess()` now accepts optional per-call env overrides, and `SubprocessProvider` can pass backend-specific variables into spawned CLI processes
- **Automatic local `CODEX_HOME` fallback for Codex backend** — when running with backend `codex`, ARE now auto-uses project-local `.codex` as `CODEX_HOME` if present and no explicit `CODEX_HOME` is set

### Changed
- **Project config now defaults to Codex backend** — `.agents-reverse-engineer/config.yaml` now sets `ai.backend: codex` instead of `auto` for this repository

### Fixed
- **Directory task filtering in execution planning** — `buildExecutionPlan()` now always skips directories not present in `plannedDirs`, preventing unintended directory-phase work when no directory tasks are planned

## [0.9.2] - 2026-02-12

### Added
- **Dedicated npm caches for update-check hooks** — `hooks/are-check-update.js` and `hooks/opencode-are-check-update.js` now create runtime-local `npm-cache` directories and set `npm_config_cache` for detached npm version checks, avoiding failures from locked global npm caches

### Changed
- **Codex command templates now pin a local npm cache** — Codex template generation prefixes `npx are` and `npx agents-reverse-engineer` with `NPM_CONFIG_CACHE=.agents-reverse-engineer/.npm-cache`, improving reliability in Codex sessions
- **Codex backend invocation updated for current CLI behavior** — backend args now pass approval as global `-a never`, enable `--ephemeral`, and run `exec` in read-only sandbox mode for compatibility with newer `codex` releases
- **Generated config defaults updated for Codex workflows** — project config now excludes `.codex` in `vendorDirs`, and the default `ai.model` example is updated to `gpt-4o`

### Fixed
- **Bump skill command examples corrected** — `.codex/skills/bump/SKILL.md` now references `$bump <version>` syntax instead of `/bump <version>`

## [0.9.1] - 2026-02-12

### Added
- **Codex runtime support in installer** — `install`/`uninstall` now accept `--runtime codex`, interactive runtime selection now includes Codex, and `--runtime all` includes Codex in runtime iteration
- **Codex installer templates and paths** — Added Codex command template generation under `.codex/skills/are-*/SKILL.md` with `--backend codex` wiring, global/local path resolution via `CODEX_HOME` or `~/.codex`, and `.codex/ARE-VERSION` marker support
- **Repository-local `bump` skill for release automation** — Added `.codex/skills/bump/SKILL.md` with a step-by-step workflow for semver validation, commit-derived changelog extraction, tagging, pushing, and GitHub release creation

## [0.9.0] - 2026-02-12

### Added
- **Codex CLI backend support** — Added a new `CodexBackend` adapter (`src/ai/backends/codex.ts`) using `codex exec --json` with robust JSONL parsing and text-output fallback. Auto-detection and backend resolution now include Codex in registry priority order
- **Codex discoverability in defaults** — Added `.codex` to default vendor directory exclusions so Codex workspace metadata is ignored during file discovery and documentation generation

### Changed
- **Backend configuration now accepts `codex`** — Updated config schema enum and generated config comments to allow `ai.backend: codex` alongside existing backends
- **CLI and docs now list Codex backend option** — Updated command help text, command option docs, and README backend descriptions to include `codex` for `--backend`

## [0.8.13] - 2026-02-12

### Added
- **Directory processing metrics in summary reporting** — `generate` and `update` commands now display dirs processed, dirs failed, and dirs skipped counts alongside existing file metrics in the run summary. New `dirsProcessed`, `dirsFailed`, and `dirsSkipped` fields added to `RunSummary` interface

### Changed
- **Update command prints combined summary after directory regeneration** — Summary reporting in `update` deferred until after AGENTS.md regeneration completes, so the printed summary includes accurate directory counts and total duration covering both file analysis and directory phases
- **`ProgressReporter` uses `totalDurationMs` from `RunSummary`** — Elapsed time in summary output now comes from the caller-provided `totalDurationMs` field instead of an internal `startTime` timer, ensuring accurate duration measurement across multi-phase pipelines

### Removed
- **Deprecated findability validation module** — Removed `src/quality/density/` directory (`validateFindability()` stub, `FindabilityResult` type, and generated AGENTS.md/CLAUDE.md files) and its re-exports from `src/quality/index.ts`
- **Unused generation types** — Removed `AnalysisResult` and `SummaryOptions` interfaces from `src/generation/types.ts` (unused since v0.5.4 metadata simplification)
- **`ora` spinner dependency** — Removed `ora@8.1.1` from package.json dependencies (terminal spinner no longer used)

## [0.8.12] - 2026-02-12

### Changed
- **ARE context loader now walks full directory ancestry** — When Claude reads a file, the `are-context-loader.js` hook now walks from the file's directory up to (but not including) the project root, collecting all unseen ARE-generated AGENTS.md files along the path. Previously only the immediate directory's AGENTS.md was loaded. Context is injected in root-to-leaf order for hierarchical readability
- **Updated OpenCode backend documentation** — AGENTS.md files for `src/ai/` and `src/ai/backends/` updated to reflect OpenCode system prompt wrapping (`composeStdinInput()`), model alias resolution (`resolveModelForOpenCode()`), agent config injection (`ensureProjectConfig()`), and step-limit marker stripping. Capitalization normalized from `Opencode` to `OpenCode` throughout

## [0.8.11] - 2026-02-12

### Changed
- **OpenCode agent step limit increased from 3 to 5** — The `are-summarizer` agent configuration now allows 5 steps instead of 3, giving the model more room to produce complete documentation for larger files
- **Improved handling of OpenCode `MAXIMUM STEPS REACHED` marker** — When the agent hits its step limit, the marker is now stripped from the output and the content is preserved if it contains substantial documentation (>=100 chars). Previously any response containing the marker was rejected entirely, even when the model had already produced useful content before the limit

### Fixed
- **Removed misleading `--force` hint from generate command** — When all files are already documented, the log message now says "Nothing to do." instead of suggesting `--force` (which is not always the intended action)

## [0.8.10] - 2026-02-12

### Changed
- **Execution plan filters directory tasks to relevant entries only** — `buildExecutionPlan()` now collects planned directory paths from the filtered generation plan and skips directories not in that set, avoiding unnecessary AGENTS.md re-aggregation for directories whose children haven't changed. Improves incremental generation performance

## [0.8.9] - 2026-02-12

### Added
- **OpenCode step-limit meta-commentary detection** — When the OpenCode agent hits its step limit and produces "MAXIMUM STEPS REACHED" instead of actual content, a `PARSE_ERROR` is now thrown with a descriptive message instead of silently accepting the meta-commentary as documentation
- **OpenCode agent file removal during uninstallation** — `uninstall` now deletes the `are-summarizer.md` agent file from `.opencode/agents/` and cleans up the empty `agents/` directory
- **Additional uninstall permissions** — Added `rm -f .agents-reverse-engineer/progress.log*` and `sleep *` to the permission entries removed during uninstall, matching the full set registered during install

### Changed
- **OpenCode agent steps increased from 1 to 3** — The `are-summarizer` agent configuration now allows 3 steps instead of 1, giving the model more room to produce complete documentation before hitting the step limit
- **Context loader hook switched to ES modules** — `hooks/are-context-loader.js` converted from CommonJS (`require()`) to ES module syntax (`import from`), aligning with the project's `"type": "module"` setting

## [0.8.8] - 2026-02-12

### Added
- **OpenCode plugin infrastructure cleanup during uninstallation** — After removing ARE command files from `.opencode/`, the uninstaller now cleans up OpenCode's plugin infrastructure artifacts (`package.json`, `node_modules/`, `bun.lock`, `.gitignore`) when no other commands or plugins remain. Only applies to local installs to avoid disrupting shared global config directories

### Changed
- **Removed deprecated permission entries from `.claude/settings.json`** — Cleaned up legacy `permissions.allow` entries for ARE bash commands that are no longer needed

## [0.8.7] - 2026-02-12

### Added
- **OpenCode agent configuration for single-turn mode** — New `are-summarizer` agent config (`.opencode/agents/are-summarizer.md`) with tool restrictions (`"*": false`) and step limit (`steps: 1`), ensuring OpenCode runs in non-agentic mode when invoked by ARE. System prompts delivered via `<system-instructions>` XML tags in stdin through new `composeStdinInput()` method, working around OpenCode's lack of `--system-prompt` flag
- **ARE context loader hook** — New `hooks/are-context-loader.js` PostToolUse hook that fires after Read tool calls. When a read file's directory contains an ARE-generated AGENTS.md, it outputs the content as `additionalContext` for Claude, providing automatic per-directory context injection with session-level deduplication
- **`--debug` flag for `discover` command** — Discover command now accepts `--debug` for diagnostic output during file discovery

### Changed
- **Command syntax simplified to `npx are`** — All slash command skill files (Claude, Gemini, OpenCode), installer templates, and uninstall logic updated from `npx agents-reverse-engineer@latest` to the shorter `npx are` alias
- **`--backend` option shown in CLI help** — Added `--backend <name>` (claude, gemini, opencode, auto) to the general options section in CLI help text

## [0.8.6] - 2026-02-12

### Added
- **Model name resolution for OpenCode backend** — Short model aliases (`sonnet`, `opus`, `haiku`) are now automatically resolved to OpenCode's fully-qualified `provider/model` format (e.g., `sonnet` → `anthropic/claude-sonnet-4-5`). Model names already containing `/` are passed through unchanged

### Changed
- **Explicit `--backend` flag in all slash command templates** — All runtime-specific command templates (Claude skills, Gemini commands, OpenCode commands) now include `--backend <runtime>` explicitly in the command invocation (e.g., `--backend claude` for Claude skills, `--backend gemini` for Gemini commands, `--backend opencode` for OpenCode commands), ensuring the correct AI backend is always used regardless of auto-detection

## [0.8.5] - 2026-02-12

### Added
- **`--backend` CLI flag for all commands** — `generate`, `update`, `specify`, and `rebuild` commands now accept `--backend <name>` (e.g., `--backend claude`, `--backend gemini`, `--backend opencode`) to override the AI backend at the command level, taking precedence over the `config.ai.backend` setting
- **`BACKEND_FLAG` placeholder in command templates** — Slash command templates for all runtimes now inject `--backend <runtime>` automatically (e.g., Gemini commands pass `--backend gemini`), ensuring the correct backend is used when ARE is invoked from a specific runtime's slash command
- **`env` command permission** — Added `env` to Claude Code settings permissions for environment variable access

### Changed
- **Backend auto-detection simplified** — Removed `detectCallingRuntime()` process-tree walking function from `src/ai/registry.ts`. The `auto` backend mode now uses PATH-based detection only (Claude > Gemini > OpenCode), since the new `--backend` flag provides explicit runtime control without relying on `/proc` filesystem inspection

### Removed
- **Session end hook (`are-session-end.js`)** — Deleted the `hooks/are-session-end.js` file that automatically ran `are update` on session close. Users should run `/are-update` manually when needed

## [0.8.4] - 2026-02-12

### Added
- **Process-tree runtime detection for `auto` backend** — New `detectCallingRuntime()` function in `src/ai/registry.ts` walks Linux `/proc` process tree (up to 10 ancestors) to identify which AI runtime (claude, opencode, gemini) invoked ARE. When backend is `auto`, the calling runtime is now preferred over PATH-based detection, improving accuracy in multi-runtime environments
- **Slash command files for all runtimes** — Added ARE skill files (`.claude/skills/are-*/SKILL.md`), Gemini CLI commands (`.gemini/commands/are-*.toml`), and OpenCode commands (`.opencode/commands/are-*.md`) covering init, discover, generate, update, specify, clean, rebuild, and help. Added `ARE-VERSION` tracking files for all three runtimes

### Removed
- **Project plan context from file analysis prompts** — Removed `projectPlan` parameter from prompt building pipeline (`builder.ts`, `templates.ts`, `types.ts`, `orchestrator.ts`), simplifying prompt construction without affecting output quality

## [0.8.3] - 2026-02-12

### Changed
- **Commands delete stale progress logs before execution** — All command templates (generate, update, discover, specify, rebuild) now run `rm -f .agents-reverse-engineer/progress.log` before starting, preventing stale data from previous runs from being read during progress polling

### Removed
- **All session hooks and plugins** — Disabled hook/plugin installation for all runtimes (Claude Code, Gemini CLI, OpenCode) due to reliability issues. `ARE_HOOKS` and `ARE_PLUGINS` arrays now empty. Users should manually run `/are-update` when needed
- **Deprecated ARE slash command files** — Removed all ARE skill files from `.claude/skills/`, Gemini command files from `.gemini/commands/`, and OpenCode command files from `.opencode/commands/` along with associated `ARE-VERSION` files and update check hooks

## [0.8.2] - 2026-02-12

### Added
- **OpenCode backend with NDJSON parsing and cost calculation** — New `src/ai/backends/opencode.ts` implementation with comprehensive NDJSON response parsing, cost tracking for DeepSeek models, and token usage extraction from OpenCode CLI output. Includes 358 lines of test coverage in `test/ai/backends/opencode.test.ts`
- **Benchmark infrastructure for OpenCode** — Added `run-benchmark-opencode.sh`, `run-trial-opencode.sh`, and `analyze-opencode.ts` scripts for systematic ARE performance evaluation with OpenCode runtime. Includes JSON result logging with metrics and verification results for 3 trials (with-ARE and without-ARE configurations)
- **Benchmark documentation** — New `OPENCODE-IMPLEMENTATION.md`, `OPENCODE-JSON-FORMAT.md`, and `README-OPENCODE.md` documenting OpenCode integration details, output format specifications, and benchmark methodology
- **Enhanced telemetry logging** — Telemetry run logs now include `command` (discover/generate/update), `backend` (claude/gemini/opencode), and `model` fields for better tracking of usage patterns across different AI backends
- **Permission settings for development workflows** — Added `lsof` command permission, `git fetch`, and `git pull` commands to Claude Code settings for smoother development experience
- **OpenCode help commands and test permission** — Added OpenCode-specific help command templates and test execution permissions to settings

### Changed
- **GENERATED_MARKER refactored to GENERATED_MARKER_PREFIX** — Renamed constant to `GENERATED_MARKER_PREFIX` for version-agnostic generated file detection, improving compatibility across ARE versions
- **AGENTS documentation refactored** — Updated AGENTS.md files across multiple modules for improved clarity and consistency with current architecture
- **Updated OpenCode repository link** — README.md now points to correct OpenCode repository URL

### Fixed
- **VSCode settings .sum file exclusion** — Commented out `**/*.sum` exclusion in VSCode settings to allow viewing generated summary files when needed for debugging

### Removed
- **OpenCode session end hook** — Removed `opencode-are-session-end.js` hook in favor of improved update check mechanism via `opencode-are-check-update.js` (session end hooks proved unreliable with OpenCode's async execution model)

## [0.8.1] - 2026-02-11

### Changed
- **Unified orchestration architecture**: Merged `GenerationOrchestrator` and `UpdateOrchestrator` into single `DocumentationOrchestrator` in `src/orchestration/orchestrator.ts`, eliminating 735 lines of duplicate code and simplifying the two-phase pipeline
- **Configurable compression ratio**: Added `generation.compressionRatio` config field (0.1-1.0, default 0.25) controlling `.sum` file verbosity with aggressive compression instructions for large files. Lower values (0.1) produce more concise summaries; higher values (0.5+) preserve more details
- **Enhanced file prompt building**: `buildFilePrompt()` now accepts `sourceFileSize` and `compressionRatio` in `PromptContext`, dynamically adjusting compression instructions based on source file size
- **Pre-built prompts in update workflow**: `CommandRunner` now uses pre-built prompts for file tasks during incremental updates, improving consistency between generation and update operations

### Improved
- Enhanced AGENTS.md documentation across 40+ modules reflecting new orchestrator architecture and config schema
- Updated exclusion patterns in project config for refined analysis scope

## [0.8.0] - 2026-02-11

### Added
- **Public programmatic API** (`agents-reverse-engineer/core`) — New `src/core/index.ts` barrel export exposes the full engine (discovery, generation, update, quality, orchestration, config, change detection) as a library without CLI dependencies (`process.exit`, `ora`, `picocolors`). Package `exports` field in `package.json` maps `./core` to the new entry point
- **`AIProvider` interface** — Injectable abstraction for AI transport in `src/ai/types.ts`, allowing consumers to swap the underlying AI call mechanism (subprocess, HTTP API, in-memory mock) without changing the pipeline. `AIService` now accepts either an `AIBackend` or an `AIProvider`
- **`SubprocessProvider`** — Default `AIProvider` implementation in `src/ai/providers/subprocess.ts` that wraps the existing `runSubprocess()` + retry logic into the new provider interface
- **`Logger` interface** with `consoleLogger` and `nullLogger` — Decouples debug/warn/error output from direct `console.error` calls. Library consumers get zero output by default (`nullLogger`); CLI passes `consoleLogger` to preserve existing behavior
- **Gemini CLI command files** — Full set of `.gemini/commands/are-*.toml` files for clean, discover, generate, help, init, rebuild, specify, and update commands
- **OpenCode command files** — Complete `.opencode/commands/are-*.md` command documentation and `are-check-update.js` plugin for background update checks

### Changed
- **`AIService` refactored for provider abstraction** — Service methods now delegate to the injected `AIProvider` instead of directly calling `runSubprocess()`, simplifying the service layer and enabling custom transport implementations
- **Unused rate-limit detection and subprocess logging code removed** from `AIService` (moved to `SubprocessProvider`)

## [0.7.12] - 2026-02-11

### Added
- **`*.local.md` exclusion patterns** — Added `*.local.md` and `**/*.local.md` to `DEFAULT_EXCLUDE_PATTERNS` in `src/config/defaults.ts` and project `config.yaml`, preventing local markdown files (e.g., `AGENTS.local.md`, `CLAUDE.local.md`) from being discovered and documented during analysis

## [0.7.11] - 2026-02-11

### Added
- **Workflow & convention rule extraction in file analysis prompts** — `FILE_SYSTEM_PROMPT` now instructs the AI to extract contribution guidelines, PR conventions, commit standards, testing mandates, tool usage requirements, approval workflows, AI agent behavioral instructions, and code conventions (naming, formatting, linting) as explicit actionable rules from sources like CONTRIBUTING.md, CI configs, PR templates, and linter/formatter configs
- **"Workflow & Conventions" section type in directory AGENTS.md prompts** — `DIRECTORY_SYSTEM_PROMPT` includes new section type for collecting workflow rules from file summaries into actionable directives
- **Mandatory preservation of workflow rules in incremental updates** — `FILE_UPDATE_SYSTEM_PROMPT` and `DIRECTORY_UPDATE_SYSTEM_PROMPT` now mandate verbatim preservation of contribution guidelines, testing mandates, and code conventions unless the source file changed them
- **Exclusion review process in `/are-discover` skill** — After discovery, the skill now scans the generation plan for test files, CI/CD configs, tool configs, migrations, fixtures, type declarations, and Docker/infra files, presenting a summary table with proposed exclusion patterns and allowing multi-select exclusion via `AskUserQuestion`

## [0.7.10] - 2026-02-11

### Added
- **`--force` flag for `generate` command** — Forces full regeneration of all `.sum` and `AGENTS.md` files, skipping nothing. Without `--force`, generate now intelligently skips files with existing artifacts
- **Incremental generation (skip existing artifacts)** — `generate` command now checks for existing `.sum` files and generated `AGENTS.md` before processing, skipping files and directories that are already documented. Dirty propagation ensures parent directories are regenerated when any child file changes
- **Skip reporting in generate output** — Plan summary, dry-run output, progress log, and execution plan markdown now show counts of skipped files (existing `.sum`) and skipped directories (existing `AGENTS.md`)
- **Early exit when fully documented** — `generate` exits immediately with a hint to use `--force` when all files already have documentation artifacts

### Changed
- **`RunSummary.filesSkipped` reports actual count** — Previously hardcoded to 0, now reflects the number of files skipped due to existing `.sum` artifacts

## [0.7.9] - 2026-02-11

### Added
- **`--show-excluded` flag for `discover` command** — Excluded files are now hidden by default during discovery output; pass `--show-excluded` to display them (previously always shown)
- **`findProjectRoot()` for automatic config directory resolution** — All CLI commands (`discover`, `generate`, `update`, `specify`, `rebuild`, `clean`) now walk up from the target path to find the nearest `.agents-reverse-engineer/` directory, so commands work correctly when invoked from subdirectories
- **ARE update check hook** — New `.claude/hooks/are-check-update.js` performs background npm registry version checks on session start, writing results to `~/.claude/cache/are-update-check.json`
- **AGENTS.md documentation regenerated** — Comprehensive `AGENTS.md` and `CLAUDE.md` pointer files generated for all 30+ project directories

### Fixed
- **`specs/` directory excluded from version control** — Added `specs/` to `.gitignore` to prevent generated specification files from being committed

## [0.7.8] - 2026-02-11

### Changed
- **Claude backend switched from `bypassPermissions` to `allowedTools`** — Subprocess invocation now uses `--allowedTools Read Write` instead of `--permission-mode bypassPermissions`, pre-approving only the minimal required tools. This fixes subprocess execution when running as root, where `bypassPermissions` is blocked by Claude CLI

## [0.7.7] - 2026-02-10

### Changed
- **JSONC handling upgraded to `jsonc-parser` library** — Replaced custom `stripJsonc()` function with the `jsonc-parser` package for VS Code settings, Claude/Gemini hooks registration, and permission management. Settings file edits now use surgical `modify()`/`applyEdits()` operations that preserve existing comments and formatting instead of round-tripping through `JSON.parse()`/`JSON.stringify()`
- **Default exclude patterns expanded** — Added `.idea`, `.vscode`, and `benchmark` directories to default exclusion list in `config.yaml`

### Removed
- **Generated AGENTS.md and CLAUDE.md files cleaned up** — Removed 32 generated AGENTS.md documentation files from source directories and root CLAUDE.md to streamline the repository

## [0.7.6] - 2026-02-10

### Added
- **JSONC support in VS Code settings** — `are init` now handles VS Code `settings.json` files containing comments and trailing commas (JSONC format). New `stripJsonc()` function strips line/block comments and trailing commas before parsing; unparseable files are left untouched to avoid data loss
- **Benchmark due date prompt** — New `benchmark/prompts/duedate.md` prompt and `benchmark/verify-duedate.sh` verification script for evaluating due date feature implementation

### Changed
- **Benchmark infrastructure reorganized** — Prompts moved to `benchmark/prompts/` subdirectory (`prompt.md` → `prompts/tags.md`), verification scripts renamed with feature prefixes (`verify.sh` → `verify-tags.sh`)

### Fixed
- **Benchmark success rate label** — Corrected label text in `benchmark/analyze.ts` for clarity

## [0.7.5] - 2026-02-10

### Added
- **Companion CLAUDE.md pointer files** — Phase 2 directory synthesis now generates a deterministic `CLAUDE.md` alongside each `AGENTS.md`, using `@AGENTS.md` import syntax instead of AI-generated content. User-authored `CLAUDE.md` files are preserved as `CLAUDE.local.md` (with `@CLAUDE.local.md` import added automatically)
- **Benchmark infrastructure** — New `benchmark/` directory with E2E trial scripts (`run-benchmark.sh`, `run-trial.sh`, `setup.sh`, `verify.sh`, `analyze.ts`) for systematic ARE performance and quality evaluation across repositories

### Changed
- **Three-phase pipeline reduced to two phases** — Phase 3 (root document generation via AI call) eliminated. `CLAUDE.md` is now a lightweight `@`-import pointer generated deterministically during Phase 2, removing an entire AI call phase and simplifying the execution plan
- **`clean` command extended for CLAUDE.md** — Now discovers and deletes generated `CLAUDE.md` files (marker-checked), restores `CLAUDE.local.md` → `CLAUDE.md`, and reports CLAUDE.md counts separately in cleanup summary
- **Execution plan simplified** — `ExecutionTask.type` narrowed from `'file' | 'directory' | 'root-doc'` to `'file' | 'directory'`; `ExecutionPlan.rootTasks` removed; ~126 lines of Phase 3 runner code deleted from `src/orchestration/runner.ts`

## [0.7.4] - 2026-02-10

### Added
- **Auto-configure `.gitignore` and VS Code on `are init`** — `init` command now automatically adds `*.sum` to `.gitignore` and sets `**/*.sum` in `.vscode/settings.json` `files.exclude`, hiding generated summary files from git tracking and the VS Code explorer
- **CONTRIBUTING.md** — Added contribution guidelines with development setup instructions
- **README badges and compatibility section** — Added npm downloads, GitHub stars, and last commit badges; new "Works with" section showing compatible AI tools (Claude Code, Gemini CLI, OpenCode, any AGENTS.md tool)
- **Comprehensive AGENTS.md documentation** — Generated navigational indexes for all 32 project directories covering orchestration, quality, rebuild, specify, update, and other subsystems

### Changed
- **Annex file extension changed from `.annex.md` to `.annex.sum`** — Annex files now use the `.sum` extension family (e.g., `foo.ts.annex.md` → `foo.annex.sum`), aligning with the `*.sum` gitignore pattern so a single glob catches all generated summary artifacts
- **`clean` command simplified** — Single `**/*.sum` glob now catches both `.sum` and `.annex.sum` files, removing the separate `**/*.annex.md` discovery pass
- **Orphan cleaner updated for new annex naming** — `cleanupOrphans()` and `cleanupEmptyDirectoryDocs()` use `.annex.sum` extension with simplified `.endsWith('.sum')` check for skipping generated files
- **README configuration documentation updated** — Removed deprecated `verbose`, `costThresholdUsd`, and custom `pricing` options; updated concurrency range from 1-10 to 1-20 with auto-detection note; simplified `discover` command description
- **npm package keywords expanded** — Added `claude-code`, `gemini-cli`, `opencode`, `agents-md`, `code-documentation`, `ai-documentation`, `codebase-analysis`, `developer-tools`, `cli`, `llm` for better discoverability

## [0.7.3] - 2026-02-10

### Changed
- **Claude CLI JSON output parser rewritten for multi-format support** — New `extractResultJson()` method in `ClaudeBackend` handles three output formats: JSON array (CLI >= 2.1.38), NDJSON (newline-delimited JSON objects), and legacy single-object (CLI <= 2.1.31). Replaces the previous naive "find first `{`" approach with a strategy-based parser that locates the `{"type":"result",...}` object regardless of output format
- **ClaudeResponseSchema hardened with `.passthrough()`** — Zod schema for Claude CLI response now uses `.passthrough()` on nested objects (`usage`, `modelUsage` entries, and root) so new fields added by future CLI versions don't cause validation failures
- **Schema documentation updated** — JSDoc on `ClaudeResponseSchema` and `parseResponse()` now documents NDJSON and JSON array formats alongside the legacy single-object format

## [0.7.2] - 2026-02-10

### Added
- **Tracing support for `specify` command** — `--trace` flag now emits `phase:start/end` trace events, creates subprocess log directories, and wires tracer into AIService for full subprocess/retry visibility during spec generation
- **File Manifest section in spec prompts** — New section 12 ("File Manifest") in specification synthesis lists every source file with path, module, and exports; each Build Plan phase must reference which manifest entries it produces
- **Per-phase file manifest injection in rebuild** — `extractManifestEntriesForPhase()` matches File Manifest lines against each phase's `Defines:` symbols and injects a "Files to Generate in This Phase" context section into rebuild prompts

### Fixed
- **Rebuild output parser delimiter collision** — Replaced regex-based `===FILE:===`/`===END_FILE===` parser with line-by-line state machine requiring delimiters at column 0 (start of line), preventing false matches when generated source code contains literal delimiter text in string literals, JSDoc, or prompt templates. Also handles unclosed file blocks gracefully (AI forgot `===END_FILE===`)

## [0.7.1] - 2026-02-09

### Added
- **`--model` option for all CLI commands** — `generate`, `update`, `specify`, and `rebuild` commands now accept `--model <name>` to override the AI model at the command level (e.g., `are generate --model sonnet`)
- **`/are-rebuild` skill** for IDE integration — project reconstruction from specification documents with background execution and progress polling
- **Rebuild command in installer templates** — `rebuild` command template added to `COMMANDS` object for skill file generation across all platforms (Claude, OpenCode, Gemini) with full options, usage, and how-it-works documentation
- **Rebuild command in `/are-help`** — help reference updated with rebuild command documentation

### Changed
- Rebuild spec reader enhanced with improved context accumulation — better section partitioning and handling of spec files for more accurate rebuild unit extraction
- Rebuild orchestrator enhanced with compliance tracking — accumulated context (export signatures) passed between rebuild groups for cross-file coherence
- Rebuild and specify prompts updated with stricter compliance and context instructions
- `rebuild/` directory added to `.gitignore`

## [0.7.0] - 2026-02-09

### Added
- **`rebuild` command** — New CLI command (`are rebuild`) that reconstructs source code from specification documents in `specs/`. Reads and partitions specs into rebuild units from Build Plan phases or top-level headings, processes them with ordered concurrent execution via worker pools, and writes generated files to an output directory
- **Rebuild checkpoint manager** — Persistent session continuity for rebuild operations with `CheckpointManager` class supporting load/createFresh static factories, markDone/markFailed/getPendingUnits tracking, spec drift detection via SHA-256 hash comparison, and promise-chain write serialization
- **Rebuild output parser** — Handles `===FILE:===` delimited multi-file AI output with fenced code block fallback for single-file responses
- **Rebuild prompt templates** — `REBUILD_SYSTEM_PROMPT` with delimiter format instructions and `buildRebuildPrompt` combining full spec, current phase, and accumulated build context (export signatures extracted after each group)
- **Conflict detection for `specify` command** — Early exit when spec files already exist to avoid waiting for an AI call; `--force` flag overrides the check

### Changed
- AI service default timeout increased from 300s (5 minutes) to 1200s (20 minutes) for longer specification and rebuild operations
- Orphan cleanup now includes `.annex.md` files when their source file is deleted/renamed, and skips `.annex.md` files when checking for remaining source files in empty directory cleanup
- Rebuild CLI handler supports `--output`, `--force`, `--dry-run`, `--concurrency`, `--fail-fast`, `--debug`, `--trace` flags with 15-minute minimum timeout and exit codes 0/1/2 for success/partial/total failure
- Full documentation regeneration with updated `.sum` and `AGENTS.md` files

## [0.6.6] - 2026-02-09

### Added
- **Annex file system** for reproduction-critical content — files containing large string constants (prompt templates, config arrays, IDE templates) now generate companion `.annex.md` files alongside `.sum` files, preserving full verbatim source content that cannot fit within summary word limits
- `collectAnnexFiles()` utility in `src/generation/collector.ts` — recursively walks project tree to collect all `.annex.md` files for consumption by the `specify` command
- Annex-aware file analysis prompts — `FILE_SYSTEM_PROMPT` includes new "REPRODUCTION-CRITICAL CONTENT (ANNEX OVERFLOW)" section instructing the LLM to identify constants needing verbatim preservation and list them in `## Annex References` sections
- Annex reference linking in directory AGENTS.md — directory prompts detect `.annex.md` files and link to them; `DIRECTORY_SYSTEM_PROMPT` includes "Reproduction-Critical Constants" section type
- Annex content in specification synthesis — `buildSpecPrompt()` accepts optional annex files, adds them as a dedicated "Annex Files" section in the user prompt, and mandates verbatim reproduction in spec sections 10 (Prompt Templates) and 11 (IDE Integration)
- `prepack` script in package.json — removes `LICENSE.sum` and `README.md.sum` before npm pack to keep published tarball clean

### Changed
- `clean` command now discovers and deletes `*.annex.md` files alongside `.sum` files, with annex count displayed in cleanup summary
- `specify` command collects annex files and includes them in dry-run token estimates and progress log metadata
- Orphan cleaner (`src/update/orphan-cleaner.ts`) now deletes `.annex.md` files when their source file is deleted/renamed, and skips `.annex.md` files when checking for remaining source files in empty directory cleanup
- `CommandRunner` automatically writes annex files when AI response contains `## Annex References` section (both initial generation and incremental update paths)
- Spec prompt adds two new required sections: "10. Prompt Templates & System Instructions" and "11. IDE Integration & Installer" with mandatory verbatim reproduction from annex content
- `npm pack` command added to Claude Code settings allowlist

## [0.6.5] - 2026-02-09

### Added
- **Behavioral contract preservation in summaries** — File analysis prompts now mandate verbatim inclusion of regex patterns, format strings, magic constants, sentinel values, environment variable names, and output templates. New "BEHAVIORAL CONTRACTS (NEVER EXCLUDE)" section in `FILE_SYSTEM_PROMPT` ensures reproduction-critical patterns survive summarization
- **Behavioral Contracts section in directory AGENTS.md** — Directory aggregation prompts include mandatory "Behavioral Contracts" section when file summaries contain regex, format specs, or constants; incremental update prompts preserve these verbatim
- **Version display in all skill commands** — Every `/are-*` skill now reads `ARE-VERSION` file and displays `agents-reverse-engineer vX.Y.Z` before execution. Platform-specific `versionFilePath` added to `PlatformConfig` (`.claude/ARE-VERSION`, `.opencode/ARE-VERSION`, `.gemini/ARE-VERSION`)
- **`specs/SPEC.md` generated** — First project specification synthesized from AGENTS.md corpus via `are specify`

### Changed
- Summary target length increased from 200-300 words to 300-500 words to accommodate behavioral contract content (`SUMMARY_GUIDELINES.targetLength`)
- "Internal implementation details" exclusion replaced with more precise "Control flow minutiae (loop structures, variable naming, temporary state)" in both `FILE_SYSTEM_PROMPT` and `SUMMARY_GUIDELINES`
- Specification synthesis prompt (`src/specify/prompts.ts`) now splits Behavioral Contracts into "Runtime Behavior" and "Implementation Contracts" subsections, requiring verbatim regex patterns and magic constants
- Stale progress log clearing (`rm -f progress.log`) removed from all skill templates, replaced with version display step
- Per-file descriptions in directory prompts clarified as belonging to "Contents sections" only; behavioral contracts directed to separate dedicated section

## [0.6.4] - 2026-02-09

### Added
- **Incremental update prompts** — `update` command now passes existing `.sum` content and `AGENTS.md` content to AI prompts with update-specific system prompts (`FILE_UPDATE_SYSTEM_PROMPT`, `DIRECTORY_UPDATE_SYSTEM_PROMPT`) that instruct the AI to preserve stable text and only modify sections affected by code changes
- **`--force` flag for `init` command** — `are init --force` overwrites existing configuration instead of warning about existing `config.yaml`
- **Claude Code skills** — Added `/are-init`, `/are-discover`, `/are-generate`, `/are-update`, `/are-clean`, `/are-specify`, `/are-help` as `.claude/skills/` SKILL.md files for native IDE integration
- **Centralized version module** (`src/version.ts`) — `getVersion()` extracted from CLI and installer banner into shared module; version now included in `RunSummary` output

### Changed
- Progress monitoring in skills and settings switched from `tail -f` to `sleep`-based polling for better compatibility with buffered environments
- `ProgressReporter` enhanced with real-time build log streaming, ETA calculation, and improved console formatting
- `CommandRunner` refactored with `RunSummary` and `FileTaskResult` types for improved execution metrics and type safety
- Quality validation in orchestration module now non-blocking — errors during quality checks no longer abort the run

## [0.6.3] - 2026-02-09

### Added
- Auto-detection of default concurrency based on system CPU cores and available memory — `getDefaultConcurrency()` computes `clamp(cores * 5, 2, min(memCap, 20))` where memCap allocates 50% of system RAM at 512MB per subprocess
- Permission entries for viewing (`tail -5`) and removing (`rm -f`) progress logs added to Claude Code installer permissions
- Phantom path validation `.sum` files and `AGENTS.md` documentation for the `src/quality/phantom-paths/`, `src/specify/`, `src/types/`, and `src/update/` directories

### Changed
- Default concurrency changed from static `5` to auto-detected value based on system resources (CPU cores and memory)
- Maximum concurrency limit increased from 10 to 20
- Generated `config.yaml` now shows auto-detected concurrency value and comments out the field by default instead of hardcoding `5`
- Affected directories in `update` command now sorted by depth descending (deepest first) so child AGENTS.md files are regenerated before their parents
- Configuration schema refactored with improved Zod validation defaults and `getDefaultConcurrency` as schema default function

## [0.6.2] - 2026-02-09

### Added
- ProgressLog integration in `discover` command for real-time `tail -f` monitoring — mirrors file discovery output, exclusion details, and plan generation status to `.agents-reverse-engineer/progress.log`
- `specify` command template with full documentation in skill help — includes argument hints, execution steps with background polling, and CLI examples

### Changed
- Command templates for `generate`, `update`, and `discover` updated with background execution and progress polling pattern — commands now run with `run_in_background: true` and poll `progress.log` every 10-15 seconds for real-time status updates
- `discover` command arguments simplified: removed `--plan` and `--show-excluded` flags (plan generation and excluded file display are now always enabled), replaced with `--debug` and `--trace`
- Help documentation updated to reflect new `specify` command and revised `discover` options

## [0.6.1] - 2026-02-09

### Added
- **`ProgressLog` class** for real-time `tail -f` monitoring — mirrors all console progress output to `.agents-reverse-engineer/progress.log` as ANSI-stripped plain text, enabling live monitoring in buffered environments (e.g. Claude Code's Bash tool)
- ProgressLog integrated into `generate`, `specify`, and `update` commands with run header (timestamp, project path, task counts) and full summary output
- `/are-specify` and `/are-clean` commands added to post-install next steps banner

### Changed
- README updated with `/are-specify` command documentation — added to workflow steps, CLI command table, and AI assistant commands table

## [0.6.0] - 2026-02-09

### Added
- **`specify` command** — New CLI command (`are specify`) that generates a project specification document from existing AGENTS.md documentation by collecting all AGENTS.md files, synthesizing them via AI, and writing a comprehensive spec to disk. Supports `--output` path, `--force` overwrite, `--dry-run` preview, `--multi-file` output mode, and `--debug`/`--trace` flags
- Shared `collectAgentsDocs()` utility (`src/generation/collector.ts`) — reusable function that walks the project tree and collects all AGENTS.md file contents, used by both root prompt building and the new specify command
- Spec generation prompt templates (`src/specify/prompts.ts`) for specification synthesis from collected documentation
- Spec output writer (`src/specify/writer.ts`) with overwrite protection (`SpecExistsError`) to prevent accidental overwrites
- ETA calculation in progress reporting — directory and root tasks now show estimated time remaining based on elapsed time and completed task ratio
- Cache creation tokens tracked in progress reporting and `FileTaskResult`/`RunSummary` interfaces

### Changed
- `buildRootPrompt()` refactored to use shared `collectAgentsDocs()` instead of inline AGENTS.md collection logic

### Fixed
- `--dry-run` in specify command no longer triggers auto-generation fallback — dry-run check moved before the auto-generate code path
- Removed language-specific `readPackageSection()` from specify prompts (tool is language-agnostic)

## [0.5.5] - 2026-02-09

### Added
- Phantom path detection in generated AGENTS.md files — post-Phase 2 validation scans all directory AGENTS.md for path-like references (`src/...`, `../...`, markdown links) that don't resolve to real files, reporting them as warnings via the inconsistency reporter
- Import map extraction module (`src/imports/`) — regex-based extractor parses TypeScript/JavaScript import statements from source files, classifying them as internal (`./`) or external (`../`) and formatting them as structured text for directory prompts
- Project directory structure context passed to directory AGENTS.md prompts — `buildDirectoryPrompt()` accepts a `projectStructure` parameter so the AI sees the real directory tree

### Changed
- Directory AGENTS.md system prompt includes "Path Accuracy" rules — AI must use only paths from the import map and exact directory names from the project structure, never inventing or renaming module paths
- Directory AGENTS.md system prompt includes "Consistency" rules — prevents self-contradictions within the same document (e.g., describing a technique as "regex-based" then calling it "AST-based")
- `RunSummary` now tracks `phantomPaths` count alongside `inconsistenciesCodeVsDoc` and `inconsistenciesCodeVsCode`
- `InconsistencyReport.counts` includes `phantomPaths` field
- `Inconsistency` union type extended with `PhantomPathInconsistency`

## [0.5.4] - 2026-02-09

### Changed
- File analysis prompts now enforce structured output format — bold purpose statement as first line (`**FileName does X.**`), mandatory exported symbols section, and explicit anti-preamble instructions preventing LLM meta-commentary
- Root CLAUDE.md prompt clarifies scope boundaries — comprehensive project reference with architecture and build instructions, referencing (not duplicating) directory-level AGENTS.md content
- Directory AGENTS.md prompts refocused as navigational indexes — 1-2 sentence per-file and per-subdirectory descriptions, no full architecture sections (those belong in root CLAUDE.md)
- `stripPreamble()` function added to runner — detects and removes common LLM preamble patterns (separator-based and bold-line detection) from AI responses before writing `.sum` files
- `extractPurpose()` now skips LLM preamble lines (e.g., "Now I'll...", "Based on my analysis...") and strips bold markdown wrappers from purpose text

### Removed
- `publicInterface`, `dependencies`, and `patterns` arrays from `SummaryMetadata` type and `.sum` file frontmatter — these fields were unused after adaptive prompt changes in v0.5.2
- `validateFindability()` implementation gutted (returns empty array) since it depended on the removed `publicInterface` metadata; function signature preserved for future re-implementation
- `checkCodeVsDoc()` no longer checks for documented items missing from source code (`missingFromCode` always empty); only undocumented exports are reported

## [0.5.3] - 2026-02-09

### Added
- Runtime root prompt builder (`buildRootPrompt()`) — collects all AGENTS.md files and package.json metadata at runtime, embedding full context directly in the root CLAUDE.md prompt instead of relying on static placeholder text
- `ROOT_SYSTEM_PROMPT` template with anti-hallucination constraints — instructs the LLM to synthesize only from provided AGENTS.md content and never invent features or APIs
- Cache token tracking in telemetry — `cacheReadTokens` and `cacheCreationTokens` fields added to `FileTaskResult`, `RunSummary`, and telemetry logger summary
- Cache statistics display in progress summary — shows cache read/created token counts when prompt caching is active

### Changed
- `clean` command now preserves user-authored AGENTS.md files by checking for `GENERATED_MARKER` before deleting; non-ARE AGENTS.md files are listed as "Preserving user-authored" in output
- Root CLAUDE.md generation moved from static inline prompts in `executor.ts` to runtime prompt building via `buildRootPrompt()` in `runner.ts` Phase 3
- Progress reporter displays effective input tokens (non-cached + cache read) per file and shows separate cache line in run summary
- Plan task count now correctly includes the root CLAUDE.md task (+1 in orchestrator trace event)
- Root doc AI call uses `maxTurns: 1` since all context is embedded in prompt (no tool use needed)

## [0.5.2] - 2026-02-08

### Added
- Project structure context in file analysis — `buildProjectStructure()` builds a compact directory-grouped file listing passed to every file prompt via `projectPlan`, giving the AI bird's-eye context of the entire codebase
- User-defined AGENTS.md preservation — non-ARE AGENTS.md files are renamed to AGENTS.local.md and user content is prepended verbatim above generated content; directory prompt builder also detects user-authored AGENTS.md and includes it as context
- Manifest file detection in directory prompts — `buildDirectoryPrompt` detects package.json, Cargo.toml, go.mod, etc. and adds a "Directory Hints" section indicating package roots
- `.agents` directory and `**/SKILL.md` added to default exclude patterns

### Changed
- File analysis prompts rewritten to be adaptive — instead of a fixed 5-section template (Purpose/Exports/Dependencies/Patterns/Related), prompts now instruct the AI to choose documentation topics most relevant to each specific file
- Directory AGENTS.md prompts rewritten with adaptive sections — instead of a fixed Contents/Subdirectories/How Files Relate template, the AI selects from architecture, stack, structure, patterns, configuration, API surface, and file relationships
- Removed mandatory "Library & Dependency Statistics" and "Common Patterns" prompt sections in favor of adaptive topic selection
- YAML config generation now properly quotes glob patterns containing special characters (`*`, `[`, `]`, etc.) via `yamlScalar()` helper in `loader.ts`
- `writeAgentsMd` now reads existing AGENTS.local.md from previous runs and prepends user content above generated content with a separator
- `GENERATED_MARKER` and `isGeneratedAgentsMd` exported from `agents-md.ts` for reuse in prompt builder
- `update` command now reads GENERATION-PLAN.md for project structure context, matching `generate` behavior

## [0.5.1] - 2026-02-08

### Added
- `--model` option for `generate` and `update` commands — set a default AI model (e.g., `sonnet`, `opus`) at the service level, with per-call override support
- Lock file exclusion patterns — `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`, `Cargo.lock`, `poetry.lock`, `composer.lock`, `go.sum`, and `*.lock` added to default exclude patterns
- Dotfile and generated artifact exclusion — `.gitignore`, `.gitattributes`, `.gitkeep`, `.env`, `*.log`, `*.sum` moved from binary extensions to glob-based exclude patterns for correct matching

### Changed
- `clean` command now restores `AGENTS.local.md` → `AGENTS.md` (undoes the rename performed during generation), with restore count reported in summary
- Directory prompt builder now filters child directories against the known plan directories, skipping directories not in the generation plan instead of throwing on missing `AGENTS.md`
- Root doc generation (CLAUDE.md) prompts rewritten to suppress conversational preamble — system prompt enforces raw markdown output only
- Runner strips LLM preamble from root doc output before writing (detects text before first `# ` heading)
- Phase 2 (directory docs) and Phase 3 (root docs) now correctly report `tasksFailed` in trace events instead of always reporting 0

## [0.5.0] - 2026-02-08

### Added
- `clean` command to delete all generated documentation artifacts (`.sum`, `AGENTS.md`, generation plan)
- Shared file discovery function (`src/discovery/run.ts`) consolidating duplicated discovery logic across commands

### Changed
- Major codebase simplification — removed 6,500+ lines of unused or over-engineered code
- Streamlined orchestrator and prompt builder by removing architectural pattern detection layer
- Simplified CLI options: removed `--verbose`, `--quiet`, and deprecated JSON output flags
- Simplified init command by removing inline options parameter
- Enhanced debug logging in prompt building functions for better troubleshooting
- Updated CLI documentation to include `clean` command and remove duplicate options

### Removed
- Token budget system (`chunker`, `counter`, `tracker`) — unused complexity
- Pricing engine and cost estimation (`src/ai/pricing.ts`) — not needed for core functionality
- Architectural pattern detection (`src/generation/detection/`) and complexity analysis
- Supplementary document writers (`STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`) — per-package documents removed in favor of simpler `AGENTS.md`-only approach
- Chunk and synthesis prompt functions
- Code-vs-doc quality analysis (`extractExports`, `checkCodeVsDoc`)
- File type detection and related metadata from generation process
- `disallowedTools` and `settings` from Claude backend options

## [0.4.11] - 2026-02-08

### Added
- Improved `/bump` command with automatic changelog extraction from git commits (Phase 2: analyzes git log, categorizes changes, extracts concrete details)

### Changed
- Detailed changelog entries added retroactively for v0.4.9 and v0.4.7 (no more "Version bump" placeholders)

### Fixed
- Init command now properly includes `DEFAULT_EXCLUDE_PATTERNS` in generated config.yaml instead of empty patterns array

## [0.4.10] - 2026-02-08

### Added
- `DEFAULT_EXCLUDE_PATTERNS` constant for AI-generated documentation files (AGENTS.md, CLAUDE.md, OPENCODE.md, GEMINI.md)
- Exclusion patterns now applied by default to prevent analyzing AI-generated files

### Changed
- AI subprocess timeout increased from 120s to 300s (5 minutes) for better handling of large files
- Telemetry log retention increased from 10 to 50 runs for better debugging history
- Exclusion patterns moved from `binaryExtensions` to dedicated `patterns` field with proper glob matching
- Enhanced README with detailed configuration documentation
- Improved init command with better default configuration

## [0.4.9] - 2026-02-08

### Added
- File path deduplication in execution plan markdown formatting for cleaner output

### Changed
- Maximum concurrency limit increased from 5 to 10 for better performance on capable systems
- Default concurrency restored from 2 to 5 for balanced resource usage
- Debug logging in subprocess execution commented out for cleaner output (logs still available with `--debug`)

## [0.4.8] - 2026-02-08

### Added
- Subprocess resource management controls — environment variables (`NODE_OPTIONS`, `UV_THREADPOOL_SIZE`, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`) to limit memory usage and thread spawning in WSL/resource-constrained environments
- Process group termination — `kill(-pid)` ensures entire subprocess tree is terminated, not just parent
- Concurrency default reduced from 5 to 2 for better resource management on WSL/limited environments

### Changed
- Improved subprocess lifecycle management with enhanced cleanup and resource constraints

## [0.4.7] - 2026-02-08

### Added
- Active subprocess tracking with detailed process lifecycle logging
- Enhanced subprocess management with PID tracking and memory usage monitoring
- Detailed logging for subprocess spawn, exit, and resource consumption

## [0.4.6] - 2026-02-08

### Added
- Subprocess output logging capability (`--debug` flag captures stdout/stderr from AI subprocesses for better debugging)
- Subprocess isolation — subprocesses are now prevented from spawning subagents and background tasks are disabled

## [0.4.5] - 2026-02-08

### Fixed
- Timeout errors no longer trigger retries — previously a timed-out subprocess (120s) would retry 3 more times, spawning heavyweight processes on an already struggling system and potentially freezing the host
- SIGKILL escalation after SIGTERM timeout — if a subprocess doesn't exit within 5s of SIGTERM, SIGKILL is sent to prevent hung/zombie processes

### Changed
- `subprocess:spawn` trace events now emit at actual spawn time instead of after subprocess completion, making trace files accurately reflect concurrent process activity
- `--debug` flag now logs active subprocess count, heap/RSS memory usage, PID, exit code, and duration for every subprocess spawn and exit
- Timeout and retry warnings now always print to stderr (not gated behind `--debug`) for visibility into transient failures

## [0.4.4] - 2026-02-08

### Added
- Concurrency tracing system (`--trace` flag) for subprocess lifecycle and task management with NDJSON output
- `--debug` and `--trace` flags to generate and update command argument options
- `ITraceWriter` interface with `NullTraceWriter` and `TraceWriter` implementations for structured trace events
- Trace events for phase lifecycle, worker management, task processing, subprocess spawn/exit, and retries

## [0.4.3] - 2026-02-08

### Added
- OpenCode integration plugins: session-end hook and update-check plugin for automatic documentation updates
- Bounded concurrency for file processing with configurable worker pools
- Token estimation in chunking and orchestration for better budget management

## [0.4.2] - 2026-02-07

### Added
- `computeContentHashFromString` function for in-memory hash computation without writing temporary files
- `PlanTracker` for real-time progress tracking in GENERATION-PLAN.md during documentation generation

### Changed
- Optimized directory processing with parallel file reads in orchestration runner

### Fixed
- Command syntax in documentation and installer messages now consistent across README, docs, and CLI output

## [0.4.1] - 2026-02-07

### Fixed
- `/are-generate` skill now delegates to CLI (`npx agents-reverse-engineer generate`) instead of using an embedded prompt-based workflow — consistent with all other ARE commands
- `/are-clean` skill now deletes all per-package documents (`STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`) instead of only `STACK.md`
- `/are-help` updated to reflect current CLI capabilities: removed deprecated `--execute`/`--stream` flags, added `--concurrency`/`--fail-fast`, added missing `CONCERNS.md` to generated files list
- Quick Start and Common Workflows in help no longer reference the removed `discover --plan` step

## [0.4.0] - 2026-02-07

### Added
- **AI Service Layer** — New backend abstraction with Claude, Gemini, and OpenCode adapters, auto-detection, and Zod response parsing
- **Orchestration Engine** — Concurrent command runner with configurable concurrency pool, progress reporting, and `--concurrency`, `--fail-fast`, `--debug` CLI flags
- **Cost Estimation** — Pricing engine with per-model token costs, cost thresholds, and unknown model warnings
- **Full Telemetry** — Track file sizes, token usage, and cost per run with dashboard display in `printSummary`
- **Quality Analysis** — Code-vs-doc drift detection (`extractExports`, `checkCodeVsDoc`), cross-file inconsistency detection wired into generate/update pipeline
- **Density-Aware Prompts** — Anchor term preservation and hierarchical deduplication in AGENTS.md builder
- **LLM-Generated Content** — Integrate LLM-generated content into AGENTS.md writing process with directory-level prompt generation
- **Findability Validator** — Validates generated documentation meets findability criteria

### Changed
- Rewrote `generate` command to use AIService + CommandRunner for real AI-powered analysis
- Rewrote `update` command to use AIService for real analysis instead of stubs
- Rewrote `discover` command for consistency with new orchestration layer

### Fixed
- Relative paths now correctly returned in `UpdateOrchestrator`
- Improved directory checks in orphan cleaner

## [0.3.6] - 2026-02-03

### Fixed
- Gemini CLI commands now use TOML format (`.toml` files) instead of markdown, matching Gemini CLI's expected format
- Gemini commands now installed to `.gemini/commands/are/{cmd}.toml` for proper `/are:*` namespace

### Changed
- Uninstall now cleans up legacy Gemini markdown files from previous installations

## [0.3.5] - 2026-02-03

### Changed
- Renamed `VERSION` file to `ARE-VERSION` to avoid conflicts with other tools in `.claude/` directory

## [0.3.4] - 2026-02-03

### Removed
- Unused SQLite database module (`src/state/`) and `better-sqlite3` dependency - state is managed via `.sum` file frontmatter
- Dead code: `writeClaudeMd`, `writeGeminiMd`, `writeOpencodeMd` functions and related files
- Dead code: `estimatePromptOverhead` function from budget module

## [0.3.3] - 2026-02-03

### Changed
- Enhanced `/are:help` command with comprehensive documentation including all options, workflows, and generated file details
- Updated generate skill to document per-package files (`STACK.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `INTEGRATIONS.md`) at manifest locations

## [0.3.2] - 2026-02-02

### Changed
- Refactored Claude Code command generation to use new skills format (`.claude/skills/are-{command}/SKILL.md`)
- OpenCode and Gemini CLI continue using commands format unchanged

## [0.3.1] - 2026-02-02

### Added
- Support for Go and Rust package manifests (`go.mod`, `Cargo.toml`) for enhanced analysis and documentation generation
- `LANGUAGES-MANIFEST.md` document listing package manifest files by language
- Package root details and supplementary documentation in generated output
- New documentation files: `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`

## [0.3.0] - 2026-02-02

### Added
- **GEMINI.md and OPENCODE.md root documents** — Runtime-specific root documents generated alongside CLAUDE.md for Gemini CLI and OpenCode users
- **Content hash for change detection** — `.sum` files now include a `content_hash` field to detect file changes without relying solely on timestamps
- **User-defined file preservation** — Generation now preserves user-modified root documents (CLAUDE.md, GEMINI.md, OPENCODE.md) instead of overwriting them

### Changed
- Updated default `vendorDirs` and `binaryExtensions` for better AI assistant tooling coverage
- Enhanced `.sum` file format documentation with detailed field guidelines and examples
- Orchestrator now uses frontmatter mode for more reliable document generation

### Fixed
- `.sum` file generation steps now correctly include content hash computation

## [0.2.12] - 2026-02-02

### Fixed
- `vendorDirs` now supports path patterns (e.g., `apps/vendor`, `.agents/skills`) in addition to single directory names

## [0.2.11] - 2026-02-02

### Fixed
- Permissions now use `npx agents-reverse-engineer@latest` to match command templates

## [0.2.10] - 2026-02-02

### Fixed
- `/are:discover` prompt now uses strict "VIOLATION IS FORBIDDEN" wording to prevent AI from auto-adding flags

## [0.2.9] - 2026-02-02

### Changed
- Refactored command templates to use single source of truth (no content duplication across Claude/OpenCode/Gemini)
- `/are:discover` command instructions now explicitly prevent AI from auto-adding flags

## [0.2.8] - 2026-02-02

### Fixed
- Uninstall prompts now correctly say "uninstall" instead of "install"
- Uninstall now removes ARE permissions from Claude Code settings.json
- Uninstall now removes `.agents-reverse-engineer` folder for local installations

## [0.2.7] - 2026-02-02

### Added
- `uninstall` command as cleaner alternative to `install -u` (e.g., `npx agents-reverse-engineer@latest uninstall`)

### Fixed
- All command templates now use `npx agents-reverse-engineer@latest` instead of `npx are` to avoid conflicts with globally installed older versions
- Session-end hook updated to use `@latest` specifier

## [0.2.6] - 2026-02-02

### Fixed
- `/are:discover` description now neutral to prevent AI from auto-adding `--plan` flag
- Added explicit instruction in command template to pass arguments exactly as provided

## [0.2.5] - 2026-02-02

### Fixed
- `--force` flag now correctly triggers installer flow (was showing help instead)

## [0.2.4] - 2026-02-02

### Added
- Auto-register bash permissions for ARE commands in Claude Code settings.json (reduces approval friction)

### Fixed
- `/are:discover` command now matches CLI signature (`npx are discover $ARGUMENTS` instead of hardcoded `--plan`)

## [0.2.3] - 2026-02-02

### Added
- `/are:help` command for all runtimes (Claude, OpenCode, Gemini) showing available commands and usage guide

## [0.2.2] - 2026-02-02

### Added
- `--version` / `-V` flag to display version and exit
- Version banner displayed on startup for all CLI commands (e.g., `agents-reverse-engineer v0.2.2`)
- Version now read dynamically from `package.json` (single source of truth)

### Changed
- Interactive installer banner now reads version from `package.json` instead of hardcoded value

## [0.2.1] - 2026-02-02

### Fixed
- Running `npx agents-reverse-engineer` with no arguments now launches the interactive installer instead of showing help text
- Updated documentation to clarify two-step workflow: install commands first, then run `/are:init` to create configuration

### Changed
- Configuration is no longer created during installation; users must run `/are:init` after installing commands

## [0.2.0] - 2026-02-02

### Added
- **Interactive TUI installer** - Running `npx agents-reverse-engineer` launches an interactive installer with ASCII banner and arrow-key navigation
- **Runtime selection** - Choose from Claude Code, OpenCode, Gemini CLI, or install to all runtimes at once
- **Location selection** - Install globally (`~/.claude/`) or locally (`./.claude/`) with interactive prompts
- **Non-interactive flags** - `--runtime <name>`, `-g`/`--global`, `-l`/`--local` for scripted installations
- **Uninstall command** - `npx are uninstall` removes all installed files and hooks cleanly
- **SessionEnd hooks** - Automatic documentation updates on session close for Claude Code and Gemini CLI
- **VERSION tracking** - Installed version tracked for future upgrade detection

### Changed
- Default command is now the interactive installer (previously required `init` command)
- `are init` now only creates config file; use `are install` for commands and hooks
- Simplified onboarding: just run `npx agents-reverse-engineer` and follow prompts

### Removed
- `--integration` flag from `are init` - replaced by the interactive installer (`are install`)

## [0.1.2] - 2026-01-31

### Added
- **Gemini CLI support** - New integration for Google's Gemini CLI with full command set
- **Required integration name** - `--integration` now requires a name parameter (`claude`, `opencode`, `gemini`, `aider`)
- **discover command** - Added to all integration templates for file discovery and plan generation
- **clean command** - Added to all integration templates for removing generated documentation
- **OIDC publishing** - GitHub Actions workflow now uses OIDC trusted publishing (no npm token needed)
- **CHANGELOG.md** - Added project changelog

### Changed
- `are init --integration` now requires environment name: `are init --integration claude`
- Updated all documentation to reflect new integration syntax
- AI Assistant Commands table now shows support for Claude, OpenCode, and Gemini

## [0.1.1] - 2025-01-30

### Added
- GitHub Actions workflow for npm publishing on release
- GENERATION-PLAN.md generation with post-order traversal in discover command
- Post-order directory processing for AGENTS.md generation

### Changed
- Improved README documentation structure and clarity

## [0.1.0] - 2025-01-29

### Added
- Initial release
- `are init` command - Create configuration file
- `are discover` command - Discover files to analyze
- `are generate` command - Generate documentation plan
- `are update` command - Incremental documentation updates
- Claude Code integration with command files and session-end hook
- OpenCode integration support
- `.sum` file generation for per-file summaries
- `AGENTS.md` generation for directory overviews
- Root document generation (`CLAUDE.md`, `ARCHITECTURE.md`, `STACK.md`)
- Configurable exclusion patterns via `.agents-reverse-engineer/config.yaml`
- Git-aware file detection (respects `.gitignore`)
- Binary file detection and exclusion
- Token budget management for AI-friendly output

[Unreleased]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.18...HEAD
[1.2.18]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.17...v1.2.18
[1.2.17]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.16...v1.2.17
[1.2.16]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.15...v1.2.16
[1.2.15]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.14...v1.2.15
[1.2.14]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.13...v1.2.14
[1.2.13]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.12...v1.2.13
[1.2.12]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.11...v1.2.12
[1.2.11]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.10...v1.2.11
[1.2.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.9...v1.2.10
[1.2.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.1.4...v1.2.0
[1.1.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.10...v1.0.0
[0.9.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.9...v0.9.10
[0.9.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.8...v0.9.9
[0.9.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.7...v0.9.8
[0.9.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.6...v0.9.7
[0.9.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.5...v0.9.6
[0.9.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.13...v0.9.0
[0.8.13]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.12...v0.8.13
[0.8.12]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.11...v0.8.12
[0.8.11]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.10...v0.8.11
[0.8.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.9...v0.8.10
[0.8.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.8...v0.8.9
[0.8.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.7...v0.8.8
[0.8.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.6...v0.8.7
[0.8.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.5...v0.8.6
[0.8.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.4...v0.8.5
[0.8.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.3...v0.8.4
[0.8.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.12...v0.8.0
[0.7.12]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.11...v0.7.12
[0.7.11]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.10...v0.7.11
[0.7.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.9...v0.7.10
[0.7.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.8...v0.7.9
[0.7.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.7...v0.7.8
[0.7.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.6...v0.7.7
[0.7.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.5...v0.7.6
[0.7.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.6...v0.7.0
[0.6.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.5...v0.6.6
[0.6.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.4...v0.6.5
[0.6.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.3...v0.6.4
[0.6.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.5...v0.6.0
[0.5.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.11...v0.5.0
[0.4.11]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.10...v0.4.11
[0.4.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.9...v0.4.10
[0.4.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.8...v0.4.9
[0.4.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.7...v0.4.8
[0.4.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.12...v0.3.0
[0.2.12]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.11...v0.2.12
[0.2.11]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.10...v0.2.11
[0.2.10]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.9...v0.2.10
[0.2.9]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/GeoloeG-IsT/agents-reverse-engineer/releases/tag/v0.1.0
