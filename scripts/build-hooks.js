#!/usr/bin/env node
/**
 * Build Hooks Script
 *
 * Copies hook source files from hooks/ to hooks/dist/ for npm bundling.
 * Run via: npm run build:hooks
 * Called automatically during: npm run prepublishOnly
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const HOOKS_SRC = join(projectRoot, 'hooks');
const HOOKS_DIST = join(projectRoot, 'hooks', 'dist');

// Ensure dist directory exists
if (!existsSync(HOOKS_DIST)) {
  mkdirSync(HOOKS_DIST, { recursive: true });
}

// Copy all hook modules from hooks/ to hooks/dist/.
// Claude/Gemini hooks ship as .mjs so Node always parses them as ESM, regardless
// of any "type": "commonjs" in the host project's package.json (see #17).
// OpenCode plugins stay .js.
const hookFiles = readdirSync(HOOKS_SRC).filter(
  (f) => (f.endsWith('.js') || f.endsWith('.mjs')) && f !== 'dist'
);

console.log('Building hooks...');
for (const file of hookFiles) {
  const src = join(HOOKS_SRC, file);
  const dest = join(HOOKS_DIST, file);
  copyFileSync(src, dest);
  console.log(`  Copied: ${file} -> hooks/dist/${file}`);
}

// Prune stale outputs (e.g. renamed hooks) so they are not bundled
for (const file of readdirSync(HOOKS_DIST)) {
  if (!hookFiles.includes(file)) {
    unlinkSync(join(HOOKS_DIST, file));
    console.log(`  Removed stale: hooks/dist/${file}`);
  }
}

console.log(`Done. ${hookFiles.length} hook(s) built.`);
