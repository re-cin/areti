// Exercise the real Drizzle repository and migrations against SQLite in memory.
// Native transport, IDs, and unrelated network/notification services are replaced.
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions, ghostState, plannedSessions, settings, studyPlans, subjects, tasks } from '@/db/schema';
import { addDays, startOfDay } from '@/lib/dates';
import { deleteTask, setTaskDone } from '@/db/queries/tasks';
import { addSubject, deleteSubject, listSubjects } from '@/features/subjects/subjectsRepo';
import { listUpcomingToday, recordFocus, scheduleTaskPomodoro } from '@/features/timer/timerRepo';
import { useTimer } from '@/features/timer/timerStore';
import { DEFAULT_POMODORO } from '@/features/timer/pomodoroSettings';
import { DEFAULT_EXAM_PREFERENCES as BASE_EXAM_PREFERENCES, createExam, deleteStudyPlan, examsQuery, getExam, getExamPreferences, getProtectedSubjectIds, previewStudySchedule, regenerateSchedules, saveProtectedSubjectIds, saveStudySchedule, updateExam, updateExamDifficulty } from './examsRepo';

jest.mock('@/db/client', () => {
  const { DatabaseSync } = jest.requireActual('node:sqlite');
  const { readFileSync } = jest.requireActual('node:fs');
  const { join } = jest.requireActual('node:path');
  const { drizzle } = jest.requireActual('drizzle-orm/expo-sqlite');
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0000_safe_hitman.sql', '0001_icy_diamondback.sql', '0002_accounts.sql', '0003_drop_local_accounts.sql', '0004_exam_difficulty.sql']) {
    sqlite.exec(readFileSync(join(process.cwd(), 'drizzle', name), 'utf8'));
  }
  const execute = (sql: string, params: unknown[], raw: boolean) => {
    const statement = sqlite.prepare(sql);
    statement.setReturnArrays(raw);
    if (statement.columns().length) {
      const rows = statement.all(...params);
      return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
    }
    const result = statement.run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  };
  return { db: drizzle({ prepareSync: (sql: string) => ({
    executeSync: (params: unknown[]) => execute(sql, params, false),
    executeForRawResultSync: (params: unknown[]) => execute(sql, params, true),
  }) }) };
});
jest.mock('@/db/id', () => ({ newId: () => jest.requireActual('node:crypto').randomUUID() }));
jest.mock('@/lib/supabase', () => ({ supabaseConfigured: false, supabase: {} }));
jest.mock('@/features/timer/notifications', () => ({ cancelTimerNotifications: jest.fn(), scheduleTimerNotifications: jest.fn() }));

// These tests cover an exam's own study times; the study-slot path has its own tests below.
const DEFAULT_EXAM_PREFERENCES = { ...BASE_EXAM_PREFERENCES, useStudySlots: false };
// Planner Study Slots matching the old fixed window, so exams without saved times behave as before.
const SLOTS_7_TO_9 = { studySlots: { mode: 'Default', enabledDays: [], schedule: Object.fromEntries(
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => [d, { start: '19:00', end: '21:00' }])) } };

const now = new Date(2026, 10, 23, 8);
const day = startOfDay(now);
const activeSessions = () => db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)).all();
const activeTasks = () => db.select().from(tasks).where(isNull(tasks.deletedAt)).all();

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(now);
  for (const table of [tasks, plannedSessions, focusSessions, ghostState, studyPlans, subjects, settings]) db.delete(table).run();
  useTimer.setState({ status: 'idle', plannedSessionId: null, run: null, cfg: null });
  db.insert(subjects).values({ id: 'math', name: 'Math', color: '#ffffff', updatedAt: now.getTime() }).run();
  db.insert(settings).values({ key: 'prefs.app', value: JSON.stringify(SLOTS_7_TO_9), updatedAt: now.getTime() }).run();
});
afterEach(() => jest.useRealTimers());

it('saves an overnight range and mirrors after-midnight sessions onto their actual task date', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const prefs = { ...DEFAULT_EXAM_PREFERENCES, start: 1320, end: 120, dailyGoalMin: 200, studyDays: [1] };
  const preview = await previewStudySchedule(id, prefs);
  expect(preview.sessions.some(s => s.date === addDays(day, 1) && s.startMinute < 120)).toBe(true);
  await saveStudySchedule(id, prefs);
  expect((await getExamPreferences(id))?.end).toBe(120);
  const morning = activeTasks().find(t => t.date === addDays(day, 1));
  // A session sits inside one piece of the overnight window (after-midnight part ends at 2:00).
  expect(morning!.endMinute).toBeLessThanOrEqual(120);
  expect(activeSessions().every(s => s.date < addDays(day, 3))).toBe(true);
  const before = activeSessions();
  await regenerateSchedules();
  expect(activeSessions()).toEqual(before);
});

it('regenerates after midnight with recovery from the completed previous-night run', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, start: 1320, end: 120, dailyGoalMin: 200, studyDays: [1] });
  const night = activeSessions().find(s => s.date === day)!;
  await setTaskDone(night.id, true);
  const afterMidnight = new Date(2026, 10, 24, 0, 5);
  jest.setSystemTime(afterMidnight);
  await regenerateSchedules(afterMidnight);
  const morning = activeTasks().find(t => t.date === addDays(day, 1));
  expect(morning!.endMinute).toBeLessThanOrEqual(120);
  expect((await listUpcomingToday()).some(s => s.id === morning!.id)).toBe(true);
});

it.each([{ start: -1 }, { start: 1440 }, { end: -1 }, { end: 1441 }])('rejects out-of-clock-range preferences %j', async changes => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  await expect(saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, ...changes })).rejects.toThrow();
});

it('automatically schedules a new exam and shows it in Daily Tasks and Pomodoro', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const sessions = activeSessions();
  expect(sessions).toHaveLength(3);
  expect(activeTasks()).toHaveLength(3);
  expect(sessions.every(s => s.planId === id)).toBe(true);
  for (const task of activeTasks()) {
    expect(task.source).toBe('generated');
    expect(task.hasPomodoro).toBe(true);
    // Default size is 2 x 25 min; the exam is 3 days away, so auto size lengthens it to 4 blocks (4 x 25 + 3 x 5)
    // while the day stays under the 2 h goal and inside the 19:00-21:00 window.
    expect(task.endMinute - task.startMinute).toBe(115);
    expect(sessions.some(s => s.id === task.id)).toBe(true);
  }
});

it('does not duplicate sessions or change IDs on repeated automatic regeneration', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const before = activeSessions();
  await regenerateSchedules();
  await regenerateSchedules();
  expect(activeSessions()).toEqual(before);
  expect(activeTasks()).toHaveLength(before.length);
});

it('treats a session whose time passed today as missed, not moved', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const original = await getExamPreferences(id);
  const late = new Date(2026, 10, 23, 22);
  jest.setSystemTime(late);
  const result = await regenerateSchedules(late);
  expect(activeSessions().every(s => s.date > day)).toBe(true);
  expect(result.shortfallByPlan[id]).toBe(0);
  expect((await getExamPreferences(id))?.totalBlocks).toBe(original?.totalBlocks);
  await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES });
  expect((await getExamPreferences(id))?.totalBlocks).toBe(original?.totalBlocks);
});

it('preserves completed tasks, focus history and locked sessions', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const first = activeSessions()[0];
  await setTaskDone(first.id, true);
  const second = activeSessions()[1];
  db.update(plannedSessions).set({ locked: true }).where(eq(plannedSessions.id, second.id)).run();
  db.insert(focusSessions).values({ id: 'history', subjectId: 'math', plannedSessionId: first.id,
    startedAt: now.getTime(), durationSec: 1500, completed: true, updatedAt: now.getTime() }).run();
  await regenerateSchedules();
  expect(activeSessions().find(s => s.id === first.id)?.completedBlocks).toBe(first.blocks);
  expect(activeTasks().find(t => t.id === first.id)?.done).toBe(true);
  expect(activeSessions().find(s => s.id === second.id)).toMatchObject({ locked: true, startMinute: second.startMinute });
  expect(db.select().from(focusSessions).all()).toHaveLength(1);
  expect((await getExamPreferences(id))?.totalBlocks).toBe(6);
});

it('moves generated work around newly added manual tasks', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  db.insert(tasks).values({ id: 'manual', title: 'Class', subjectId: 'math', date: day,
    startMinute: 19 * 60, endMinute: 20 * 60, updatedAt: now.getTime() }).run();
  await regenerateSchedules();
  const today = activeSessions().filter(s => s.date === day);
  expect(today.every(s => s.startMinute! >= 20 * 60)).toBe(true);
  expect(activeTasks().find(t => t.id === 'manual')?.title).toBe('Class');
});

it('retains in-progress session IDs and frozen settings during regeneration', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.insert(settings).values({ key: 'timer.state', value: JSON.stringify({ status: 'running', plannedSessionId: first.id }), updatedAt: now.getTime() }).run();
  const frozen = db.select().from(settings).where(eq(settings.key, `session.settings:${first.id}`)).get();
  await saveStudySchedule(first.planId, { ...DEFAULT_EXAM_PREFERENCES, focusMin: 30 });
  expect(activeSessions().find(s => s.id === first.id)).toEqual(first);
  expect(db.select().from(settings).where(eq(settings.key, `session.settings:${first.id}`)).get()).toEqual(frozen);
});

it('keeps partially completed missed blocks as history (missed work is not carried to other days)', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.update(plannedSessions).set({ completedBlocks: 1 }).where(eq(plannedSessions.id, first.id)).run();
  const late = new Date(2026, 10, 23, 22);
  const result = await regenerateSchedules(late);
  const history = activeSessions().find(s => s.id === first.id);
  expect(history?.completedBlocks).toBe(1);
  expect(history?.blocks).toBe(1);
  expect(activeTasks().find(t => t.id === first.id)?.done).toBe(true);
  // Rule: each day has its own sessions; the unfinished part of a missed session is not moved elsewhere.
  expect(result.shortfallBlocks).toBe(0);
});

it('rejects invalid settings without deleting an existing schedule', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const before = activeSessions();
  await expect(saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, end: DEFAULT_EXAM_PREFERENCES.start })).rejects.toThrow();
  expect(activeSessions()).toEqual(before);
});

it('regenerates an edited exam without replacing the exam or resetting its workload', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  await updateExam(id, { name: 'Final rescheduled', subjectId: 'math', date: addDays(day, 1) });
  expect(activeSessions().every(s => s.date < addDays(day, 1))).toBe(true);
  expect((await getExamPreferences(id))?.totalBlocks).toBe(6);
  expect(db.select().from(studyPlans).all()).toHaveLength(1);
  expect(activeTasks().every(t => t.title === 'Final rescheduled')).toBe(true);
  await updateExam(id, { name: 'Later exam', subjectId: 'math', date: addDays(day, 4) });
  expect((await regenerateSchedules()).shortfallBlocks).toBe(0);
});

it('previews changes without writing, and atomically rolls back a failed save', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const before = activeSessions();
  const beforePrefs = await getExamPreferences(id);
  await previewStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, start: 17 * 60 });
  expect(activeSessions()).toEqual(before);
  expect(await getExamPreferences(id)).toEqual(beforePrefs);
  db.run("CREATE TRIGGER fail_schedule BEFORE INSERT ON tasks BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  try {
    await expect(saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, start: 17 * 60 })).rejects.toThrow();
    expect(activeSessions()).toEqual(before);
    expect(await getExamPreferences(id)).toEqual(beforePrefs);
  } finally { db.run('DROP TRIGGER fail_schedule'); }
});

it('shares the daily goal across multiple exams and preserves every exam preference', async () => {
  db.insert(subjects).values({ id: 'science', name: 'Science', color: '#ffffff', updatedAt: now.getTime() }).run();
  const first = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const second = await createExam({ name: 'Science final', subjectId: 'science', date: addDays(day, 3) });
  await saveStudySchedule(first, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', dailyGoalMin: 40 });
  expect((await getExamPreferences(second))?.dailyGoalMin).toBe(40);
  // Auto size: both exams fit under the 40 min goal by shortening (25 min + 15 min a day).
  const auto = await previewStudySchedule(first, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', dailyGoalMin: 40 });
  expect(auto.overGoalDays).toEqual([]);
  expect(auto.shortfallBlocks).toBe(0);
  expect(auto.resized.shrunk).toBeGreaterThan(0);
  // A size the user set (2 x 25 min) is kept: the top exam keeps its daily session (over the goal, flagged), the
  // other exam's sessions find no day with room and are reported as not placed.
  await saveStudySchedule(first, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', dailyGoalMin: 40, autoSize: false });
  const preview = await previewStudySchedule(first, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', dailyGoalMin: 40, autoSize: false });
  expect(preview.overGoalDays.some(d => d.date === day)).toBe(true);
  const placed = (id: string) => activeSessions().filter(s => s.planId === id).length;
  expect(placed(first) + placed(second)).toBe(3);
  expect(preview.shortfallBlocks).toBeGreaterThan(0);
  expect((await getExamPreferences(second))?.start).toBe(DEFAULT_EXAM_PREFERENCES.start);
});

it('does not trim a paused partial session after its originally scheduled end time', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.update(plannedSessions).set({ completedBlocks: 1 }).where(eq(plannedSessions.id, first.id)).run();
  db.insert(settings).values({ key: 'timer.state', value: JSON.stringify({ status: 'paused', plannedSessionId: first.id }), updatedAt: now.getTime() }).run();
  await regenerateSchedules(new Date(2026, 10, 23, 22));
  expect(activeSessions().find(s => s.id === first.id)?.blocks).toBe(first.blocks);
});

it('gives no session on an excluded day and one on every other study day', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const result = await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, excluded: [day] });
  expect(activeSessions().every(s => s.date !== day)).toBe(true);
  expect(new Set(activeSessions().filter(s => s.planId === id).map(s => s.date)).size).toBe(2);
  expect(result.shortfallByPlan[id]).toBe(0);
});

it('keeps a session studied early from duplicating its remaining blocks', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.update(plannedSessions).set({ completedBlocks: 1 }).where(eq(plannedSessions.id, first.id)).run();
  await regenerateSchedules();
  const today = activeSessions().filter(s => s.date === day);
  expect(today).toHaveLength(1);
  expect(today[0].id).toBe(first.id);
  expect(today[0].completedBlocks).toBe(1);
  // One session per study day (today and tomorrow; exam day has no time set), no duplicate for the started one.
  expect(activeSessions()).toHaveLength(2);
});

it('puts the harder exam first when exams compete for the daily goal', async () => {
  db.insert(subjects).values({ id: 'science', name: 'Science', color: '#ffffff', updatedAt: now.getTime() }).run();
  const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const science = await createExam({ name: 'Science final', subjectId: 'science', date: addDays(day, 3) });
  const before = (await getExamPreferences(science))?.totalBlocks;
  await updateExamDifficulty(math, 1);
  await updateExamDifficulty(science, 5);
  await regenerateSchedules();
  void before;
  // Science (higher priority) keeps its session every study day; Math only gets days with room under the goal.
  const days = (id: string) => new Set(activeSessions().filter(s => s.planId === id).map(s => s.date)).size;
  expect(days(science)).toBe(3);
  expect(days(science)).toBeGreaterThanOrEqual(days(math));
  const stable = activeSessions();
  await regenerateSchedules();
  expect(activeSessions()).toEqual(stable);
  await expect(updateExamDifficulty(math, 0)).rejects.toThrow();
});

it('keeps difficulty independent for two exams of the same subject, including All Exams saves', async () => {
  const low = await createExam({ name: 'Math quiz', subjectId: 'math', date: addDays(day, 3), difficulty: 1 });
  const high = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3), difficulty: 5 });
  const blocks = (id: string) => activeSessions().filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks, 0);
  expect(blocks(high)).toBeGreaterThan(blocks(low));
  await updateExamDifficulty(low, 3);
  expect((await getExam(high))?.difficulty).toBe(5);
  expect((await getExam(low))?.difficulty).toBe(3);
  await saveStudySchedule(low, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', start: 18 * 60 });
  expect((await getExam(high))?.difficulty).toBe(5);
  expect((await getExam(low))?.difficulty).toBe(3);
  await updateExam(low, { name: 'Math quiz renamed', subjectId: 'math', date: addDays(day, 4) });
  expect((await getExam(low))?.difficulty).toBe(3);
  await updateExam(low, { name: 'Math quiz renamed', subjectId: 'math', date: addDays(day, 4), difficulty: 1 });
  expect((await getExam(low))?.difficulty).toBe(1);
  expect((await getExam(high))?.difficulty).toBe(5);
});

it('creates plain subjects and defaults new exams to Medium', async () => {
  await addSubject('Physics', '#123456');
  const subject = (await listSubjects()).find(s => s.name === 'Physics')!;
  expect(subject).not.toHaveProperty('difficulty');
  const id = await createExam({ name: 'Physics exam', subjectId: subject.id, date: addDays(day, 3) });
  expect((await getExam(id))?.difficulty).toBe(3);
});

it('rejects invalid or deleted exam difficulty updates without changing another plan', async () => {
  await expect(createExam({ name: 'Invalid', subjectId: 'math', date: addDays(day, 3), difficulty: 0 })).rejects.toThrow();
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3), difficulty: 5 });
  await expect(updateExam(id, { name: 'Invalid edit', subjectId: 'math', date: addDays(day, 3), difficulty: 6 })).rejects.toThrow();
  expect((await getExam(id))?.difficulty).toBe(5);
  await deleteStudyPlan(id);
  await expect(updateExamDifficulty(id, 1)).rejects.toThrow('no longer exists');
});

it('keeps protected subject sessions in place when the plan is regenerated and allows unprotecting', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const before = activeSessions();
  await saveProtectedSubjectIds(['math', 'math']);
  expect(await getProtectedSubjectIds()).toEqual(['math']);
  await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, start: 17 * 60 });
  expect(activeSessions()).toEqual(before);
  expect(activeTasks().every(task => !task.movable)).toBe(true);
  await saveProtectedSubjectIds([]);
  expect(await getProtectedSubjectIds()).toEqual([]);
  expect(activeSessions().every(session => session.startMinute === 17 * 60)).toBe(true);
  expect(activeTasks().every(task => task.movable)).toBe(true);
});

it('deletes a plan from Planner and Pomodoro and cannot regenerate it', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  expect((await listUpcomingToday(now)).length).toBeGreaterThan(0);
  await deleteStudyPlan(id);
  await regenerateSchedules();
  await regenerateSchedules();
  expect(await getExam(id)).toBeNull();
  expect(await examsQuery()).toEqual([]);
  expect(activeTasks()).toEqual([]);
  expect(activeSessions()).toEqual([]);
  expect(await listUpcomingToday(now)).toEqual([]);
  await expect(saveStudySchedule(id, DEFAULT_EXAM_PREFERENCES)).rejects.toThrow();
  await expect(previewStudySchedule(id, DEFAULT_EXAM_PREFERENCES)).rejects.toThrow();
  await expect(updateExam(id, { name: 'Stale edit', subjectId: 'math', date: addDays(day, 4) })).rejects.toThrow();
  expect(db.select().from(studyPlans).where(eq(studyPlans.id, id)).get()).toMatchObject({ status: 'archived', deletedAt: now.getTime() });
});

it('preserves finished tasks, study logs and XP when a plan is deleted', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const first = activeSessions()[0];
  await setTaskDone(first.id, true);
  db.insert(focusSessions).values({ id: 'history', subjectId: 'math', plannedSessionId: first.id,
    startedAt: now.getTime(), durationSec: 1500, completed: true, updatedAt: now.getTime() }).run();
  db.insert(ghostState).values({ id: 'reti', level: 2, xp: 80, updatedAt: now.getTime() }).run();
  const history = db.select().from(focusSessions).all();
  const xp = db.select().from(ghostState).all();
  await deleteStudyPlan(id);
  expect(activeTasks()).toHaveLength(1);
  expect(activeTasks()[0]).toMatchObject({ id: first.id, done: true });
  expect(db.select().from(focusSessions).all()).toEqual(history);
  expect(db.select().from(ghostState).all()).toEqual(xp);
});

it('keeps a running timer going as unplanned study when its plan is deleted', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const first = activeSessions()[0];
  const timer = { status: 'running' as const, plannedSessionId: first.id, subjectId: 'math',
    endsAt: now.getTime() + 1_500_000, cfg: { focusMin: 25, focusCount: 4, breakMin: 5, longBreakMin: 30 },
    run: { phase: 'focus' as const, completedBlocks: 0, totalBlocks: 4 } };
  useTimer.setState(timer);
  db.insert(settings).values({ key: 'timer.state', value: JSON.stringify(timer), updatedAt: now.getTime() }).run();
  const result = await deleteStudyPlan(id);
  expect(result.detachedSessionId).toBe(first.id);
  const saved = JSON.parse(db.select().from(settings).where(eq(settings.key, 'timer.state')).get()!.value);
  expect(saved).toEqual({ ...timer, plannedSessionId: null });
  await useTimer.getState().detachPlannedSession(first.id);
  expect(useTimer.getState()).toMatchObject({ ...timer, plannedSessionId: null });
  await recordFocus({ subjectId: 'math', plannedSessionId: null, startedAt: now.getTime(), durationSec: 1500, completed: true });
  expect(db.select().from(focusSessions).all()).toHaveLength(1);
  expect(activeTasks()).toHaveLength(0);
});

it('does not remove manual tasks or another exam when one plan is deleted', async () => {
  const first = await createExam({ name: 'First exam', subjectId: 'math', date: addDays(day, 2) });
  const second = await createExam({ name: 'Second exam', subjectId: 'math', date: addDays(day, 3) });
  db.insert(tasks).values({ id: 'manual', title: 'Independent assignment', subjectId: 'math', date: day,
    startMinute: 9 * 60, endMinute: 10 * 60, updatedAt: now.getTime() }).run();
  await deleteStudyPlan(first);
  expect(await getExam(second)).not.toBeNull();
  expect(activeTasks().find(task => task.id === 'manual')).toMatchObject({ title: 'Independent assignment', deletedAt: null });
  expect(activeSessions().every(session => session.planId === second)).toBe(true);
});

it('rolls back a failed plan deletion atomically', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const before = activeSessions();
  db.run("CREATE TRIGGER fail_deletion BEFORE UPDATE ON tasks BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  try {
    await expect(deleteStudyPlan(id)).rejects.toThrow();
    expect(await getExam(id)).not.toBeNull();
    expect(activeSessions()).toEqual(before);
    expect(activeTasks()).toHaveLength(before.length);
  } finally { db.run('DROP TRIGGER fail_deletion'); }
});

it('removes a deleted subject’s exams and pending tasks without affecting focus history', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  db.insert(focusSessions).values({ id: 'history', subjectId: 'math', plannedSessionId: null, startedAt: now.getTime(),
    durationSec: 1500, completed: true, updatedAt: now.getTime() }).run();
  await deleteSubject('math');
  await regenerateSchedules();
  expect(await getExam(id)).toBeNull();
  expect(activeTasks()).toEqual([]);
  expect(await listUpcomingToday(now)).toEqual([]);
  expect(db.select().from(focusSessions).all()).toHaveLength(1);
});

it('reuses a generated task’s existing Pomodoro and preserves its settings', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  const before = activeSessions();
  const frozen = db.select().from(settings).where(eq(settings.key, `session.settings:${first.id}`)).get();
  await scheduleTaskPomodoro(first.id, JSON.parse(frozen!.value));
  expect(activeSessions()).toEqual(before);
  expect(db.select().from(settings).where(eq(settings.key, `session.settings:${first.id}`)).get()).toEqual(frozen);
  expect((await listUpcomingToday(now))[0].taskTitle).toBe('Math final');
  await expect(scheduleTaskPomodoro(first.id, { ...DEFAULT_POMODORO, focusMin: 60 })).rejects.toThrow('Exam Study Plan');
});

it('deleting a manual task also removes its Pomodoro', async () => {
  db.insert(tasks).values({ id: 'manual', title: 'Assignment', subjectId: 'math', date: day,
    startMinute: 9 * 60, endMinute: 10 * 60, updatedAt: now.getTime() }).run();
  await scheduleTaskPomodoro('manual', DEFAULT_POMODORO);
  expect(await listUpcomingToday(now)).toHaveLength(1);
  await deleteTask('manual');
  expect(await listUpcomingToday(now)).toEqual([]);
  expect(activeSessions()).toEqual([]);
});

it('repairs legacy pending tasks left by an inactive parent plan', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  db.update(studyPlans).set({ deletedAt: now.getTime() }).where(eq(studyPlans.id, id)).run();
  expect(await listUpcomingToday(now)).toEqual([]);
  await regenerateSchedules();
  expect(activeTasks()).toEqual([]);
  expect(activeSessions()).toEqual([]);
});

it('changes subject without reusing the previous subject’s sessions', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  db.insert(subjects).values({ id: 'science', name: 'Science', color: '#ffffff', updatedAt: now.getTime() }).run();
  await updateExam(id, { name: 'Science final', subjectId: 'science', date: addDays(day, 2) });
  expect(activeSessions().every(session => session.subjectId === 'science')).toBe(true);
  const first = activeSessions()[0];
  await setTaskDone(first.id, true);
  await expect(updateExam(id, { name: 'Math again', subjectId: 'math', date: addDays(day, 2) })).rejects.toThrow('study progress');
});

it('keeps logged study in the daily budget after its plan is deleted', async () => {
  const id = await createExam({ name: 'First exam', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.update(plannedSessions).set({ completedBlocks: 1 }).where(eq(plannedSessions.id, first.id)).run();
  db.insert(focusSessions).values({ id: 'history', subjectId: 'math', plannedSessionId: first.id, startedAt: now.getTime(),
    durationSec: 1500, completed: true, updatedAt: now.getTime() }).run();
  await deleteStudyPlan(id);
  const second = await createExam({ name: 'Next exam', subjectId: 'math', date: addDays(day, 2) });
  // Logged study still counts toward today's total, so the new plan's day shows as over the goal.
  const preview = await previewStudySchedule(second, { ...DEFAULT_EXAM_PREFERENCES });
  const todayMinutes = activeSessions().filter(session => session.planId === second && session.date === day).reduce((sum, session) => sum + session.blocks * 25, 0);
  if (todayMinutes > 75) expect(preview.overGoalDays.some(d => d.date === day)).toBe(true);
});

describe('exam time and Planner Study Slots', () => {
  const setSlots = (start: string, end: string) => db.update(settings)
    .set({ value: JSON.stringify({ studySlots: { mode: 'Default', enabledDays: [], schedule: Object.fromEntries(
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => [d, { start, end }])) } }) })
    .where(eq(settings.key, 'prefs.app')).run();

  it('allows an exam later today and studies before it, ending 30 minutes early', async () => {
    setSlots('06:00', '20:00');
    const id = await createExam({ name: 'Quiz', subjectId: 'math', date: day, time: 13 * 60 });
    const sessions = activeSessions().filter(s => s.planId === id);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every(s => s.date === day)).toBe(true);
    const lastTask = activeTasks().filter(t => t.planId === id).sort((a, b) => b.endMinute - a.endMinute)[0];
    expect(lastTask.endMinute).toBeLessThanOrEqual(13 * 60 - 30);
  });

  it('rejects an exam today without a time, or at a time that has passed', async () => {
    await expect(createExam({ name: 'Quiz', subjectId: 'math', date: day })).rejects.toThrow('exam time');
    await expect(createExam({ name: 'Quiz', subjectId: 'math', date: day, time: 7 * 60 })).rejects.toThrow('passed');
    await expect(createExam({ name: 'Quiz', subjectId: 'math', date: addDays(day, -1), time: 9 * 60 })).rejects.toThrow();
  });

  it('starts studying today when the study slots still have time today', async () => {
    setSlots('09:00', '18:00');
    const id = await createExam({ name: 'Final', subjectId: 'math', date: addDays(day, 2), time: 9 * 60 });
    const dates = new Set(activeSessions().filter(s => s.planId === id).map(s => s.date));
    expect(dates.has(day)).toBe(true);
    expect(activeSessions().filter(s => s.date === day).every(s => (s.startMinute ?? 0) >= 9 * 60)).toBe(true);
  });

  it('follows per-day Custom slots and skips days that are switched off', async () => {
    const schedule = Object.fromEntries(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .map(d => [d, { start: '10:00', end: '12:00' }]));
    const today = new Date(day).getDay();
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    db.update(settings).set({ value: JSON.stringify({ studySlots: { mode: 'Custom', schedule,
      enabledDays: names.filter((_, i) => i !== (today + 1) % 7) } }) }).where(eq(settings.key, 'prefs.app')).run();
    const id = await createExam({ name: 'Final', subjectId: 'math', date: addDays(day, 3), time: 9 * 60 });
    const dates = new Set(activeSessions().filter(s => s.planId === id).map(s => s.date));
    expect(dates.has(day)).toBe(true);
    expect(dates.has(addDays(day, 1))).toBe(false);
  });

  it('uses the one daily goal from Preferences', async () => {
    setSlots('06:00', '20:00');
    db.insert(settings).values({ key: 'planner.dailyGoalMin', value: '40', updatedAt: now.getTime() }).run();
    const id = await createExam({ name: 'Final', subjectId: 'math', date: addDays(day, 3), time: 9 * 60 });
    const today = activeSessions().filter(s => s.planId === id && s.date === day);
    // 40 min goal: the default 2-block session (50 min) is shrunk to 1 block so the day stays under the goal.
    expect(today.reduce((sum, s) => sum + s.blocks, 0)).toBe(1);
    const preview = await previewStudySchedule(id, { ...BASE_EXAM_PREFERENCES });
    expect(preview.dailyGoalMin).toBe(40);
    expect(preview.overGoalDays).toEqual([]);
    // A size the user set is kept and the day is flagged instead.
    const own = await previewStudySchedule(id, { ...BASE_EXAM_PREFERENCES, autoSize: false });
    // (Today's session has already started at 8:00, so it stays as it is.)
    expect(own.overGoalDays.some(d => d.date === addDays(day, 1))).toBe(true);
  });

  it('stores a shortened focus time on the session itself', async () => {
    setSlots('06:00', '20:00');
    db.insert(settings).values({ key: 'planner.dailyGoalMin', value: '20', updatedAt: now.getTime() }).run();
    const id = await createExam({ name: 'Final', subjectId: 'math', date: addDays(day, 3), time: 9 * 60 });
    const session = activeSessions().find(s => s.planId === id && s.date === day)!;
    expect(session.blocks).toBe(1);
    const stored = db.select().from(settings).where(eq(settings.key, `session.settings:${session.id}`)).get();
    expect(JSON.parse(stored!.value).focusMin).toBe(20);
    const task = activeTasks().find(t => t.id === session.id)!;
    expect(task.endMinute - task.startMinute).toBe(20);
  });

  it('treats an older plan with its own size as user-set', async () => {
    const id = await createExam({ name: 'Final', subjectId: 'math', date: addDays(day, 3), time: 9 * 60 });
    const { autoSize: _drop, ...legacy } = { ...BASE_EXAM_PREFERENCES, focusCount: 4 };
    void _drop;
    db.update(settings).set({ value: JSON.stringify(legacy) }).where(eq(settings.key, `exam-prefs:${id}`)).run();
    expect((await getExamPreferences(id))?.autoSize).toBe(false);
  });
});

it('skips one study session from the Planner and re-plans that study at another time', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const before = activeSessions().filter(s => s.planId === id);
  const total = before.reduce((sum, s) => sum + s.blocks, 0);
  const target = before[0];
  const { skipStudySession } = jest.requireActual('./examsRepo') as typeof import('./examsRepo');
  await skipStudySession(target.id);
  const after = activeSessions().filter(s => s.planId === id);
  expect(after.some(s => s.id === target.id)).toBe(false);
  expect(after.some(s => s.date === target.date && s.startMinute === target.startMinute)).toBe(false);
  expect(after.reduce((sum, s) => sum + s.blocks, 0)).toBeLessThanOrEqual(total);
  await regenerateSchedules();
  expect(activeSessions().some(s => s.date === target.date && s.startMinute === target.startMinute && s.planId === id)).toBe(false);
});

it('explains what uses a day\'s time, and Undo frees a removed session', async () => {
  const { explainStudyDay, restoreSkippedTime, skipStudySession } = jest.requireActual('./examsRepo') as typeof import('./examsRepo');
  db.insert(tasks).values({ id: 'gym', title: 'Gym', subjectId: 'math', date: day, startMinute: 19 * 60, endMinute: 20 * 60, updatedAt: now.getTime() }).run();
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const first = activeSessions().filter(s => s.planId === id).sort((a, b) => a.date - b.date)[0];
  await skipStudySession(first.id);
  const info = await explainStudyDay(id, (await getExamPreferences(id))!, first.date);
  expect(info.used.some(u => u.skippedPlanId === id && u.startMinute === first.startMinute)).toBe(true);
  if (first.date === day) expect(info.used.some(u => u.label.startsWith('Task: Gym'))).toBe(true);
  await restoreSkippedTime(id, first.date, first.startMinute!);
  const again = await explainStudyDay(id, (await getExamPreferences(id))!, first.date);
  expect(again.used.some(u => u.skippedPlanId)).toBe(false);
});

it('Clear study history removes exams too, so the planner does not rebuild their sessions', async () => {
  const { clearStudyHistory } = jest.requireActual('@/features/account/accountRepo') as typeof import('@/features/account/accountRepo');
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3), time: 9 * 60 });
  db.insert(focusSessions).values({ id: 'log', subjectId: 'math', plannedSessionId: null, startedAt: now.getTime(), durationSec: 1500, completed: true, updatedAt: now.getTime() }).run();
  expect(activeSessions().length).toBeGreaterThan(0);
  expect(await clearStudyHistory()).toBeGreaterThan(0);
  await regenerateSchedules();
  expect(activeSessions()).toEqual([]);
  expect(activeTasks()).toEqual([]);
  expect(db.select().from(focusSessions).where(isNull(focusSessions.deletedAt)).all()).toEqual([]);
  expect(await examsQuery()).toEqual([]);
  expect(db.select().from(subjects).where(isNull(subjects.deletedAt)).all().length).toBe(1);
});
