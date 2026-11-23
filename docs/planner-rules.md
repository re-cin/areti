# Planner rules

Source of truth for the scheduling engine (`src/features/planner`). The engine is a pure function:
`generatePlan(input) -> { sessions, shortfallBlocks }`. No UI, database or Expo imports.

## Agreed rules
1. A subject must exist before a plan can be made. Each exam has its own **difficulty**; the subject supplies its name, color and existing urgency value.
2. With no exam, subjects use default values. With an exam, the exam date adjusts how often sessions are scheduled and how they are split.
3. Exams share free time and one daily focus goal. First protect subjects on their last available study day. Then use earlier free windows and allocate focus minutes by difficulty-weighted fair sharing; earlier deadlines, then urgency + difficulty, break ties.
4. Pending session times can move when plans compete. Preserve each exam's original total focus-block target: unfinished blocks remain outstanding, with a visible shortfall if they cannot fit before the exam.
5. Sessions must fit inside the user's **time availability window** and **study days**.
6. **Never exceed the daily goal.** If there is not enough room before the exam, return `shortfallBlocks` and let the UI warn. Do not overload days.
7. If the user manually increases a day, that day is **locked** and the engine must not rebalance it.
8. Excluded days are never used.
9. **Break rule:** at most **2 hours of focus before a long break of at least 30 minutes** (`rules.ts`, `splitIntoRuns`).

## Workload and availability
- Difficulty belongs to the exam/study plan (default Medium = 3, scale 1-5). Two exams for the same subject can have different difficulty. Urgency still uses the existing subject value.
- Low/Medium/High difficulty (stored 1/3/5) has study-time weights 1/2/3. With comparable deadlines, pending workloads and block lengths, six available blocks split approximately 1/2/3. The share also accounts for remaining focus minutes per eligible day, so nearer deadlines and fewer study days matter.
- Fairness carries across generated days, so a one-block daily goal can still give easier subjects time. Difficulty changes redistribute unfinished study and preserve existing total targets, completed work and fixed sessions. A completed hard target releases its share to other subjects.
- Set difficulty in Set/Edit Exam or Exam Study Plan. Changing it rebalances pending study automatically and preserves every other exam's difficulty, including exams for the same subject. All Exams preference saves do not copy difficulty between exams. Subjects have no difficulty field or control.
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
- Missed unfinished blocks move to the next eligible free slots (Premium; Free students trigger this by regenerating, see Free vs Premium). Partially completed missed sessions retain completed blocks as history; only the unfinished blocks move.
- Preferences and sessions are saved with matching generated Daily Tasks, frozen timer settings and per-exam shortfalls in one synchronous SQLite transaction.
- SQLite migration `0004_exam_difficulty` copies legacy subject difficulty to linked exams before removing the subject column, preserving existing choices and study history. Apply Supabase migration `20261123090000_exam_difficulty.sql` before syncing the updated app; it makes the matching cloud schema change.
- Repeated refreshes preserve unchanged session IDs and timestamps. Preview uses the same engine without writing. Generate/Regenerate and Save persist the schedule; All Exams applies preferences to upcoming exams while all plans continue to share capacity.

## Study-plan lifecycle
- Planner > View opens the complete list of active study plans, including past exams. Students can open or delete any listed plan. The Exam Study Plan screen also has a Delete study plan action.
- Deletion requires confirmation in the app. It archives the plan with a syncable deletion timestamp and cancels unfinished generated tasks and Pomodoros in one transaction. Completed tasks, focus logs and XP remain as history. Regeneration, stale previews and stale edits cannot revive a deleted plan.
- A running or paused timer continues as unplanned study after its plan is deleted; its timer state, settings and remaining time are kept. This applies to the saved timer and the active timer store.
- Deleting a subject cancels its study plans and pending tasks. Refresh also cleans up pending work whose parent was deleted, archived, expired, or lost its subject, including changes received through sync.
- Focus already logged today still counts against the daily goal after cancellation. Active unplanned timers also reserve capacity. Completed history does not turn back into pending work during regeneration.
- Generated tasks reuse their existing Pomodoro and frozen settings; timer configuration changes belong in Exam Study Plan. Deleting a manual task removes its task-linked Pomodoro.
- Changing an exam's subject creates fresh pending sessions for the new subject. A plan with completed study or an active timer must use a separate new exam to change subjects, keeping study history correctly attributed.

## Free vs Premium
One scheduling engine serves everyone; the subscription tier (`src/features/subscription/entitlements.ts`) only switches capabilities on. Deadline, difficulty and urgency are measured identically in both tiers.

| | Free | Premium |
|---|---|---|
| Subjects and exams (manual tracking) | Unlimited | Unlimited |
| Automatically scheduled exams | The nearest deadline only | All of them, sharing time |
| Missed sessions | Marked missed and left in place. They move when the student taps Regenerate/Save (or Reschedule missed sessions) | Moved automatically to the next free slots |
| Exam priority (Normal / High / Highest) | Not available | Re-shares available time between exams |
| Insights | Progress and missed count | Plus time left, scheduled blocks, workload fit and missed-session patterns |

- **Free scheduling limit.** The nearest upcoming exam is auto-scheduled; ties break by id. Other exams stay listed, but their generated pending sessions are withdrawn (completed history is kept) and their preview/save is refused with `PremiumRequiredError`. When the nearest exam passes, the next one becomes the scheduled exam.
- **Free missed work.** Automatic refreshes keep a missed unfinished session where it is and count it as accounted for, so no replacement is generated. An explicit Regenerate/Save is a manual reschedule and moves it, for every tier.
- **Priority** multiplies an exam's fair-share weight (1 / 1.5 / 2). It never adds study hours or exceeds the daily goal; with room for every exam it changes order only. It is stored as setting `exam-priority:<plan id>` and ignored if the subscription is not Premium.
- **Subscription source of truth.** Supabase table `public.subscriptions` (students can read, never write). The phone caches it in local-only setting `subscription.plan` (`subscriptionRepo.refreshSubscription`, run after each sync). A failed or offline refresh keeps the last cache. Missing, unreadable or expired subscriptions are Free. Migration `20261123100000_subscriptions.sql` also drops uploaded `exam-priority:*` settings from non-Premium users and refuses any upload of `subscription.plan`.
- **Not built yet:** review-and-accept before Premium recovery is applied, advanced side-by-side schedule comparison, and payments (the upgrade button is a placeholder). Scheduling runs on the device, so a modified app could still schedule extra exams locally; the server protects the subscription record and Premium-only synced data.

## Verification
`engine.test.ts`: capacity, competing exams, fixed commitments, breaks, study days, exclusions, missed work, exam today, multiple availability windows and ordinary study without an exam.

`insights.test.ts` and `entitlements.test.ts`: Free/Premium rules, insight maths and subscription parsing/expiry.

`examsRepo.test.ts`: real Drizzle queries and migrations against in-memory SQLite, automatic creation, duplicate prevention, retained progress/history/locks, manual conflicts, running/paused timers, partial completion, date changes, shared preferences, preview without writes and transaction rollback.
