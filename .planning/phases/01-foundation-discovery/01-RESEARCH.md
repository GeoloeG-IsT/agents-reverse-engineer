# Phase 1: Foundation & Discovery - Research

**Researched:** 2026-01-25
**Domain:** File discovery, gitignore pattern matching, binary detection, CLI output
**Confidence:** HIGH

## Summary

This phase implements the file discovery layer for agents-reverse. The tool needs to traverse a directory tree, identify which files should be analyzed, and filter out noise (gitignore patterns, binaries, vendor directories). The decisions from CONTEXT.md constrain the implementation: CLI with `ar init` and `ar discover` commands, YAML configuration in `.agents-reverse/config.yaml`, verbose output by default with `--quiet` flag, and configurable handling of symlinks, large files, and unreadable files.

The standard approach uses `fast-glob` for directory traversal with `ignore` for gitignore pattern matching. Binary detection uses `isbinaryfile` which analyzes file headers for null bytes and non-ASCII characters. Configuration is parsed with the `yaml` package and validated with `zod`. Terminal output uses `picocolors` for lightweight coloring and `ora` for optional spinner feedback.

**Primary recommendation:** Use fast-glob + ignore for discovery, isbinaryfile for binary detection, yaml + zod for configuration, and picocolors for terminal output. Follow the extension-first-then-content pattern for binary detection to optimize performance.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fast-glob | 3.3.3 | Directory traversal and pattern matching | 10-20% faster than node-glob; battle-tested; supports negative patterns |
| ignore | 7.0.5+ | Gitignore pattern parsing and matching | Used by eslint, prettier; spec-compliant; TypeScript support |
| isbinaryfile | 5.x | Binary file detection | Analyzes first bytes for null/non-ASCII; TypeScript native; fast |
| yaml | 2.x | YAML config parsing | No dependencies; TypeScript support; accepts any string without throwing |
| zod | 4.x | Config validation | Already peer dep of MCP SDK; TypeScript-first schema validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.1.x | Terminal colors | Default output coloring; 7 kB, 14x smaller than chalk |
| ora | 5.x | Spinner/progress | Optional progress indicator during discovery |
| simple-git | 3.x | Git operations | Reading .gitignore from git root; detecting git repos |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fast-glob | globby | globby auto-reads .gitignore but adds overhead; fast-glob + ignore gives more control |
| ignore | glob-gitignore | glob-gitignore filters during traversal but couples glob and ignore logic |
| isbinaryfile | file-type | file-type detects specific MIME types; isbinaryfile does binary/text classification |
| picocolors | chalk | chalk has richer API but 101 kB vs 7 kB, slower load time |
| yaml | js-yaml | js-yaml requires @types; yaml has built-in TypeScript |

**Installation:**
```bash
npm install fast-glob ignore isbinaryfile yaml zod picocolors ora simple-git
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/                 # CLI entry and command handling
│   ├── index.ts         # Entry point, arg parsing
│   ├── init.ts          # ar init command
│   └── discover.ts      # ar discover command
├── discovery/           # File discovery logic
│   ├── walker.ts        # Directory traversal with fast-glob
│   ├── filters/         # Filter chain
│   │   ├── gitignore.ts # Gitignore pattern filter
│   │   ├── binary.ts    # Binary file filter
│   │   ├── vendor.ts    # Vendor directory filter
│   │   └── custom.ts    # Custom pattern filter
│   └── types.ts         # Discovery-related types
├── config/              # Configuration handling
│   ├── schema.ts        # Zod schema for config
│   ├── loader.ts        # Load and validate config
│   └── defaults.ts      # Default configuration values
├── output/              # Terminal output utilities
│   ├── logger.ts        # Colored output with verbose/quiet modes
│   └── progress.ts      # Optional spinner/progress
└── types/               # Shared types
```

### Pattern 1: Filter Chain Pattern
**What:** Process files through a series of filters, each returning whether to include/exclude
**When to use:** For the discovery phase where multiple exclusion criteria apply
**Example:**
```typescript
// Source: Derived from ignore and fast-glob patterns
interface FileFilter {
  name: string;
  shouldExclude(path: string, stats?: Stats): Promise<boolean> | boolean;
}

async function discoverFiles(root: string, filters: FileFilter[]): Promise<string[]> {
  const allFiles = await fg.glob('**/*', {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false, // Per CONTEXT.md: skip symlinks by default
  });

  const results: string[] = [];
  for (const file of allFiles) {
    let excluded = false;
    for (const filter of filters) {
      if (await filter.shouldExclude(file)) {
        excluded = true;
        break;
      }
    }
    if (!excluded) results.push(file);
  }
  return results;
}
```

### Pattern 2: Gitignore Pattern Loading
**What:** Load .gitignore from git root and any nested .gitignore files
**When to use:** For DISC-01 requirement
**Example:**
```typescript
// Source: https://github.com/kaelzhang/node-ignore
import ignore, { Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';

async function loadGitignore(root: string): Promise<Ignore> {
  const ig = ignore();

  // Load root .gitignore
  const gitignorePath = path.join(root, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore, continue
  }

  return ig;
}

// Usage: paths must be RELATIVE to root, no leading ./
function isIgnored(ig: Ignore, relativePath: string, isDir: boolean): boolean {
  // CRITICAL: ignore library treats 'foo' as file, 'foo/' as directory
  const testPath = isDir ? `${relativePath}/` : relativePath;
  return ig.ignores(testPath);
}
```

### Pattern 3: Extension-First Binary Detection
**What:** Check file extension first (fast), fall back to content analysis (slower)
**When to use:** For DISC-02 binary detection to optimize performance
**Example:**
```typescript
// Source: Derived from isbinaryfile and common patterns
import { isBinaryFile } from 'isbinaryfile';

const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z',
  // Executables
  '.exe', '.dll', '.so', '.dylib',
  // Media
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  // Other
  '.woff', '.woff2', '.ttf', '.eot', '.class', '.pyc',
]);

async function isBinary(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();

  // Fast path: known binary extension
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // Slow path: content analysis (like git)
  try {
    return await isBinaryFile(filePath);
  } catch {
    // If we can't read it, skip it (will be caught by unreadable filter)
    return true;
  }
}
```

### Pattern 4: Configuration Schema with Defaults
**What:** Define config schema with zod, merge with defaults
**When to use:** For loading `.agents-reverse/config.yaml`
**Example:**
```typescript
// Source: zod documentation patterns
import { z } from 'zod';

const ConfigSchema = z.object({
  exclude: z.object({
    patterns: z.array(z.string()).default([]),
    vendorDirs: z.array(z.string()).default([
      'node_modules', 'vendor', '.git', 'dist', 'build',
      '__pycache__', '.next', 'venv', '.venv', 'target',
    ]),
    binaryExtensions: z.array(z.string()).optional(),
  }).default({}),
  options: z.object({
    followSymlinks: z.boolean().default(false),
    maxFileSize: z.number().default(1024 * 1024), // 1MB
  }).default({}),
  output: z.object({
    colors: z.boolean().default(true),
    verbose: z.boolean().default(true),
  }).default({}),
}).default({});

type Config = z.infer<typeof ConfigSchema>;
```

### Anti-Patterns to Avoid
- **Glob then filter:** Don't glob all files then filter with gitignore. Use fast-glob's `ignore` option or filter during traversal to avoid unnecessary disk I/O.
- **Absolute paths with ignore:** The `ignore` library requires relative paths. Always convert to relative before checking.
- **Missing trailing slash for directories:** When checking if a directory matches a gitignore pattern, append `/` to the path.
- **Reading entire files for binary detection:** Only read first few KB. isbinaryfile does this automatically.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gitignore parsing | Regex-based pattern matching | `ignore` library | Gitignore spec has edge cases: negation, `**` patterns, slash positioning, case sensitivity |
| Binary detection | Extension-only check | `isbinaryfile` | Some binaries have text extensions; some text files have binary-looking extensions |
| YAML parsing | JSON.parse or regex | `yaml` library | YAML has anchors, multi-line strings, complex types |
| Glob patterns | Manual recursive readdir | `fast-glob` | Performance optimizations, proper pattern handling |
| Terminal colors | ANSI escape codes | `picocolors` | Color support detection, terminal compatibility |

**Key insight:** Gitignore parsing is deceptively complex. The spec has nuances around negation patterns (cannot re-include if parent excluded), slash positioning (leading/middle slash = relative to .gitignore, trailing = directory only), and `**` handling. The `ignore` library is tested against `git check-ignore` output to ensure spec compliance.

## Common Pitfalls

### Pitfall 1: Forgetting Trailing Slash for Directories
**What goes wrong:** Pattern `build/` should only match directories named "build", but `ig.ignores('build')` returns false
**Why it happens:** The ignore library treats paths without trailing slash as files
**How to avoid:** Always append `/` when checking directory paths: `ig.ignores(dirPath + '/')`
**Warning signs:** Directories that should be ignored are being processed

### Pitfall 2: Using Absolute Paths with ignore Library
**What goes wrong:** `ig.ignores('/home/user/project/node_modules')` always returns false
**Why it happens:** The ignore library requires relative paths without leading `/` or `./`
**How to avoid:** Use `path.relative(root, filePath)` before checking
**Warning signs:** Nothing is being ignored despite .gitignore having patterns

### Pitfall 3: Symlink Loops
**What goes wrong:** Traversal hangs or crashes with "too many open files"
**Why it happens:** Symlinks can create circular references (a -> b -> a)
**How to avoid:** Set `followSymbolicLinks: false` in fast-glob (per CONTEXT.md decision); if following symlinks, track visited inodes
**Warning signs:** Discovery takes forever on certain repos

### Pitfall 4: Negation Pattern Order
**What goes wrong:** `!important.log` pattern doesn't work as expected
**Why it happens:** Gitignore processes patterns sequentially; negation must come AFTER the pattern it overrides
**How to avoid:** Educate users; the ignore library handles this correctly if patterns are added in file order
**Warning signs:** Files meant to be un-ignored are still excluded

### Pitfall 5: Case Sensitivity Mismatch
**What goes wrong:** `*.JPG` files not excluded on Linux despite `*.jpg` pattern
**Why it happens:** Gitignore is case-sensitive by default; macOS/Windows have case-insensitive filesystems
**How to avoid:** The ignore library handles this via `ignorecase` option; default is case-insensitive
**Warning signs:** Same repo behaves differently on Linux vs macOS

### Pitfall 6: Large File Memory Issues
**What goes wrong:** Memory spikes when checking if a 500MB file is binary
**Why it happens:** Reading entire file into memory
**How to avoid:** isbinaryfile only reads first few KB; but still check file size BEFORE reading
**Warning signs:** Process crashes on repos with large files

## Code Examples

Verified patterns from official sources:

### Loading and Using Gitignore
```typescript
// Source: https://github.com/kaelzhang/node-ignore
import ignore from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';

async function createGitignoreFilter(root: string) {
  const ig = ignore();

  // Add default vendor patterns
  ig.add(['node_modules/', 'vendor/', '.git/', 'dist/', 'build/']);

  // Load .gitignore if exists
  try {
    const content = await fs.readFile(path.join(root, '.gitignore'), 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore, use defaults only
  }

  return {
    shouldExclude(absolutePath: string, isDirectory: boolean): boolean {
      const relativePath = path.relative(root, absolutePath);
      if (!relativePath || relativePath.startsWith('..')) return false;

      // Critical: append / for directories
      const testPath = isDirectory ? `${relativePath}/` : relativePath;
      return ig.ignores(testPath);
    }
  };
}
```

### Fast-Glob Directory Traversal
```typescript
// Source: https://github.com/mrmlnc/fast-glob
import fg from 'fast-glob';

async function getAllFiles(root: string): Promise<string[]> {
  return fg.glob('**/*', {
    cwd: root,
    absolute: true,
    dot: true, // Include dotfiles
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true, // Don't throw on permission errors
    // Pre-filter obvious exclusions for performance
    ignore: ['**/node_modules/**', '**/.git/**'],
  });
}
```

### Binary Detection with Size Check
```typescript
// Source: https://github.com/gjtorikian/isBinaryFile
import { isBinaryFile } from 'isbinaryfile';
import fs from 'node:fs/promises';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB default

async function shouldSkipFile(filePath: string, maxSize = MAX_FILE_SIZE): Promise<{
  skip: boolean;
  reason?: string;
}> {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size > maxSize) {
      return { skip: true, reason: `exceeds ${maxSize} bytes` };
    }

    if (await isBinaryFile(filePath)) {
      return { skip: true, reason: 'binary file' };
    }

    return { skip: false };
  } catch (err) {
    return { skip: true, reason: `unreadable: ${(err as Error).message}` };
  }
}
```

### Configuration Loading
```typescript
// Source: https://github.com/eemeli/yaml + zod patterns
import { parse } from 'yaml';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = '.agents-reverse/config.yaml';

async function loadConfig(root: string): Promise<Config> {
  const configPath = path.join(root, CONFIG_PATH);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const raw = parse(content); // yaml.parse accepts any string
    return ConfigSchema.parse(raw); // zod validates and fills defaults
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // No config file, use defaults
      return ConfigSchema.parse({});
    }
    throw err;
  }
}
```

### Verbose Terminal Output
```typescript
// Source: https://github.com/alexeyraspopov/picocolors
import pc from 'picocolors';

interface Logger {
  file(path: string): void;
  excluded(path: string, reason: string): void;
  summary(included: number, excluded: number): void;
  error(message: string): void;
}

function createLogger(options: { verbose: boolean; colors: boolean; quiet: boolean }): Logger {
  const { verbose, colors, quiet } = options;

  const c = colors ? pc : {
    green: (s: string) => s,
    dim: (s: string) => s,
    red: (s: string) => s,
    bold: (s: string) => s,
    yellow: (s: string) => s,
  };

  return {
    file(path: string) {
      if (quiet) return;
      if (verbose) console.log(c.green('  +') + ' ' + path);
    },
    excluded(path: string, reason: string) {
      if (quiet) return;
      // Only in --show-excluded mode
    },
    summary(included: number, excluded: number) {
      if (quiet) return;
      console.log(c.bold(`\nDiscovered ${included} files`) + c.dim(` (${excluded} excluded)`));
    },
    error(message: string) {
      console.error(c.red('Error: ') + message);
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk for colors | picocolors | 2023 | 14x smaller, 2x faster load time |
| js-yaml | yaml (eemeli) | 2022 | Built-in TypeScript, no @types needed |
| node-glob | fast-glob | 2020 | 10-20% faster traversal |
| Manual gitignore regex | ignore library | Long standard | Spec-compliant, tested against git |

**Deprecated/outdated:**
- `glob` v10 and below: Security advisory CVE-2024-21538 (ReDoS vulnerability); use v11+ or fast-glob
- `ts-node` for dev: ESM compatibility issues; use `tsx` instead
- Manual binary detection via extension only: Misses edge cases; use isbinaryfile

## Open Questions

Things that couldn't be fully resolved:

1. **Nested .gitignore files**
   - What we know: Git supports .gitignore in subdirectories; patterns are relative to that directory
   - What's unclear: Should we load all nested .gitignore files or just root?
   - Recommendation: Start with root only; add nested support if users request it

2. **Global gitignore (~/.gitignore_global)**
   - What we know: Git supports global ignore patterns via `core.excludesFile`
   - What's unclear: Should we respect global gitignore or only project-local?
   - Recommendation: Project-local only for predictability; document this

3. **Git-aware vs directory-only mode**
   - What we know: CONTEXT.md says "Works on any directory, but warns that some features won't work without git"
   - What's unclear: Exact behavior when not in a git repo
   - Recommendation: Skip gitignore loading; use only vendor defaults and custom patterns

## Sources

### Primary (HIGH confidence)
- [fast-glob GitHub](https://github.com/mrmlnc/fast-glob) - API, options, behavior
- [ignore GitHub](https://github.com/kaelzhang/node-ignore) - Gitignore pattern matching
- [isbinaryfile GitHub](https://github.com/gjtorikian/isBinaryFile) - Binary detection algorithm
- [yaml GitHub](https://github.com/eemeli/yaml) - YAML parsing API
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Terminal colors API

### Secondary (MEDIUM confidence)
- [Git gitignore documentation](https://git-scm.com/docs/gitignore) - Gitignore spec and edge cases
- [Node.js security releases](https://nodejs.org/en/blog/vulnerability/december-2025-security-releases) - Symlink handling security concerns

### Tertiary (LOW confidence)
- Community benchmarks for picocolors vs chalk - Performance claims need independent verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official repos and npm
- Architecture: HIGH - Patterns derived from library documentation
- Pitfalls: HIGH - Documented in official library READMEs and community issues

**Research date:** 2026-01-25
**Valid until:** 60 days (stable libraries, well-established patterns)
