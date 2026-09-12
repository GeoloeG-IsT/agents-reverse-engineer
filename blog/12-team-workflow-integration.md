# Integrating ARE into Your Team Workflow: CI/CD, Hooks, and Automation

You've mastered agents-reverse-engineer (ARE) individually. Now make it a team tool. Here's how to scale from personal use to shared infrastructure.

## Session Hooks: Zero-Effort Maintenance

ARE ships with three hooks that run automatically during AI sessions:

- **are-check-update.mjs** (SessionStart): Checks npm for newer ARE versions in the background, caches results. Pin a team version by committing `.claude/ARE-VERSION` to your repo.
- **are-context-loader.mjs** (PostToolUse): Injects parent `AGENTS.md` into context whenever your AI reads a file. Your assistant automatically understands the broader architecture.
- **are-session-end.js** (SessionEnd): Detects git changes via `git status --porcelain` and runs `are update --quiet` in the background. Documentation stays fresh without manual intervention.

All hooks use detached spawning (`child.unref()`) so they never block your session. Disable with `ARE_DISABLE_HOOK=1` or `hook_enabled: false` in config.

## CI/CD Integration

Add documentation validation to your pipeline. A minimal GitHub Actions example:

```yaml
- name: Check docs are current
  run: |
    npx are update --dry-run
    if git status --porcelain | grep -q '\.sum$\|AGENTS\.md$'; then
      echo "Docs out of date. Run 'npx are update' locally."
      exit 1
    fi
```

ARE's exit codes map cleanly to CI: 0 (success), 1 (partial failure), 2 (total failure).

## Shared Configuration

Commit `.agents-reverse-engineer/config.yaml` to standardize behavior: exclusion patterns, concurrency limits, model selection, and compression ratios. Everyone generates consistent documentation.

For monorepos, either run ARE per-workspace or use aggressive exclusion patterns to scope discovery.

## The Programmatic API

For custom integrations, import from `agents-reverse-engineer/core` (@beta):

```typescript
import { updateDocumentation, readConfig } from 'agents-reverse-engineer/core';
const config = await readConfig(process.cwd());
await updateDocumentation(process.cwd(), config);
```

The API exposes 60+ symbols for discovery, generation, orchestration, and telemetry.

## Team Conventions

Agree on basics: commit generated docs or gitignore them, regeneration cadence (per-session via hooks, weekly, or CI gate), and who reviews output. Use `AGENTS.local.md` for team-specific instructions that survive regeneration.

## Series Wrap-Up

Over twelve articles, we've covered ARE from installation through advanced usage:

```bash
npx agents-reverse-engineer@latest
```

ARE is MIT-licensed and open source at [github.com/GeoloeG-IsT/agents-reverse-engineer](https://github.com/GeoloeG-IsT/agents-reverse-engineer).

The goal isn't perfect documentation. It's documentation that's good enough, fresh enough, and automatic enough to actually help.
