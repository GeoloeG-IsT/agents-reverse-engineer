#!/usr/bin/env node
/**
 * Session-end hook for agents-reverse
 * Triggers ar update when session ends (if there are uncommitted changes)
 *
 * Disable temporarily: AR_DISABLE_HOOK=1
 * Disable permanently: Set hook_enabled: false in .agents-reverse.yaml
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check for disable environment variable
if (process.env.AR_DISABLE_HOOK === '1') {
  process.exit(0);
}

// Check config file for permanent disable
const configPath = path.join(process.cwd(), '.agents-reverse.yaml');
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

// Check if ar CLI is available
try {
  execSync('which ar', { encoding: 'utf-8', timeout: 2000 });
} catch {
  // ar CLI not in PATH - exit silently
  // User hasn't installed agents-reverse globally
  process.exit(0);
}

// Run update in background (don't block session close)
try {
  const child = spawn('ar', ['update', '--quiet'], {
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
} catch {
  // Spawn failed - exit silently
  process.exit(0);
}
