---
phase: quick-001
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - hooks/are-context-loader.js
  - src/installer/operations.ts
  - .claude/hooks/are-context-loader.js
  - .claude/settings.json
  - CHANGELOG.md
  - hooks/AGENTS.md
autonomous: true

must_haves:
  truths:
    - "A Bash command that cats/greps a nested file (e.g. `cat src/cli/index.ts`) causes src/AGENTS.md and src/cli/AGENTS.md to be injected as additionalContext"
    - "Edit/Write/MultiEdit/NotebookEdit tool calls inject the same context Read does today"
    - "Agent/Task prompts that mention project-relative paths inject the AGENTS.md files for those paths"
    - "Paths outside the project root, non-existent paths, and the project root itself inject nothing"
    - "Each AGENTS.md is injected at most once per session (dedupe still holds across the new tools)"
    - "A user upgrading from 1.2.19 who re-runs the installer ends up with the widened matcher in settings.json instead of the stale `Read` matcher"
    - "`npm run build` (tsc) passes"
  artifacts:
    - path: "hooks/are-context-loader.js"
      provides: "Multi-tool path derivation (file_path / notebook_path / Bash command scan / Agent prompt scan) + multi-start-dir upward walk"
      contains: "tool_name"
    - path: "src/installer/operations.ts"
      provides: "Widened ARE_HOOKS matcher + in-place matcher upgrade for existing installs"
      contains: "Read|Edit|Write|MultiEdit|Bash|Agent|Task"
    - path: ".claude/settings.json"
      provides: "Dogfooding install uses the widened matcher"
      contains: "Read|Edit|Write|MultiEdit|Bash|Agent|Task"
    - path: ".claude/hooks/are-context-loader.js"
      provides: "Byte-identical copy of the updated hook for this repo's own session"
    - path: "CHANGELOG.md"
      provides: "[Unreleased] entry describing the widened hook"
  key_links:
    - from: "src/installer/operations.ts"
      to: "settings.json PostToolUse entry"
      via: "registerClaudeHooks matcher comparison + update"
      pattern: "matcher"
    - from: "hooks/are-context-loader.js"
      to: "data.tool_name dispatch"
      via: "collectStartDirs()"
      pattern: "tool_input.command|tool_input.prompt"
---

<objective>
Extend the `are-context-loader` PostToolUse hook so nested ARE-generated `AGENTS.md` files are injected for the tools Claude Code actually uses to touch files — not just `Read`. Today the hook is registered with `matcher: "Read"` and reads only `tool_input.file_path`, so sessions that work through Bash (`cat`/`sed -n`/`grep`), Edit/Write, or Agent/Task never get nested context (GitHub issue #14).

Purpose: nested AGENTS.md is the core value of ARE's runtime integration; it is currently dead weight in most real sessions.
Output: a dependency-free ESM hook that derives start directories per tool, a widened installer matcher with an upgrade path for existing installs, an updated dogfooding install in this repo, and a CHANGELOG entry.

Out of scope: version bump / package.json changes, PR creation, regenerating AGENTS.md docs with `are generate`.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@hooks/are-context-loader.js
@src/installer/operations.ts
@.claude/settings.json
@CHANGELOG.md

Verified facts (do not re-derive):
- `hooks/are-context-loader.js` is ESM, imports only `node:fs`/`node:path`/`node:os`, reads stdin JSON, uses `data.tool_input.file_path`, `data.cwd`, `data.session_id`; dedupe state at `${os.tmpdir()}/are-context-loader/${session_id}.json`; emits `{ suppressOutput:false, hookSpecificOutput:{ hookEventName:'PostToolUse', additionalContext } }`; it ignores `data.tool_name` entirely.
- `src/installer/operations.ts`: `HookDefinition`/`ARE_HOOKS` near line 553-561 (`matcher: 'Read'`); `registerClaudeHooks()` near line 608 checks existence by `h.command === hookCommand` only and returns `false` (writing nothing) when all hooks exist; `interface SessionHook { type: 'command'; command: string }` at line ~510, `interface HookEvent { matcher?: string; hooks: SessionHook[] }` at ~515.
- `src/installer/uninstall.ts` matches hooks by command string only — no change needed.
- `scripts/build-hooks.js` copies `hooks/*.js` → `hooks/dist/` at publish time — no change needed.
- No test framework exists in this repo. Validation = `npm run build` + piping sample JSON into the hook.
- Repo dirs with marker-bearing ARE AGENTS.md (confirmed): `src/`, `src/cli/`, `src/installer/`, `src/quality/`, `hooks/`, `scripts/`. Root `AGENTS.md` is intentionally skipped by the hook (loaded via CLAUDE.md → @AGENTS.md).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Derive start directories per tool in the context-loader hook</name>
  <files>hooks/are-context-loader.js</files>
  <action>
Rewrite `main(data)` in `hooks/are-context-loader.js` so it dispatches on `data.tool_name` and supports multiple start directories per invocation. Keep the file dependency-free ESM, keep the silent-exit-on-error behaviour, keep `hookEventName: 'PostToolUse'`, keep the `'Generated by agents-reverse-engineer'` marker check, keep the `## ARE Context: {relDir}/AGENTS.md\n\n{content}` part format, and keep the dedupe file location/shape unchanged (so existing session state stays valid).

Update the header comment block: title becomes `ARE Context Loader Hook (PostToolUse → Read|Edit|Write|MultiEdit|Bash|Agent|Task)` and the description explains that paths are taken from `tool_input.file_path`/`notebook_path` or scanned out of `tool_input.command` (Bash) and `tool_input.prompt`/`description` (Agent/Task).

Structure the implementation as:

1. `const projectRoot = data.cwd ? path.resolve(data.cwd) : '';`

2. `collectStartDirs(data, projectRoot)` → ordered, de-duplicated array of absolute directories:
   - `const tool = data.tool_name;` and `const input = data.tool_input || {};`
   - `Read`, `Edit`, `Write`, `MultiEdit` → single token `input.file_path`.
   - `NotebookEdit` → `input.notebook_path || input.file_path`.
   - `Bash` → `extractPathTokens(input.command)`.
   - `Agent`, `Task` → `extractPathTokens([input.prompt, input.description].filter(Boolean).join('\n'))`.
   - Any other/absent `tool_name` → fall back to `input.file_path` if present (backward compatibility with payloads lacking `tool_name`), else empty.
   - Map each token through `resolveStartDir()` and drop nulls; cap the result at 10 start dirs.

3. `extractPathTokens(text)` — conservative scanner:
   - Return `[]` when `text` is falsy or `text.length > 20000` (keeps the hook well under the 5 s hook timeout).
   - Normalise by replacing quote/backtick characters (`'`, `"`, `` ` ``) with spaces, then match with a regex requiring at least one `/`, e.g. `/(?:[A-Za-z0-9._~@+-]*\/)+[A-Za-z0-9._~@+-]+\/?/g`. This naturally matches `/abs/path`, `./rel`, `../rel`, and `apps/x/y.ts`, and naturally skips flags like `-n`.
   - Strip trailing punctuation from each match: `token.replace(/[,;:)\]}.]+$/, '')`.
   - Dedupe and return at most the first 50 unique tokens. Do NOT special-case URLs — `https://github.com/...` resolves to a non-existent path and is dropped by `resolveStartDir()`.

4. `resolveStartDir(token, projectRoot)`:
   - `const abs = path.resolve(projectRoot || process.cwd(), token);`
   - If `projectRoot` is set, require `abs === projectRoot || abs.startsWith(projectRoot + path.sep)`; otherwise return `null` (paths outside the project are ignored).
   - `fs.statSync(abs)` inside try/catch; on throw return `null` (non-existent path).
   - Directory → return `abs`; file → return `path.dirname(abs)`; anything else → `null`.
   - Return `null` when the resulting directory equals `projectRoot` (root AGENTS.md is already loaded via CLAUDE.md).

5. Walk + ordering:
   - Load `seen` from the dedupe file once (unchanged logic).
   - For each start dir, walk upward while `dir && dir !== projectRoot && dir !== path.dirname(dir)`, collecting candidate dirs into a single array, skipping dirs already in `seen` or already collected this invocation.
   - After collecting, sort the candidate dirs by path depth ascending (`dir.split(path.sep).length`, tie-break lexicographically) so parents are emitted before children across the union of walks — this replaces the old `parts.reverse()`.
   - Read each dir's `AGENTS.md`; only when it exists and contains the marker, push the formatted part and set `seen[dir] = true`.
   - If no parts, return without writing the dedupe file or any stdout.
   - Otherwise persist `seen` and write the same JSON envelope with `additionalContext: parts.join('\n\n')`.
  </action>
  <verify>
Run each case from the repo root. Reset dedupe state first:
`rm -rf "$(node -p 'require("os").tmpdir()')/are-context-loader"`

1. Read (baseline, unchanged behaviour):
`echo '{"tool_name":"Read","tool_input":{"file_path":"'$PWD'/src/cli/index.ts"},"cwd":"'$PWD'","session_id":"t1"}' | node hooks/are-context-loader.js | head -c 300`
→ JSON with `hookEventName":"PostToolUse"` and additionalContext starting `## ARE Context: src/AGENTS.md` (parent first), containing `## ARE Context: src/cli/AGENTS.md` later.

2. Dedupe (repeat case 1 verbatim, same session `t1`):
→ empty stdout, exit 0.

3. Edit:
`echo '{"tool_name":"Edit","tool_input":{"file_path":"'$PWD'/src/installer/operations.ts"},"cwd":"'$PWD'","session_id":"t2"}' | node hooks/are-context-loader.js | grep -c "ARE Context"`
→ `2` (src/AGENTS.md + src/installer/AGENTS.md).

4. Bash with a relative path:
`echo '{"tool_name":"Bash","tool_input":{"command":"cat src/cli/index.ts"},"cwd":"'$PWD'","session_id":"t3"}' | node hooks/are-context-loader.js | grep -o "ARE Context: [^ ]*"`
→ `ARE Context: src/AGENTS.md` then `ARE Context: src/cli/AGENTS.md`, in that order.

5. Bash with an absolute path + a second directory token (multi-start-dir union + ordering):
`echo '{"tool_name":"Bash","tool_input":{"command":"sed -n 1,20p '$PWD'/hooks/are-context-loader.js && grep -rn foo src/quality/"},"cwd":"'$PWD'","session_id":"t4"}' | node hooks/are-context-loader.js | grep -o "ARE Context: [^ ]*"`
→ exactly three lines: `hooks/AGENTS.md` and `src/AGENTS.md` (both depth-1, either order) before `src/quality/AGENTS.md`; no duplicates.

6. Agent prompt scan:
`echo '{"tool_name":"Agent","tool_input":{"prompt":"Please review scripts/build-hooks.js and hooks/are-context-loader.js","description":"review hooks"},"cwd":"'$PWD'","session_id":"t5"}' | node hooks/are-context-loader.js | grep -o "ARE Context: [^ ]*"`
→ `scripts/AGENTS.md` and `hooks/AGENTS.md`.

7. Path outside the project:
`echo '{"tool_name":"Read","tool_input":{"file_path":"/etc/hosts"},"cwd":"'$PWD'","session_id":"t6"}' | node hooks/are-context-loader.js | wc -c`
→ `0`.

8. Non-existent path in a Bash command:
`echo '{"tool_name":"Bash","tool_input":{"command":"cat src/does/not/exist.ts"},"cwd":"'$PWD'","session_id":"t7"}' | node hooks/are-context-loader.js | wc -c`
→ `0`.

9. Root-level file only (root is skipped):
`echo '{"tool_name":"Bash","tool_input":{"command":"cat package.json"},"cwd":"'$PWD'","session_id":"t8"}' | node hooks/are-context-loader.js | wc -c`
→ `0`.

10. Legacy payload without `tool_name` (backward compatibility):
`echo '{"tool_input":{"file_path":"'$PWD'/src/cli/index.ts"},"cwd":"'$PWD'","session_id":"t9"}' | node hooks/are-context-loader.js | grep -c "ARE Context"`
→ `2`.

11. Oversized text guard + no crash on junk:
`node -e 'const s="cat src/cli/index.ts ".repeat(2000);process.stdout.write(JSON.stringify({tool_name:"Bash",tool_input:{command:s},cwd:process.cwd(),session_id:"t10"}))' | node hooks/are-context-loader.js | wc -c`
→ `0` (text > 20 KB is skipped), and the command returns immediately (well under 5 s).
`echo 'not json' | node hooks/are-context-loader.js; echo "exit=$?"`
→ `exit=0`, no output.
  </verify>
  <done>All 11 verification cases produce the stated outcomes; the hook remains dependency-free ESM with an updated header comment.</done>
</task>

<task type="auto">
  <name>Task 2: Widen the installer matcher and add an in-place upgrade path</name>
  <files>src/installer/operations.ts</files>
  <action>
1. In `ARE_HOOKS`, change the context-loader entry's matcher to the full tool list:
   `{ event: 'PostToolUse', filename: 'are-context-loader.js', name: 'are-context-loader', matcher: 'Read|Edit|Write|MultiEdit|Bash|Agent|Task' }`.

2. In `registerClaudeHooks()`, replace the boolean `hookExists` check with a lookup that returns the existing `HookEvent` (the entry whose `hooks` array contains a hook with `command === hookCommand`), so an upgrade from an older install can be repaired:
   - If no existing entry → push the new `HookEvent` as today and set `addedAny = true`.
   - If an existing entry is found and `hookDef.matcher` is defined and `existing.matcher !== hookDef.matcher` → set `existing.matcher = hookDef.matcher` and set `addedAny = true` (the flag now means "settings changed"; rename it to `changedAny` and update the `if (!addedAny) return false;` guard and the doc comment accordingly — the function's `true`/`false` return contract is unchanged: `true` = settings were written).
   - If found and the matcher already matches → do nothing.
   This fixes the 1.2.19 upgrade path where re-running the installer left `matcher: "Read"` in place.

3. Update `registerHooks()`/`registerClaudeHooks()` JSDoc to say it registers hooks *and upgrades stale matchers*.

Do NOT add `timeout: 5` to the hook entry (it would require widening `SessionHook`, and the hook already returns in milliseconds) — keep `SessionHook` as `{ type: 'command'; command: string }`.
Do NOT touch `src/installer/uninstall.ts` (it matches by command string and is unaffected).
  </action>
  <verify>
1. `npm run build` → exits 0, no tsc errors.
2. Fresh install path:
`rm -rf /tmp/are-hooktest && mkdir -p /tmp/are-hooktest && node -e 'const{registerHooks}=require("/home/user/agents-reverse-engineer/dist/installer/operations.js")' 2>/dev/null || true`
Preferred (ESM) check:
`node --input-type=module -e 'import {registerHooks} from "/home/user/agents-reverse-engineer/dist/installer/operations.js"; registerHooks("/tmp/are-hooktest","claude",false); console.log(require?0:0)' ; cat /tmp/are-hooktest/settings.json`
→ settings.json contains a PostToolUse entry with `"matcher": "Read|Edit|Write|MultiEdit|Bash|Agent|Task"`.
3. Upgrade path (stale matcher is repaired):
`node -e 'require("fs").writeFileSync("/tmp/are-hooktest/settings.json", JSON.stringify({hooks:{PostToolUse:[{matcher:"Read",hooks:[{type:"command",command:"node .claude/hooks/are-context-loader.js"}]}]}},null,2))'`
then re-run the `registerHooks("/tmp/are-hooktest","claude",false)` snippet and `cat /tmp/are-hooktest/settings.json`
→ the return value is `true` and the matcher is now `Read|Edit|Write|MultiEdit|Bash|Agent|Task`; there is exactly ONE PostToolUse entry for that command (no duplicate appended).
4. Idempotence: run `registerHooks` a third time → returns `false`, settings.json unchanged (`Read|Edit|Write|MultiEdit|Bash|Agent|Task`, one entry).
5. Cleanup: `rm -rf /tmp/are-hooktest`.
  </verify>
  <done>`npm run build` passes; a fresh install writes the widened matcher; an install carrying the old `Read` matcher is upgraded in place without duplicating the entry; a third run is a no-op returning false.</done>
</task>

<task type="auto">
  <name>Task 3: Update this repo's dogfooding install, CHANGELOG, and hooks doc line</name>
  <files>.claude/settings.json, .claude/hooks/are-context-loader.js, CHANGELOG.md, hooks/AGENTS.md</files>
  <action>
1. `.claude/settings.json`: change the `PostToolUse` entry's `"matcher": "Read"` to `"matcher": "Read|Edit|Write|MultiEdit|Bash|Agent|Task"`. Leave everything else (statusLine, SessionStart, permissions) untouched.

2. Re-copy the updated hook so the repo's own session uses the new behaviour:
   `cp hooks/are-context-loader.js .claude/hooks/are-context-loader.js`
   (the two files must stay byte-identical).

3. `CHANGELOG.md`: under the existing empty `## [Unreleased]` section add a `### Changed` block. Do NOT bump the version and do NOT touch `package.json`. Entries:
   - **`are-context-loader` hook now fires for more tools** — the PostToolUse matcher widened from `Read` to `Read|Edit|Write|MultiEdit|Bash|Agent|Task`; the hook derives paths from `tool_input.file_path`/`notebook_path`, scans Bash `command` strings and Agent/Task `prompt`/`description` for project-relative path tokens, and injects the matching nested `AGENTS.md` files (fixes #14, where nested AGENTS.md was never loaded in Bash-driven sessions).
   - **Installer upgrades stale hook matchers** — `registerClaudeHooks()` now updates an existing `are-context-loader` entry whose matcher differs from the current definition instead of leaving 1.2.19-era `matcher: "Read"` entries in place.

4. `hooks/AGENTS.md`: one-line manual touch-up of the `are-context-loader.js` bullet under `## Contents` so it reads as a multi-tool hook (paths from `tool_input.file_path`/`notebook_path`, or scanned from Bash `command` / Agent `prompt`), and the matching line under `## File Relationships`. Do NOT run `are generate` / regenerate any other AGENTS.md.
  </action>
  <verify>
1. `grep -n "matcher" .claude/settings.json` → `"matcher": "Read|Edit|Write|MultiEdit|Bash|Agent|Task"`.
2. `node -e 'JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"));console.log("valid json")'` → `valid json`.
3. `diff hooks/are-context-loader.js .claude/hooks/are-context-loader.js && echo identical` → `identical`.
4. End-to-end through the installed copy:
`rm -rf "$(node -p 'require("os").tmpdir()')/are-context-loader" && echo '{"tool_name":"Bash","tool_input":{"command":"cat src/installer/operations.ts"},"cwd":"'$PWD'","session_id":"dogfood-1"}' | node .claude/hooks/are-context-loader.js | grep -o "ARE Context: [^ ]*"`
→ `src/AGENTS.md` then `src/installer/AGENTS.md`.
5. `sed -n '/## \[Unreleased\]/,/## \[1.2.19\]/p' CHANGELOG.md` → shows the `### Changed` block with both entries.
6. `git diff --stat package.json` → empty (no version bump).
7. `npm run build` → exits 0 (final regression check).
  </verify>
  <done>The repo's own Claude install uses the widened matcher with a byte-identical hook copy, CHANGELOG `[Unreleased]` documents both changes without a version bump, and `hooks/AGENTS.md` describes the hook accurately.</done>
</task>

</tasks>

<verification>
- `npm run build` passes (tsc, no errors).
- Full manual hook matrix from Task 1 passes against `hooks/are-context-loader.js`, and the Task 3 dogfood case passes against `.claude/hooks/are-context-loader.js`.
- `git diff --name-only` lists only: `hooks/are-context-loader.js`, `src/installer/operations.ts`, `.claude/hooks/are-context-loader.js`, `.claude/settings.json`, `CHANGELOG.md`, `hooks/AGENTS.md` (plus `dist/` if it is tracked — it is not).
- No version bump, no PR, no regenerated AGENTS.md beyond the one-line touch-up.
</verification>

<success_criteria>
- Bash/Edit/Write/MultiEdit/NotebookEdit/Agent/Task tool payloads all yield nested AGENTS.md injection; Read behaviour is unchanged.
- Tokens outside the project root, non-existent tokens, the project root itself, and oversized (>20 KB) text inject nothing and never throw.
- Per-session dedupe still guarantees at most one injection per AGENTS.md, including across the union of multiple start directories in a single Bash command.
- `ARE_HOOKS` carries the widened matcher and `registerClaudeHooks()` repairs stale matchers in place, idempotently.
- `.claude/settings.json` + `.claude/hooks/are-context-loader.js` reflect the new behaviour in this repo; CHANGELOG `[Unreleased]` documents it.
</success_criteria>

<output>
After completion, create `.planning/quick/001-extend-are-context-loader-hook-to-bash-e/001-SUMMARY.md`
</output>
