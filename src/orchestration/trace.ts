/**
 * Concurrency tracing system for debugging task/subprocess lifecycle.
 *
 * Produces append-only NDJSON trace files in `.agents-reverse-engineer/traces/`
 * when the `--trace` CLI flag is set. When disabled, the {@link NullTraceWriter}
 * ensures zero overhead -- every call site can unconditionally call `emit()`
 * without branching.
 *
 * Uses promise-chain serialization (same pattern as {@link PlanTracker}) to
 * handle concurrent writes from multiple pool workers safely.
 *
 * @module
 */

import { open, mkdir, readdir, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import * as path from 'node:path';
import { safeTimestamp } from '../core/utils.js';

// ---------------------------------------------------------------------------
// Trace directory
// ---------------------------------------------------------------------------

/** Directory for trace files (relative to project root) */
const TRACES_DIR = '.agents-reverse-engineer/traces';

// ---------------------------------------------------------------------------
// Trace event types
// ---------------------------------------------------------------------------

/** Common fields present on every trace event */
interface TraceEventBase {
  /** Monotonically increasing sequence number (per-run) */
  seq: number;
  /** ISO 8601 timestamp at event creation time */
  ts: string;
  /** process.pid of the Node.js parent process */
  pid: number;
  /** High-resolution elapsed time since run start (ms, fractional) */
  elapsedMs: number;
}

/** Emitted when a phase begins execution */
interface PhaseStartEvent extends TraceEventBase {
  type: 'phase:start';
  phase: string;
  taskCount: number;
  concurrency: number;
}

/** Emitted when a phase completes */
interface PhaseEndEvent extends TraceEventBase {
  type: 'phase:end';
  phase: string;
  durationMs: number;
  tasksCompleted: number;
  tasksFailed: number;
}

/** Emitted when a pool worker starts pulling from the shared iterator */
interface WorkerStartEvent extends TraceEventBase {
  type: 'worker:start';
  workerId: number;
  phase: string;
}

/** Emitted when a pool worker exhausts the iterator or is aborted */
interface WorkerEndEvent extends TraceEventBase {
  type: 'worker:end';
  workerId: number;
  phase: string;
  tasksExecuted: number;
}

/** Emitted when a worker picks up a task from the iterator */
interface TaskPickupEvent extends TraceEventBase {
  type: 'task:pickup';
  workerId: number;
  taskIndex: number;
  taskLabel: string;
  activeTasks: number;
}

/** Emitted when a task completes (success or failure) */
interface TaskDoneEvent extends TraceEventBase {
  type: 'task:done';
  workerId: number;
  taskIndex: number;
  taskLabel: string;
  durationMs: number;
  success: boolean;
  error?: string;
  activeTasks: number;
}

/** Emitted when a child process is spawned */
interface SubprocessSpawnEvent extends TraceEventBase {
  type: 'subprocess:spawn';
  childPid: number;
  command: string;
  taskLabel: string;
}

/** Emitted when a child process exits */
interface SubprocessExitEvent extends TraceEventBase {
  type: 'subprocess:exit';
  childPid: number;
  command: string;
  taskLabel: string;
  exitCode: number;
  signal: string | null;
  durationMs: number;
  timedOut: boolean;
}

/** Emitted before a retry attempt */
interface RetryEvent extends TraceEventBase {
  type: 'retry';
  attempt: number;
  taskLabel: string;
  errorCode: string;
}

/** Emitted when a non-pool task starts execution */
interface TaskStartEvent extends TraceEventBase {
  type: 'task:start';
  taskLabel: string;
  phase: string;
}

/** Emitted when file discovery begins */
interface DiscoveryStartEvent extends TraceEventBase {
  type: 'discovery:start';
  targetPath: string;
}

/** Emitted when file discovery completes */
interface DiscoveryEndEvent extends TraceEventBase {
  type: 'discovery:end';
  filesIncluded: number;
  filesExcluded: number;
  durationMs: number;
}

/** Emitted when a filter is applied during discovery */
interface FilterAppliedEvent extends TraceEventBase {
  type: 'filter:applied';
  filterName: string;
  filesMatched: number;
  filesRejected: number;
}

/** Emitted when a generation/update plan is created */
interface PlanCreatedEvent extends TraceEventBase {
  type: 'plan:created';
  planType: 'generate' | 'update';
  fileCount: number;
  taskCount: number;
}

/** Emitted when configuration is loaded */
interface ConfigLoadedEvent extends TraceEventBase {
  type: 'config:loaded';
  configPath: string;
  model: string;
  concurrency: number;
}

/** Discriminated union of all trace event types */
export type TraceEvent =
  | PhaseStartEvent
  | PhaseEndEvent
  | WorkerStartEvent
  | WorkerEndEvent
  | TaskPickupEvent
  | TaskDoneEvent
  | TaskStartEvent
  | SubprocessSpawnEvent
  | SubprocessExitEvent
  | RetryEvent
  | DiscoveryStartEvent
  | DiscoveryEndEvent
  | FilterAppliedEvent
  | PlanCreatedEvent
  | ConfigLoadedEvent;

/** Keys auto-populated by the trace writer */
type BaseKeys = 'seq' | 'ts' | 'pid' | 'elapsedMs';

/** Distributive Omit that works correctly across union members */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Event payload without auto-populated base fields */
export type TraceEventPayload = DistributiveOmit<TraceEvent, BaseKeys>;

// ---------------------------------------------------------------------------
// ITraceWriter interface
// ---------------------------------------------------------------------------

/**
 * Public interface for trace event emission.
 *
 * All consumers depend only on this interface, allowing the no-op
 * implementation to be swapped in when tracing is disabled.
 */
export interface ITraceWriter {
  /** Emit a trace event. Base fields (seq, ts, pid, elapsedMs) are auto-populated. */
  emit(event: TraceEventPayload): void;
  /** Flush all pending writes and close the file handle. */
  finalize(): Promise<void>;
  /** Absolute path to the trace file (empty string for NullTraceWriter). */
  readonly filePath: string;
}

// ---------------------------------------------------------------------------
// NullTraceWriter (no-op)
// ---------------------------------------------------------------------------

/**
 * No-op trace writer. Returned when `--trace` is not set.
 * All methods are empty -- zero overhead at call sites.
 */
class NullTraceWriter implements ITraceWriter {
  readonly filePath = '';
  emit(): void { /* no-op */ }
  async finalize(): Promise<void> { /* no-op */ }
}

// ---------------------------------------------------------------------------
// TraceWriter (real implementation)
// ---------------------------------------------------------------------------

/**
 * Append-only NDJSON trace writer.
 *
 * Each `emit()` call serializes the event to a single JSON line and
 * enqueues a file append via a promise chain. This guarantees correct
 * ordering even when multiple pool workers emit concurrently.
 */
class TraceWriter implements ITraceWriter {
  readonly filePath: string;

  private seq = 0;
  private readonly nodePid = process.pid;
  private readonly startHr = process.hrtime.bigint();
  private writeQueue: Promise<void> = Promise.resolve();
  private fd: FileHandle | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  emit(partial: TraceEventPayload): void {
    const event = {
      ...partial,
      seq: this.seq++,
      ts: new Date().toISOString(),
      pid: this.nodePid,
      elapsedMs: Number(process.hrtime.bigint() - this.startHr) / 1_000_000,
    };
    const line = JSON.stringify(event) + '\n';

    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!this.fd) {
          await mkdir(path.dirname(this.filePath), { recursive: true });
          this.fd = await open(this.filePath, 'a');
        }
        await this.fd.write(line);
      })
      .catch(() => { /* non-critical -- trace loss is acceptable */ });
  }

  async finalize(): Promise<void> {
    await this.writeQueue;
    if (this.fd) {
      await this.fd.close();
      this.fd = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a trace writer.
 *
 * Returns a {@link NullTraceWriter} when `enabled` is false (zero overhead).
 * Otherwise returns a {@link TraceWriter} that appends NDJSON to
 * `.agents-reverse-engineer/traces/trace-{timestamp}.ndjson`.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param enabled - Whether tracing is enabled (typically from `--trace` flag)
 * @returns A trace writer instance
 */
export function createTraceWriter(projectRoot: string, enabled: boolean): ITraceWriter {
  if (!enabled) return new NullTraceWriter();
  const timestamp = safeTimestamp();
  const filePath = path.join(projectRoot, TRACES_DIR, `trace-${timestamp}.ndjson`);
  return new TraceWriter(filePath);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove old trace files, keeping only the most recent ones.
 *
 * Mirrors the pattern in `src/ai/telemetry/cleanup.ts`.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @param keepCount - Number of most recent trace files to retain (default: 500)
 * @returns Number of files deleted
 */
export async function cleanupOldTraces(projectRoot: string, keepCount: number = 500): Promise<number> {
  const tracesDir = path.join(projectRoot, TRACES_DIR);

  let entries: string[];
  try {
    const allEntries = await readdir(tracesDir);
    entries = allEntries.filter(
      (name) => name.startsWith('trace-') && name.endsWith('.ndjson'),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  // Sort newest first (ISO timestamps sort lexicographically)
  entries.sort();
  entries.reverse();

  const toDelete = entries.slice(keepCount);

  for (const filename of toDelete) {
    await unlink(path.join(tracesDir, filename));
  }

  return toDelete.length;
}
