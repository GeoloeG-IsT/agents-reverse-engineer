/**
 * Template generators for AI coding assistant integration files
 *
 * Generates command file templates for Claude Code, Codex, OpenCode, and Gemini CLI.
 */

import type { IntegrationTemplate } from './types.js';

// =============================================================================
// Shared Command Content
// =============================================================================

const COMMANDS = {
  generate: {
    description: 'Generate AI-friendly documentation for the entire codebase',
    argumentHint: '[path] [--dry-run] [--eval] [--concurrency N] [--fail-fast] [--debug] [--trace]',
    content: `Generate comprehensive documentation for this codebase using agents-reverse-engineer.

<execution>
Run the generate command in the background and monitor progress in real time.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the generate command in the background** using \`run_in_background: true\`:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION generate BACKEND_FLAG $ARGUMENTS
   \`\`\`

3. **Monitor progress** by polling the latest progress log:
   - Wait ~15 seconds (use \`sleep 15\` in Bash), then use **Glob** to find the latest \`.agents-reverse-engineer/progress-*.log\` file, and **Read** it (use the \`offset\` parameter to read only the last ~20 lines for long files)
   - Show the user a brief progress update (e.g. "32/96 files analyzed, ~12m remaining")
   - Check whether the background task has completed using \`TaskOutput\` with \`block: false\`
   - Repeat until the background task finishes
   - **Important**: Keep polling even if no progress log exists yet (the command takes a few seconds to start writing)

4. **On completion**, read the full background task output and summarize:
   - Number of files analyzed and any failures
   - Number of directories documented
   - Any inconsistency warnings from the quality report

This executes a two-phase pipeline:

1. **File Analysis** (concurrent): Discovers files, applies filters, then analyzes each source file via AI and writes \`.sum\` summary files with YAML frontmatter (\`content_hash\`, \`file_type\`, \`purpose\`, \`public_interface\`, \`dependencies\`, \`patterns\`).

2. **Directory Aggregation** (sequential): Generates \`AGENTS.md\` per directory in post-order traversal (deepest first, so child summaries feed into parents), and writes \`CLAUDE.md\` pointers.

**Options:**
- \`--dry-run\`: Preview the plan without making AI calls
- \`--eval\`: Namespace output by backend.model for side-by-side comparison (e.g., \`file.ts.claude.haiku.sum\`, \`AGENTS.claude.haiku.md\`)
- \`--concurrency N\`: Control number of parallel AI calls (default: auto)
- \`--fail-fast\`: Stop on first file analysis failure
- \`--debug\`: Show AI prompts and backend details
- \`--trace\`: Enable concurrency tracing to \`.agents-reverse-engineer/traces/\`
</execution>`,
  },

  update: {
    description: 'Incrementally update documentation for changed files',
    argumentHint: '[path] [--uncommitted] [--dry-run] [--eval] [--concurrency N] [--fail-fast] [--debug] [--trace]',
    content: `Update documentation for files that changed since last run.

<execution>
Run the update command in the background and monitor progress in real time.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the update command in the background** using \`run_in_background: true\`:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION update BACKEND_FLAG $ARGUMENTS
   \`\`\`

3. **Monitor progress** by polling the latest progress log:
   - Wait ~15 seconds (use \`sleep 15\` in Bash), then use **Glob** to find the latest \`.agents-reverse-engineer/progress-*.log\` file, and **Read** it (use the \`offset\` parameter to read only the last ~20 lines for long files)
   - Show the user a brief progress update (e.g. "12/30 files updated, ~5m remaining")
   - Check whether the background task has completed using \`TaskOutput\` with \`block: false\`
   - Repeat until the background task finishes
   - **Important**: Keep polling even if no progress log exists yet (the command takes a few seconds to start writing)

4. **On completion**, read the full background task output and summarize:
   - Files updated
   - Files unchanged
   - Any orphaned docs cleaned up

**Options:**
- \`--uncommitted\`: Include staged but uncommitted changes
- \`--dry-run\`: Show what would be updated without writing
- \`--eval\`: Namespace output by backend.model for side-by-side comparison
- \`--concurrency N\`: Control number of parallel AI calls (default: auto)
- \`--fail-fast\`: Stop on first file analysis failure
- \`--debug\`: Show AI prompts and backend details
- \`--trace\`: Enable concurrency tracing to \`.agents-reverse-engineer/traces/\`
</execution>`,
  },

  discover: {
    description: 'Discover files in codebase',
    argumentHint: '[path] [--debug] [--trace]',
    content: `List files that would be analyzed for documentation.

<execution>
## STRICT RULES - VIOLATION IS FORBIDDEN

1. Run ONLY this exact command: \`npx agents-reverse-engineer@$VERSION discover $ARGUMENTS\`
2. DO NOT add ANY flags the user did not explicitly type
3. If user typed nothing after \`COMMAND_PREFIXdiscover\`, run with ZERO flags

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the discover command in the background** using \`run_in_background: true\`:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION discover $ARGUMENTS
   \`\`\`

3. **Monitor progress** by polling the latest progress log:
   - Wait ~10 seconds (use \`sleep 10\` in Bash), then use **Glob** to find the latest \`.agents-reverse-engineer/progress-*.log\` file, and **Read** it (use the \`offset\` parameter to read only the last ~20 lines for long files)
   - Show the user a brief progress update
   - Check whether the background task has completed using \`TaskOutput\` with \`block: false\`
   - Repeat until the background task finishes
   - **Important**: Keep polling even if no progress log exists yet (the command takes a few seconds to start writing)

4. **On completion**, read the full background task output and report number of files found.

6. **Review plan and suggest exclusions**:
   - Read \`.agents-reverse-engineer/GENERATION-PLAN.md\` and \`.agents-reverse-engineer/config.yaml\`
   - Scan the Phase 1 file list and classify files into these categories:
     - **Test/spec files**: matches like \`*.test.*\`, \`*.spec.*\`, \`__tests__/**\`, \`__mocks__/**\`, \`*.stories.*\`, \`*.story.*\`
     - **CI/CD configs**: \`.github/workflows/*.yml\`, \`.gitlab-ci.yml\`, \`Jenkinsfile\`, \`.circleci/**\`, \`.travis.yml\`
     - **Tool configs**: \`.eslintrc*\`, \`.prettierrc*\`, \`jest.config.*\`, \`.editorconfig\`, \`babel.config.*\`, \`webpack.config.*\`, \`vite.config.*\`, \`rollup.config.*\`, \`tsconfig*.json\`, \`.lintstagedrc*\`, \`.huskyrc*\`, \`.stylelintrc*\`, \`commitlint.config.*\`
     - **Migration files**: paths containing \`migrations/\` or matching \`*.migration.*\`
     - **Fixture/snapshot files**: \`__snapshots__/**\`, \`*.fixture.*\`, \`fixtures/**\`, \`test-data/**\`, \`testdata/**\`
     - **Type declarations**: \`*.d.ts\` (not source code, auto-generated or ambient)
     - **Docker/infra**: \`Dockerfile*\`, \`docker-compose*\`, \`*.Dockerfile\`, \`k8s/**\`, \`terraform/**\`, \`helm/**\`
   - For each category, count how many files from the plan match and list up to 3 example filenames
   - **Skip categories with zero matches** — only present categories that have files in the plan
   - Also skip patterns that are already in the current \`config.yaml\` exclude list
   - Present the findings in a summary table showing category, file count, example files, and proposed glob patterns
   - Ask the user which categories to exclude using \`AskUserQuestion\` with \`multiSelect: true\`
   - For accepted categories, use the **Edit** tool to append the corresponding glob patterns to the \`exclude.patterns\` array in \`.agents-reverse-engineer/config.yaml\`
   - After editing, briefly confirm what was added
</execution>`,
  },

  clean: {
    description: 'Delete all generated documentation artifacts (.sum, AGENTS.md, plan)',
    argumentHint: '[path] [--dry-run]',
    content: `Remove all documentation artifacts generated by agents-reverse-engineer.

<execution>
## STRICT RULES - VIOLATION IS FORBIDDEN

1. Run ONLY this exact command: \`npx agents-reverse-engineer@$VERSION clean $ARGUMENTS\`
2. DO NOT add ANY flags the user did not explicitly type
3. If user typed nothing after \`COMMAND_PREFIXclean\`, run with ZERO flags

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the clean command**:
\`\`\`bash
npx agents-reverse-engineer@$VERSION clean $ARGUMENTS
\`\`\`

Report number of files deleted.
</execution>`,
  },

  specify: {
    description: 'Generate project specification from AGENTS.md docs (experimental)',
    argumentHint: '[path] [--dry-run] [--output <path>] [--multi-file] [--force] [--debug] [--trace]',
    content: `Generate a project specification from existing AGENTS.md documentation.

<execution>
Run the specify command in the background and monitor progress in real time.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the specify command in the background** using \`run_in_background: true\`:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION specify BACKEND_FLAG $ARGUMENTS
   \`\`\`

3. **Monitor progress** by polling the latest progress log:
   - Wait ~15 seconds (use \`sleep 15\` in Bash), then use **Glob** to find the latest \`.agents-reverse-engineer/progress-*.log\` file, and **Read** it (use the \`offset\` parameter to read only the last ~20 lines for long files)
   - Show the user a brief progress update
   - Check whether the background task has completed using \`TaskOutput\` with \`block: false\`
   - Repeat until the background task finishes
   - **Important**: Keep polling even if no progress log exists yet (the command takes a few seconds to start writing)

4. **On completion**, read the full background task output and summarize:
   - Number of AGENTS.md files collected
   - Output file(s) written

This collects all AGENTS.md files, synthesizes them via AI, and writes a comprehensive project specification.

If no AGENTS.md files exist, it will auto-run \`generate\` first.

**Options:**
- \`--dry-run\`: Show input statistics without making AI calls
- \`--output <path>\`: Custom output path (default: specs/SPEC.md)
- \`--multi-file\`: Split specification into multiple files
- \`--force\`: Overwrite existing specification
- \`--debug\`: Show AI prompts and backend details
- \`--trace\`: Enable concurrency tracing to \`.agents-reverse-engineer/traces/\`
</execution>`,
  },

  rebuild: {
    description: 'Reconstruct project from specification documents (experimental)',
    argumentHint: '[path] [--dry-run] [--output <path>] [--force] [--concurrency N] [--fail-fast] [--debug] [--trace]',
    content: `Reconstruct a project from specification documents using agents-reverse-engineer.

<execution>
Run the rebuild command in the background and monitor progress in real time.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the rebuild command in the background** using \`run_in_background: true\`:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION rebuild BACKEND_FLAG $ARGUMENTS
   \`\`\`

3. **Monitor progress** by polling the latest progress log:
   - Wait ~15 seconds (use \`sleep 15\` in Bash), then use **Glob** to find the latest \`.agents-reverse-engineer/progress-*.log\` file, and **Read** it (use the \`offset\` parameter to read only the last ~20 lines for long files)
   - Show the user a brief progress update (e.g. "4/12 rebuild units completed")
   - Check whether the background task has completed using \`TaskOutput\` with \`block: false\`
   - Repeat until the background task finishes
   - **Important**: Keep polling even if no progress log exists yet (the command takes a few seconds to start writing)

4. **On completion**, read the full background task output and summarize:
   - Number of rebuild units processed
   - Files generated and output directory
   - Any failures or partial completions

This reads spec files from \`specs/\`, partitions them into ordered rebuild units, and processes each via AI to generate source files.

**Options:**
- \`--dry-run\`: Show rebuild plan without making AI calls
- \`--output <path>\`: Output directory (default: rebuild/)
- \`--force\`: Wipe output directory and start fresh
- \`--concurrency N\`: Control number of parallel AI calls (default: auto)
- \`--fail-fast\`: Stop on first failure
- \`--debug\`: Show AI prompts and backend details
- \`--trace\`: Enable concurrency tracing to \`.agents-reverse-engineer/traces/\`

**Exit codes:** 0 (success), 1 (partial failure), 2 (total failure)
</execution>`,
  },

  dashboard: {
    description: 'Show telemetry dashboard (costs, tokens, traces) (experimental)',
    argumentHint: '[path] [--run <id>] [--trace <id>] [--trends] [--format <table|json|html>]',
    content: `Show the ARE telemetry dashboard with cost analysis, token usage, and trace timelines.

<execution>
## STRICT RULES - VIOLATION IS FORBIDDEN

1. Run ONLY the exact command shown: \`npx agents-reverse-engineer@$VERSION dashboard $ARGUMENTS\`
2. DO NOT add ANY flags the user did not explicitly type
3. If user typed nothing after \`COMMAND_PREFIXdashboard\`, run with ZERO flags

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the dashboard command**:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION dashboard $ARGUMENTS
   \`\`\`

3. **Present the output** to the user. The dashboard has several modes:

   - **Default (no flags)**: Shows a summary table of all runs with costs, tokens, duration, and errors
   - **\`--run <id>\`**: Drill-down into a specific run showing per-entry details (latency, tokens, cost per file)
   - **\`--trace <id>\`**: ASCII Gantt timeline showing concurrent phase execution and worker utilization
   - **\`--trends\`**: Cost and usage trends across all runs (daily aggregation, cache savings, error rates)
   - **\`--format html\`**: Generate a self-contained HTML report with Chart.js visualizations — pipe to a file: \`npx agents-reverse-engineer dashboard --format html > report.html\`
   - **\`--format json\`**: Output raw run log data as JSON

4. **If no runs found**, suggest the user run \`COMMAND_PREFIXgenerate\` or \`COMMAND_PREFIXupdate\` first to create telemetry data.

**Options:**
- \`--run <id>\`: Show per-entry detail for a specific run (partial timestamp match)
- \`--trace <id>\`: Show ASCII timeline from a trace file (partial timestamp match)
- \`--trends\`: Show cost & usage trends across all runs
- \`--format html\`: Generate self-contained HTML report with charts
- \`--format json\`: Output raw data as JSON
</execution>`,
  },

  plan: {
    description: 'Compare AI planning quality with and without ARE documentation (experimental)',
    argumentHint: '<task> [path] [--eval] [--model <name>] [--dry-run] [--list] [--show <id>]',
    content: `Compare AI planning quality with and without ARE documentation.

<execution>
Run the plan command to create an A/B comparison of AI planning quality.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the plan command**:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION plan BACKEND_FLAG $ARGUMENTS
   \`\`\`

3. **Wait for completion** — the command runs two sequential AI planning sessions (without docs, then with docs) and outputs a comparison table.

4. **On completion**, summarize the comparison results:
   - Quantitative metrics (file references, actionable steps, code identifiers)
   - Cost and latency comparison
   - Quality evaluation scores (if \`--eval\` was used)

This creates two git branches from HEAD and runs an AI planner in each:
- **With ARE docs**: Full documentation available
- **Without ARE docs**: Source code only (ARE artifacts stripped)

The comparison measures how much ARE documentation improves AI planning quality.

**Options:**
- \`--eval\`: Run AI quality evaluator on both plans (5-point rubric)
- \`--eval-model <name>\`: Model for the evaluator (default: same as --model)
- \`--model <name>\`: AI model to use for planning
- \`--dry-run\`: Show what would happen without executing
- \`--list\`: List all saved plan comparisons
- \`--show <id>\`: View a previous comparison by date
- \`--force\`: Overwrite existing branches for the same task
- \`--debug\`: Show verbose AI execution details
</execution>`,
  },

  implement: {
    description: 'Execute implementation with and without ARE documentation (experimental)',
    argumentHint: '<task> [path] [--eval] [--model <name>] [--dry-run] [--list] [--show <id>] [--run-tests] [--run-build] [--run-lint]',
    content: `Execute the implementation phase with and without ARE documentation to measure impact.

<execution>
Run the implement command to execute code changes in both environments.

## Steps

1. **Read version**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

2. **Run the implement command**:
   \`\`\`bash
   npx agents-reverse-engineer@$VERSION implement BACKEND_FLAG $ARGUMENTS
   \`\`\`
   Note: When \`--plan-id <id>\` is provided, the task description is loaded from the stored plan — no need to pass it explicitly.

3. **Wait for completion** — the command runs two sequential AI implementation sessions (without docs, then with docs) and outputs a comparison table.

4. **On completion**, summarize the comparison results:
   - Implementation metrics (files created/modified, lines added/deleted)
   - Test results (if \`--run-tests\` was used)
   - Build and lint results (if \`--run-build\` / \`--run-lint\` was used)
   - Cost and latency comparison
   - Quality evaluation scores (if \`--eval\` was used)

This re-uses branches created by \`COMMAND_PREFIXplan\` and executes the implementation in both worktrees:
- **With ARE docs**: Full documentation available during implementation
- **Without ARE docs**: Source code only (ARE artifacts stripped)

The comparison measures how much ARE documentation improves implementation quality.

**Options:**
- \`--eval\`: Run AI quality evaluator on both implementations
- \`--eval-model <name>\`: Model for the evaluator (default: same as --model)
- \`--model <name>\`: AI model to use for implementation
- \`--task-slug <slug>\`: Reference existing plan by slug (default: auto-generate from task)
- \`--plan-id <id>\`: Reference existing plan by ID (shown by \`are plan\` on completion)
- \`--run-tests\`: Execute test suite and include results in metrics
- \`--run-build\`: Execute build and verify success
- \`--run-lint\`: Run linter and include error/warning counts
- \`--dry-run\`: Show what would happen without executing
- \`--list\`: List all saved implementation comparisons
- \`--show <id>\`: View a previous comparison by date
- \`--force\`: Overwrite existing branches for the same task
- \`--debug\`: Show verbose AI execution details
</execution>`,
  },

  help: {
    description: 'Show available ARE commands and usage guide',
    argumentHint: '',
    // Content uses COMMAND_PREFIX placeholder, replaced per platform
    content: `<objective>
Display the complete ARE command reference.

**First**: Read \`VERSION_FILE_PATH\` → store as \`$VERSION\`. Show the user: \`agents-reverse-engineer v$VERSION\`

**Then**: Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<reference>
# agents-reverse-engineer (ARE) Command Reference

**ARE** generates AI-friendly documentation for codebases, creating structured summaries optimized for AI assistants.

## Quick Start

1. \`COMMAND_PREFIXgenerate\` — Generate documentation for the codebase
2. \`COMMAND_PREFIXupdate\` — Keep docs in sync after code changes
3. \`COMMAND_PREFIXdashboard\` — View costs and telemetry

Configuration (\`.agents-reverse-engineer/config.yaml\`) is created automatically during installation.

## Commands Reference

### \`COMMAND_PREFIXdiscover\`
Discover files that would be analyzed for documentation.

Shows included files, excluded files with reasons, and generates a \`GENERATION-PLAN.md\` execution plan.

**Options:**
| Flag | Description |
|------|-------------|
| \`[path]\` | Target directory (default: current directory) |
| \`--debug\` | Show verbose debug output |
| \`--trace\` | Enable concurrency tracing to \`.agents-reverse-engineer/traces/\` |
**Usage:**
- \`COMMAND_PREFIXdiscover\` — Discover files and generate execution plan

**CLI:**
\`\`\`bash
npx agents-reverse-engineer discover
npx agents-reverse-engineer discover ./src
\`\`\`

---

### \`COMMAND_PREFIXgenerate\`
Generate comprehensive documentation for the codebase.

**Options:**
| Flag | Description |
|------|-------------|
| \`[path]\` | Target directory (default: current directory) |
| \`--concurrency N\` | Number of concurrent AI calls (default: auto) |
| \`--dry-run\` | Show what would be generated without writing |
| \`--eval\` | Namespace output by backend.model for comparison |
| \`--fail-fast\` | Stop on first file analysis failure |
| \`--debug\` | Show AI prompts and backend details |
| \`--trace\` | Enable concurrency tracing to \`.agents-reverse-engineer/traces/\` |
**Usage:**
- \`COMMAND_PREFIXgenerate\` — Generate docs
- \`COMMAND_PREFIXgenerate --dry-run\` — Preview without writing
- \`COMMAND_PREFIXgenerate --eval\` — Generate variant docs for comparison
- \`COMMAND_PREFIXgenerate --concurrency 3\` — Limit parallel AI calls

**CLI:**
\`\`\`bash
npx agents-reverse-engineer generate
npx agents-reverse-engineer generate --dry-run
npx agents-reverse-engineer generate ./my-project --concurrency 3
npx agents-reverse-engineer generate --debug --trace
\`\`\`

**How it works:**
1. Discovers files, applies filters, analyzes each file via concurrent AI calls, writes \`.sum\` summary files
2. Generates \`AGENTS.md\` for each directory (post-order traversal) and writes \`CLAUDE.md\` pointers

---

### \`COMMAND_PREFIXupdate\`
Incrementally update documentation for changed files.

**Options:**
| Flag | Description |
|------|-------------|
| \`[path]\` | Target directory (default: current directory) |
| \`--uncommitted\` | Include staged but uncommitted changes |
| \`--dry-run\` | Show what would be updated without writing |
| \`--eval\` | Namespace output by backend.model for comparison |
| \`--concurrency N\` | Number of concurrent AI calls (default: auto) |
| \`--fail-fast\` | Stop on first file analysis failure |
| \`--debug\` | Show AI prompts and backend details |
| \`--trace\` | Enable concurrency tracing to \`.agents-reverse-engineer/traces/\` |
**Usage:**
- \`COMMAND_PREFIXupdate\` — Update docs for committed changes
- \`COMMAND_PREFIXupdate --uncommitted\` — Include uncommitted changes

**CLI:**
\`\`\`bash
npx agents-reverse-engineer update
npx agents-reverse-engineer update --uncommitted
npx agents-reverse-engineer update --dry-run
npx agents-reverse-engineer update ./my-project --concurrency 3
\`\`\`

---

### \`COMMAND_PREFIXspecify\` (Experimental)
Generate a project specification from AGENTS.md documentation.

Collects all AGENTS.md files, synthesizes them via AI, and writes a comprehensive project specification. Auto-runs \`generate\` if no AGENTS.md files exist.

**Options:**
| Flag | Description |
|------|-------------|
| \`[path]\` | Target directory (default: current directory) |
| \`--output <path>\` | Custom output path (default: specs/SPEC.md) |
| \`--multi-file\` | Split specification into multiple files |
| \`--force\` | Overwrite existing specification |
| \`--dry-run\` | Show input statistics without making AI calls |
| \`--debug\` | Show AI prompts and backend details |
| \`--trace\` | Enable concurrency tracing to \`.agents-reverse-engineer/traces/\` |
**Usage:**
- \`COMMAND_PREFIXspecify\` — Generate specification
- \`COMMAND_PREFIXspecify --dry-run\` — Preview without calling AI
- \`COMMAND_PREFIXspecify --output ./docs/spec.md --force\` — Custom output path

**CLI:**
\`\`\`bash
npx agents-reverse-engineer specify
npx agents-reverse-engineer specify --dry-run
npx agents-reverse-engineer specify --output ./docs/spec.md --force
npx agents-reverse-engineer specify --multi-file
\`\`\`

---

### \`COMMAND_PREFIXrebuild\` (Experimental)
Reconstruct a project from specification documents.

Reads spec files from \`specs/\`, partitions them into ordered rebuild units, processes each via AI, and writes generated source files to an output directory. Supports checkpoint-based session continuity for resumable long-running rebuilds.

**Options:**
| Flag | Description |
|------|-------------|
| \`[path]\` | Target directory (default: current directory) |
| \`--output <path>\` | Output directory (default: rebuild/) |
| \`--force\` | Wipe output directory and start fresh |
| \`--dry-run\` | Show rebuild plan without making AI calls |
| \`--concurrency N\` | Number of concurrent AI calls (default: auto) |
| \`--fail-fast\` | Stop on first failure |
| \`--debug\` | Show AI prompts and backend details |
| \`--trace\` | Enable concurrency tracing to \`.agents-reverse-engineer/traces/\` |
**Usage:**
- \`COMMAND_PREFIXrebuild --dry-run\` — Preview rebuild plan
- \`COMMAND_PREFIXrebuild --output ./out --force\` — Rebuild to custom directory

**CLI:**
\`\`\`bash
npx agents-reverse-engineer rebuild --dry-run
npx agents-reverse-engineer rebuild --output ./out --force
npx agents-reverse-engineer rebuild --concurrency 3
\`\`\`

**How it works:**
1. Reads all spec files from \`specs/\` directory
2. Partitions specs into ordered rebuild units (from Build Plan phases or top-level headings)
3. Processes units in order: sequentially between groups, concurrently within each group
4. Accumulates context (export signatures) after each group for dependent phases
5. Writes generated source files via \`===FILE:===\` delimited output parsing

**Exit codes:** 0 (success), 1 (partial failure), 2 (total failure)

---

### \`COMMAND_PREFIXclean\`
Remove all generated documentation artifacts.

**Options:**
| Flag | Description |
|------|-------------|
| \`--dry-run\` | Show what would be deleted without deleting |

**What gets deleted:**
- \`.agents-reverse-engineer/GENERATION-PLAN.md\`
- All \`*.sum\` files (including eval variant \`.sum\` files)
- All \`AGENTS.md\` and \`AGENTS.*.md\` variant files
- Pointers: \`CLAUDE.md\`

**Usage:**
- \`COMMAND_PREFIXclean --dry-run\` — Preview deletions
- \`COMMAND_PREFIXclean\` — Delete all artifacts

**CLI:**
\`\`\`bash
npx agents-reverse-engineer clean --dry-run
npx agents-reverse-engineer clean
\`\`\`

---

### \`COMMAND_PREFIXdashboard\` (Experimental)
Show telemetry dashboard with cost analysis, token usage, and trace timelines.

**Options:**
| Flag | Description |
|------|-------------|
| \`--run <id>\` | Per-entry drill-down for a specific run (partial timestamp match) |
| \`--trace <id>\` | ASCII timeline from trace file (partial timestamp match) |
| \`--trends\` | Cost & usage trends across all runs |
| \`--format html\` | Self-contained HTML report with Chart.js charts |
| \`--format json\` | Raw data as JSON |

**Usage:**
- \`COMMAND_PREFIXdashboard\` — Show run summary table
- \`COMMAND_PREFIXdashboard --run 2026-02-14\` — Drill into a specific run
- \`COMMAND_PREFIXdashboard --trace 2026-02-14\` — Show execution timeline
- \`COMMAND_PREFIXdashboard --trends\` — Cost trends over time

**CLI:**
\`\`\`bash
npx agents-reverse-engineer dashboard
npx agents-reverse-engineer dashboard --run 2026-02-14
npx agents-reverse-engineer dashboard --trace 2026-02-14
npx agents-reverse-engineer dashboard --trends
npx agents-reverse-engineer dashboard --format html > report.html
\`\`\`

---

### \`COMMAND_PREFIXhelp\`
Show this command reference.

## CLI Installation

Install ARE commands to your AI assistant:

\`\`\`bash
npx agents-reverse-engineer install              # Interactive mode
npx agents-reverse-engineer install --runtime claude -g  # Global Claude
npx agents-reverse-engineer install --runtime codex -g   # Global Codex
npx agents-reverse-engineer install --runtime claude -l  # Local project
npx agents-reverse-engineer install --runtime all -g     # All runtimes
\`\`\`

**Install/Uninstall Options:**
| Flag | Description |
|------|-------------|
| \`--runtime <name>\` | Target: \`claude\`, \`codex\`, \`opencode\`, \`gemini\`, \`all\` |
| \`-g, --global\` | Install to global config directory |
| \`-l, --local\` | Install to current project directory |
| \`--force\` | Overwrite existing files (install only) |

## Configuration

**File:** \`.agents-reverse-engineer/config.yaml\`

\`\`\`yaml
# Exclusion patterns
exclude:
  patterns:
    - "**/*.test.ts"
    - "**/__mocks__/**"
  vendorDirs:
    - node_modules
    - dist
    - .git
  binaryExtensions:
    - .png
    - .jpg
    - .pdf

# Options
options:
  followSymlinks: false
  maxFileSize: 100000

# Output settings
output:
  colors: true
\`\`\`

## Generated Files

### Per Source File

**\`*.sum\`** — File summaries with YAML frontmatter + detailed prose.

\`\`\`yaml
---
file_type: service
generated_at: 2025-01-15T10:30:00Z
content_hash: abc123...
purpose: Handles user authentication and session management
public_interface: [login(), logout(), refreshToken(), AuthService]
dependencies: [express, jsonwebtoken, ./user-model]
patterns: [singleton, factory, observer]
related_files: [./types.ts, ./middleware.ts]
---

<300-500 word summary covering implementation, patterns, edge cases>
\`\`\`

### Per Directory

**\`AGENTS.md\`** — Directory overview synthesized from \`.sum\` files. Groups files by purpose and links to subdirectories.

### Pointer Files

| File | Purpose |
|------|---------|
| \`CLAUDE.md\` | Project entry point — imports root AGENTS.md |

## Common Workflows

**Initial documentation:**
\`\`\`
COMMAND_PREFIXgenerate
\`\`\`

**After code changes:**
\`\`\`
COMMAND_PREFIXupdate
\`\`\`

**Full regeneration:**
\`\`\`
COMMAND_PREFIXclean
COMMAND_PREFIXgenerate
\`\`\`

**Preview before generating:**
\`\`\`
COMMAND_PREFIXdiscover                   # Check files and exclusions
COMMAND_PREFIXgenerate --dry-run         # Preview generation
\`\`\`

## Tips

- **Custom exclusions**: Edit \`.agents-reverse-engineer/config.yaml\` to skip files
- **Context loading**: Install creates a hook that auto-loads AGENTS.md context when reading project files
- **Total session costs**: Use CCUSAGE_HINT, not just ARE subprocesses

## Resources

- **Repository:** https://github.com/GeoloeG-IsT/agents-reverse-engineer
- **Update:** \`npx agents-reverse-engineer install --force\`
</reference>`,
  },
} as const;

// =============================================================================
// Platform-specific template generators
// =============================================================================

type Platform = 'claude' | 'codex' | 'opencode' | 'gemini';

interface PlatformConfig {
  commandPrefix: string; // /are- command prefix used in generated docs
  pathPrefix: string; // .claude/skills/, .agents/skills/, .opencode/commands/, etc
  filenameSeparator: string; // . or -
  extraFrontmatter?: string; // e.g., "agent: build" for OpenCode
  usesName: boolean; // Claude uses "name:" in frontmatter
  versionFilePath: string; // .claude/ARE-VERSION, .agents/ARE-VERSION, etc.
  ccusageHint: string; // Runtime-specific ccusage tip (package varies by runtime)
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  claude: {
    commandPrefix: '/are-',
    pathPrefix: '.claude/skills/',
    filenameSeparator: '.',
    usesName: true,
    versionFilePath: '.claude/ARE-VERSION',
    ccusageHint: '`npx ccusage@latest` (https://github.com/ryoppippi/ccusage) to see ALL Claude Code session costs',
  },
  codex: {
    commandPrefix: '$are-',
    pathPrefix: '.agents/skills/',
    filenameSeparator: '.',
    usesName: true,
    versionFilePath: '.agents/ARE-VERSION',
    ccusageHint: '`npx @ccusage/codex@latest` (https://github.com/ryoppippi/ccusage) to see ALL Codex session costs',
  },
  opencode: {
    commandPrefix: '/are-',
    pathPrefix: '.opencode/commands/',
    filenameSeparator: '-',
    extraFrontmatter: 'agent: build',
    usesName: false,
    versionFilePath: '.opencode/ARE-VERSION',
    ccusageHint: '`npx @ccusage/opencode@latest` (https://github.com/ryoppippi/ccusage) to see ALL OpenCode session costs',
  },
  gemini: {
    commandPrefix: '/are-',
    pathPrefix: '.gemini/commands/',
    filenameSeparator: '-',
    usesName: false,
    versionFilePath: '.gemini/ARE-VERSION',
    ccusageHint: '`npx ccusage@latest` (https://github.com/ryoppippi/ccusage) to see session costs for other AI runtimes (Gemini not yet supported)',
  },
};

function buildFrontmatter(
  platform: Platform,
  commandName: string,
  description: string,
  argumentHint?: string,
): string {
  const config = PLATFORM_CONFIGS[platform];
  const lines = ['---'];

  if (config.usesName) {
    lines.push(`name: are-${commandName}`);
  }

  lines.push(`description: ${description}`);
  lines.push('disable-model-invocation: true');

  if (platform === 'codex' && argumentHint) {
    lines.push(`argument-hint: ${JSON.stringify(argumentHint)}`);
  }

  if (config.extraFrontmatter) {
    lines.push(config.extraFrontmatter);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Build TOML content for Gemini CLI commands
 *
 * Gemini uses TOML format with description and prompt fields.
 * See: https://geminicli.com/docs/cli/custom-commands/
 */
function buildGeminiToml(
  commandName: string,
  command: (typeof COMMANDS)[keyof typeof COMMANDS]
): string {
  const config = PLATFORM_CONFIGS.gemini;
  // Replace placeholders in content
  const promptContent = command.content
    .replace(/COMMAND_PREFIX/g, config.commandPrefix)
    .replace(/VERSION_FILE_PATH/g, config.versionFilePath)
    .replace(/BACKEND_FLAG/g, '--backend gemini')
    .replace(/CCUSAGE_HINT/g, config.ccusageHint);

  // Build TOML content
  // Use triple quotes for multi-line prompt
  const lines = [`description = "${command.description}"`];

  if (command.argumentHint) {
    lines.push(`# Arguments: ${command.argumentHint}`);
  }

  lines.push(`prompt = """`);
  lines.push(promptContent);
  lines.push(`"""`);

  return lines.join('\n');
}

function buildTemplate(
  platform: Platform,
  commandName: string,
  command: (typeof COMMANDS)[keyof typeof COMMANDS]
): IntegrationTemplate {
  const config = PLATFORM_CONFIGS[platform];

  // Platform-specific file naming:
  // - Claude: .claude/skills/are-{command}/SKILL.md
  // - Codex: .agents/skills/are-{command}/SKILL.md
  // - OpenCode: .opencode/commands/are-{command}.md
  // - Gemini: .gemini/commands/are-{command}.toml (TOML format)
  if (platform === 'gemini') {
    const filename = `are-${commandName}.toml`;
    const path = `${config.pathPrefix}${filename}`;
    const content = buildGeminiToml(commandName, command);

    return {
      filename,
      path,
      content: `${content}\n`,
    };
  }

  const usesSkillFile = platform === 'claude' || platform === 'codex';
  const filename = usesSkillFile ? 'SKILL.md' : `are-${commandName}.md`;
  const path =
    usesSkillFile
      ? `${config.pathPrefix}are-${commandName}/${filename}`
      : `${config.pathPrefix}${filename}`;

  const frontmatter = buildFrontmatter(
    platform,
    commandName,
    command.description,
    command.argumentHint,
  );

  // Replace placeholders in content
  const content = command.content
    .replace(/COMMAND_PREFIX/g, config.commandPrefix)
    .replace(/VERSION_FILE_PATH/g, config.versionFilePath)
    .replace(/BACKEND_FLAG/g, `--backend ${platform}`)
    .replace(/CCUSAGE_HINT/g, config.ccusageHint);

  return {
    filename,
    path,
    content: `${frontmatter}\n\n${content}\n`,
  };
}

function getTemplatesForPlatform(platform: Platform): IntegrationTemplate[] {
  return Object.entries(COMMANDS).map(([name, command]) =>
    buildTemplate(platform, name, command)
  );
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get Claude Code command file templates
 */
export function getClaudeTemplates(): IntegrationTemplate[] {
  return getTemplatesForPlatform('claude');
}

/**
 * Get Codex command file templates
 */
export function getCodexTemplates(): IntegrationTemplate[] {
  return getTemplatesForPlatform('codex');
}

/**
 * Get OpenCode command file templates
 */
export function getOpenCodeTemplates(): IntegrationTemplate[] {
  return getTemplatesForPlatform('opencode');
}

/**
 * Get Gemini CLI command file templates
 */
export function getGeminiTemplates(): IntegrationTemplate[] {
  return getTemplatesForPlatform('gemini');
}
