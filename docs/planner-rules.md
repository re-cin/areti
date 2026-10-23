# Planner rules

Source of truth for the scheduling engine (`src/features/planner`). The engine is a pure function:
`generatePlan(input) -> { sessions, shortfallBlocks }`. No UI, database or Expo imports.

## Agreed rules
1. A subject must exist before a plan can be made. Each subject has a **difficulty** and an **urgency**.
2. With no exam, subjects use default values. With an exam, the exam date adjusts how often sessions are scheduled and how they are split.
3. If another subject already has a session that day, compare their priority (urgency + difficulty). The higher priority keeps its place.
4. The lower priority session may lose only a **limited share** of its time. The rest is moved to another day or time, not dropped.
5. Sessions must fit inside the user's **time availability window** and **study days**.
6. **Never exceed the daily goal.** If there is not enough room before the exam, return `shortfallBlocks` and let the UI warn. Do not overload days.
7. If the user manually increases a day, that day is **locked** and the engine must not rebalance it.
8. Excluded days are never used.
9. **Break rule:** at most **2 hours of focus before a long break of at least 30 minutes** (`rules.ts`, `splitIntoRuns`).

## Open questions (decide before finishing the engine)
- Difficulty and urgency scales (suggested: 1 to 5).
- How much total study time per subject should the plan aim for (for example, a base number of blocks multiplied by difficulty)?
- The maximum share of a session that can be taken away by a higher priority session (suggested: 30%).
- Does the 2 hour limit count focus time only, or elapsed time including short breaks? (Currently: focus time only.)
- Are missed sessions rescheduled automatically, or only when the user regenerates or edits?

## Test cases to write
Exam tomorrow, no capacity, two subjects collide, locked day, exam date moves earlier, exam date moves later, day excluded, no exam.
