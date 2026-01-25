# Stack Research

**Domain:** CLI tooling for AI coding assistant integrations (Claude Code, OpenCode)
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

This stack is optimized for building a recursive documentation generator that integrates with AI coding assistants as a skill/command system. The key insight: **we don't call LLMs directly** - the host tools (Claude Code, OpenCode) handle LLM orchestration. Our job is file system work, markdown generation, and providing the right interface.

The recommended stack prioritizes:
1. Native TypeScript/ESM for modern tooling compatibility
2. Markdown-based skill files for zero-dependency integration
3. Fast file system operations for recursive traversal
4. Git-aware operations for diff-based updates

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| TypeScript | 5.5+ | Type safety, IDE support | Standard for CLI tools in 2025; native Node.js support emerging | HIGH |
| Node.js | 22+ | Runtime | LTS with native TypeScript stripping; required by chokidar v5 | HIGH |
| ESM | Native | Module system | Industry standard; Claude Code/OpenCode both ESM-native | HIGH |

**Rationale:** Node.js 22+ with native TypeScript support means fewer build steps. ESM is non-negotiable - both Claude Code and OpenCode are ESM-first, and the MCP SDK requires it.

### Development Runtime

| Tool | Version | Purpose | Why Recommended | Confidence |
|------|---------|---------|-----------------|------------|
| tsx | 4.21+ | TypeScript execution | Faster than ts-node, seamless ESM support, works with Node 22 | HIGH |
| tsup | 8.5+ | Build/bundling | Zero-config dual ESM/CJS output; esbuild-powered speed | HIGH |

**Rationale:** tsx for development (instant execution, no compile step), tsup for distribution (if we ever publish to npm). Node 23+ can run TypeScript natively with `--experimental-strip-types`, but tsx remains more mature for watch mode and complex setups.

### File System & Traversal

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| fast-glob | 3.3.3 | Pattern-based file discovery | 10-20% faster than node-glob; mature and battle-tested | HIGH |
| ignore | 7.0.5 | Gitignore pattern matching | Used by eslint, prettier; spec-compliant gitignore parsing | HIGH |
| chokidar | 5.0+ | File watching (if needed) | De facto standard; used by VS Code, webpack | MEDIUM |

**Rationale:** fast-glob for initial codebase scanning, ignore for respecting .gitignore patterns (critical for not documenting node_modules). chokidar only if we implement watch mode for live updates.

### Git Operations

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| simple-git | 3.x | Git operations | Full TypeScript support; chainable API; lightweight | HIGH |

**Rationale:** Need git operations for: (1) detecting changed files via diff, (2) staged file awareness, (3) commit metadata. simple-git wraps git CLI with proper TypeScript types.

### Markdown & Frontmatter

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| gray-matter | 4.0.3 | YAML frontmatter parsing | Industry standard; used by Gatsby, Astro, 11ty | HIGH |

**Rationale:** SKILL.md files use YAML frontmatter. gray-matter parses this cleanly and is battle-tested across the static site generator ecosystem.

### Schema Validation

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| zod | 4.3+ | Runtime validation | Required peer dep of MCP SDK; TypeScript-first | HIGH |

**Rationale:** Zod 4 is the standard. It's a peer dependency of @modelcontextprotocol/sdk anyway, so we get it for free. Use for validating configuration files and SKILL.md frontmatter.

### CLI Framework

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| None | - | CLI parsing | Skills/commands are markdown files, not CLI binaries | HIGH |

**Rationale:** This is the key architectural decision. We are NOT building a traditional CLI. We are building Claude Code skills and OpenCode plugins. The "CLI" is the host tool itself. Our code is invoked via:
- Claude Code: `/agents-reverse` skill
- OpenCode: Plugin in `.opencode/plugin/`

If we later need a standalone CLI for debugging/testing, commander 14.x is the choice (lightweight, TypeScript-first).

### Testing

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| Vitest | 4.0+ | Test runner | Native ESM/TypeScript; faster than Jest; Vite ecosystem | HIGH |

**Rationale:** Vitest has surpassed Jest for TypeScript projects. Native ESM support means no configuration hell. snapshot testing for generated markdown files.

---

## Integration Architecture

### Claude Code Integration (Primary)

**Method:** Skill-based integration via SKILL.md files

```
.claude/skills/agents-reverse/
  SKILL.md           # Skill definition with YAML frontmatter
  scripts/           # TypeScript scripts invoked by skill
  references/        # Documentation for context
```

**SKILL.md Structure:**
```yaml
---
name: agents-reverse
description: Generate and maintain AGENTS.md files for this codebase
allowed-tools: Read, Write, Bash, Glob, Grep
---
[Instructions for Claude on how to run the tool]
```

**Confidence:** HIGH - This is the documented and recommended pattern from Anthropic.

### OpenCode Integration (Secondary)

**Method:** Plugin-based integration

```
.opencode/plugin/
  agents-reverse.ts  # Plugin definition
```

**Plugin Structure:**
```typescript
export default {
  name: 'agents-reverse',
  tools: [...],
  hooks: {...}
}
```

**Confidence:** MEDIUM - OpenCode plugin API is less documented than Claude Code skills.

### MCP Server (Optional/Future)

**Method:** Model Context Protocol server for cross-tool compatibility

| Package | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | 1.25.3 | MCP server implementation |

**Confidence:** HIGH for SDK, MEDIUM for necessity. MCP provides tool-agnostic integration but adds complexity. Start with native skills, add MCP if cross-tool support becomes critical.

---

## Installation

```bash
# Core dependencies
npm install fast-glob ignore simple-git gray-matter zod

# Development dependencies
npm install -D typescript tsx tsup vitest @types/node

# Optional: MCP server (if building cross-tool support)
npm install @modelcontextprotocol/sdk
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| fast-glob | node-glob | When you need glob v11 advanced features (10-20% slower) |
| tsx | ts-node | Legacy projects on Node <20; tsx has better ESM support |
| tsup | esbuild direct | When you need fine-grained control; tsup wraps esbuild anyway |
| Vitest | Jest | Legacy projects with heavy Jest investment |
| simple-git | isomorphic-git | When you need browser compatibility (we don't) |
| zod | yup, joi | Yup/Joi if team already uses them; Zod is MCP SDK peer dep |
| gray-matter | front-matter | front-matter for YAML-only; gray-matter more flexible |
| SKILL.md | MCP Server | MCP for cross-tool; SKILL.md for Claude Code native |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ts-node | ESM compatibility issues on Node 20+; slower than tsx | tsx |
| Jest | Configuration complexity with ESM; slower than Vitest | Vitest |
| Glob v10 | Security advisory CVE-2024-21538 (ReDoS); use v11+ or fast-glob | fast-glob 3.3.3 |
| node-fetch | Built into Node 18+; unnecessary dependency | Native fetch |
| axios | Overkill for simple HTTP; adds bundle size | Native fetch |
| LangChain/CrewAI | Unnecessary - host tool handles LLM orchestration | Direct skill integration |
| commander/yargs | Not a CLI app - it's a skill/plugin system | SKILL.md files |
| Anthropic SDK | Host tool calls Claude - we don't make API calls directly | Let host handle LLM |

**Critical Anti-Pattern:** Do NOT add `@anthropic-ai/sdk` or similar. The entire point is that Claude Code/OpenCode handle LLM calls. Our tool does file system work and returns structured output for the host to process.

---

## Stack Patterns by Integration Target

### If targeting Claude Code only:
- Use SKILL.md files in `.claude/skills/`
- Scripts in TypeScript, executed via `tsx`
- No MCP server needed
- Hooks via `.claude/settings.json`

### If targeting OpenCode only:
- Use plugin files in `.opencode/plugin/`
- TypeScript plugin definition
- MCP server optional but straightforward

### If targeting both (recommended):
- SKILL.md for Claude Code
- Plugin wrapper for OpenCode
- Shared core TypeScript library
- Consider MCP server for future-proofing

---

## Version Compatibility Matrix

| Package | Requires | Compatible With | Notes |
|---------|----------|-----------------|-------|
| @modelcontextprotocol/sdk 1.25.x | zod >=3.25 or 4.x | Node 18+ | Peer dep on zod |
| fast-glob 3.3.3 | Node 12+ | - | Very permissive |
| chokidar 5.x | Node 20+ | - | ESM-only in v5 |
| tsx 4.x | Node 18+ | - | - |
| tsup 8.x | Node 18+ | - | - |
| Vitest 4.x | Node 18+ | Vite 5/6 | - |
| zod 4.x | - | TypeScript 5.5+ | - |
| simple-git 3.x | Node 12+ | - | Requires git CLI |
| gray-matter 4.x | Node 8+ | - | Very permissive |
| ignore 7.x | Node 6+ | - | Very permissive |

**Minimum Node version for full stack:** Node 20 (due to chokidar 5.x if used, otherwise 18)
**Recommended Node version:** Node 22 LTS (native TypeScript support emerging)

---

## Configuration Files

### tsconfig.json (recommended)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json (recommended)
```json
{
  "name": "agents-reverse",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest"
  },
  "engines": {
    "node": ">=20"
  }
}
```

---

## Sources

### HIGH Confidence (Official Documentation / Releases)
- [MCP TypeScript SDK v1.25.3](https://github.com/modelcontextprotocol/typescript-sdk/releases) - Official releases page
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) - Anthropic official docs
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) - Anthropic official docs
- [OpenCode MCP Servers](https://opencode.ai/docs/mcp-servers/) - OpenCode official docs
- [fast-glob 3.3.3 Release](https://github.com/mrmlnc/fast-glob/releases/tag/3.3.3) - GitHub releases
- [Commander 14.x Changelog](https://github.com/tj/commander.js/blob/master/CHANGELOG.md) - Official changelog

### MEDIUM Confidence (Verified Community Sources)
- [tsx npm package](https://www.npmjs.com/package/tsx) - v4.21.0 confirmed
- [tsup npm package](https://www.npmjs.com/package/tsup) - v8.5.1 confirmed
- [Vitest 4.0 Release](https://vitest.dev/blog/vitest-3) - Official blog (v4.0.17 current)
- [zod v4 Release Notes](https://zod.dev/v4) - Official documentation
- [Node.js TypeScript Support](https://nodejs.org/en/learn/typescript/run) - Official Node.js docs

### LOW Confidence (Community Sources - Validate Before Use)
- [OpenCode Plugin Architecture](https://deepwiki.com/anomalyco/opencode/8.3-mcp-server-development) - Community documentation
- [Claude Code Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Community blog

---

*Stack research for: Agents Reverse - AI coding assistant documentation tooling*
*Researched: 2026-01-25*
