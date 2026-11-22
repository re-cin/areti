# Planner rules

Source of truth for the scheduling engine (`src/features/planner`). The engine is a pure function:
`generatePlan(input) -> { sessions, shortfallBlocks }`. No UI, database or Expo imports.

## Agreed rules
1. A subject must exist before a plan can be made. Each subject has a **difficulty** and an **urgency**.
2. With no exam, subjects use default values. With an exam, the exam date adjusts how often sessions are scheduled and how they are split.
3. Exams share free time and one daily focus goal. First protect subjects on their last available study day. Then use earlier free windows and allocate focus minutes by difficulty-weighted fair sharing; earlier deadlines, then urgency + difficulty, break ties.
4. Pending session times can move when plans compete. Preserve each exam's original total focus-block target: unfinished blocks remain outstanding, with a visible shortfall if they cannot fit before the exam.
5. Sessions must fit inside the user's **time availability window** and **study days**.
6. **Never exceed the daily goal.** If there is not enough room before the exam, return `shortfallBlocks` and let the UI warn. Do not overload days.
7. If the user manually increases a day, that day is **locked** and the engine must not rebalance it.
8. Excluded days are never used.
9. **Break rule:** at most **2 hours of focus before a long break of at least 30 minutes** (`rules.ts`, `splitIntoRuns`).

## Workload and availability
- Difficulty and urgency use the existing subject values (default 3, scale 1–5).
- Low/Medium/High difficulty (stored 1/3/5) has study-time weights 1/2/3. With comparable deadlines, pending workloads and block lengths, six available blocks split approximately 1/2/3. The share also accounts for remaining focus minutes per eligible day, so nearer deadlines and fewer study days matter.
- Fairness carries across generated days, so a one-block daily goal can still give easier subjects time. Difficulty changes redistribute unfinished study and preserve existing total targets, completed work and fixed sessions. A completed hard target releases its share to other subjects.
- Set or change difficulty in Settings > Subjects; New Subject also saves the same difficulty scale. Subject edits trigger automatic regeneration while the app is active.
- A new exam targets `focusCount × eligible study days` focus blocks. Defaults: four 25-minute blocks, 5-minute short breaks, at least 30-minute long breaks, 19:00–21:00, all weekdays.
- Study-day and excluded-date preferences are honored. No generated study takes place on or after the exam date, or earlier than the current time.
- The daily focus goal is shared across exams. Manual tasks and fixed sessions consume capacity. Breaks consume clock time but not focus minutes.
- The two-hour continuous-study limit counts focus time. The scheduler and each generated session's frozen Pomodoro settings both enforce it.
- Completed work, locked sessions and a running/paused timer keep their IDs and settings. Ordinary automatic refresh also retains a session whose scheduled time is still in progress.
- In the Exam Study Plan's All Exams view, students can select subjects whose upcoming sessions should stay in place. These selections persist and can be removed later; the scheduler reserves those sessions before distributing the remaining study time.
- Availability changes (study range, daily goal, exam date, study days or excluded dates) retain the original workload. Explicit changes to focus count or focus length set a new remaining workload.

## Automatic regeneration and persistence
- New exams receive a schedule immediately. Existing exams are scheduled on the next app launch/foreground refresh.
- Refresh after task, subject, exam or session changes, and once per minute while the app is active. On foreground, catch up the timer before moving missed work. A closed app catches up when reopened; no background execution service is required.
- Missed unfinished blocks move to the next eligible free slots. Partially completed missed sessions retain completed blocks as history; only the unfinished blocks move.
- Preferences and sessions are saved with matching generated Daily Tasks, frozen timer settings and per-exam shortfalls in one synchronous SQLite transaction. No schema migration is needed.
- Repeated refreshes preserve unchanged session IDs and timestamps. Preview uses the same engine without writing. Generate/Regenerate and Save persist the schedule; All Exams applies preferences to upcoming exams while all plans continue to share capacity.

## Study-plan lifecycle
- Planner > View opens the complete list of active study plans, including past exams. Students can open or delete any listed plan. The Exam Study Plan screen also has a Delete study plan action.
- Deletion requires confirmation in the app. It archives the plan with a syncable deletion timestamp and cancels unfinished generated tasks and Pomodoros in one transaction. Completed tasks, focus logs and XP remain as history. Regeneration, stale previews and stale edits cannot revive a deleted plan.
- A running or paused timer continues as unplanned study after its plan is deleted; its timer state, settings and remaining time are kept. This applies to the saved timer and the active timer store.
- Deleting a subject cancels its study plans and pending tasks. Refresh also cleans up pending work whose parent was deleted, archived, expired, or lost its subject, including changes received through sync.
- Focus already logged today still counts against the daily goal after cancellation. Active unplanned timers also reserve capacity. Completed history does not turn back into pending work during regeneration.
- Generated tasks reuse their existing Pomodoro and frozen settings; timer configuration changes belong in Exam Study Plan. Deleting a manual task removes its task-linked Pomodoro.
- Changing an exam's subject creates fresh pending sessions for the new subject. A plan with completed study or an active timer must use a separate new exam to change subjects, keeping study history correctly attributed.

## Verification
`engine.test.ts`: capacity, competing exams, fixed commitments, breaks, study days, exclusions, missed work, exam today, multiple availability windows and ordinary study without an exam.

`examsRepo.test.ts`: real Drizzle queries and migrations against in-memory SQLite, automatic creation, duplicate prevention, retained progress/history/locks, manual conflicts, running/paused timers, partial completion, date changes, shared preferences, preview without writes and transaction rollback.
