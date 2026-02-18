/**
 * Utility functions for agents-reverse-engineer.
 *
 * @module
 */

/**
 * Converts a Date object to a filesystem-safe ISO timestamp string.
 *
 * Replaces colons and periods with hyphens to ensure the timestamp
 * can be safely used in file paths and directory names across all platforms.
 *
 * @param date - The date to convert (defaults to current date/time)
 * @returns ISO timestamp with colons and periods replaced by hyphens
 *
 * @example
 * ```typescript
 * safeTimestamp();
 * // => "2024-01-15T10-30-45-123Z"
 *
 * safeTimestamp(new Date('2024-01-15T10:30:45.123Z'));
 * // => "2024-01-15T10-30-45-123Z"
 * ```
 */
export function safeTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
