/**
 * Types for the documentation generation pipeline
 */

/**
 * FileType enum - 11 categories for template selection
 * Used to select appropriate prompts for different file types
 */
export type FileType =
  | 'component' // React/Vue/Svelte components
  | 'service' // Business logic services
  | 'util' // Utility functions
  | 'type' // Type definitions only
  | 'test' // Test files
  | 'config' // Configuration files
  | 'api' // API routes/handlers
  | 'model' // Data models/entities
  | 'hook' // React hooks
  | 'schema' // Validation schemas (Zod, Yup, etc.)
  | 'generic'; // Fallback for undetected types

/**
 * Request to analyze a file
 */
export interface AnalysisRequest {
  /** Path to the file being analyzed */
  filePath: string;
  /** Content of the file */
  content: string;
  /** Detected file type for prompt selection */
  fileType: FileType;
  /** Token count for the file content */
  tokens: number;
  /** Related files for context */
  contextFiles?: string[];
}

/**
 * Result of file analysis (populated by LLM via host)
 */
export interface AnalysisResult {
  /** Generated summary text */
  summary: string;
  /** Extracted metadata */
  metadata: SummaryMetadata;
}

/**
 * Metadata extracted during analysis
 */
export interface SummaryMetadata {
  /** Primary purpose of the file */
  purpose: string;
  /** Public exports/interface */
  publicInterface: string[];
  /** External dependencies */
  dependencies: string[];
  /** Design patterns used */
  patterns: string[];
  /** Only security/breaking issues */
  criticalTodos?: string[];
  /** Tightly coupled siblings */
  relatedFiles?: string[];
}

/**
 * Options for summary generation
 */
export interface SummaryOptions {
  /** Target length for generated summaries */
  targetLength: 'short' | 'standard' | 'detailed';
  /** Whether to include code snippets in output */
  includeCodeSnippets: boolean;
}

/**
 * Configuration for the generation process
 */
export interface GenerationConfig {
  /** Maximum token budget for generation */
  tokenBudget: number;
  /** Directory for supplementary docs */
  outputDir?: string;
  /** Whether to generate architecture doc */
  generateArchitecture: boolean;
  /** Whether to generate stack doc */
  generateStack: boolean;
}
