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
import { SUBSCRIPTION_SETTING_KEY, PremiumRequiredError, type PlanTier } from '@/features/subscription/entitlements';
import { GenerationLimitError, GenerationUnavailableError } from '@/features/subscription/generationQuota';
import { DEFAULT_EXAM_PREFERENCES, createExam, deleteStudyPlan, examsQuery, getExam, getExamAccess, getExamPreferences, getPlanInsights, getProtectedSubjectIds, setExamPriority, previewStudySchedule, regenerateSchedules, saveProtectedSubjectIds, saveStudySchedule, updateExam, updateExamDifficulty } from './examsRepo';

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
// The server counts Free generations; the tests stand in for it with a simple monthly counter.
const mockReserve = jest.fn();
jest.mock('@/features/subscription/generationQuotaRepo', () => ({
  reserveGeneration: () => mockReserve(), getGenerationQuota: jest.fn(),
}));
jest.mock('@/features/timer/notifications', () => ({ cancelTimerNotifications: jest.fn(), scheduleTimerNotifications: jest.fn() }));

const now = new Date(2026, 10, 23, 8);
const day = startOfDay(now);
const activeSessions = () => db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)).all();
const activeTasks = () => db.select().from(tasks).where(isNull(tasks.deletedAt)).all();
const setTier = (plan: PlanTier, expiresAt: number | null = null) => {
  const value = JSON.stringify({ plan, expiresAt });
  db.insert(settings).values({ key: SUBSCRIPTION_SETTING_KEY, value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: settings.key, set: { value } }).run();
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(now);
  for (const table of [tasks, plannedSessions, focusSessions, ghostState, studyPlans, subjects, settings]) db.delete(table).run();
  useTimer.setState({ status: 'idle', plannedSessionId: null, run: null, cfg: null });
  db.insert(subjects).values({ id: 'math', name: 'Math', color: '#ffffff', updatedAt: now.getTime() }).run();
  setTier('premium'); // The original tests describe adaptive (Premium) scheduling. Free is covered below.
  mockReserve.mockReset();
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
  expect(morning).toMatchObject({ startMinute: 25, endMinute: 110 });
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
  expect(morning).toMatchObject({ startMinute: 25, endMinute: 110 });
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

it('reschedules missed work without resetting the original workload', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const original = await getExamPreferences(id);
  const late = new Date(2026, 10, 23, 22);
  jest.setSystemTime(late);
  const result = await regenerateSchedules(late);
  expect(activeSessions().every(s => s.date > day)).toBe(true);
  expect(result.shortfallByPlan[id]).toBe(4);
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
  expect((await getExamPreferences(id))?.totalBlocks).toBe(12);
});

it('moves generated work around newly added manual tasks', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  db.insert(tasks).values({ id: 'manual', title: 'Class', subjectId: 'math', date: day,
    startMinute: 19 * 60, endMinute: 20 * 60, updatedAt: now.getTime() }).run();
  await regenerateSchedules();
  const today = activeSessions().filter(s => s.date === day);
  expect(today.every(s => s.startMinute! >= 20 * 60 + 30)).toBe(true);
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

it('keeps partially completed missed blocks as history and carries only unfinished blocks', async () => {
  await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 2) });
  const first = activeSessions()[0];
  db.update(plannedSessions).set({ completedBlocks: 1 }).where(eq(plannedSessions.id, first.id)).run();
  const late = new Date(2026, 10, 23, 22);
  const result = await regenerateSchedules(late);
  const history = activeSessions().find(s => s.id === first.id);
  expect(history?.completedBlocks).toBe(1);
  expect(history?.blocks).toBe(1);
  expect(activeTasks().find(t => t.id === first.id)?.done).toBe(true);
  expect(result.shortfallBlocks).toBe(3);
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
  expect((await getExamPreferences(id))?.totalBlocks).toBe(12);
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
  await saveStudySchedule(first, { ...DEFAULT_EXAM_PREFERENCES, scope: 'all', dailyGoalMin: 75 });
  expect((await getExamPreferences(second))?.dailyGoalMin).toBe(75);
  expect(activeSessions().filter(s => s.date === day).reduce((sum, s) => sum + s.blocks * 25, 0)).toBeLessThanOrEqual(75);
  expect(activeSessions().some(s => s.planId === second)).toBe(true);
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

it('keeps excluded-day work outstanding rather than silently dropping it', async () => {
  const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const result = await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES, excluded: [day] });
  expect(activeSessions().every(s => s.date !== day)).toBe(true);
  expect((await getExamPreferences(id))?.totalBlocks).toBe(12);
  expect(result.shortfallByPlan[id]).toBe(4);
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
  expect(activeSessions().reduce((sum, s) => sum + s.blocks, 0)).toBe(8);
});

it('rebalances unfinished exams when exam difficulty changes, without changing the target', async () => {
  db.insert(subjects).values({ id: 'science', name: 'Science', color: '#ffffff', updatedAt: now.getTime() }).run();
  const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
  const science = await createExam({ name: 'Science final', subjectId: 'science', date: addDays(day, 3) });
  const before = (await getExamPreferences(science))?.totalBlocks;
  await updateExamDifficulty(math, 1);
  await updateExamDifficulty(science, 5);
  await regenerateSchedules();
  const blocks = (id: string) => activeSessions().filter(s => s.planId === id).reduce((sum, s) => sum + s.blocks, 0);
  expect(blocks(science)).toBeGreaterThan(blocks(math));
  expect(blocks(math)).toBeGreaterThan(0);
  expect((await getExamPreferences(science))?.totalBlocks).toBe(before);
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
  expect(activeSessions().filter(session => session.planId === second && session.date === day).reduce((sum, session) => sum + session.blocks * 25, 0)).toBeLessThanOrEqual(75);
});

// ---------------------------------------------------------------------------
// Free vs Premium: one engine, capabilities switched on by subscription tier
// ---------------------------------------------------------------------------
describe('Free vs Premium', () => {
  const addScience = () => db.insert(subjects).values({ id: 'sci', name: 'Science', color: '#eeeeee', updatedAt: now.getTime() }).run();
  const blocksFor = (planId: string) => activeSessions().filter(s => s.planId === planId).reduce((sum, s) => sum + s.blocks, 0);

  it('treats a missing, unreadable or expired subscription as Free', async () => {
    db.delete(settings).run();
    expect((await getExamAccess('none')).entitlements.tier).toBe('free');
    db.insert(settings).values({ key: SUBSCRIPTION_SETTING_KEY, value: '{not json', updatedAt: 1 }).run();
    expect((await getExamAccess('none')).entitlements.tier).toBe('free');
    setTier('premium', now.getTime() - 1);
    expect((await getExamAccess('none')).entitlements.tier).toBe('free');
    setTier('premium', now.getTime() + 86_400_000);
    expect((await getExamAccess('none')).entitlements.tier).toBe('premium');
  });

  /** Stands in for the server: `limit` generations succeed, then GenerationLimitError. */
  const allowGenerations = (limit: number) => {
    let used = 0;
    mockReserve.mockImplementation(async () => {
      if (used >= limit) throw new GenerationLimitError(limit, Date.UTC(2026, 11, 1));
      used++;
    });
  };

  it('lets Free students add unlimited exams but never schedules them automatically', async () => {
    setTier('free'); addScience(); allowGenerations(3);
    const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    const sci = await createExam({ name: 'Science final', subjectId: 'sci', date: addDays(day, 6) });
    expect((await examsQuery()).map(e => e.id).sort()).toEqual([math, sci].sort()); // both stay listed
    await regenerateSchedules();
    expect(activeSessions()).toHaveLength(0);
    expect(activeTasks()).toHaveLength(0);
    expect(mockReserve).not.toHaveBeenCalled(); // automatic refreshes never use a generation
    const preview = await previewStudySchedule(sci, { ...DEFAULT_EXAM_PREFERENCES }); // previewing is free
    expect(preview.sessions.length).toBeGreaterThan(0);
    expect(mockReserve).not.toHaveBeenCalled();
    expect(activeSessions()).toHaveLength(0);
  });

  it('lets Free students keep their own manual sessions while nothing is generated', async () => {
    setTier('free');
    const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    db.insert(tasks).values({ id: 'mine', title: 'Read chapter 4', subjectId: 'math', date: day, startMinute: 600, endMinute: 660,
      source: 'manual', movable: true, hasPomodoro: false, done: false, updatedAt: now.getTime() }).run();
    await regenerateSchedules();
    expect(activeTasks().map(t => t.id)).toEqual(['mine']);
    expect(await getExam(id)).toBeTruthy();
  });

  it('generates for every exam on request and stops after three Free generations in a month', async () => {
    setTier('free'); addScience(); allowGenerations(3);
    const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    const sci = await createExam({ name: 'Science final', subjectId: 'sci', date: addDays(day, 6) });
    await saveStudySchedule(math, { ...DEFAULT_EXAM_PREFERENCES });
    expect(mockReserve).toHaveBeenCalledTimes(1);
    expect(blocksFor(math)).toBeGreaterThan(0);
    expect(blocksFor(sci)).toBeGreaterThan(0); // one generation schedules all exams together
    await saveStudySchedule(math, { ...DEFAULT_EXAM_PREFERENCES }); // Regenerate counts too
    await saveStudySchedule(sci, { ...DEFAULT_EXAM_PREFERENCES });
    const before = activeSessions();
    const error = await saveStudySchedule(math, { ...DEFAULT_EXAM_PREFERENCES }).catch(e => e);
    expect(error).toBeInstanceOf(GenerationLimitError);
    expect(error).toBeInstanceOf(PremiumRequiredError); // the screen turns this into the upgrade prompt
    expect(activeSessions()).toEqual(before); // refused: nothing changed
    expect((await examsQuery()).length).toBe(2);
  });

  it('does not generate when the server cannot confirm a Free generation', async () => {
    setTier('free');
    mockReserve.mockRejectedValue(new GenerationUnavailableError());
    const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    await expect(saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES })).rejects.toBeInstanceOf(GenerationUnavailableError);
    expect(activeSessions()).toHaveLength(0);
  });

  it('never counts Premium generations, and keeps existing sessions when the plan changes', async () => {
    setTier('premium'); addScience(); allowGenerations(0);
    const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    const sci = await createExam({ name: 'Science final', subjectId: 'sci', date: addDays(day, 6) });
    expect(blocksFor(math)).toBeGreaterThan(0); // Premium schedules automatically
    expect(blocksFor(sci)).toBeGreaterThan(0);
    await saveStudySchedule(math, { ...DEFAULT_EXAM_PREFERENCES });
    expect(mockReserve).not.toHaveBeenCalled();
    const before = activeSessions();
    setTier('free'); await regenerateSchedules(); // a lapsed subscription stops automatic changes, it doesn't erase plans
    expect(activeSessions()).toEqual(before);
    expect((await examsQuery()).some(e => e.id === sci)).toBe(true);
  });

  it('marks a missed session for Free students and moves it only when they regenerate', async () => {
    setTier('free'); allowGenerations(3);
    const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES }); // their first generation
    const missed = activeSessions().find(s => s.date === day)!;
    expect(missed).toBeTruthy();
    const late = new Date(2026, 10, 23, 22);
    jest.setSystemTime(late);
    await regenerateSchedules(late); // automatic refresh must not silently move it
    expect(activeSessions().find(s => s.id === missed.id)).toMatchObject({ date: day, startMinute: missed.startMinute, completedBlocks: 0 });
    expect(activeTasks().find(t => t.id === missed.id)?.done).toBe(false);
    expect((await getPlanInsights(id, late)).missedSessions).toBe(1);
    expect((await getPlanInsights(id, late)).detailed).toBeUndefined();
    await saveStudySchedule(id, { ...DEFAULT_EXAM_PREFERENCES }); // the student spends another generation
    expect(mockReserve).toHaveBeenCalledTimes(2);
    expect(activeSessions().every(s => s.date > day)).toBe(true);
    expect((await getPlanInsights(id, late)).missedSessions).toBe(0);
  });

  it('recovers a missed session automatically for Premium students and reports detailed insights', async () => {
    const id = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 3) });
    const late = new Date(2026, 10, 23, 22);
    jest.setSystemTime(late);
    const result = await regenerateSchedules(late);
    expect(activeSessions().every(s => s.date > day)).toBe(true);
    expect(result.shortfallByPlan[id]).toBe(4); // today's blocks cannot fit again before the exam
    const insights = await getPlanInsights(id, late);
    expect(insights.detailed).toMatchObject({ enoughTime: false, shortfallBlocks: 4, daysLeft: 3 });
  });

  it('keeps priority controls Premium-only and never changes the total study time', async () => {
    addScience();
    const math = await createExam({ name: 'Math final', subjectId: 'math', date: addDays(day, 4) });
    const sci = await createExam({ name: 'Science final', subjectId: 'sci', date: addDays(day, 4) });
    const total = () => blocksFor(math) + blocksFor(sci);
    const before = { math: blocksFor(math), sci: blocksFor(sci), total: total() };
    await setExamPriority(math, 'highest');
    expect((await getExamAccess(math)).priority).toBe('highest');
    expect(blocksFor(math)).toBeGreaterThan(before.math);
    expect(blocksFor(sci)).toBeLessThan(before.sci);
    expect(total()).toBe(before.total); // redistributed, not added
    setTier('free');
    await expect(setExamPriority(math, 'normal')).rejects.toBeInstanceOf(PremiumRequiredError);
    await regenerateSchedules(); // a stale saved priority is ignored once the subscription lapses
    expect((await getExamAccess(math)).priority).toBe('normal');
  });
});
