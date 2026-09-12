#!/usr/bin/env node
/**
 * ARE Update Check Hook
 *
 * Checks for ARE updates in background, writes result to cache.
 * Called by SessionStart hook - runs once per session.
 *
 * Cache file: ~/.claude/cache/are-update-check.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn, execSync } from 'child_process';

const homeDir = homedir();
const cwd = process.cwd();
const cacheDir = join(homeDir, '.claude', 'cache');
const cacheFile = join(cacheDir, 'are-update-check.json');
const npmCacheDir = join(cacheDir, 'npm-cache');

// ARE-VERSION file locations (check project first, then global)
const projectVersionFile = join(cwd, '.claude', 'ARE-VERSION');
const globalVersionFile = join(homeDir, '.claude', 'ARE-VERSION');

// Ensure cache directory exists
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}
if (!existsSync(npmCacheDir)) {
  mkdirSync(npmCacheDir, { recursive: true });
}

// Run check in background (spawn background process)
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const { execSync } = require('child_process');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const projectVersionFile = ${JSON.stringify(projectVersionFile)};
  const globalVersionFile = ${JSON.stringify(globalVersionFile)};

  // Check project directory first (local install), then global
  let installed = '0.0.0';
  try {
    if (fs.existsSync(projectVersionFile)) {
      installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
    } else if (fs.existsSync(globalVersionFile)) {
      installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
    }
  } catch (e) {}

  let latest = null;
  try {
    latest = execSync('npm view agents-reverse-engineer version', { encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();
  } catch (e) {}

  const result = {
    update_available: latest && installed !== latest,
    installed,
    latest: latest || 'unknown',
    checked: Math.floor(Date.now() / 1000)
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));
`], {
  stdio: 'ignore',
  detached: true,
  windowsHide: true,
  env: {
    ...process.env,
  },
});

child.unref();
