import { writeFile, readFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { ComplexityMetrics } from '../complexity.js';

/**
 * Configuration for supplementary documentation.
 */
export interface SupplementaryConfig {
  /** Output directory (default: project root) */
  outputDir?: string;
  /** Whether to generate ARCHITECTURE.md */
  generateArchitecture: boolean;
  /** Whether to generate STACK.md */
  generateStack: boolean;
}

/**
 * Information about the technology stack.
 */
export interface StackInfo {
  /** Runtime environment */
  runtime: string;
  /** Primary framework */
  framework?: string;
  /** Key dependencies grouped by category */
  dependencies: Record<string, Array<{ name: string; version: string; purpose?: string }>>;
  /** Development tools */
  devTools: string[];
}

/**
 * Build ARCHITECTURE.md content from complexity metrics.
 *
 * This generates a template that the host LLM will expand with actual
 * architectural analysis.
 */
export function buildArchitectureMd(
  metrics: ComplexityMetrics,
  projectName: string
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Architecture: ${projectName}\n`);
  sections.push(`> Auto-generated architecture overview. ${metrics.fileCount} files analyzed.\n`);

  // Detected patterns
  if (metrics.architecturalPatterns.length > 0) {
    sections.push('## Architectural Patterns\n');
    for (const pattern of metrics.architecturalPatterns) {
      sections.push(`- **${formatPatternName(pattern)}**`);
    }
    sections.push('');
  }

  // Directory structure (high-level)
  sections.push('## Directory Structure\n');
  sections.push('```');
  const topLevelDirs = getTopLevelDirectories(metrics.directories);
  for (const dir of topLevelDirs.sort()) {
    sections.push(`${dir}/`);
  }
  sections.push('```\n');

  // Layers section (placeholder for LLM expansion)
  sections.push('## Layers\n');
  sections.push('<!-- This section describes the architectural layers -->\n');

  // Data flow section (placeholder)
  sections.push('## Data Flow\n');
  sections.push('<!-- This section describes how data flows through the system -->\n');

  // Key abstractions (placeholder)
  sections.push('## Key Abstractions\n');
  sections.push('<!-- This section describes important interfaces and patterns -->\n');

  return sections.join('\n');
}

/**
 * Format pattern name for display.
 */
function formatPatternName(pattern: string): string {
  return pattern
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get top-level directories from all directories.
 */
function getTopLevelDirectories(directories: Set<string>): string[] {
  const topLevel: string[] = [];

  for (const dir of directories) {
    const parts = dir.split(path.sep);
    if (parts.length === 1 || (parts.length === 2 && parts[0] === '.')) {
      topLevel.push(parts[parts.length - 1]);
    }
  }

  return [...new Set(topLevel)];
}

/**
 * Build STACK.md content from package.json analysis.
 */
export function buildStackMd(
  stackInfo: StackInfo,
  projectName: string
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Technology Stack: ${projectName}\n`);

  // Runtime
  sections.push('## Runtime\n');
  sections.push(`- **Environment**: ${stackInfo.runtime}`);
  if (stackInfo.framework) {
    sections.push(`- **Framework**: ${stackInfo.framework}`);
  }
  sections.push('');

  // Dependencies by category
  for (const [category, deps] of Object.entries(stackInfo.dependencies)) {
    if (deps.length === 0) continue;

    sections.push(`## ${category}\n`);
    for (const dep of deps) {
      const purpose = dep.purpose ? ` - ${dep.purpose}` : '';
      sections.push(`- **${dep.name}** (${dep.version})${purpose}`);
    }
    sections.push('');
  }

  // Dev tools
  if (stackInfo.devTools.length > 0) {
    sections.push('## Development Tools\n');
    for (const tool of stackInfo.devTools) {
      sections.push(`- ${tool}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Parse package.json to extract stack information.
 */
export async function analyzePackageJson(
  packageJsonPath: string
): Promise<StackInfo | null> {
  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    const stackInfo: StackInfo = {
      runtime: 'Node.js',
      dependencies: {
        'Core': [],
        'Framework': [],
        'Database': [],
        'Testing': [],
        'Build Tools': [],
        'Other': [],
      },
      devTools: [],
    };

    // Detect framework
    const frameworkDeps = ['next', 'react', 'vue', 'angular', 'svelte', 'express', 'fastify', 'nestjs'];
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const fw of frameworkDeps) {
      if (deps[fw]) {
        stackInfo.framework = fw.charAt(0).toUpperCase() + fw.slice(1);
        break;
      }
    }

    // Categorize dependencies
    const categoryRules: Array<{ category: string; patterns: string[] }> = [
      { category: 'Framework', patterns: ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express', 'fastify', 'nestjs'] },
      { category: 'Database', patterns: ['prisma', 'mongoose', 'typeorm', 'sequelize', 'pg', 'mysql', 'redis', 'drizzle'] },
      { category: 'Testing', patterns: ['jest', 'vitest', 'mocha', 'chai', 'cypress', 'playwright', '@testing-library'] },
      { category: 'Build Tools', patterns: ['typescript', 'esbuild', 'vite', 'webpack', 'rollup', 'parcel', 'tsup'] },
    ];

    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
      let categorized = false;
      for (const rule of categoryRules) {
        if (rule.patterns.some(p => name.toLowerCase().includes(p))) {
          stackInfo.dependencies[rule.category].push({ name, version: version as string });
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        stackInfo.dependencies['Other'].push({ name, version: version as string });
      }
    }

    // Dev tools
    const devToolPatterns = ['eslint', 'prettier', 'husky', 'lint-staged'];
    for (const [name] of Object.entries(pkg.devDependencies ?? {})) {
      if (devToolPatterns.some(p => name.includes(p))) {
        stackInfo.devTools.push(name);
      }
    }

    return stackInfo;
  } catch {
    return null;
  }
}

/**
 * Write ARCHITECTURE.md to the configured location.
 */
export async function writeArchitectureMd(
  projectRoot: string,
  metrics: ComplexityMetrics,
  config: SupplementaryConfig
): Promise<string | null> {
  if (!config.generateArchitecture) return null;

  const outputDir = config.outputDir
    ? path.join(projectRoot, config.outputDir)
    : projectRoot;

  await mkdir(outputDir, { recursive: true });

  const projectName = path.basename(projectRoot);
  const content = buildArchitectureMd(metrics, projectName);
  const filePath = path.join(outputDir, 'ARCHITECTURE.md');

  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Write STACK.md to the configured location.
 */
export async function writeStackMd(
  projectRoot: string,
  config: SupplementaryConfig
): Promise<string | null> {
  if (!config.generateStack) return null;

  const packageJsonPath = path.join(projectRoot, 'package.json');
  const stackInfo = await analyzePackageJson(packageJsonPath);

  if (!stackInfo) return null;

  const outputDir = config.outputDir
    ? path.join(projectRoot, config.outputDir)
    : projectRoot;

  await mkdir(outputDir, { recursive: true });

  const projectName = path.basename(projectRoot);
  const content = buildStackMd(stackInfo, projectName);
  const filePath = path.join(outputDir, 'STACK.md');

  await writeFile(filePath, content, 'utf-8');
  return filePath;
}
