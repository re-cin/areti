import type { PlannerInput, PlannerResult } from './types';

/**
 * TODO (planner owner): implement the scheduling rules in docs/planner-rules.md.
 * Keep this a PURE function (no database, no UI, no Expo imports) and cover it with tests.
 */
export function generatePlan(_input: PlannerInput): PlannerResult {
  return { sessions: [], shortfallBlocks: 0 };
}
