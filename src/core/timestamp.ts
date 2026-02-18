/**
 * Utility for generating filesystem-safe timestamps.
 *
 * @module
 */

/**
 * Converts a Date to a filesystem-safe ISO timestamp string.
 *
 * Replaces colons and dots with hyphens to create valid filenames
 * across all platforms (Windows forbids `:` in filenames).
 *
 * @param date - The date to convert (defaults to current time)
 * @returns ISO 8601 timestamp with `:` and `.` replaced by `-`
 *
 * @example
 * ```ts
 * safeTimestamp(new Date('2024-01-15T10:30:45.123Z'))
 * // → '2024-01-15T10-30-45-123Z'
 *
 * safeTimestamp()
 * // → current time as safe timestamp
 * ```
 */
export function safeTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
