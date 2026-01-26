# Phase 4: Integration & Commands - Research

**Researched:** 2026-01-26
**Domain:** AI coding assistant integration, slash commands, hooks, multi-tool support
**Confidence:** HIGH

## Summary

This phase implements slash command integration (`/ar:generate`, `/ar:update`) and end-of-session hooks for AI coding assistants. The primary targets are Claude Code (the primary environment) and OpenCode (secondary), with a generic pattern that can extend to other assistants like Aider and Continue.

Claude Code uses markdown files in `.claude/commands/` with YAML frontmatter for custom slash commands, and a JSON-based hooks system in `.claude/settings.json` for lifecycle events including `SessionEnd`. OpenCode follows a similar pattern with markdown command files in `.opencode/commands/` and JSON agent configurations. Both systems share the conceptual model of markdown-defined commands with argument placeholders.

The key architectural insight is that our slash commands are thin wrappers that call the existing CLI (`ar generate`, `ar update`). Commands should format output for markdown consumption (AI chat context) rather than terminal display, and hooks should be silent when nothing changed.

**Primary recommendation:** Create markdown command files that call the CLI with appropriate flags, use SessionEnd hook with git status pre-check for auto-updates, and implement `/ar:init` to detect environment and generate appropriate integration files for all detected assistants.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none) | - | No additional dependencies | Integration is file-based, uses existing CLI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| simple-git | ^3.27 | Git status checks in hooks | Pre-check for changes before triggering update |
| picocolors | ^1.x | Already in project | Terminal output formatting (CLI-side only) |

### No New Dependencies

This phase requires no new npm dependencies. Integration files are plain markdown and JSON. The CLI already has all functionality needed; commands just invoke it.

**Installation:**
```bash
# No installation needed - uses existing CLI
```

## Architecture Patterns

### Recommended Project Structure
```
.claude/                          # Claude Code integration
├── commands/
│   └── ar/
│       ├── generate.md          # /ar:generate command
│       ├── update.md            # /ar:update command
│       └── init.md              # /ar:init command
├── hooks/
│   └── ar-session-end.js        # End-of-session hook script
└── settings.json                # Hook registration

.opencode/                        # OpenCode integration
├── commands/
│   ├── ar-generate.md           # /ar:generate command
│   └── ar-update.md             # /ar:update command
└── agents/
    └── ar-docs.md               # Docs agent definition

src/
├── commands/                    # NEW: Slash command handlers
│   ├── types.ts                # Command output types
│   ├── generate.ts             # Generate command for slash context
│   ├── update.ts               # Update command for slash context
│   └── init.ts                 # Init command - generates integration files
└── cli/
    └── index.ts                 # Add init command routing
```

### Pattern 1: Claude Code Command Files
**What:** Markdown files with YAML frontmatter that define slash commands
**When to use:** All Claude Code command integrations
**Example:**
```markdown
---
name: ar:generate
description: Generate AI-friendly documentation for the entire codebase
argument-hint: "[--budget N] [--dry-run] [--verbose]"
---

Generate comprehensive documentation for this codebase using agents-reverse.

<execution>
Run the agents-reverse generate command:

\`\`\`bash
ar generate $ARGUMENTS
\`\`\`

After completion, summarize:
- Number of files analyzed
- Token budget used
- Any files skipped due to budget
- Location of generated CLAUDE.md and AGENTS.md files

If budget concerns arise, suggest `--budget N` to adjust.
</execution>
```

### Pattern 2: Claude Code Session End Hook
**What:** JavaScript hook that runs when session ends, checks for changes, and triggers update
**When to use:** Automatic documentation updates
**Example:**
```javascript
#!/usr/bin/env node
// .claude/hooks/ar-session-end.js
// Triggers ar update when session ends (if there are uncommitted changes)

const { execSync, spawn } = require('child_process');
const fs = require('fs');

// Check for disable flag
if (process.env.AR_DISABLE_HOOK === '1') {
  process.exit(0);
}

// Check config file for permanent disable
const configPath = '.agents-reverse.yaml';
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf-8');
  if (config.includes('hook_enabled: false')) {
    process.exit(0);
  }
}

// Check git status - skip if no changes
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (!status.trim()) {
    // No changes since last run - exit silently
    process.exit(0);
  }
} catch {
  // Not a git repo or git not available - exit silently
  process.exit(0);
}

// Run update in background (don't block session close)
const child = spawn('ar', ['update', '--quiet'], {
  stdio: 'ignore',
  detached: true,
});
child.unref();
```

### Pattern 3: OpenCode Command Files
**What:** Markdown command files for OpenCode with similar structure
**When to use:** OpenCode integration
**Example:**
```markdown
---
description: Generate AI-friendly documentation for the entire codebase
agent: build
---

Generate comprehensive documentation for this codebase using agents-reverse.

Run: `ar generate $ARGUMENTS`

Arguments supported:
- `--budget N` - Override token budget
- `--dry-run` - Show plan without writing files
- `--verbose` - Show detailed output
```

### Pattern 4: Init Command with Environment Detection
**What:** Detect AI assistant environment and generate appropriate integration files
**When to use:** First-time setup via `/ar:init` or `ar init --integration`
**Example:**
```typescript
// Source: Project design from CONTEXT.md
interface DetectedEnvironment {
  type: 'claude' | 'opencode' | 'aider' | 'unknown';
  configDir: string;
  detected: boolean;
}

function detectEnvironments(projectRoot: string): DetectedEnvironment[] {
  const environments: DetectedEnvironment[] = [];

  // Check for Claude Code
  const claudeDir = path.join(projectRoot, '.claude');
  if (fs.existsSync(claudeDir) || fs.existsSync(path.join(projectRoot, 'CLAUDE.md'))) {
    environments.push({ type: 'claude', configDir: '.claude', detected: true });
  }

  // Check for OpenCode
  const openCodeDir = path.join(projectRoot, '.opencode');
  if (fs.existsSync(openCodeDir)) {
    environments.push({ type: 'opencode', configDir: '.opencode', detected: true });
  }

  // Check for Aider (presence of .aider.conf.yml or .aider/)
  const aiderConfig = path.join(projectRoot, '.aider.conf.yml');
  const aiderDir = path.join(projectRoot, '.aider');
  if (fs.existsSync(aiderConfig) || fs.existsSync(aiderDir)) {
    environments.push({ type: 'aider', configDir: '.aider', detected: true });
  }

  return environments;
}
```

### Pattern 5: Markdown-Optimized Output
**What:** Format CLI output for AI assistant context consumption
**When to use:** All command output when running in slash command context
**Example:**
```typescript
// Source: Project design from CONTEXT.md
interface CommandOutput {
  summary: string;           // Concise summary for chat context
  details?: string;          // Expandable details (markdown formatted)
  warnings?: string[];       // Any warnings to surface
  nextSteps?: string[];      // Suggested next actions
}

function formatForMarkdown(plan: GenerationPlan): CommandOutput {
  return {
    summary: `Analyzed ${plan.files.length} files using ${plan.budget.estimated.toLocaleString()} tokens`,
    details: `
## Generation Complete

**Files analyzed:** ${plan.files.length}
**Token budget:** ${plan.budget.estimated.toLocaleString()} / ${plan.budget.total.toLocaleString()}

### File Types
${formatTypeDistribution(plan)}

### Generated Files
- \`CLAUDE.md\` - Project overview
- \`AGENTS.md\` - Per-directory summaries
- \`.sum\` files - Individual file summaries
`.trim(),
    warnings: plan.skippedFiles.length > 0
      ? [`${plan.skippedFiles.length} files skipped due to budget constraints`]
      : undefined,
    nextSteps: ['Review generated documentation', 'Run `/ar:update` after making changes'],
  };
}
```

### Anti-Patterns to Avoid
- **Embedding AI assistant-specific logic in core CLI:** Keep integration files as thin wrappers; core CLI should be assistant-agnostic
- **Blocking on hook execution:** Hooks should be fast or spawn background processes; don't delay session close
- **Ignoring hook errors silently:** Log errors to a file for debugging, even if not showing to user
- **Generating files for non-detected environments:** Only generate integration files for environments actually detected in the project
- **Hardcoding paths:** Use `$CLAUDE_PROJECT_DIR` or equivalent env vars for project-relative paths

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git status check | Custom git parsing | `git status --porcelain` or simple-git | Handles all edge cases (untracked, staged, etc.) |
| YAML frontmatter parsing | Regex extraction | Existing frontmatter convention | Consistency with ecosystem |
| Hook registration | Manual JSON editing | `/hooks` command in Claude Code | Safer, validated configuration |
| Environment detection | Complex heuristics | Simple directory existence checks | Sufficient and reliable |

**Key insight:** Integration should be additive, not invasive. We're adding files to existing config directories, not modifying core tool behavior.

## Common Pitfalls

### Pitfall 1: Hook Blocks Session Close
**What goes wrong:** Update runs synchronously, delays user exit
**Why it happens:** Hook script waits for completion before exiting
**How to avoid:** Spawn background process immediately, `unref()` to detach
**Warning signs:** Users report Claude Code hangs when closing

### Pitfall 2: Noisy Hook on No Changes
**What goes wrong:** Hook outputs messages even when nothing changed
**Why it happens:** Missing pre-check before running update
**How to avoid:** Check git status first, exit 0 silently if no changes
**Warning signs:** Users see repeated "No changes" messages every session

### Pitfall 3: Command Output Too Verbose for Chat
**What goes wrong:** Terminal-style output clutters AI context
**Why it happens:** Using same output format as CLI
**How to avoid:** Create markdown-optimized output format, use headers/bullets not ASCII tables
**Warning signs:** AI responses reference raw terminal escape codes or formatting

### Pitfall 4: Init Overwrites User Customizations
**What goes wrong:** Running init twice overwrites user's modified command files
**Why it happens:** Blindly writing files without checking existence
**How to avoid:** Check if files exist, prompt before overwriting or skip existing
**Warning signs:** Users complain their customizations disappeared

### Pitfall 5: Hook Fails Silently on Missing CLI
**What goes wrong:** Hook runs but `ar` command not found
**Why it happens:** CLI not installed globally or not in PATH
**How to avoid:** Check for CLI availability, provide helpful error or skip gracefully
**Warning signs:** Documentation never updates automatically

### Pitfall 6: Large Codebase Causes Timeout
**What goes wrong:** Preview for large codebase analysis never completes
**Why it happens:** No timeout on analysis phase
**How to avoid:** Show preview with file count and estimated time, ask before proceeding on large codebases
**Warning signs:** Command appears to hang on large repos

## Code Examples

Verified patterns from official sources:

### Claude Code Command File Structure
```markdown
# Source: https://code.claude.com/docs/en/slash-commands (inferred from ecosystem)
---
name: ar:generate
description: Generate AI-friendly documentation for the entire codebase
argument-hint: "[--budget N] [--dry-run] [--verbose]"
---

<objective>
Analyze the codebase and generate comprehensive AI-friendly documentation.
</objective>

<execution>
1. Run documentation generation:
\`\`\`bash
ar generate $ARGUMENTS
\`\`\`

2. After completion, summarize the results for the user.
</execution>
```

### Claude Code Hook Registration in settings.json
```json
// Source: https://code.claude.com/docs/en/hooks
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/ar-session-end.js"
          }
        ]
      }
    ]
  }
}
```

### Hook Input JSON Structure
```typescript
// Source: https://code.claude.com/docs/en/hooks (SessionEnd Input)
interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: "SessionEnd";
  reason: "clear" | "logout" | "prompt_input_exit" | "other";
}
```

### OpenCode Command File Structure
```markdown
# Source: https://opencode.ai/docs/commands/
---
description: Generate AI-friendly documentation
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---

Analyze the codebase and generate comprehensive AI-friendly documentation.

Run: `ar generate $ARGUMENTS`

Arguments: --budget N, --dry-run, --verbose
```

### Large Codebase Preview Pattern
```typescript
// Source: Project design from CONTEXT.md
const LARGE_CODEBASE_THRESHOLD = 500; // files

interface PreviewResult {
  fileCount: number;
  estimatedTime: string;
  requiresConfirmation: boolean;
}

function generatePreview(discoveryResult: DiscoveryResult): PreviewResult {
  const fileCount = discoveryResult.files.length;
  const estimatedMinutes = Math.ceil(fileCount / 100); // ~100 files per minute estimate

  return {
    fileCount,
    estimatedTime: estimatedMinutes > 1
      ? `~${estimatedMinutes} minutes`
      : '< 1 minute',
    requiresConfirmation: fileCount >= LARGE_CODEBASE_THRESHOLD,
  };
}
```

### Stale Docs Reminder Pattern
```typescript
// Source: Project design from CONTEXT.md
const STALE_THRESHOLD = 10; // uncommitted changes

async function checkStaleness(projectRoot: string): Promise<string | null> {
  const git = simpleGit(projectRoot);
  const status = await git.status();

  const changedFiles = status.modified.length +
                       status.not_added.length +
                       status.created.length;

  if (changedFiles >= STALE_THRESHOLD) {
    return `Documentation may be stale: ${changedFiles} files changed since last update. Run \`/ar:update\` to refresh.`;
  }

  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell scripts for integration | Markdown command files | 2024 | Easier to maintain, AI-readable |
| Manual hook configuration | `/hooks` command in Claude Code | 2025 | Safer, validated configuration |
| Single-tool focus | Multi-assistant support | 2025-2026 | OpenCode, Aider, Continue all gaining market share |

**Deprecated/outdated:**
- Shell-based custom commands: Replaced by markdown files with frontmatter
- JSON-only command definitions: OpenCode now supports markdown files
- Cursor-style rules files: Claude Code uses CLAUDE.md + commands

## Open Questions

Things that couldn't be fully resolved:

1. **Aider Integration Specifics**
   - What we know: Aider uses `.aider.conf.yml` and `/add`, `/drop` commands
   - What's unclear: Exact mechanism for custom slash commands in Aider
   - Recommendation: Research further if Aider support becomes priority; start with Claude Code + OpenCode

2. **Continue Integration**
   - What we know: Continue supports custom slash commands
   - What's unclear: Exact file format and location for Continue commands
   - Recommendation: Add Continue support in future iteration if demand exists

3. **Hook Timeout Behavior**
   - What we know: Hooks have 60-second default timeout
   - What's unclear: What happens if hook exceeds timeout on large repo update
   - Recommendation: Background spawn pattern avoids this issue

4. **Exact Thresholds**
   - Large codebase threshold: Start with 500 files, adjust based on user feedback
   - Stale docs reminder: Start with 10 changes, adjust based on user feedback
   - Progress update frequency: Start with per-file, batch if too noisy

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) - Hook events, configuration, input/output format
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) - Complete hook lifecycle, SessionEnd details
- [OpenCode Commands Documentation](https://opencode.ai/docs/commands/) - Command file format, arguments
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/) - Agent configuration, custom agents
- Project codebase: `.claude/commands/`, `.claude/settings.json`, `src/cli/` - Existing patterns

### Secondary (MEDIUM confidence)
- [Claude Code Slash Commands](https://code.claude.com/docs/en/slash-commands) - Command system overview (page 404, but ecosystem patterns consistent)
- [Agentic CLI Tools Compared](https://research.aimultiple.com/agentic-cli/) - Ecosystem landscape verification
- Multiple community examples on GitHub for Claude Code hooks and commands

### Tertiary (LOW confidence)
- WebSearch for Aider/Continue custom command specifics - Limited official documentation found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, file-based integration
- Architecture: HIGH - Patterns directly from official Claude Code documentation
- Pitfalls: MEDIUM - Based on common integration mistakes and user reports
- Multi-tool support: MEDIUM - OpenCode well-documented, Aider/Continue less clear

**Research date:** 2026-01-26
**Valid until:** 60 days (hook/command formats stable, new assistants may emerge)
