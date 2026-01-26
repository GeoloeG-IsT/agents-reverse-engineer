/**
 * File type detection patterns
 *
 * Directory-based patterns for fast detection, with content-based
 * fallback for files in non-standard locations.
 */

import type { FileType } from '../types.js';

/**
 * Directory name -> FileType mapping (case-insensitive)
 * Used for fast path detection when files are in standard directories
 */
export const DIRECTORY_PATTERNS: Record<string, FileType> = {
  // Component directories
  components: 'component',
  pages: 'component',
  views: 'component',
  screens: 'component',
  layouts: 'component',

  // Service directories
  services: 'service',
  providers: 'service',

  // Utility directories
  utils: 'util',
  helpers: 'util',
  lib: 'util',
  common: 'util',

  // Type directories
  types: 'type',
  interfaces: 'type',
  '@types': 'type',
  typings: 'type',

  // Test directories
  __tests__: 'test',
  tests: 'test',
  spec: 'test',
  __mocks__: 'test',

  // API directories
  api: 'api',
  routes: 'api',
  handlers: 'api',
  endpoints: 'api',
  controllers: 'api',

  // Model directories
  models: 'model',
  entities: 'model',
  domain: 'model',

  // Hook directories
  hooks: 'hook',

  // Schema directories
  schemas: 'schema',
  validators: 'schema',
  validation: 'schema',

  // Config directories
  config: 'config',
  configs: 'config',
};

/**
 * Content-based detection patterns
 * Used when directory doesn't match any known pattern
 *
 * @param content - File content to analyze
 * @returns Detected file type or 'generic' if no pattern matches
 */
export function detectFromContent(content: string): FileType {
  // Test files - check first as tests can contain other patterns
  if (
    /\b(describe|it|test|expect)\s*\(/.test(content) ||
    /\b(jest|vitest|mocha|chai)\b/.test(content)
  ) {
    return 'test';
  }

  // React hook pattern: export (function|const) useXxx
  if (/export\s+(function|const)\s+use[A-Z]/.test(content)) {
    return 'hook';
  }

  // Zod/Yup schema pattern
  if (
    /\bz\.(object|string|number|boolean|array|enum|union)\b/.test(content) ||
    /\byup\.(object|string|number|boolean|array)\b/.test(content)
  ) {
    return 'schema';
  }

  // React component pattern - JSX/TSX with capitalized export
  if (/export\s+(default\s+)?(function|const)\s+[A-Z][a-zA-Z]*/.test(content)) {
    if (/<[A-Z]|<\/|jsx|tsx|React|'react'|"react"/.test(content)) {
      return 'component';
    }
  }

  // Type-only file (only type/interface exports, no runtime code)
  if (/^(export\s+)?(interface|type)\s+/m.test(content)) {
    const hasRuntimeCode =
      /^(export\s+)?(function|const|let|var|class)\s+(?!type\s)/m.test(content);
    if (!hasRuntimeCode) {
      return 'type';
    }
  }

  // API route pattern (Next.js, Express-like)
  if (
    /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/.test(
      content,
    ) ||
    /\.(get|post|put|delete|patch)\s*\(/.test(content) ||
    /router\.(get|post|put|delete)/.test(content)
  ) {
    return 'api';
  }

  // Config file patterns
  if (
    /export\s+(default\s+)?{[\s\S]*?}/.test(content) &&
    /\b(config|options|settings|env)\b/i.test(content)
  ) {
    return 'config';
  }

  // Service pattern (class with methods, or object with functions)
  if (
    /class\s+\w+Service\b/.test(content) ||
    /export\s+const\s+\w+Service\s*=/.test(content)
  ) {
    return 'service';
  }

  // Model/Entity pattern
  if (
    /class\s+\w+(Entity|Model)\b/.test(content) ||
    /interface\s+\w+(Entity|Model)\b/.test(content) ||
    /prisma\.|@Entity|@Table|mongoose\./.test(content)
  ) {
    return 'model';
  }

  return 'generic';
}
