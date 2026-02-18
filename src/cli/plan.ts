/**
 * `are plan` CLI command handler.
 *
 * Orchestrates the full plan comparison workflow:
 * 1. Create worktree pair from current HEAD
 * 2. Strip artifacts from "without-docs" worktree
 * 3. Run AI planner in each worktree (without-docs first)
 * 4. Save results and render comparison
 * 5. Optionally run AI evaluator (--eval)
 *
 * @module
 */

import path from 'node:path';
import pc from 'picocolors';
import { findProjectRoot } from '../config/loader.js';
import { loadConfig } from '../config/loader.js';
import { createBackendRegistry, resolveBackend } from '../ai/registry.js';
import { createLogger } from '../output/logger.js';
import { safeTimestamp } from '../core/timestamp.js';
import {
  slugify,
  createWorktreePair,
  hasUncommittedChanges,
  commitPlanToWorktree,
  stripArtifacts,
  executePlanRun,
  evaluatePlans,
  saveComparison,
  loadComparison,
  listComparisons,
  renderComparison,
  renderHeader,
  renderPhaseStart,
  renderPhaseComplete,
  renderList,
} from '../plan/index.js';
import type { PlanOptions, PlanComparison, ComparisonDeltas } from '../plan/types.js';

/**
 * Execute the `are plan` command.
 *
 * @param task - The task description to plan (or empty if using --list/--show)
 * @param targetPath - Project root directory
 * @param options - Command options
 */
export async function planCommand(
  task: string,
  targetPath: string,
  options: PlanOptions,
): Promise<void> {
  const projectRoot = await findProjectRoot(path.resolve(targetPath || process.cwd()));
  const logger = createLogger({ colors: true });
  const config = await loadConfig(projectRoot, { debug: options.debug });

  // Handle --list
  if (options.list) {
    const comparisons = await listComparisons(projectRoot);
    renderList(comparisons);
    return;
  }

  // Handle --show
  if (options.show) {
    const comparison = await loadComparison(projectRoot, options.show);
    if (!comparison) {
      logger.error(`No comparison found matching "${options.show}".`);
      logger.info('Run `are plan --list` to see available comparisons.');
      process.exit(1);
    }
    renderHeader(comparison.task, comparison.model, comparison.backend, comparison.branches);
    renderComparison(comparison);
    return;
  }

  // Require a task for actual planning
  if (!task) {
    logger.error('A task description is required.');
    logger.info('Usage: are plan "<task description>" [options]');
    logger.info('       are plan --list');
    logger.info('       are plan --show <id>');
    process.exit(1);
  }

  // Resolve backend and model
  const registry = createBackendRegistry();
  const backendName = options.backend ?? config.ai.backend;
  const backend = await resolveBackend(registry, backendName);
  const model = options.model ?? config.ai.model;

  const taskSlug = slugify(task);
  const withDocsBranch = `are/plan/with-docs/${taskSlug}`;
  const withoutDocsBranch = `are/plan/without-docs/${taskSlug}`;

  // Dry run: show what would happen
  if (options.dryRun) {
    console.log(pc.bold('=== Plan Comparison (dry run) ==='));
    console.log(`Task: "${task}"`);
    console.log(`Slug: ${taskSlug}`);
    console.log(`Model: ${model}  Backend: ${backend.name}`);
    console.log('');
    console.log('Would create branches:');
    console.log(`  ${withDocsBranch}`);
    console.log(`  ${withoutDocsBranch}`);
    console.log('');
    console.log('Would create temporary worktrees in /tmp');
    console.log('Would run AI planner in both worktrees (without-docs first)');
    if (options.eval) {
      console.log('Would run AI evaluator on both plans');
    }
    console.log('');
    console.log(pc.yellow('Dry run — no actions taken.'));
    return;
  }

  // Check for uncommitted changes
  if (await hasUncommittedChanges(projectRoot)) {
    logger.warn('Uncommitted changes detected. Plans will compare the last committed state.');
    logger.warn('Consider committing first for accurate results.');
    console.log('');
  }

  const startTime = new Date().toISOString();
  const comparisonId = safeTimestamp(new Date(startTime));

  // Render header
  renderHeader(task, model, backend.name, {
    withDocs: withDocsBranch,
    withoutDocs: withoutDocsBranch,
  });

  // Create worktree pair
  let worktrees;
  try {
    worktrees = await createWorktreePair(projectRoot, taskSlug, options.force ?? false);
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }

  {
    // Phase 1: Strip artifacts from "without-docs" worktree
    const removedCount = await stripArtifacts(worktrees.withoutDocsPath);
    if (options.debug) {
      console.error(`[plan] Stripped ${removedCount} artifacts from without-docs worktree`);
    }

    // Phase 2: Run AI planner in "without-docs" worktree
    renderPhaseStart(1, 2, 'Planning WITHOUT documentation...');
    const withoutDocsResult = await executePlanRun({
      task,
      cwd: worktrees.withoutDocsPath,
      model,
      debug: options.debug,
    });
    renderPhaseComplete(
      withoutDocsResult.latencyMs,
      withoutDocsResult.outputTokens,
      withoutDocsResult.cost.totalCost,
      withoutDocsResult.success,
    );

    // Phase 3: Run AI planner in "with-docs" worktree
    renderPhaseStart(2, 2, 'Planning WITH documentation...');
    const withDocsResult = await executePlanRun({
      task,
      cwd: worktrees.withDocsPath,
      model,
      debug: options.debug,
    });
    renderPhaseComplete(
      withDocsResult.latencyMs,
      withDocsResult.outputTokens,
      withDocsResult.cost.totalCost,
      withDocsResult.success,
    );

    // Extract plan texts for storage
    const withDocsPlanText = withDocsResult.planText || `[Failed: ${withDocsResult.error}]`;
    const withoutDocsPlanText = withoutDocsResult.planText || `[Failed: ${withoutDocsResult.error}]`;

    // Commit plan texts to worktree branches (before cleanup removes them)
    await commitPlanToWorktree(worktrees.withDocsPath, withDocsPlanText, comparisonId);
    await commitPlanToWorktree(worktrees.withoutDocsPath, withoutDocsPlanText, comparisonId);

    // Run evaluation if requested
    let evaluation = null;
    if (options.eval && withDocsResult.success && withoutDocsResult.success) {
      console.log(pc.bold('Running quality evaluation...'));
      const evalModel = options.evalModel ?? model;
      evaluation = await evaluatePlans(
        task,
        withDocsPlanText,
        withoutDocsPlanText,
        evalModel,
        options.debug,
      );
      if (evaluation) {
        console.log(pc.green('  \u2713 Evaluation complete'));
      } else {
        console.log(pc.yellow('  \u2717 Evaluation failed (results saved without eval)'));
      }
      console.log('');
    }

    // Compute deltas
    const deltas: ComparisonDeltas = {
      costDelta: withDocsResult.cost.totalCost - withoutDocsResult.cost.totalCost,
      latencyDelta: withDocsResult.latencyMs - withoutDocsResult.latencyMs,
      specificityRatio: withoutDocsResult.metrics.fileReferences > 0
        ? withDocsResult.metrics.fileReferences / withoutDocsResult.metrics.fileReferences
        : null,
      actionabilityRatio: withoutDocsResult.metrics.actionableSteps > 0
        ? withDocsResult.metrics.actionableSteps / withoutDocsResult.metrics.actionableSteps
        : null,
      qualityScoreDelta: evaluation
        ? (evaluation.planALabel === 'withDocs'
          ? evaluation.totalScoreA - evaluation.totalScoreB
          : evaluation.totalScoreB - evaluation.totalScoreA)
        : null,
    };

    // Build comparison record
    const comparison: PlanComparison = {
      id: comparisonId,
      startTime,
      endTime: new Date().toISOString(),
      task,
      taskSlug,
      backend: backend.name,
      model,
      branches: {
        withDocs: withDocsBranch,
        withoutDocs: withoutDocsBranch,
      },
      withDocs: withDocsResult,
      withoutDocs: withoutDocsResult,
      evaluation,
      deltas,
    };

    // Save to disk
    await saveComparison(projectRoot, comparison, withDocsPlanText, withoutDocsPlanText);

    // Render results
    renderComparison(comparison);

    // Print worktree paths for inspection
    console.log(`Worktrees: ${worktrees.withDocsPath}`);
    console.log(`           ${worktrees.withoutDocsPath}`);
  }
}
