/**
 * Integration file generation for AI coding assistants
 *
 * Generates command files and hooks for detected AI assistant environments.
 * Handles file creation with directory creation and skip-if-exists behavior.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import type { IntegrationResult, EnvironmentType } from './types.js';
import { detectEnvironments } from './detect.js';
import {
  getClaudeTemplates,
  getOpenCodeTemplates,
  getHookTemplate,
} from './templates.js';

/**
 * Options for generating integration files
 */
export interface GenerateOptions {
  /** If true, don't actually write files - just report what would be done */
  dryRun?: boolean;
  /** If true, overwrite existing files instead of skipping them */
  force?: boolean;
}

/**
 * Ensure parent directories exist for a file path
 *
 * @param filePath - Full path to the file
 */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate integration files for all detected AI assistant environments
 *
 * For each detected environment:
 * - Gets appropriate templates (command files)
 * - Creates files if they don't exist (or if force=true)
 * - For Claude: also creates the session-end hook
 *
 * @param projectRoot - Root directory of the project
 * @param options - Generation options
 * @returns Array of results, one per environment
 *
 * @example
 * ```typescript
 * const results = await generateIntegrationFiles('/path/to/project');
 * // [{ environment: 'claude', filesCreated: ['...'], filesSkipped: [] }]
 * ```
 */
export async function generateIntegrationFiles(
  projectRoot: string,
  options: GenerateOptions = {}
): Promise<IntegrationResult[]> {
  const { dryRun = false, force = false } = options;
  const results: IntegrationResult[] = [];

  // Detect which environments are present
  const environments = detectEnvironments(projectRoot);

  for (const env of environments) {
    const result: IntegrationResult = {
      environment: env.type,
      filesCreated: [],
      filesSkipped: [],
    };

    // Get templates for this environment
    const templates = getTemplatesForEnvironment(env.type);

    // Process each template
    for (const template of templates) {
      const fullPath = path.join(projectRoot, template.path);

      if (existsSync(fullPath) && !force) {
        // File exists and force is not set - skip it
        result.filesSkipped.push(template.path);
      } else {
        // Create the file
        if (!dryRun) {
          ensureDir(fullPath);
          writeFileSync(fullPath, template.content, 'utf-8');
        }
        result.filesCreated.push(template.path);
      }
    }

    // For Claude, also generate the hook file
    if (env.type === 'claude') {
      const hookPath = '.claude/hooks/ar-session-end.js';
      const fullHookPath = path.join(projectRoot, hookPath);

      if (existsSync(fullHookPath) && !force) {
        result.filesSkipped.push(hookPath);
      } else {
        if (!dryRun) {
          ensureDir(fullHookPath);
          writeFileSync(fullHookPath, getHookTemplate(), 'utf-8');
        }
        result.filesCreated.push(hookPath);
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Get templates for a specific environment type
 *
 * @param type - Environment type
 * @returns Array of templates for that environment
 */
function getTemplatesForEnvironment(
  type: EnvironmentType
): ReturnType<typeof getClaudeTemplates> {
  switch (type) {
    case 'claude':
      return getClaudeTemplates();
    case 'opencode':
      return getOpenCodeTemplates();
    case 'aider':
      // Aider doesn't have command files yet - return empty
      return [];
    default:
      return [];
  }
}
