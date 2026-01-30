/**
 * Template generators for AI coding assistant integration files
 *
 * Generates command file templates for Claude Code, OpenCode, and session hooks.
 */

import type { IntegrationTemplate } from './types.js';

/**
 * Get Claude Code command file templates
 *
 * Returns templates for:
 * - generate.md: Full documentation generation command
 * - update.md: Incremental documentation update command
 * - init.md: Initialize agents-reverse-engineer in a project
 *
 * @returns Array of Claude Code command templates
 */
export function getClaudeTemplates(): IntegrationTemplate[] {
  return [
    {
      filename: 'generate.md',
      path: '.claude/commands/are/generate.md',
      content: `---
name: are:generate
description: Generate AI-friendly documentation for the entire codebase
argument-hint: "[--budget N] [--dry-run] [--verbose]"
---

Generate comprehensive documentation for this codebase using agents-reverse-engineer.

<execution>
Run the agents-reverse-engineer generate command:

\`\`\`bash
npx are generate $ARGUMENTS
\`\`\`

After completion, summarize:
- Number of files analyzed
- Token budget used
- Any files skipped due to budget
- Location of generated CLAUDE.md and AGENTS.md files

If budget concerns arise, suggest \`--budget N\` to adjust.
</execution>
`,
    },
    {
      filename: 'update.md',
      path: '.claude/commands/are/update.md',
      content: `---
name: are:update
description: Incrementally update documentation for changed files
argument-hint: "[--uncommitted] [--dry-run] [--verbose]"
---

Update documentation for files that changed since last run.

<execution>
Run the agents-reverse-engineer update command:

\`\`\`bash
npx are update $ARGUMENTS
\`\`\`

After completion, summarize:
- Files updated
- Files unchanged
- Any orphaned docs cleaned up

Use \`--uncommitted\` to include staged but uncommitted changes.
</execution>
`,
    },
    {
      filename: 'init.md',
      path: '.claude/commands/are/init.md',
      content: `---
name: are:init
description: Initialize agents-reverse-engineer configuration and integration
argument-hint: "[--integration]"
---

Initialize agents-reverse-engineer in this project.

<execution>
Run the agents-reverse-engineer init command:

\`\`\`bash
npx are init $ARGUMENTS
\`\`\`

This creates:
- \`.agents-reverse-engineer.yaml\` configuration file
- With \`--integration\`: command files for detected AI assistants
</execution>
`,
    },
  ];
}

/**
 * Get OpenCode command file templates
 *
 * Returns templates for:
 * - are-generate.md: Full documentation generation command
 * - are-update.md: Incremental documentation update command
 *
 * @returns Array of OpenCode command templates
 */
export function getOpenCodeTemplates(): IntegrationTemplate[] {
  return [
    {
      filename: 'are-generate.md',
      path: '.opencode/commands/are-generate.md',
      content: `---
description: Generate AI-friendly documentation for the entire codebase
agent: build
---

Generate comprehensive documentation for this codebase using agents-reverse-engineer.

Run: \`npx are generate $ARGUMENTS\`

Arguments supported:
- \`--budget N\` - Override token budget
- \`--dry-run\` - Show plan without writing files
- \`--verbose\` - Show detailed output
`,
    },
    {
      filename: 'are-update.md',
      path: '.opencode/commands/are-update.md',
      content: `---
description: Incrementally update documentation for changed files
agent: build
---

Update documentation for files that changed since last run.

Run: \`npx are update $ARGUMENTS\`

Arguments supported:
- \`--uncommitted\` - Include staged but uncommitted changes
- \`--dry-run\` - Show plan without writing files
- \`--verbose\` - Show detailed output
`,
    },
  ];
}

/**
 * Get session-end hook template for automatic documentation updates
 *
 * The hook:
 * - Checks ARE_DISABLE_HOOK env var for temporary disable
 * - Checks config file for permanent disable (hook_enabled: false)
 * - Checks git status and exits silently if no changes
 * - Spawns are update --quiet in background (detached, unref'd)
 *
 * Uses CommonJS (require) since hooks run via node directly.
 *
 * @returns JavaScript hook code as a string
 */
export function getHookTemplate(): string {
  return `#!/usr/bin/env node
// .claude/hooks/are-session-end.js
// Triggers are update when session ends (if there are uncommitted changes)

const { execSync, spawn } = require('child_process');
const fs = require('fs');

// Check for disable flag
if (process.env.ARE_DISABLE_HOOK === '1') {
  process.exit(0);
}

// Check config file for permanent disable
const configPath = '.agents-reverse-engineer.yaml';
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
const child = spawn('npx', ['are', 'update', '--quiet'], {
  stdio: 'ignore',
  detached: true,
});
child.unref();
`;
}
