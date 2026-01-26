import { countTokens } from './counter.js';

export interface Chunk {
  index: number;
  content: string;
  tokens: number;
  startLine: number;
  endLine: number;
}

export interface ChunkOptions {
  /** Target tokens per chunk (default: 3000) */
  chunkSize?: number;
  /** Lines of overlap between chunks (default: 10) */
  overlapLines?: number;
}

const DEFAULT_CHUNK_SIZE = 3000;
const DEFAULT_OVERLAP_LINES = 10;

/**
 * Check if a file needs to be chunked for processing.
 *
 * @param content - File content
 * @param threshold - Token threshold for chunking (default: 4000)
 * @returns true if file should be chunked
 */
export function needsChunking(content: string, threshold: number = 4000): boolean {
  return countTokens(content) > threshold;
}

/**
 * Split a large file into overlapping chunks for map-reduce summarization.
 *
 * Each chunk includes some overlap with the previous chunk to maintain
 * context continuity. The overlap uses line-based boundaries to avoid
 * cutting in the middle of statements.
 *
 * @param content - File content to chunk
 * @param options - Chunking options
 * @returns Array of chunks with metadata
 */
export function chunkFile(content: string, options: ChunkOptions = {}): Chunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlapLines = DEFAULT_OVERLAP_LINES,
  } = options;

  const lines = content.split('\n');
  const chunks: Chunk[] = [];

  let currentLines: string[] = [];
  let currentTokens = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = countTokens(line + '\n');

    // Check if adding this line would exceed chunk size
    if (currentTokens + lineTokens > chunkSize && currentLines.length > 0) {
      // Save current chunk
      chunks.push({
        index: chunks.length,
        content: currentLines.join('\n'),
        tokens: currentTokens,
        startLine,
        endLine: i - 1,
      });

      // Start new chunk with overlap from previous
      const overlapStart = Math.max(0, currentLines.length - overlapLines);
      const overlapContent = currentLines.slice(overlapStart);
      currentLines = overlapContent;
      currentTokens = countTokens(overlapContent.join('\n'));
      startLine = i - overlapContent.length;
    }

    currentLines.push(line);
    currentTokens += lineTokens;
  }

  // Add final chunk if there's remaining content
  if (currentLines.length > 0) {
    chunks.push({
      index: chunks.length,
      content: currentLines.join('\n'),
      tokens: currentTokens,
      startLine,
      endLine: lines.length - 1,
    });
  }

  return chunks;
}

/**
 * Get total tokens across all chunks.
 */
export function getTotalChunkTokens(chunks: Chunk[]): number {
  return chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
}
