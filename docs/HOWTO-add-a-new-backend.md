# How to Add a New AI CLI Backend

This guide walks you through adding a new AI CLI backend to agents-reverse-engineer (ARE). It covers the full integration surface — from the core `AIBackend` interface to installer support, integration templates, and hooks.

**Gemini CLI** is used as the worked example throughout, since it already exists as a stub ready to be completed.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Implement the AIBackend Interface](#step-1-implement-the-aibackend-interface)
- [Step 2: Register the Backend](#step-2-register-the-backend)
- [Step 3: Update Configuration Schema](#step-3-update-configuration-schema)
- [Step 4: Add Installer Support](#step-4-add-installer-support)
- [Step 5: Create Integration Templates](#step-5-create-integration-templates)
- [Step 6: Add Hooks (Optional)](#step-6-add-hooks-optional)
- [Step 7: Test Your Backend](#step-7-test-your-backend)
- [Response Format Patterns](#response-format-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Worked Example: Completing the Gemini Backend](#worked-example-completing-the-gemini-backend)
- [Reference: Existing Backends](#reference-existing-backends)
- [Appendix: Next Backend Candidates](#appendix-next-backend-candidates)

---

## Architecture Overview

ARE uses a pluggable backend system with four layers:

```
CLI (--backend flag)
  └─▶ BackendRegistry (priority-ordered list of AIBackend implementations)
        └─▶ AIService (retry logic, telemetry, timeout enforcement)
              └─▶ SubprocessProvider (spawns CLI process, pipes stdin, captures stdout)
                    └─▶ AIBackend.buildArgs()        → construct CLI arguments
                        AIBackend.parseResponse()     → normalize output to AIResponse
                        AIBackend.composeStdinInput?() → optional stdin wrapping
```

**What the framework handles automatically** (you get this for free):
- Retry with exponential backoff (rate-limit errors only)
- Timeout enforcement with SIGTERM → SIGKILL escalation (5s grace)
- Telemetry recording (tokens, duration, model, errors) to JSON logs
- Trace event emission (NDJSON) for subprocess lifecycle
- Concurrent execution via `runPool()` with bounded parallelism
- CLI `--backend` flag routing and auto-detection via PATH scanning
- `--eval` variant mode for A/B comparison between backends
- Subprocess buffer management (10MB max), stdin piping, and exit code handling

**What you must implement** per backend:
- CLI argument construction (JSON output flags, model selection, session control)
- Response parsing (extract text + tokens + model from CLI-specific format)
- System prompt delivery (CLI flag or stdin wrapping)
- Token extraction and normalization
- Install instructions for error messages

### Key Files

| Layer | File | Role |
|-------|------|------|
| Interface | `src/ai/types.ts` | `AIBackend`, `AIResponse`, `AICallOptions` contracts |
| Registry | `src/ai/registry.ts` | `BackendRegistry`, `createBackendRegistry()`, `resolveBackend()` |
| Service | `src/ai/service.ts` | `AIService` — retry, telemetry, timeout orchestration |
| Subprocess | `src/ai/providers/subprocess.ts` | `SubprocessProvider` — spawns CLI, pipes I/O |
| Subprocess exec | `src/ai/subprocess.ts` | `runSubprocess()` — low-level process management |
| Config schema | `src/config/schema.ts` | Zod enum for backend names |
| Config defaults | `src/config/defaults.ts` | Vendor dir exclusions, concurrency calculation |
| Installer types | `src/installer/types.ts` | `Runtime` union type |
| Installer paths | `src/installer/paths.ts` | `getRuntimePaths()` per runtime |
| Installer ops | `src/installer/operations.ts` | `installFiles()` per runtime |
| Integration detect | `src/integration/detect.ts` | `detectEnvironments()` |
| Integration templates | `src/integration/templates.ts` | Platform-specific command templates |

---

## Prerequisites

- Node.js 18+ and TypeScript
- An AI CLI tool that:
  - Accepts prompts via **stdin** (not just as CLI arguments)
  - Returns **structured output** (JSON, NDJSON, or parseable text)
  - Supports a **non-interactive mode** (no TTY prompts, no pagers)
  - Exits with code 0 on success, non-zero on failure

---

## Step 1: Implement the AIBackend Interface

Create `src/ai/backends/<name>.ts`. Your backend must implement this interface from `src/ai/types.ts`:

```typescript
export interface AIBackend {
  /** Unique lowercase identifier (e.g., "goose") */
  readonly name: string;
  /** CLI executable name on PATH (e.g., "goose") */
  readonly cliCommand: string;

  /** Check whether this backend's CLI is available on PATH */
  isAvailable(): Promise<boolean>;

  /** Build the CLI argument array for a given call */
  buildArgs(options: AICallOptions): string[];

  /** Parse the CLI's stdout into a normalized AIResponse */
  parseResponse(stdout: string, durationMs: number, exitCode: number): AIResponse;

  /** Get user-facing install instructions when the CLI is not found */
  getInstallInstructions(): string;

  /** Optional: Compose custom stdin input (e.g., wrap system prompt in XML tags) */
  composeStdinInput?(options: AICallOptions): string;

  /** Optional: Create backend-specific config files in the target project */
  ensureProjectConfig?(projectRoot: string): Promise<void>;
}
```

And every backend must normalize its output into this shape:

```typescript
export interface AIResponse {
  text: string;              // The model's text response
  model: string;             // Model identifier as reported by the CLI
  inputTokens: number;       // Input tokens consumed
  outputTokens: number;      // Output tokens generated
  cacheReadTokens: number;   // Tokens served from cache reads
  cacheCreationTokens: number; // Tokens written to cache
  durationMs: number;        // Wall-clock duration
  exitCode: number;          // Process exit code
  raw: unknown;              // Original output for debugging
}
```

### 1a. `isAvailable()` — PATH detection

Use the shared `isCommandOnPath()` utility exported from `src/ai/backends/common.ts`:

```typescript
import { isCommandOnPath } from './common.js';

export class GooseBackend implements AIBackend {
  readonly name = 'goose';
  readonly cliCommand = 'goose';

  async isAvailable(): Promise<boolean> {
    return isCommandOnPath(this.cliCommand);
  }
  // ...
}
```

This handles cross-platform PATH splitting and Windows PATHEXT extension checking.

### 1b. `buildArgs()` — CLI argument construction

Return the argument array for the CLI subprocess. The prompt itself is **NOT** included — it goes to stdin via the subprocess wrapper.

```typescript
buildArgs(options: AICallOptions): string[] {
  const args: string[] = [
    'run',                        // Subcommand (if needed)
    '--format', 'json',           // Request structured output
    '--no-interactive',           // Disable TTY prompts
  ];

  if (options.model) {
    args.push('--model', options.model);
  }

  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt);
  }

  return args;
}
```

**Design decisions:**
- If the CLI has a `--system-prompt` flag, use it (like Claude does)
- If it doesn't, implement `composeStdinInput()` instead (like Codex and OpenCode do)
- Always request JSON/structured output for reliable parsing
- Disable session persistence, interactive mode, and colors

### 1c. `parseResponse()` — Response parsing

This is the most complex method. Parse the CLI's stdout into the normalized `AIResponse`.

```typescript
parseResponse(stdout: string, durationMs: number, exitCode: number): AIResponse {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new AIServiceError('PARSE_ERROR', 'Empty CLI output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new AIServiceError(
      'PARSE_ERROR',
      `Failed to parse JSON: ${trimmed.slice(0, 200)}`,
    );
  }

  // Extract text, tokens, model from the parsed response
  // (This is highly CLI-specific — see "Response Format Patterns" section)

  return {
    text: extractedText,
    model: extractedModel ?? 'unknown',
    inputTokens: tokens.input ?? 0,
    outputTokens: tokens.output ?? 0,
    cacheReadTokens: tokens.cacheRead ?? 0,
    cacheCreationTokens: tokens.cacheWrite ?? 0,
    durationMs,
    exitCode,
    raw: parsed,
  };
}
```

**Important:** Use Zod schemas for response validation when the CLI has a stable format. See `claude.ts` and `opencode.ts` for examples. For unstable formats, use defensive extraction with fallbacks (see `codex.ts`).

### 1d. `getInstallInstructions()`

Return a human-readable string shown in error messages when the CLI is not found:

```typescript
getInstallInstructions(): string {
  return [
    'Goose CLI:',
    '  pip install goose-ai',
    '  https://github.com/block/goose',
  ].join('\n');
}
```

### 1e. Optional: `composeStdinInput()`

If the CLI has no `--system-prompt` flag, wrap the system prompt in XML tags via stdin:

```typescript
composeStdinInput(options: AICallOptions): string {
  if (options.systemPrompt) {
    return `<system-instructions>\n${options.systemPrompt}\n</system-instructions>\n\n${options.prompt}`;
  }
  return options.prompt;
}
```

Both Codex and OpenCode use this pattern. When `composeStdinInput` is not implemented, the `SubprocessProvider` falls back to sending `options.prompt` directly to stdin.

### 1f. Optional: `ensureProjectConfig()`

If the CLI needs project-level config files, create them here. Called once before any AI calls:

```typescript
async ensureProjectConfig(projectRoot: string): Promise<void> {
  const configDir = path.join(projectRoot, '.goose');
  await mkdir(configDir, { recursive: true });
  await writeFile(
    path.join(configDir, 'are-agent.yaml'),
    agentConfigContent,
    'utf-8',
  );
}
```

OpenCode uses this to create `.opencode/agents/are-summarizer.md` with tool restrictions.

---

## Step 2: Register the Backend

Add your backend to the registry in `src/ai/registry.ts`:

```typescript
import { GooseBackend } from './backends/goose.js';

export function createBackendRegistry(): BackendRegistry {
  const registry = new BackendRegistry();
  registry.register(new ClaudeBackend());    // Priority 1
  registry.register(new CodexBackend());     // Priority 2
  registry.register(new GeminiBackend());    // Priority 3
  registry.register(new OpenCodeBackend());  // Priority 4
  registry.register(new GooseBackend());     // Priority 5 ← add here
  return registry;
}
```

**Registration order = auto-detection priority.** When `--backend auto` is used, the system scans PATH in this order and uses the first available CLI.

---

## Step 3: Update Configuration Schema

### 3a. Add to the backend enum

In `src/config/schema.ts`, add your backend name to the Zod enum:

```typescript
const AISchema = z.object({
  backend: z.enum(['claude', 'codex', 'gemini', 'opencode', 'goose', 'auto']).default('auto'),
  // ...
});
```

### 3b. Add vendor directory exclusion

In `src/config/defaults.ts`, add the CLI's config directory to the exclusion list so ARE doesn't try to document it:

```typescript
export const DEFAULT_VENDOR_DIRS = [
  // ... existing entries ...
  '.goose',     // ← add your CLI's config directory
] as const;
```

### 3c. Add exclude pattern (if needed)

If the CLI creates markdown files that could conflict with ARE's output (like `GOOSE.md`), add them to `DEFAULT_EXCLUDE_PATTERNS`:

```typescript
export const DEFAULT_EXCLUDE_PATTERNS = [
  // ... existing entries ...
  'GOOSE.md',
  '**/GOOSE.md',
] as const;
```

---

## Step 4: Add Installer Support

### 4a. Update the Runtime type

In `src/installer/types.ts`:

```typescript
export type Runtime = 'claude' | 'codex' | 'opencode' | 'gemini' | 'goose' | 'all';
```

### 4b. Add to `getAllRuntimes()`

In `src/installer/paths.ts`:

```typescript
export function getAllRuntimes(): Array<Exclude<Runtime, 'all'>> {
  return ['claude', 'codex', 'opencode', 'gemini', 'goose'];
}
```

### 4c. Add path resolution

In `src/installer/paths.ts`, add a case to `getRuntimePaths()`:

```typescript
case 'goose': {
  const globalPath = process.env.GOOSE_CONFIG_DIR || path.join(home, '.goose');
  return {
    global: globalPath,
    local: '.goose',
    settingsFile: path.join(globalPath, 'settings.json'),
  };
}
```

**Convention:** Support an environment variable override (`GOOSE_CONFIG_DIR`) for non-standard installations.

### 4d. Add install/uninstall operations

In `src/installer/operations.ts`, add routing for your runtime in `installFiles()`. This creates command templates, hooks, and version files in the target directory.

In `src/installer/uninstall.ts`, add the reverse logic.

---

## Step 5: Create Integration Templates

### 5a. Environment detection

In `src/integration/detect.ts`, add detection for the CLI's config directory:

```typescript
// Check for Goose
const gooseDir = path.join(projectRoot, '.goose');
const gooseConfig = path.join(projectRoot, '.goose.yaml');
if (existsSync(gooseDir) || existsSync(gooseConfig)) {
  environments.push({
    type: 'goose',
    configDir: '.goose',
    detected: true,
  });
}
```

### 5b. Platform configuration

In `src/integration/templates.ts`, add your platform config:

```typescript
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  // ... existing configs ...
  goose: {
    commandPrefix: '/are-',
    pathPrefix: '.goose/commands/',
    filenameSeparator: '-',
    usesName: false,
    versionFilePath: '.goose/ARE-VERSION',
  },
};
```

Key decisions:
- `pathPrefix`: Where command files live in the CLI's config directory
- `filenameSeparator`: `-` for `are-generate.md`, `.` for `are.generate.md`
- `usesName`: Whether the CLI expects a `name:` field in frontmatter
- `versionFilePath`: Where ARE writes its version for update checking

The shared `COMMANDS` object (generate, update, discover, specify, rebuild, clean, help) will automatically have `BACKEND_FLAG` replaced with `--backend goose` in your templates.

---

## Step 6: Add Hooks (Optional)

Hooks are JavaScript files that integrate with the CLI's event system.

### SessionStart hook (update check)

Create `hooks/goose-are-check-update.js` that:
1. Reads the installed ARE version from `ARE-VERSION`
2. Spawns a background `npm view agents-reverse-engineer version` check
3. Caches the result to avoid repeated network calls
4. Outputs a message if an update is available

See `hooks/are-check-update.mjs` (Claude) and `hooks/opencode-are-check-update.js` for reference implementations.

### Build integration

Ensure the hook is copied to `hooks/dist/` during the build step (see `scripts/build-hooks.js`).

---

## Step 7: Test Your Backend

### Manual testing checklist

```bash
# 1. Auto-detection: your CLI should be found if on PATH
npx agents-reverse-engineer generate --dry-run
# Should show: "Using <name> backend"

# 2. Explicit selection
npx agents-reverse-engineer generate --backend goose --dry-run

# 3. Full generation run
npx agents-reverse-engineer generate --backend goose

# 4. Incremental update
# (make a code change first)
npx agents-reverse-engineer update --backend goose

# 5. Specification
npx agents-reverse-engineer specify --backend goose

# 6. Eval mode (variant comparison)
npx agents-reverse-engineer generate --backend goose --eval

# 7. Error handling: unavailable backend
npx agents-reverse-engineer generate --backend nonexistent
# Should show install instructions

# 8. Verify telemetry
cat .agents-reverse-engineer/logs/run-generate-goose-*.json | jq '.summary'
# Should show token counts, duration, call count
```

### What to verify

- [ ] `isAvailable()` returns `true` when CLI is installed, `false` otherwise
- [ ] `buildArgs()` produces correct flags for all option combinations
- [ ] `parseResponse()` extracts text, model, and all 4 token fields correctly
- [ ] Rate-limit errors are detected (check `SubprocessProvider` stderr patterns)
- [ ] Timeout handling works (try with `--timeout 1` or very short timeout)
- [ ] `--eval` mode produces correctly namespaced output files
- [ ] Telemetry logs capture accurate token counts
- [ ] Install/uninstall creates and removes files correctly

---

## Response Format Patterns

Different CLIs emit different output formats. Here are the patterns used by existing backends:

### Pattern 1: Single JSON Object (Claude)

```json
{
  "type": "result",
  "result": "The model's response text here...",
  "usage": { "input_tokens": 1500, "output_tokens": 300, ... },
  "modelUsage": { "claude-sonnet-4-5-20250929": { ... } }
}
```

**Strategy:** Parse JSON, validate with Zod, extract fields by known paths.
See: `src/ai/backends/claude.ts`

### Pattern 2: NDJSON Event Stream (OpenCode)

```
{"type":"text","part":{"type":"text","text":"First chunk..."}}
{"type":"text","part":{"type":"text","text":"Second chunk..."}}
{"type":"step_finish","part":{"type":"step-finish","tokens":{"input":1500,"output":300}}}
```

**Strategy:** Split by newline, parse each line independently, concatenate text events, aggregate tokens from step_finish events.
See: `src/ai/backends/opencode.ts`

### Pattern 3: JSONL Events with Fallbacks (Codex)

```
{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"text","text":"..."}]}}
{"type":"turn.completed","usage":{"input_tokens":1500,"output_tokens":300}}
```

**Strategy:** Multi-tier extraction: preferred path → fallback recursive text collection → raw stdout fallback. Normalize polymorphic token field names.
See: `src/ai/backends/codex.ts`

### Choosing your strategy

1. **Stable JSON format?** → Use Zod schema validation (Claude pattern)
2. **Streaming NDJSON?** → Split lines, filter by event type, aggregate (OpenCode pattern)
3. **Unstable/evolving format?** → Multi-tier fallbacks with defensive extraction (Codex pattern)
4. **No structured output?** → Return raw stdout as text, set tokens to 0

---

## Common Pitfalls

### Stdin must be `.end()`'d

The subprocess wrapper calls `child.stdin.write(input)` then `child.stdin.end()`. If your CLI blocks waiting for stdin EOF, this is handled automatically. But ensure your CLI reads from stdin (not just CLI args).

### Rate-limit detection is stderr-based

The `SubprocessProvider` checks stderr for these patterns:
```
'rate limit', '429', 'too many requests', 'overloaded'
```
If your CLI uses different error messages for rate limits, they won't be detected as retryable. Add new patterns in `src/ai/providers/subprocess.ts` if needed.

### Token field naming varies wildly

Different CLIs report tokens with different field names:
- `input_tokens` vs `inputTokens` vs `cached_input_tokens`
- `output_tokens` vs `outputTokens`
- `cache_read_input_tokens` vs `cacheReadInputTokens` vs `cached_input_tokens`

Normalize everything to the `AIResponse` field names. See Codex's `extractUsageFromTurnCompleted()` for a robust example of handling multiple naming conventions.

### Model name mapping

ARE uses short model aliases (`sonnet`, `opus`, `haiku`) that backends must resolve to their CLI's expected format. If your CLI uses different model identifiers:

```typescript
const MODEL_ALIASES: Record<string, string> = {
  'sonnet': 'anthropic/claude-sonnet-4-5',
  'opus': 'anthropic/claude-opus-4-6',
};

function resolveModel(model: string): string {
  if (model.includes('/')) return model; // Already qualified
  return MODEL_ALIASES[model] ?? model;
}
```

### Cache tokens may not be available

Not all CLIs report cache token metrics. If unavailable, set `cacheReadTokens` and `cacheCreationTokens` to `0`. If you need cost estimation without cache data, you can calculate from input/output tokens (see OpenCode's `calculateCostFromTokens()`).

### The "MAXIMUM STEPS REACHED" pattern

If your CLI has an agent step limit, handle the marker text. OpenCode strips `"MAXIMUM STEPS REACHED"` from output if substantial content was already produced, or throws a `PARSE_ERROR` if the response is too short (< 100 chars).

---

## Worked Example: Completing the Gemini Backend

The Gemini backend exists as a **stub** at `src/ai/backends/gemini.ts`. Here's what's already done and what remains.

### Current state

```typescript
// src/ai/backends/gemini.ts (current stub)
export class GeminiBackend implements AIBackend {
  readonly name = 'gemini';
  readonly cliCommand = 'gemini';

  async isAvailable(): Promise<boolean> {
    return isCommandOnPath(this.cliCommand);       // ✅ Works
  }

  buildArgs(_options: AICallOptions): string[] {
    return ['-p', '--output-format', 'json'];      // ⚠️ Needs refinement
  }

  parseResponse(/* ... */): AIResponse {
    throw new AIServiceError(                       // ❌ Not implemented
      'SUBPROCESS_ERROR',
      'Gemini backend is not yet implemented.',
    );
  }

  getInstallInstructions(): string { /* ... */ }    // ✅ Works
}
```

**Already integrated:** Registry (priority 3), config schema enum, vendor dir exclusion (`.gemini`), installer paths, integration templates (TOML format).

### What needs to be done

#### 1. Research the Gemini CLI output format

```bash
# Check available flags
gemini --help

# Test JSON output
echo "Say hello" | gemini -p --output-format json

# Examine the response structure
echo "Say hello" | gemini -p --output-format json | python3 -m json.tool
```

Document: What fields exist? Where are tokens reported? What's the model field path? Is it JSON or NDJSON?

#### 2. Refine `buildArgs()`

Based on CLI docs, add support for:
- Model selection (`--model` flag)
- System prompt delivery (flag or stdin wrapping)
- Session/persistence control
- Tool restriction (if available)

```typescript
buildArgs(options: AICallOptions): string[] {
  const args = ['-p', '--output-format', 'json'];

  if (options.model) {
    args.push('--model', options.model);
  }

  // Add system prompt flag if Gemini CLI supports it
  // Otherwise, implement composeStdinInput() instead
  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt);
  }

  return args;
}
```

#### 3. Implement `parseResponse()`

Once you know the JSON structure, create a Zod schema and parser:

```typescript
const GeminiResponseSchema = z.object({
  // Define based on actual Gemini CLI output
  text: z.string(),
  model: z.string().optional(),
  usage: z.object({
    inputTokens: z.number().optional().default(0),
    outputTokens: z.number().optional().default(0),
    // Cache tokens may not be available
  }).optional(),
}).passthrough();

parseResponse(stdout: string, durationMs: number, exitCode: number): AIResponse {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new AIServiceError('PARSE_ERROR', 'Empty Gemini CLI output');
  }

  let parsed: z.infer<typeof GeminiResponseSchema>;
  try {
    parsed = GeminiResponseSchema.parse(JSON.parse(trimmed));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new AIServiceError('PARSE_ERROR', `Failed to parse Gemini response: ${msg}`);
  }

  return {
    text: parsed.text,
    model: parsed.model ?? 'unknown',
    inputTokens: parsed.usage?.inputTokens ?? 0,
    outputTokens: parsed.usage?.outputTokens ?? 0,
    cacheReadTokens: 0,        // Gemini CLI may not expose these
    cacheCreationTokens: 0,
    durationMs,
    exitCode,
    raw: parsed,
  };
}
```

#### 4. Add `composeStdinInput()` if needed

If the Gemini CLI has no `--system-prompt` flag:

```typescript
composeStdinInput(options: AICallOptions): string {
  if (options.systemPrompt) {
    return `<system-instructions>\n${options.systemPrompt}\n</system-instructions>\n\n${options.prompt}`;
  }
  return options.prompt;
}
```

#### 5. Test end-to-end

```bash
npx agents-reverse-engineer generate --backend gemini --dry-run
npx agents-reverse-engineer generate --backend gemini
npx agents-reverse-engineer update --backend gemini
```

### Risks and unknowns

- **JSON format stability**: The stub was deferred because Gemini CLI's output format wasn't stable. Verify the current state.
- **Token reporting**: Gemini may report tokens differently or not at all. May need a cost calculation fallback.
- **Cache tokens**: Gemini context caching is a separate API feature; the CLI may not expose cache metrics.
- **System prompt support**: May require stdin wrapping if no dedicated flag exists.

---

## Reference: Existing Backends

| Aspect | Claude | Codex | Gemini | OpenCode |
|--------|--------|-------|--------|----------|
| **Status** | Production | Production | Stub | Production |
| **File** | `backends/claude.ts` | `backends/codex.ts` | `backends/gemini.ts` | `backends/opencode.ts` |
| **CLI command** | `claude` | `codex` | `gemini` | `opencode` |
| **Output format** | JSON / NDJSON | JSONL events | (not implemented) | NDJSON events |
| **System prompt** | `--system-prompt` flag | XML tags via stdin | TBD | XML tags via stdin |
| **Model flag** | `--model` | `--model` | TBD | `--model` (aliased) |
| **Project config** | None | None | None | `.opencode/agents/` |
| **Custom stdin** | No | Yes (`composeStdinInput`) | No | Yes (`composeStdinInput`) |
| **Token extraction** | Zod schema on `usage` | Polymorphic field names | TBD | Zod schema on events |
| **Cost tracking** | From CLI response | From events | TBD | Calculated if missing |
| **Registry priority** | 1st | 2nd | 3rd | 4th |
| **Response validation** | Zod schema | Multi-tier fallbacks | — | Zod schema |

---

## Appendix: Next Backend Candidates

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| CLI maturity | High | Stable JSON output, documented flags, non-interactive mode |
| User base | High | Number of developers actively using this tool |
| Agentic capability | Medium | Tool use, multi-turn, context window size |
| Token reporting | Medium | Does the CLI expose usage metrics in output? |
| Open source | Low | Easier to debug, contribute, and inspect output format |

### Tier 1 — Strong Candidates

**Goose** (Block/Square)
- CLI-first open-source AI agent
- Has `--format json` output mode
- Clean subprocess model, similar to existing backends
- Growing community, multiple provider support
- **Recommended as next backend after Gemini**

**Aider**
- Extremely popular AI coding CLI (150k+ GitHub stars)
- Supports multiple LLM backends (OpenAI, Anthropic, local models)
- Has `--message` flag for non-interactive use
- Large, active user base
- **Complexity:** Multi-model routing; JSON output may need investigation

### Tier 2 — Worth Watching

**Amp** (Sourcegraph)
- AI coding agent with CLI support
- Focus on codebase-wide operations
- Newer, smaller user base

**Local Model CLIs** (Ollama wrappers, llama.cpp servers)
- Growing demand for offline/private operation
- **Challenge:** Diverse CLI interfaces, no standardized output format

### Tier 3 — Future / Blocked

**Cursor CLI** — No standalone CLI exists yet (IDE-only). Huge potential user base if released.

**Windsurf CLI** (Codeium) — IDE-only currently. No standalone CLI.

**GitHub Copilot CLI** — Limited to shell command suggestions, not general-purpose agentic mode.

**Amazon Q Developer CLI** — Tightly coupled to AWS ecosystem, complex auth model.

### Recommended Sequence

1. **Gemini CLI** — Complete the existing stub (partially integrated)
2. **Goose** — CLI-native, JSON output, open source, clean subprocess model
3. **Aider** — Massive user base, multi-provider, mature CLI
