import { writeFile, readFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { SummaryMetadata } from '../types.js';

/**
 * Content structure for a .sum file.
 */
export interface SumFileContent {
  /** Main summary text */
  summary: string;
  /** Extracted metadata */
  metadata: SummaryMetadata;
  /** File type that was detected */
  fileType: string;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * Parse a .sum file back into structured content.
 * Returns null if file doesn't exist or is invalid.
 */
export async function readSumFile(sumPath: string): Promise<SumFileContent | null> {
  try {
    const content = await readFile(sumPath, 'utf-8');
    return parseSumFile(content);
  } catch {
    return null;
  }
}

/**
 * Parse .sum file content into structured data.
 */
function parseSumFile(content: string): SumFileContent | null {
  try {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const summary = content.slice(frontmatterMatch[0].length).trim();

    // Parse frontmatter (simple YAML-like parsing)
    const fileType = frontmatter.match(/file_type:\s*(.+)/)?.[1]?.trim() ?? 'generic';
    const generatedAt = frontmatter.match(/generated_at:\s*(.+)/)?.[1]?.trim() ?? '';

    // Parse metadata sections
    const metadata: SummaryMetadata = {
      purpose: '',
      publicInterface: [],
      dependencies: [],
      patterns: [],
    };

    // Extract purpose from summary (first paragraph after any heading)
    const purposeMatch = summary.match(/##?\s*Purpose\n([\s\S]*?)(?=\n##|\n\n##|$)/i);
    if (purposeMatch) {
      metadata.purpose = purposeMatch[1].trim();
    }

    return {
      summary,
      metadata,
      fileType,
      generatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Format .sum file content for writing.
 */
function formatSumFile(content: SumFileContent): string {
  const frontmatter = [
    '---',
    `file_type: ${content.fileType}`,
    `generated_at: ${content.generatedAt}`,
    '---',
    '',
  ].join('\n');

  return frontmatter + content.summary;
}

/**
 * Write a .sum file alongside a source file.
 * Creates: foo.ts -> foo.ts.sum
 *
 * @param sourcePath - Path to the source file
 * @param content - Summary content to write
 * @returns Path to the written .sum file
 */
export async function writeSumFile(
  sourcePath: string,
  content: SumFileContent
): Promise<string> {
  const sumPath = `${sourcePath}.sum`;
  const dir = path.dirname(sumPath);

  // Ensure directory exists
  await mkdir(dir, { recursive: true });

  // Write file
  const formatted = formatSumFile(content);
  await writeFile(sumPath, formatted, 'utf-8');

  return sumPath;
}

/**
 * Get the .sum path for a source file.
 */
export function getSumPath(sourcePath: string): string {
  return `${sourcePath}.sum`;
}

/**
 * Check if a .sum file exists for a source file.
 */
export async function sumFileExists(sourcePath: string): Promise<boolean> {
  const sumPath = getSumPath(sourcePath);
  const content = await readSumFile(sumPath);
  return content !== null;
}
