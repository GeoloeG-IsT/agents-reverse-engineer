# Phase 2: Documentation Generation - Research

**Researched:** 2026-01-26
**Domain:** Code summarization, documentation generation, token budgeting, LLM integration via host tool
**Confidence:** HIGH

## Summary

This phase implements documentation generation for agents-reverse. The tool generates `.sum` files for each source file, `AGENTS.md` files for each directory, and supplementary docs (ARCHITECTURE.md, STACK.md) when complexity warrants. A critical constraint from PROJECT.md: the tool works **within** Claude Code (or similar hosts) and uses the host's LLM capabilities rather than making external API calls. This means the tool orchestrates analysis by producing prompts/instructions for the host, not by calling LLM APIs directly.

The implementation follows the Agent Skills pattern: the CLI tool outputs structured prompts that the host LLM processes. For full automation, skills will be created that invoke the CLI and process its output. Token budgeting uses `gpt-tokenizer` for counting tokens before sending to the LLM. Chunking uses a map-reduce pattern: split large files, summarize chunks, synthesize final summary.

**Primary recommendation:** Implement as a two-layer system: (1) Node.js CLI that discovers files, detects file types, manages token budgets, and generates prompt templates; (2) Claude Code skills that orchestrate the LLM analysis. Use `gpt-tokenizer` for token counting, file path/content heuristics for template selection, and map-reduce for large file summarization.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gpt-tokenizer | 2.x | Token counting for budget enforcement | Fastest JS tokenizer; supports all OpenAI encodings; TypeScript native |
| Node.js fs/promises | built-in | File reading and writing | Native async file I/O; no dependencies |
| path | built-in | Path manipulation | Cross-platform path handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fast-glob | 3.3.x | Already in project for discovery | Reuse for directory structure analysis |
| picocolors | 1.x | Already in project for CLI output | Progress reporting during generation |
| ora | 8.x | Already in project for spinners | Long-running operations feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gpt-tokenizer | tiktoken (WASM) | tiktoken-wasm is faster but heavier; gpt-tokenizer is pure JS and sufficient |
| markdown-it | Custom string building | markdown-it adds parsing overhead we don't need; we're generating, not parsing |
| Vercel AI SDK | Host-based approach | AI SDK requires API keys; host approach uses existing LLM context |
| @anthropic-ai/sdk | Host-based approach | Same; host tool handles LLM calls |

**Installation:**
```bash
npm install gpt-tokenizer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── generation/               # Documentation generation logic
│   ├── types.ts              # Generation-related types
│   ├── analyzer.ts           # File analysis orchestration
│   ├── prompts/              # Prompt templates
│   │   ├── templates.ts      # Template definitions by file type
│   │   ├── builder.ts        # Prompt construction
│   │   └── types.ts          # Template type definitions
│   ├── budget/               # Token budget management
│   │   ├── counter.ts        # Token counting with gpt-tokenizer
│   │   ├── tracker.ts        # Project-wide budget tracking
│   │   └── chunker.ts        # Large file chunking
│   ├── writers/              # Output file writers
│   │   ├── sum.ts            # .sum file writer
│   │   ├── agents-md.ts      # AGENTS.md writer
│   │   ├── claude-md.ts      # CLAUDE.md writer
│   │   └── supplementary.ts  # ARCHITECTURE.md, STACK.md writers
│   └── detection/            # File type detection
│       ├── detector.ts       # Main detection logic
│       └── patterns.ts       # Directory and content patterns
├── cli/
│   ├── generate.ts           # ar generate command
│   └── ...existing files
└── ...existing directories
```

### Pattern 1: Host-Delegated Analysis
**What:** CLI produces structured prompts; host LLM performs analysis
**When to use:** Core pattern for all file analysis
**Example:**
```typescript
// Source: Derived from Agent Skills pattern and PROJECT.md constraints
interface AnalysisRequest {
  filePath: string;
  content: string;
  fileType: FileType;
  prompt: string;
  contextFiles?: string[];  // Related files for context
}

interface AnalysisResult {
  summary: string;
  metadata: {
    purpose: string;
    publicInterface: string[];
    dependencies: string[];
    patterns: string[];
  };
}

// CLI generates the request; host LLM processes it
function buildAnalysisPrompt(request: AnalysisRequest): string {
  const template = getTemplate(request.fileType);
  return template
    .replace('{{FILE_PATH}}', request.filePath)
    .replace('{{CONTENT}}', request.content)
    .replace('{{CONTEXT}}', request.contextFiles?.join('\n') ?? '');
}
```

### Pattern 2: Directory-First Type Detection
**What:** Detect file type from directory path first, fall back to content analysis
**When to use:** For selecting appropriate prompt templates
**Example:**
```typescript
// Source: Derived from CONTEXT.md decisions
type FileType =
  | 'component'   // React/Vue/Svelte components
  | 'service'     // Business logic services
  | 'util'        // Utility functions
  | 'type'        // Type definitions
  | 'test'        // Test files
  | 'config'      // Configuration files
  | 'api'         // API routes/handlers
  | 'model'       // Data models
  | 'hook'        // React hooks
  | 'schema'      // Validation schemas
  | 'generic';    // Default fallback

const DIRECTORY_PATTERNS: Record<string, FileType> = {
  'components': 'component',
  'services': 'service',
  'utils': 'util',
  'helpers': 'util',
  'types': 'type',
  'interfaces': 'type',
  '__tests__': 'test',
  'tests': 'test',
  'spec': 'test',
  'api': 'api',
  'routes': 'api',
  'models': 'model',
  'entities': 'model',
  'hooks': 'hook',
  'schemas': 'schema',
  'validators': 'schema',
  'config': 'config',
};

function detectFileType(filePath: string, content: string): FileType {
  // Directory-first detection
  const dirName = path.dirname(filePath).split(path.sep).pop()?.toLowerCase();
  if (dirName && DIRECTORY_PATTERNS[dirName]) {
    return DIRECTORY_PATTERNS[dirName];
  }

  // Content-based fallback
  if (content.includes('describe(') || content.includes('it(') || content.includes('test(')) {
    return 'test';
  }
  if (content.match(/export\s+(default\s+)?function\s+use[A-Z]/)) {
    return 'hook';
  }
  if (content.match(/export\s+(default\s+)?(function|const)\s+[A-Z]\w*\s*[=(]/)) {
    return 'component';
  }
  if (content.match(/z\.(object|string|number|array)/)) {
    return 'schema';
  }

  return 'generic';
}
```

### Pattern 3: Map-Reduce Chunking for Large Files
**What:** Split large files into chunks, summarize each, synthesize final
**When to use:** For files exceeding context-friendly size (4000+ tokens)
**Example:**
```typescript
// Source: Derived from LLM summarization research
import { countTokens } from 'gpt-tokenizer';

const CHUNK_SIZE = 3000;  // tokens per chunk
const CHUNK_OVERLAP = 200; // overlap for context continuity

interface Chunk {
  index: number;
  content: string;
  tokens: number;
  startLine: number;
  endLine: number;
}

function chunkFile(content: string): Chunk[] {
  const lines = content.split('\n');
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineTokens = countTokens(lines[i]);

    if (currentTokens + lineTokens > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        index: chunks.length,
        content: currentChunk.join('\n'),
        tokens: currentTokens,
        startLine,
        endLine: i - 1,
      });

      // Overlap: keep last few lines for context
      const overlapLines = currentChunk.slice(-10);
      currentChunk = overlapLines;
      currentTokens = countTokens(overlapLines.join('\n'));
      startLine = i - overlapLines.length;
    }

    currentChunk.push(lines[i]);
    currentTokens += lineTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      index: chunks.length,
      content: currentChunk.join('\n'),
      tokens: currentTokens,
      startLine,
      endLine: lines.length - 1,
    });
  }

  return chunks;
}

// Map: Summarize each chunk
// Reduce: Synthesize chunk summaries into final summary
```

### Pattern 4: Token Budget Tracking
**What:** Track token usage across project to prevent cost explosion
**When to use:** Throughout the generation process
**Example:**
```typescript
// Source: Derived from GEN-04 requirement
interface BudgetTracker {
  totalBudget: number;
  used: number;
  remaining: number;
  filesProcessed: number;
  filesRemaining: number;
}

class ProjectBudget {
  private budget: BudgetTracker;

  constructor(totalBudget: number, totalFiles: number) {
    this.budget = {
      totalBudget,
      used: 0,
      remaining: totalBudget,
      filesProcessed: 0,
      filesRemaining: totalFiles,
    };
  }

  canProcess(estimatedTokens: number): boolean {
    return this.budget.remaining >= estimatedTokens;
  }

  record(tokensUsed: number): void {
    this.budget.used += tokensUsed;
    this.budget.remaining -= tokensUsed;
    this.budget.filesProcessed++;
    this.budget.filesRemaining--;
  }

  getReport(): BudgetReport {
    return {
      ...this.budget,
      percentUsed: (this.budget.used / this.budget.totalBudget) * 100,
      averagePerFile: this.budget.filesProcessed > 0
        ? this.budget.used / this.budget.filesProcessed
        : 0,
    };
  }
}
```

### Pattern 5: AGENTS.md Directory Aggregation
**What:** Generate AGENTS.md by aggregating .sum files and detecting patterns
**When to use:** After all files in a directory are summarized
**Example:**
```typescript
// Source: Derived from CONTEXT.md and AGENTS.md spec
interface DirectoryDoc {
  path: string;
  description: string;
  files: FileGroup[];
  subdirectories: SubdirSummary[];
  relatedDirectories: string[];
  patterns: string[];
}

interface FileGroup {
  purpose: string;
  files: FileRef[];
}

interface FileRef {
  name: string;
  description: string;
  critical?: boolean;
}

function buildAgentsMd(dir: DirectoryDoc): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${path.basename(dir.path)}\n`);
  sections.push(`${dir.description}\n`);

  // Files grouped by purpose
  sections.push('## Contents\n');
  for (const group of dir.files) {
    sections.push(`### ${group.purpose}\n`);
    for (const file of group.files) {
      const marker = file.critical ? ' **[critical]**' : '';
      sections.push(`- [${file.name}](./${file.name}) - ${file.description}${marker}`);
    }
    sections.push('');
  }

  // Subdirectories
  if (dir.subdirectories.length > 0) {
    sections.push('## Subdirectories\n');
    for (const subdir of dir.subdirectories) {
      sections.push(`- [${subdir.name}/](./${subdir.name}/) - ${subdir.summary}`);
    }
    sections.push('');
  }

  // Related directories
  if (dir.relatedDirectories.length > 0) {
    sections.push('## Related\n');
    for (const related of dir.relatedDirectories) {
      sections.push(`- [${related}](${related})`);
    }
    sections.push('');
  }

  // Patterns/Conventions
  if (dir.patterns.length > 0) {
    sections.push('## Patterns\n');
    for (const pattern of dir.patterns) {
      sections.push(`- ${pattern}`);
    }
  }

  return sections.join('\n');
}
```

### Anti-Patterns to Avoid
- **Direct LLM API calls:** The tool runs within a host that provides LLM access; don't add separate API dependencies
- **Parsing markdown we generate:** We generate markdown, we don't need to parse it; avoid markdown-it overhead
- **Ignoring token budgets:** Always check budget before processing; don't assume small files
- **Flat file listings:** Group files by purpose, not alphabetically; AGENTS.md spec recommends this
- **One-size-fits-all prompts:** Use file-type-specific templates for better summary quality

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Character/word estimation | `gpt-tokenizer` | BPE tokenization is complex; estimation can be 2-3x off |
| File path manipulation | String splitting/joining | `path` module | Cross-platform issues with separators |
| Async file operations | Callback-based fs | `fs/promises` | Cleaner async/await code |
| Markdown escaping | Manual regex | Template with escaping function | Edge cases with special characters |

**Key insight:** Token counting is critical for budget enforcement. Word count approximations (words/0.75 = tokens) can be off by 2-3x for code files due to camelCase, imports, and punctuation. Use `gpt-tokenizer` for accuracy.

## Common Pitfalls

### Pitfall 1: Token Count Mismatch
**What goes wrong:** Budget tracking shows 10k tokens used but actual LLM consumption was 25k
**Why it happens:** Using word-based estimation instead of proper tokenization; not accounting for prompt overhead
**How to avoid:** Use `gpt-tokenizer` with the correct encoding (cl100k_base for Claude); include prompt template in token count
**Warning signs:** Budget depletes faster than expected; cost overruns

### Pitfall 2: Context Window Overflow for Large Files
**What goes wrong:** LLM truncates or errors on large files
**Why it happens:** Sending entire file without checking size
**How to avoid:** Always chunk files above threshold (4000 tokens recommended); use map-reduce synthesis
**Warning signs:** Incomplete summaries; LLM errors about context length

### Pitfall 3: Poor File Type Detection
**What goes wrong:** Component files get generic prompts; summaries miss React-specific details
**Why it happens:** Relying only on content patterns without directory context
**How to avoid:** Directory-first detection (files in /components are components); content fallback for edge cases
**Warning signs:** Summaries lack domain-specific terminology; missing React hooks in hook summaries

### Pitfall 4: Circular Dependencies in Related Directories
**What goes wrong:** AGENTS.md lists "Related: ../a" and a/AGENTS.md lists "Related: ../b" creating confusion
**Why it happens:** Auto-detecting relations from imports without considering hierarchy
**How to avoid:** Only list related directories for cross-cutting concerns; prefer parent AGENTS.md for broader context
**Warning signs:** Every directory relates to every other directory; circular references

### Pitfall 5: Budget Exhaustion Without Progress Report
**What goes wrong:** Generation stops mid-way; user doesn't know what completed
**Why it happens:** Budget check fails but no report generated
**How to avoid:** Always write progress report on budget exhaustion; list completed files and remaining files
**Warning signs:** Silent failures; incomplete documentation state

### Pitfall 6: Blocking on Single Large File
**What goes wrong:** One 50k-token file consumes entire budget
**Why it happens:** Processing files depth-first instead of breadth-first
**How to avoid:** Breadth-first: shallow pass on all files first, then deep pass within remaining budget
**Warning signs:** Most files have no summary; one file has extensive summary

## Code Examples

Verified patterns from official sources:

### Token Counting with gpt-tokenizer
```typescript
// Source: https://github.com/niieani/gpt-tokenizer
import { countTokens, isWithinTokenLimit } from 'gpt-tokenizer';

// Count tokens in a string
const tokens = countTokens(fileContent);

// Check if content fits within limit (efficient - doesn't encode entire string)
const fitsContext = isWithinTokenLimit(fileContent, 4000);

// For Claude models, use cl100k_base encoding
import { countTokens as countClaude } from 'gpt-tokenizer/model/gpt-4';
```

### Async File Writing
```typescript
// Source: Node.js fs/promises documentation
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function writeSumFile(filePath: string, content: string): Promise<void> {
  const sumPath = `${filePath}.sum`;
  await writeFile(sumPath, content, 'utf-8');
}

async function writeAgentsMd(dirPath: string, content: string): Promise<void> {
  const agentsPath = path.join(dirPath, 'AGENTS.md');
  await writeFile(agentsPath, content, 'utf-8');
}

async function writeClaude.md(rootPath: string): Promise<void> {
  const content = `# CLAUDE.md

See [AGENTS.md](./AGENTS.md) for codebase documentation.
`;
  await writeFile(path.join(rootPath, 'CLAUDE.md'), content, 'utf-8');
}
```

### File Type Detection
```typescript
// Source: Derived from common patterns and CONTEXT.md decisions
import path from 'node:path';

const TEST_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /__tests__\//];
const CONFIG_PATTERNS = [/\.config\.[jt]s$/, /rc\.[jt]s$/, /\.json$/];

function detectFileType(filePath: string, content: string): FileType {
  const fileName = path.basename(filePath);
  const dirPath = path.dirname(filePath);
  const dirName = dirPath.split(path.sep).pop()?.toLowerCase() ?? '';

  // Test files by name pattern
  if (TEST_PATTERNS.some(p => p.test(filePath))) {
    return 'test';
  }

  // Config files by name pattern
  if (CONFIG_PATTERNS.some(p => p.test(fileName))) {
    return 'config';
  }

  // Directory-based detection
  const dirTypeMap: Record<string, FileType> = {
    components: 'component',
    pages: 'component',
    views: 'component',
    services: 'service',
    utils: 'util',
    helpers: 'util',
    lib: 'util',
    types: 'type',
    interfaces: 'type',
    '@types': 'type',
    api: 'api',
    routes: 'api',
    handlers: 'api',
    models: 'model',
    entities: 'model',
    hooks: 'hook',
    schemas: 'schema',
    validators: 'schema',
  };

  if (dirTypeMap[dirName]) {
    return dirTypeMap[dirName];
  }

  // Content-based fallback
  return detectFromContent(content);
}

function detectFromContent(content: string): FileType {
  // React hook pattern: export function useXxx or export const useXxx
  if (/export\s+(function|const)\s+use[A-Z]/.test(content)) {
    return 'hook';
  }

  // React component pattern: export function Xxx or export const Xxx =
  if (/export\s+(default\s+)?(function|const)\s+[A-Z][a-zA-Z]*\s*[=(]/.test(content)) {
    if (content.includes('jsx') || content.includes('tsx') ||
        content.includes('React') || content.includes('<')) {
      return 'component';
    }
  }

  // Zod schema pattern
  if (/z\.(object|string|number|boolean|array|enum)/.test(content)) {
    return 'schema';
  }

  // Type definitions only
  if (/^(export\s+)?(interface|type)\s+/m.test(content) &&
      !/^(export\s+)?(function|const|class|let|var)\s+/m.test(content)) {
    return 'type';
  }

  return 'generic';
}
```

### Complexity Detection for Supplementary Docs
```typescript
// Source: Derived from CONTEXT.md supplementary doc triggers
interface ComplexityMetrics {
  fileCount: number;
  directoryDepth: number;
  architecturalPatterns: string[];
}

function shouldGenerateArchitectureMd(metrics: ComplexityMetrics): boolean {
  // Triggers (any one fires):
  // - 20+ source files
  // - 3+ directory levels
  // - Multiple architectural patterns detected

  if (metrics.fileCount >= 20) return true;
  if (metrics.directoryDepth >= 3) return true;
  if (metrics.architecturalPatterns.length >= 2) return true;

  return false;
}

function detectArchitecturalPatterns(files: string[]): string[] {
  const patterns: string[] = [];

  const hasPattern = (pattern: string[]) =>
    pattern.some(p => files.some(f => f.includes(p)));

  if (hasPattern(['controllers/', 'services/', 'repositories/'])) {
    patterns.push('layered-architecture');
  }
  if (hasPattern(['domain/', 'application/', 'infrastructure/'])) {
    patterns.push('clean-architecture');
  }
  if (hasPattern(['/api/', '/pages/'])) {
    patterns.push('next-js-convention');
  }
  if (hasPattern(['components/', 'containers/'])) {
    patterns.push('presentational-container');
  }
  if (hasPattern(['redux/', 'store/', 'slices/'])) {
    patterns.push('redux-pattern');
  }
  if (hasPattern(['hooks/', 'context/'])) {
    patterns.push('react-patterns');
  }

  return patterns;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Word-based token estimation | BPE tokenization (gpt-tokenizer) | 2024 | Accurate budget tracking |
| Single-pass summarization | Map-reduce chunking | 2024 | Handles large files without truncation |
| Generic prompts for all files | File-type-specific templates | 2024 | Better summary quality |
| Flat file listings in docs | Purpose-grouped file listings | 2024 | AGENTS.md spec recommendation |
| External LLM API calls | Host-delegated analysis | 2025 | No API keys needed; uses existing context |

**Deprecated/outdated:**
- `tiktoken` WASM for JS: Still works but `gpt-tokenizer` is lighter and sufficient
- Direct API integration: For tools running in Claude Code, use host delegation
- README-focused docs: AGENTS.md is the AI-agent standard now

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal chunk size for Claude**
   - What we know: Claude 3.5 has 200k context; practical single-query limit around 8k tokens
   - What's unclear: Optimal chunk size for code summarization quality vs speed
   - Recommendation: Start with 3000 tokens per chunk; make configurable for tuning

2. **Related directory detection accuracy**
   - What we know: Can detect from imports; may over-connect or miss implicit relations
   - What's unclear: How aggressive to be with auto-detection
   - Recommendation: Conservative default (only explicit imports); allow config overrides

3. **Prompt template iteration**
   - What we know: Templates affect summary quality significantly
   - What's unclear: Optimal prompts discovered through iteration
   - Recommendation: Start with reasonable templates; log feedback for iteration

4. **Budget allocation strategy**
   - What we know: Breadth-first prioritizes coverage; some files need deep analysis
   - What's unclear: Optimal split between shallow pass and deep pass
   - Recommendation: 70% shallow (all files), 30% deep (critical files); make configurable

## Sources

### Primary (HIGH confidence)
- [gpt-tokenizer GitHub](https://github.com/niieani/gpt-tokenizer) - Token counting API, encoding support
- [AGENTS.md Specification](https://github.com/agentsmd/agents.md) - Documentation format standard
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) - Host-delegated analysis pattern
- [Agent Skills Standard](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) - Cross-tool skill format

### Secondary (MEDIUM confidence)
- [Autodoc GitHub](https://github.com/context-labs/autodoc) - Similar tool for reference
- [Pinecone Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/) - Map-reduce summarization patterns
- [Anthropic Prompt Engineering](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices) - Prompt template guidance

### Tertiary (LOW confidence)
- WebSearch results on file type detection patterns - Community conventions, not standardized
- Chunk size recommendations - Varies by use case, needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gpt-tokenizer verified via npm, host-delegation pattern from official docs
- Architecture: HIGH - Derived from Phase 1 patterns and CONTEXT.md decisions
- Pitfalls: MEDIUM - Some based on general LLM patterns, needs validation in this context

**Research date:** 2026-01-26
**Valid until:** 30 days (stable libraries, but prompt templates may need iteration)
