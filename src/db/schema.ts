import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Every table follows the same sync-ready pattern:
//  - id: UUID created ON THE DEVICE (use newId() from ./id), never auto-increment
//  - updatedAt: epoch ms, set on every write
//  - deletedAt: epoch ms, null unless deleted (soft delete, so deletions can sync later)
const base = {
  id: text('id').primaryKey(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
};

export const subjects = sqliteTable('subjects', {
  ...base,
  name: text('name').notNull(),
  color: text('color').notNull(),
  difficulty: integer('difficulty').notNull().default(3), // scale TBD, see docs/planner-rules.md
  urgency: integer('urgency').notNull().default(3), // scale TBD
  sortOrder: integer('sort_order').notNull().default(0),
});

export const studyPlans = sqliteTable('study_plans', {
  ...base,
  subjectId: text('subject_id').notNull(),
  examDate: integer('exam_date').notNull(), // epoch ms (start of day)
  status: text('status').notNull().default('active'), // active | done | archived
});

export const plannedSessions = sqliteTable('planned_sessions', {
  ...base,
  planId: text('plan_id').notNull(),
  subjectId: text('subject_id').notNull(),
  date: integer('date').notNull(), // epoch ms (start of day)
  startMinute: integer('start_minute'), // minutes from midnight, null if unscheduled within the window
  blocks: integer('blocks').notNull(), // number of focus blocks
  locked: integer('locked', { mode: 'boolean' }).notNull().default(false), // user edited, engine must not move it
  excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false),
  completedBlocks: integer('completed_blocks').notNull().default(0),
});

export const focusSessions = sqliteTable('focus_sessions', {
  ...base,
  subjectId: text('subject_id'),
  plannedSessionId: text('planned_session_id'), // null for unplanned sessions
  startedAt: integer('started_at').notNull(),
  durationSec: integer('duration_sec').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
});

export const ghostState = sqliteTable('ghost_state', {
  ...base,
  name: text('name').notNull().default('Reti'),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  equippedExpression: text('equipped_expression').notNull().default('neutral'),
  unlockedExpressions: text('unlocked_expressions').notNull().default('["neutral"]'), // JSON array
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON-encoded
  updatedAt: integer('updated_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  ...base,
  title: text('title').notNull(),
  subjectId: text('subject_id').notNull(),
  date: integer('date').notNull(),            // local midnight in epoch ms
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(), // duration = end - start, never stored
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull().default('manual'), // manual | generated
  planId: text('plan_id'),
  movable: integer('movable', { mode: 'boolean' }).notNull().default(false),
  hasPomodoro: integer('has_pomodoro', { mode: 'boolean' }).notNull().default(false),
  notificationSound: text('notification_sound').notNull().default('Silent'),
});

export const profile = sqliteTable('profile', {
  ...base,
  displayName: text('display_name').notNull().default(''),
  pictureUri: text('picture_uri'),
});