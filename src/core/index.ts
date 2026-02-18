/**
 * Public programmatic API for agents-reverse-engineer.
 *
 * Import from `'agents-reverse-engineer/core'` to use the engine
 * without CLI dependencies (no `process.exit`, `ora`, `picocolors`).
 *
 * @beta — API surface is experimental until v1.0.0
 * @module
 *
 * @example
 * ```typescript
 * import {
 *   discoverFiles,
 *   buildFilePrompt,
 *   AIService,
 *   type AIProvider,
 * } from 'agents-reverse-engineer/core';
 * ```
 */

// === Logger ===
export { nullLogger, consoleLogger } from './logger.js';
export type { Logger } from './logger.js';

// === AI ===
export { AIService } from '../ai/service.js';
export type { AIServiceOptions } from '../ai/service.js';
export type {
  AIProvider,
  AICallOptions,
  AIResponse,
  AIBackend,
  RetryOptions,
  AIServiceErrorCode,
} from '../ai/types.js';
export { AIServiceError } from '../ai/types.js';
export { withRetry, DEFAULT_RETRY_OPTIONS } from '../ai/retry.js';
export { SubprocessProvider } from '../ai/providers/subprocess.js';
export type { SubprocessProviderOptions } from '../ai/providers/subprocess.js';

// === Discovery ===
export { discoverFiles } from '../discovery/run.js';
export { walkDirectory } from '../discovery/walker.js';
export { applyFilters } from '../discovery/filters/index.js';
export type {
  FileFilter,
  FilterResult,
  WalkerOptions,
} from '../discovery/types.js';

// === Generation: Prompts ===
export {
  buildFilePrompt,
  buildDirectoryPrompt,
  detectLanguage,
} from '../generation/prompts/builder.js';
export type { PromptContext } from '../generation/prompts/types.js';

// === Generation: Writers ===
export {
  writeSumFile,
  readSumFile,
  getSumPath,
  sumFileExists,
  getAnnexPath,
  writeAnnexFile,
} from '../generation/writers/sum.js';
export type { SumFileContent } from '../generation/writers/sum.js';
export {
  writeAgentsMd,
  writeAgentsMdHub,
  isGeneratedAgentsMd,
} from '../generation/writers/agents-md.js';
export { writeClaudeMdPointer } from '../generation/writers/claude-md.js';

// === Generation: Orchestration ===
export {
  DocumentationOrchestrator as GenerationOrchestrator,
  DocumentationOrchestrator as UpdateOrchestrator,
} from '../orchestration/orchestrator.js';
export type { GenerationPlan, PreparedFile, AnalysisTask, UpdatePlan } from '../orchestration/orchestrator.js';
export {
  buildExecutionPlan,
  formatExecutionPlanAsMarkdown,
} from '../generation/executor.js';
export type { ExecutionPlan, ExecutionTask } from '../generation/executor.js';

// === Quality ===
export {
  extractExports,
  checkCodeVsDoc,
} from '../quality/inconsistency/code-vs-doc.js';
export { checkCodeVsCode } from '../quality/inconsistency/code-vs-code.js';
export { checkPhantomPaths } from '../quality/phantom-paths/validator.js';
export {
  buildInconsistencyReport,
  formatReportForCli,
  formatReportAsMarkdown,
} from '../quality/inconsistency/reporter.js';
export type {
  Inconsistency,
  InconsistencyReport,
  InconsistencySeverity,
  CodeDocInconsistency,
  CodeCodeInconsistency,
  PhantomPathInconsistency,
} from '../quality/types.js';

// === Orchestration ===
export { runPool } from '../orchestration/pool.js';
export type { PoolOptions, TaskResult } from '../orchestration/pool.js';

// === Change Detection ===
export {
  computeContentHash,
  computeContentHashFromString,
  isGitRepo,
  getCurrentCommit,
  getChangedFiles,
} from '../change-detection/detector.js';
export type {
  FileChange,
  ChangeDetectionResult,
} from '../change-detection/types.js';

// === Config ===
export { loadConfig, findProjectRoot } from '../config/loader.js';
export { ConfigSchema } from '../config/schema.js';
export type { Config } from '../config/schema.js';
export {
  getDefaultConcurrency,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_VENDOR_DIRS,
} from '../config/defaults.js';

// === Imports ===
export {
  extractImports,
  extractDirectoryImports,
  formatImportMap,
} from '../imports/extractor.js';

// === Utilities ===
export { safeTimestamp } from './timestamp.js';
