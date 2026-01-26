import { encode, isWithinTokenLimit as checkLimit } from 'gpt-tokenizer';

/**
 * Count tokens in content using BPE tokenization.
 * Uses cl100k_base encoding (compatible with Claude/GPT-4).
 *
 * @param content - Text to count tokens in
 * @returns Token count
 */
export function countTokens(content: string): number {
  return encode(content).length;
}

/**
 * Check if content fits within token limit without fully encoding.
 * More efficient than counting when you only need a boolean check.
 *
 * @param content - Text to check
 * @param limit - Maximum allowed tokens
 * @returns true if content is within limit
 */
export function isWithinLimit(content: string, limit: number): boolean {
  // checkLimit returns token count if within limit, false if exceeded
  return checkLimit(content, limit) !== false;
}

/**
 * Estimate prompt overhead for a given file type.
 * Includes template tokens + system prompt portion.
 *
 * @param fileType - Type of file being summarized
 * @returns Estimated overhead in tokens
 */
export function estimatePromptOverhead(fileType: string): number {
  // Base overhead for all prompts (system instructions, formatting)
  const BASE_OVERHEAD = 500;

  // Additional overhead by file type (templates vary in size)
  const TYPE_OVERHEAD: Record<string, number> = {
    component: 200,
    service: 150,
    api: 180,
    model: 120,
    schema: 100,
    generic: 100,
  };

  return BASE_OVERHEAD + (TYPE_OVERHEAD[fileType] ?? 100);
}
