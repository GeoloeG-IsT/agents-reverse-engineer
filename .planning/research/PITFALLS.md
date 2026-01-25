# Pitfalls Research

**Domain:** Recursive Codebase Documentation Generation / AI Context Tools
**Researched:** 2026-01-25
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Token Budget Explosion on Large Repositories

**What goes wrong:**
Bottom-up recursive summarization generates summaries for every file, then combines them into directory summaries, then into parent directory summaries. Each level multiplies context requirements. A 10,000-file monorepo could easily exceed 50+ million tokens in raw content before any summarization begins.

**Why it happens:**
Developers underestimate repository scale. Tools like Repomix report token counts of 56-69 million for large repositories like python-docs-samples. Even "medium" repositories (1,000 files) can hit millions of tokens. The recursive nature compounds this: if each file summary is 500 tokens and each directory combines 20 file summaries, parent directories explode exponentially.

**How to avoid:**
- Implement aggressive file filtering BEFORE any LLM processing (gitignore, binary detection, generated code patterns)
- Set hard token budgets per level (e.g., max 2,000 tokens per file summary, max 5,000 per directory)
- Use streaming/chunked processing rather than loading entire repo in memory
- Implement early-exit conditions when token budgets are exceeded
- Consider sampling strategies for massive directories (summarize top 10 most important files, note "and 47 others")

**Warning signs:**
- Processing time grows non-linearly with repo size
- Memory usage spikes during directory summarization
- LLM API costs unexpectedly high during testing
- Summaries becoming truncated or cut off

**Phase to address:**
Core Architecture phase - token budget system must be foundational, not bolted on

---

### Pitfall 2: Summary Quality Degradation Up the Tree

**What goes wrong:**
As summaries propagate up the directory hierarchy, each level loses information. File summaries compress implementation details. Directory summaries compress file summaries. By the time you reach root-level documentation, the content becomes vague abstractions: "This directory contains utilities and helpers" instead of actionable context for AI assistants.

**Why it happens:**
This is the fundamental tradeoff of hierarchical summarization. Research confirms that "if we break the document and summarize it in small portions, this breaks up the text into incoherent summarizations." Each summarization pass loses domain-specific terminology, loses relationships between components, and converges toward generic descriptions.

**How to avoid:**
- Preserve "anchor terms" that must survive all summarization levels (function names, key concepts, API endpoints)
- Use different summarization strategies at different levels:
  - File level: Implementation details, public API, dependencies
  - Directory level: Component purpose, inter-file relationships, entry points
  - Root level: Architecture overview, key entry points, navigation hints
- Include explicit "For AI assistants" sections with concrete file references
- Verify summaries against "Can an AI assistant find the right file?" test
- Consider maintaining a parallel "index" of important symbols that bypasses summarization

**Warning signs:**
- Root AGENTS.md reads like a generic README
- AI assistants consistently fail to find the right files
- Summaries use words like "various," "utilities," "helpers" without specifics
- No concrete file paths or function names in higher-level summaries

**Phase to address:**
Summary Generation phase - define quality metrics and verification before implementing

---

### Pitfall 3: Incomplete File Exclusion Leading to Noise/Cost Explosion

**What goes wrong:**
Binary files (images, compiled assets), generated code (node_modules, vendor, dist, build outputs), lock files (package-lock.json, yarn.lock), and data files (.csv, .json fixtures) get processed by the LLM. This wastes tokens, increases costs, adds noise to summaries, and can even cause processing failures on binary content.

**Why it happens:**
Developers rely solely on .gitignore, which is designed for version control, not documentation relevance. Many relevant-to-track but irrelevant-to-document files are not in .gitignore. Some repositories have incomplete .gitignore files. Generated code inside the repo (common in monorepos) may be committed intentionally.

**How to avoid:**
- Layer multiple exclusion mechanisms:
  1. Respect .gitignore as baseline
  2. Add documentation-specific exclusions (lock files, fixtures, migrations)
  3. Binary file detection (check file headers, not just extensions)
  4. Generated code detection (look for "DO NOT EDIT" markers, common paths like dist/, build/, .next/)
  5. Size-based exclusions (files over X KB are likely not source code)
- Make exclusions configurable via .agentsignore or similar
- Log excluded files so users can audit and adjust
- Default to strict exclusion (opt-in rather than opt-out)

**Warning signs:**
- Processing time dominated by node_modules or vendor directories
- Summaries mentioning "binary content" or garbled text
- Token counts 10x higher than expected for repo size
- Summaries of lock files or minified JavaScript

**Phase to address:**
File Discovery phase - must be bulletproof before any LLM processing begins

---

### Pitfall 4: Git Diff-Based Staleness Detection Breaks on Renames/Moves

**What goes wrong:**
The incremental update system relies on git diff to detect changed files. But git doesn't track renames explicitly - it uses heuristic similarity matching (>50% content match). When files are renamed AND modified, or when directories are restructured, git may report them as delete+add rather than rename. The documentation system then orphans the old summary and creates a new one, losing historical context and potentially leaving stale references.

**Why it happens:**
Git's rename detection is post-hoc heuristic, not explicit tracking. If content changes more than 50%, git sees it as a new file. Directory renames are even more fragile - they require Git 2.19+ and consistent movement of files within the directory.

**How to avoid:**
- Never rely solely on git diff output - verify file existence independently
- Handle delete+add pairs with similarity checking as potential renames
- Track AGENTS.md files independently and validate their targets still exist
- Implement "orphan detection" - AGENTS.md files pointing to non-existent files
- Consider content hashing for similarity detection independent of git
- Support manual rename hints in configuration
- When in doubt, regenerate rather than trust incremental update

**Warning signs:**
- AGENTS.md files with broken file references after refactoring
- Duplicate summaries for same logical file after rename
- "File not found" errors during incremental updates
- Documentation diverging from actual file structure

**Phase to address:**
Incremental Update phase - needs comprehensive test suite for edge cases

---

### Pitfall 5: Git Hook Unreliability Across Environments

**What goes wrong:**
The automatic freshness feature relies on git hooks (post-commit, post-merge) to trigger documentation updates. But git hooks are notoriously unreliable: they're not version-controlled by default, they can be bypassed with --no-verify, they don't work in all Git UIs, and different developers may have different hook configurations.

**Why it happens:**
Git hooks live in .git/hooks/ which is not cloned with the repository. Teams use different tools for hook management (husky, pre-commit, lefthook, custom scripts). CI/CD pipelines may run in environments without hooks. Some developers disable hooks for performance.

**How to avoid:**
- Hooks should be a convenience, not the only update mechanism
- Provide multiple trigger options:
  1. Git hooks (automatic, best UX when working)
  2. CLI command (manual trigger, always works)
  3. CI integration (ensure freshness on merge to main)
  4. Watch mode for development
- Include hook installation as part of project setup with clear docs
- Detect stale documentation independently of hooks (timestamp comparison, git log analysis)
- Fail gracefully when hooks don't fire - don't corrupt state

**Warning signs:**
- Some team members have fresh docs, others have stale
- Documentation freshness varies between local and CI
- Users report "hooks not running" issues
- Documentation silently becomes stale after refactoring

**Phase to address:**
Integration phase - design hook system with fallbacks from the start

---

### Pitfall 6: Token Counting Inaccuracy Across Models

**What goes wrong:**
The tool estimates token counts to budget LLM calls and warn about context limits. But different LLM providers use different tokenizers (tiktoken for OpenAI, custom for Anthropic, SentencePiece for LLaMA). Using the wrong tokenizer can undercount by 20-30%, leading to context overflow or API errors.

**Why it happens:**
Many tools default to tiktoken (OpenAI's tokenizer) for all models. This is significantly inaccurate for Claude, Gemini, or open-source models. Even within providers, different model versions may have different tokenizers.

**How to avoid:**
- Use provider-specific tokenizers when available:
  - OpenAI: tiktoken with correct encoding (cl100k_base, o200k_base)
  - Anthropic: Use their beta token counting API
  - Others: Use the model's actual tokenizer.json
- Add safety margin (10-15%) to all token estimates
- Validate token counts against actual API responses during testing
- Make token counting strategy configurable per provider
- Consider character-based approximation (4 chars ≈ 1 token) as fallback with clear warnings

**Warning signs:**
- API errors about context length despite estimates showing headroom
- Inconsistent behavior between providers
- Token counts from tool don't match provider's reported usage
- Summaries being truncated unexpectedly

**Phase to address:**
LLM Integration phase - must support multiple providers correctly

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded file exclusions | Quick to implement | Can't adapt to different project types | Never - make configurable from day one |
| Single-model token counting | Simpler code | Breaks for multi-provider support | Only if explicitly single-provider tool |
| In-memory file tree | Fast for small repos | Memory explosion on large repos | Only with explicit size limits |
| Synchronous LLM calls | Simpler control flow | Poor performance on large repos | MVP only, plan streaming architecture |
| String-based diff parsing | Works for simple cases | Breaks on edge cases (binary, renames) | Never - use git plumbing commands |
| Flat summary storage | Simple file structure | Hard to track hierarchy relationships | Only if no incremental updates planned |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Git | Using porcelain commands (git status) | Use plumbing commands (git diff-tree, git ls-files) for reliable parsing |
| Git | Assuming .gitignore is complete | Layer documentation-specific exclusions on top |
| LLM APIs | Fixed timeouts | Exponential backoff with jitter, handle rate limits gracefully |
| LLM APIs | No streaming | Stream responses for long summaries to avoid timeouts |
| File system | Path separators | Use path.join/normalize, test on Windows |
| File system | Symlinks | Decide policy: follow, ignore, or error. Document clearly |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all files into memory | Memory spikes, OOM crashes | Stream file processing, process one at a time | Repos > 1GB or 10,000 files |
| Synchronous directory traversal | Slow startup, blocked UI | Async iteration with concurrent limits | Deep directory trees (>10 levels) |
| No caching of git operations | Repeated slow git calls | Cache git status/diff results per session | Any repo > 100 files |
| Full re-summarization on any change | Processing time scales with repo size | True incremental: only process changed files | After initial generation |
| Unbounded LLM concurrency | Rate limits, API errors | Semaphore-limited concurrency (3-5 parallel) | Any production usage |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Including .env files in summaries | Credential exposure in documentation | Explicitly exclude .env, *.pem, credentials.* patterns |
| Logging full file contents | Secrets in logs | Log file paths only, never content |
| Sending binary files to LLM | Potential data leakage, wasted cost | Detect and skip binary files before API calls |
| No API key rotation | Compromised keys | Support key rotation, don't embed in config |
| Storing summaries with secrets | Persistent exposure | Scan summaries for common secret patterns before writing |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication | Users think tool is frozen on large repos | Show file count, current file, estimated time |
| Silent failures | Users don't know docs are stale | Clear error messages, status indicators |
| All-or-nothing generation | Can't test on subset of repo | Support --include/--exclude for partial runs |
| Requiring LLM key for any operation | Can't explore tool without API access | Provide dry-run mode showing what would be processed |
| Overwriting user edits | Users lose manual additions to AGENTS.md | Preserve user sections, only update generated sections |

## "Looks Done But Isn't" Checklist

- [ ] **Token budgets:** Are they enforced or just estimated? Test with repo that exceeds budget
- [ ] **Incremental updates:** Test rename, move, delete, and combined operations
- [ ] **Binary detection:** Test with images, PDFs, compiled files in non-obvious locations
- [ ] **Hook installation:** Verify hooks survive git clone, work in CI, handle --no-verify
- [ ] **Cross-platform paths:** Test on Windows with backslashes, long paths, special characters
- [ ] **Empty directories:** Tool should handle directories with only ignored files
- [ ] **Circular symlinks:** Should not infinite loop
- [ ] **Very long files:** Test with generated code, minified files, large data files
- [ ] **Unicode filenames:** International characters in paths and content
- [ ] **Monorepo structure:** Test with nested package.json, multiple language roots

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Token budget exceeded mid-run | LOW | Implement resume from checkpoint, allow partial results |
| Stale references after rename | MEDIUM | Add orphan detection, provide cleanup command |
| Corrupted summary hierarchy | HIGH | Full regeneration with --force flag |
| Secrets accidentally documented | HIGH | Immediate file deletion, git history rewrite, key rotation |
| Summary quality degraded | MEDIUM | Add quality validation, regenerate with adjusted prompts |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Token budget explosion | Core Architecture | Test with 10K+ file repo, measure memory and time |
| Summary quality degradation | Summary Generation | Blind test: can AI find correct file from summary? |
| Incomplete file exclusion | File Discovery | Count tokens before/after exclusions, audit excluded list |
| Git rename detection failure | Incremental Update | Test matrix: rename, move, delete, rename+modify |
| Hook unreliability | Integration | Test fresh clone, CI environment, --no-verify bypass |
| Token counting inaccuracy | LLM Integration | Compare estimates vs actual API token usage |

## Sources

- [Kinde: AI Context Windows Engineering](https://kinde.com/learn/ai-for-software-engineering/best-practice/ai-context-windows-engineering-around-token-limits-in-large-codebases/)
- [Repomix GitHub](https://github.com/yamadashy/repomix)
- [Code2Prompt](https://github.com/mufeedvh/code2prompt)
- [Qodo: State of AI Code Quality 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/)
- [jyn.dev: Pre-commit hooks are fundamentally broken](https://jyn.dev/pre-commit-hooks-are-fundamentally-broken/)
- [Git Directory Rename Detection](https://git-scm.com/docs/directory-rename-detection/2.22.0)
- [Palantir: Renaming and Deep Directory Hierarchies in Git](https://medium.com/palantir/renaming-and-deep-directory-hierarchies-in-git-f8e96d5e39a9)
- [Token Counting Guide 2025](https://www.propelcode.ai/blog/token-counting-tiktoken-anthropic-gemini-guide-2025)
- [AGENTS.md Specification](https://agents.md/)
- [Builder.io: Improve AI output with AGENTS.md](https://www.builder.io/blog/agents-md)
- [Digma: 10 Common Monorepo Problems](https://digma.ai/10-common-problems-of-working-with-a-monorepo/)
- [Augment Code: Auto Document Your Code 2025](https://www.augmentcode.com/learn/auto-document-your-code-tools-and-best-practices)
- [OpenAI Cookbook: Summarizing Long Documents](https://cookbook.openai.com/examples/summarizing_long_documents)
- [ACL 2025: NEXUSSUM Hierarchical Summarization](https://aclanthology.org/2025.acl-long.500.pdf)

---
*Pitfalls research for: Agents Reverse - Recursive Codebase Documentation Generator*
*Researched: 2026-01-25*
