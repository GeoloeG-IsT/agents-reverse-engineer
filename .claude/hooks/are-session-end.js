#!/usr/bin/env node
/**
 * Session-end hook for agents-reverse-engineer
 * Triggers are update when session ends (if there are uncommitted changes)
 *
 * Disable temporarily: ARE_DISABLE_HOOK=1
 * Disable permanently: Set hook_enabled: false in .agents-reverse-engineer.yaml
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check for disable environment variable
if (process.env.ARE_DISABLE_HOOK === '1') {
  process.exit(0);
}

// Check config file for permanent disable
const configPath = path.join(process.cwd(), '.agents-reverse-engineer.yaml');
if (fs.existsSync(configPath)) {
  try {
    const config = fs.readFileSync(configPath, 'utf-8');
    if (config.includes('hook_enabled: false')) {
      process.exit(0);
    }
  } catch {
    // Ignore config read errors
  }
}

// Check git status - skip if no changes
try {
  const status = execSync('git status --porcelain', {
    encoding: 'utf-8',
    timeout: 5000,
  });
  if (!status.trim()) {
    // No changes - exit silently
    process.exit(0);
  }
} catch {
  // Not a git repo or git not available - exit silently
  process.exit(0);
}

// Check if npx is available
try {
  execSync('which npx', { encoding: 'utf-8', timeout: 2000 });
} catch {
  // npx not in PATH - exit silently
  process.exit(0);
}

// Run update in background (don't block session close)
try {
  const child = spawn('npx', ['are', 'update', '--quiet'], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
} catch {
  // Spawn failed - exit silently
  process.exit(0);
}
