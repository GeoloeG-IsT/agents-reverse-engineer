# Architecture Research

**Domain:** Recursive documentation generator for AI coding assistants
**Researched:** 2026-01-25
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
+-------------------------------------------------------------------------+
|                        Orchestration Layer                               |
|  +------------------+  +------------------+  +------------------+        |
|  | CLI Entry Point  |  | Hook Dispatcher  |  | State Manager    |        |
|  +--------+---------+  +--------+---------+  +--------+---------+        |
|           |                     |                     |                  |
+-----------+---------------------+---------------------+------------------+
|                        Core Processing Layer                             |
|  +------------------+  +------------------+  +------------------+        |
|  | Tree Walker      |  | File Analyzer    |  | Summary Aggregator|       |
|  +--------+---------+  +--------+---------+  +--------+---------+        |
|           |                     |                     |                  |
+-----------+---------------------+---------------------+------------------+
|                        Infrastructure Layer                              |
|  +------------------+  +------------------+  +------------------+        |
|  | Git Integration  |  | LLM Interface    |  | File System I/O  |        |
|  +------------------+  +------------------+  +------------------+        |
+-------------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI Entry Point | Parse commands, route to workflows | Commander.js or native arg parsing |
| Hook Dispatcher | Trigger documentation updates from git events | Git hooks (post-commit, post-merge) |
| State Manager | Track processed files, git hashes, update status | JSON/YAML state file in `.agents-reverse/` |
| Tree Walker | Traverse directory structure depth-first | Recursive filesystem iteration |
| File Analyzer | Generate summaries for individual files | LLM calls with file content + context |
| Summary Aggregator | Combine child summaries into parent AGENTS.md | LLM synthesis of child outputs |
| Git Integration | Detect changes, track hashes, compute diffs | git CLI or simple-git library |
| LLM Interface | Abstract LLM calls (Claude, GPT, local) | Unified API adapter pattern |
| File System I/O | Read source files, write .sum and AGENTS.md | Node fs or similar |

## Recommended Project Structure

```
agents-reverse/
├── src/
│   ├── cli/                # CLI command definitions
│   │   ├── index.ts        # Entry point
│   │   ├── commands/       # Individual commands (init, update, generate)
│   │   └── hooks/          # Hook installation/management
│   ├── core/               # Core processing logic
│   │   ├── walker.ts       # Tree traversal engine
│   │   ├── analyzer.ts     # File analysis orchestration
│   │   ├── aggregator.ts   # Summary rollup logic
│   │   └── scheduler.ts    # Processing order management
│   ├── infrastructure/     # External integrations
│   │   ├── git.ts          # Git operations wrapper
│   │   ├── llm/            # LLM provider adapters
│   │   │   ├── interface.ts
│   │   │   ├── claude.ts
│   │   │   └── openai.ts
│   │   └── fs.ts           # File system operations
│   ├── state/              # State management
│   │   ├── tracker.ts      # File hash tracking
│   │   └── store.ts        # Persistence layer
│   └── types/              # TypeScript types
├── templates/              # AGENTS.md templates
├── tests/                  # Test files
├── .agents-reverse/        # Runtime state (gitignored)
│   └── state.json          # Processing state
└── package.json
```

### Structure Rationale

- **src/cli/:** Separates CLI concerns from core logic, enabling testing without CLI overhead
- **src/core/:** Contains the heart of the system - traversal, analysis, and aggregation are independent and testable
- **src/infrastructure/:** Abstracts external dependencies (git, LLMs, filesystem) for mockability
- **src/state/:** Dedicated state management enables incremental updates and resume capability

## Architectural Patterns

### Pattern 1: Bottom-Up Recursive Processing

**What:** Process leaf files first, then aggregate summaries upward to parent directories until reaching root.

**When to use:** Always - this is the core pattern for the tool

**Trade-offs:**
- PRO: Each directory summary has full context from children
- PRO: Natural parallelization at sibling level
- CON: Must wait for all children before processing parent

**Example:**
```typescript
async function processDirectory(dir: Path): Promise<Summary> {
  const entries = await fs.readdir(dir);

  // Process all children first (can parallelize siblings)
  const childSummaries = await Promise.all(
    entries.map(entry =>
      entry.isDirectory()
        ? processDirectory(entry.path)
        : processFile(entry.path)
    )
  );

  // Then aggregate into parent AGENTS.md
  return aggregator.synthesize(dir, childSummaries);
}
```

### Pattern 2: State-Driven Incremental Updates

**What:** Track git hash per file/directory; on update, diff against stored hash to identify changed paths, only reprocess those paths and their ancestors.

**When to use:** For the `update` command after initial generation

**Trade-offs:**
- PRO: Fast updates - only processes what changed
- PRO: Git-native change detection is reliable
- CON: State file must be kept in sync; corruption requires full regeneration

**Example:**
```typescript
interface FileState {
  path: string;
  lastHash: string;
  lastProcessed: string;
}

async function findChangedPaths(state: FileState[]): Promise<Path[]> {
  const currentHash = await git.getHeadHash();
  const storedHash = state[0]?.lastProcessedCommit;

  if (!storedHash) return getAllPaths(); // Full generation

  const diffOutput = await git.diff(storedHash, currentHash, '--name-only');
  return diffOutput.split('\n').filter(Boolean);
}
```

### Pattern 3: Parallel Sibling Processing

**What:** Process files/directories at the same level in parallel since they don't depend on each other.

**When to use:** When LLM rate limits allow; configurable concurrency

**Trade-offs:**
- PRO: Significant speedup for large codebases
- CON: Rate limiting concerns with LLM providers
- CON: Resource consumption (memory for parallel file reads)

**Example:**
```typescript
async function processSiblings(paths: Path[], concurrency = 5): Promise<Summary[]> {
  const results: Summary[] = [];

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processPath));
    results.push(...batchResults);
  }

  return results;
}
```

## Data Flow

### Full Generation Flow

```
[CLI: generate]
    |
    v
[Tree Walker] ---> Builds directory tree from root
    |
    v
[Scheduler] ---> Orders processing: leaves first, then parents
    |
    v
[File Analyzer] ---> For each file: read content -> LLM call -> write {file}.sum
    |
    v
[Summary Aggregator] ---> For each directory: read child .sum files -> LLM call -> write AGENTS.md
    |
    v
[State Manager] ---> Record git hash and timestamps
    |
    v
[Output] ---> AGENTS.md files throughout tree, .sum files for each source file
```

### Incremental Update Flow

```
[Hook: post-commit] or [CLI: update]
    |
    v
[Git Integration] ---> Compute diff since last processed hash
    |
    v
[State Manager] ---> Identify changed paths
    |
    v
[Path Resolver] ---> Expand changed paths to include ancestor directories
    |
    v
[Scheduler] ---> Order processing: changed files first, then ancestor dirs
    |
    v
[File Analyzer] ---> Regenerate .sum for changed files only
    |
    v
[Summary Aggregator] ---> Regenerate AGENTS.md for affected directories only
    |
    v
[State Manager] ---> Update stored hash to HEAD
```

### Key Data Flows

1. **File -> Summary:** Source file content + optional context (imports, exports) -> LLM -> {filename}.sum (compact summary)
2. **Directory -> AGENTS.md:** All child .sum files + directory structure -> LLM -> AGENTS.md (comprehensive directory guide)
3. **State persistence:** After each successful generation, record {path, gitHash, timestamp} for incremental updates

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Small (<100 files) | Sequential processing sufficient, in-memory state |
| Medium (100-1000 files) | Parallel sibling processing, file-based state, batched LLM calls |
| Large (1000+ files) | Chunked processing, persistent queue, rate limiting, partial updates |

### Scaling Priorities

1. **First bottleneck:** LLM API rate limits and costs. Mitigation: caching, batching, model selection (smaller models for simple files)
2. **Second bottleneck:** Memory for large codebases. Mitigation: streaming file reads, process subtrees independently

## Anti-Patterns

### Anti-Pattern 1: Top-Down Generation

**What people do:** Start at root, try to understand entire codebase, then drill down

**Why it's wrong:** LLM context limits make this impossible for non-trivial codebases; no incremental benefit

**Do this instead:** Bottom-up processing where each level has bounded context from children

### Anti-Pattern 2: Storing Summaries in Code Comments

**What people do:** Add generated documentation as comments in source files

**Why it's wrong:** Pollutes codebase, merge conflicts, goes stale immediately, requires full file rewrites

**Do this instead:** Separate .sum files and AGENTS.md files that can be regenerated without touching source

### Anti-Pattern 3: Ignoring Git State

**What people do:** Regenerate everything on every run

**Why it's wrong:** Expensive, slow, unnecessary when only a few files changed

**Do this instead:** Track git hashes, diff against last processed state, regenerate only changed subtrees

### Anti-Pattern 4: Monolithic AGENTS.md at Root Only

**What people do:** Generate one big file describing entire codebase

**Why it's wrong:** Exceeds useful context length, hard to navigate, doesn't help with specific directory questions

**Do this instead:** Hierarchical AGENTS.md per directory, with each focused on its immediate contents

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API | HTTP client with retry/backoff | Primary LLM, supports long context |
| OpenAI API | HTTP client with retry/backoff | Alternative LLM provider |
| Local LLMs (Ollama) | HTTP to localhost | Cost-free option for sensitive codebases |
| Git | CLI subprocess or simple-git | Core for change detection |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI <-> Core | Function calls with typed params | CLI is thin wrapper over core |
| Core <-> Infrastructure | Dependency injection | Infrastructure interfaces allow mocking |
| Walker <-> Analyzer | Event/callback pattern | Walker emits file events, analyzer processes |
| Analyzer <-> Aggregator | Summary data structures | Aggregator receives completed summaries |

## Component Dependency Graph

```
                    CLI
                     |
          +----------+-----------+
          |          |           |
       Walker    Analyzer    Aggregator
          |          |           |
          +-----+----+-----+-----+
                |          |
            Git Client   LLM Interface
                |          |
          +-----+----------+
          |
      File System
```

**Build Order Implications:**

1. **Infrastructure first:** `fs.ts`, `git.ts`, `llm/interface.ts` - no internal dependencies
2. **State second:** Depends only on infrastructure
3. **Core third:** `walker.ts` -> `analyzer.ts` -> `aggregator.ts` (each depends on previous)
4. **CLI last:** Depends on all core components

## Hook Integration Architecture

### Git Hook Strategy

```
.git/hooks/
├── post-commit    # Triggers incremental update
├── post-merge     # Triggers incremental update after pulls
└── post-checkout  # Optional: update after branch switch
```

### Hook Installation

```typescript
// Install hook that calls agents-reverse update
async function installHooks(projectRoot: Path) {
  const hookScript = `#!/bin/sh
exec agents-reverse update --quiet
`;

  const hooksDir = path.join(projectRoot, '.git', 'hooks');
  await fs.writeFile(path.join(hooksDir, 'post-commit'), hookScript, { mode: 0o755 });
}
```

### Hook Integration Patterns

| Hook | When Fires | What to Do |
|------|------------|------------|
| post-commit | After each commit | Run incremental update on changed files |
| post-merge | After git pull/merge | Run incremental update on all changed files since last hash |
| post-checkout | After branch switch | Optional: update if branch has diverged significantly |

## Comparison with Existing Tools

### GSD Codebase Mapper

GSD uses parallel agents with different focus areas (tech, arch, quality, concerns) writing documents directly. Key insights:

- **Parallel domain agents:** Each agent has fresh context, reduces token contamination
- **Template-driven output:** Consistent structure across documents
- **Orchestrator pattern:** Lightweight coordinator spawns workers, collects confirmations

**Applicable to agents-reverse:**
- Could parallelize directory processing
- Templates for AGENTS.md ensure consistent format
- Orchestrator tracks completion state

### BMAD Multi-Agent System

BMAD uses 26 agents coordinated via manifests and workflows:

- **Manifest-driven discovery:** Agents find each other via registry files
- **Step-file architecture:** Each phase reloads context to prevent information loss
- **Documentation cascade:** Research -> Brief -> PRD -> Implementation

**Applicable to agents-reverse:**
- State file serves similar purpose to manifests
- Bottom-up processing is a form of step-file architecture
- Summary cascade mirrors documentation cascade

### CodeWiki (Research Framework)

CodeWiki generates repository-level documentation through hierarchical decomposition:

- **Dependency graph construction:** Tree-sitter AST for structure
- **Dynamic task delegation:** Agents spawn sub-agents for complex modules
- **Bottom-up synthesis:** Parent documentation synthesizes child documentation

**Applicable to agents-reverse:**
- Confirms bottom-up as correct approach
- Tree-sitter could enhance file analysis accuracy
- Multi-agent delegation for large directories

### Autodoc (Context Labs)

Autodoc uses depth-first traversal with LLM documentation per file and folder:

- **Token-based model selection:** Smaller models for simple files
- **Depth-first traversal:** Natural recursive processing
- **Query interface:** Generated docs enable codebase questions

**Applicable to agents-reverse:**
- Model selection based on file complexity saves costs
- Depth-first matches bottom-up processing
- Query capability is future enhancement opportunity

## Sources

- [CodeWiki: Evaluating AI's Ability to Generate Holistic Documentation](https://arxiv.org/abs/2510.24428) - Hierarchical decomposition framework
- [Autodoc by Context Labs](https://github.com/context-labs/autodoc) - Depth-first traversal approach
- [C4Diagrammer/RepoDocumenter](https://github.com/jonverrier/RepoDocumenter) - Rollup documentation pattern
- [BMAD Architecture Deep Dive](https://www.vibesparking.com/en/blog/ai/bmad/2026-01-15-bmad-agents-workflows-tasks-files-architecture/) - Multi-agent coordination
- [AGENTS.md Specification](https://agents.md/) - Target output format standard
- [GitHub Blog: How to Write a Great AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) - Best practices for output
- [Tree-sitter Documentation](https://tree-sitter.github.io/) - AST parsing for code analysis
- [Git Hooks Documentation](https://git-scm.com/docs/githooks) - Hook integration patterns

---

*Architecture research for: Recursive Documentation Generator*
*Researched: 2026-01-25*
