import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, plannedSessions, settings, studyPlans, subjects, tasks } from '@/db/schema';
import { addDays, startOfDay } from '@/lib/dates';
import { and, asc, eq, gte, isNull, lt } from 'drizzle-orm';
import { DEFAULT_POMODORO } from '@/features/timer/pomodoroSettings';
import { bumpData } from '@/stores/dataVersion';
import { sessionMinutes, studyWindows, type BusyTime } from './engine';
import { generateDailySchedule, type DailyPlan } from './dailyEngine';
import { DAILY_GOAL_KEY, DEFAULT_DAILY_GOAL_MIN, normalizePreferences, PREFERENCES_KEY, weeklyStudySlots } from '@/features/settings/preferences';
import { cancelStudyPlanWork } from './studyPlanLifecycle';
import { refreshSessionReminders } from '@/features/timer/reminders';
import type { Run, TimerConfig } from '@/features/timer/session';

export const examsQuery = () => db.select().from(studyPlans)
  .where(and(isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active')))
  .orderBy(asc(studyPlans.examDate));

export async function examName(id: string, subjectName: string) {
  const row = await db.select().from(settings).where(eq(settings.key, `exam-name:${id}`)).limit(1);
  return row.length ? readJson(row[0].value, `${subjectName} Exam`) : `${subjectName} Exam`;
}

export type ExamInput = { name: string; subjectId: string; date: number; difficulty?: number;
  /** Exam start time, minutes from midnight. */
  time?: number };

/** The exam's start time (minutes from midnight), or null for exams saved before times existed. */
export async function examTime(id: string): Promise<number | null> {
  const row = await db.select().from(settings).where(eq(settings.key, `exam-time:${id}`)).limit(1);
  const value = row.length ? readJson<number | null>(row[0].value, null) : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function createExam(input: ExamInput) {
  const id = newId();
  const now = Date.now();
  validateExamInput(input, now);
  db.transaction((tx) => {
    tx.insert(studyPlans).values({ id, subjectId: input.subjectId, examDate: startOfDay(input.date), difficulty: input.difficulty ?? 3, updatedAt: now }).run();
    tx.insert(settings).values({ key: `exam-name:${id}`, value: JSON.stringify(input.name.trim()), updatedAt: now }).run();
    if (input.time !== undefined) tx.insert(settings).values({ key: `exam-time:${id}`, value: JSON.stringify(input.time), updatedAt: now }).run();
  });
  await regenerateSchedules();
  bumpData();
  return id;
}

export async function getExam(id: string) {
  const rows = await db.select().from(studyPlans).where(and(eq(studyPlans.id, id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).limit(1);
  return rows[0] ?? null;
}

export async function updateExam(id: string, rawInput: ExamInput) {
  const now = Date.now();
  if (!await getExam(id)) throw new Error('This exam no longer exists.');
  // Keep the saved exam time when only the date (or name) changes.
  const input = { ...rawInput, time: rawInput.time ?? (await examTime(id)) ?? undefined };
  db.transaction(tx => {
    const current = tx.select().from(studyPlans).where(and(eq(studyPlans.id, id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).get();
    if (!current) throw new Error('This study plan is no longer active.');
    validateExamInput(input, now);
    if (current.subjectId !== input.subjectId) {
      const sessions = tx.select().from(plannedSessions).where(eq(plannedSessions.planId, id)).all();
      const timerRow = tx.select().from(settings).where(eq(settings.key, 'timer.state')).get();
      const timer = readJson<{ status?: string; plannedSessionId?: string }>(timerRow?.value ?? '{}', {});
      if (sessions.some(session => session.completedBlocks > 0 || (timer.status !== 'idle' && timer.plannedSessionId === session.id))) {
        throw new Error('This plan already has study progress or an active timer. Create a new exam to study a different subject.');
      }
      cancelStudyPlanWork(tx, [id], now, false);
    }
    tx.update(studyPlans).set({ subjectId: input.subjectId, examDate: startOfDay(input.date), difficulty: input.difficulty ?? current.difficulty, updatedAt: now })
      .where(eq(studyPlans.id, id)).run();
    const value = JSON.stringify(input.name.trim());
    tx.insert(settings).values({ key: `exam-name:${id}`, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } }).run();
    if (input.time !== undefined) {
      const time = JSON.stringify(input.time);
      tx.insert(settings).values({ key: `exam-time:${id}`, value: time, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value: time, updatedAt: now } }).run();
    }
  });
  await regenerateSchedules();
  bumpData();
}

/** An exam can be today, as long as its start time hasn't passed yet. */
export function examDateProblem(date: number, time: number | undefined, now: number): string | null {
  if (!Number.isFinite(date) || !Number.isFinite(startOfDay(date))) return 'Choose an exam date.';
  if (time !== undefined && (!Number.isInteger(time) || time < 0 || time >= 1440)) return 'Choose a valid exam time.';
  const day = startOfDay(date);
  const today = startOfDay(now);
  if (day < today) return 'Choose a date from today onward.';
  if (day === today) {
    if (time === undefined) return 'Choose an exam time for an exam today.';
    const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    if (time <= nowMin) return 'That time has already passed today.';
  }
  return null;
}

function validateExamInput(input: ExamInput, now: number) {
  if (input.difficulty !== undefined) validateDifficulty(input.difficulty);
  if (!input.name.trim()) throw new Error('Enter an exam name.');
  const problem = examDateProblem(input.date, input.time, now);
  if (problem) throw new Error(problem);
  if (!db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), isNull(subjects.deletedAt))).get()) throw new Error('Choose an existing subject.');
}

function validateDifficulty(difficulty: number) {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) throw new Error('Choose an exam difficulty from 1 to 5.');
}

/** Only this exam's priority changes, even when other exams have the same subject. */
export async function updateExamDifficulty(id: string, difficulty: number): Promise<void> {
  validateDifficulty(difficulty);
  const changed = db.update(studyPlans).set({ difficulty, updatedAt: Date.now() })
    .where(and(eq(studyPlans.id, id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).run();
  if (!changed.changes) throw new Error('This exam no longer exists.');
  await regenerateSchedules();
  bumpData();
}

export async function deleteStudyPlan(id: string) {
  const result = db.transaction(tx => cancelStudyPlanWork(tx, [id], Date.now()));
  // Other plans stay as they are; they only change on Save / Reschedule.
  bumpData();
  void refreshSessionReminders();
  return result;
}

export async function listPlanSessions(id: string) {
  return db.select().from(plannedSessions)
    .where(and(eq(plannedSessions.planId, id), isNull(plannedSessions.deletedAt)))
    .orderBy(asc(plannedSessions.date), asc(plannedSessions.startMinute));
}

export type ExamPreferences = { scope: 'this' | 'all'; focusCount: number; focusMin: number;
  breakMin: number; longBreakMin: number; start: number; end: number; excluded: number[];
  /** True (default): study times come from Settings > Preferences > Planner Study Slots. False: this exam's own start/end. */
  useStudySlots?: boolean;
  /** Study sessions a day for this exam (default 1). Each session = `focusCount` focus blocks. */
  sessionsPerDay?: number;
  /** True (default): the user kept the default focus blocks and focus time, so Reschedule may shorten or
   *  lengthen sessions to fit the daily goal. Set to false once the user changes either one. */
  autoSize?: boolean;
  studyDays?: number[]; dailyGoalMin?: number; totalBlocks?: number; planStartDate?: number };

export const DEFAULT_EXAM_PREFERENCES: ExamPreferences = {
  scope: 'this', focusCount: 2, focusMin: 25, breakMin: 5, longBreakMin: 30,
  start: 19 * 60, end: 21 * 60, excluded: [], useStudySlots: true, sessionsPerDay: 1, autoSize: true,
};

/** Plans saved before auto-sizing existed count as auto only if they still use the default size. */
function withAutoSize(p: ExamPreferences): ExamPreferences {
  return p.autoSize !== undefined ? p : { ...p, autoSize: p.focusCount === DEFAULT_EXAM_PREFERENCES.focusCount
    && p.focusMin === DEFAULT_EXAM_PREFERENCES.focusMin };
}

export async function getExamPreferences(id: string): Promise<ExamPreferences | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, `exam-prefs:${id}`)).limit(1);
  const prefs = rows.length ? readJson<ExamPreferences | null>(rows[0].value, null) : null;
  const goal = await db.select().from(settings).where(eq(settings.key, DAILY_GOAL_KEY)).limit(1);
  // The one daily goal (Settings > Preferences) wins over any older per-exam copy.
  const dailyGoalMin = goal.length ? readJson<number>(goal[0].value, DEFAULT_DAILY_GOAL_MIN) : DEFAULT_DAILY_GOAL_MIN;
  return prefs ? withAutoSize({ ...prefs, dailyGoalMin }) : null;
}

export async function saveExamPreferences(id: string, prefs: ExamPreferences) {
  await saveStudySchedule(id, prefs);
}

function examMinuteOf(id: string, stored: Map<string, string>): number | undefined {
  const value = readJson<number | null>(stored.get(`exam-time:${id}`) ?? 'null', null);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Past exams stop scheduling. With a time, an exam today stays active until it starts. */
function examOver(plan: { id: string; examDate: number }, stored: Map<string, string>, now: Date): boolean {
  const today = startOfDay(now);
  if (plan.examDate < today) return true;
  if (plan.examDate > today) return false;
  const minute = examMinuteOf(plan.id, stored);
  return minute !== undefined && minute <= now.getHours() * 60 + now.getMinutes();
}

function readJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function validate(p: ExamPreferences) {
  if (![p.focusCount, p.focusMin, p.breakMin, p.longBreakMin, p.start, p.end].every(Number.isFinite)
    || !Number.isInteger(p.focusCount) || p.focusCount < 1 || p.focusCount > 8
    || p.focusMin < 5 || p.focusMin > 120 || p.breakMin < 1 || p.longBreakMin < 30
    || (p.sessionsPerDay !== undefined && (!Number.isInteger(p.sessionsPerDay) || p.sessionsPerDay < 1 || p.sessionsPerDay > 6))
    || p.start < 0 || p.start >= 1440 || p.end < 0 || p.end > 1440 || p.end === p.start
    || (p.dailyGoalMin !== undefined && (!Number.isFinite(p.dailyGoalMin) || p.dailyGoalMin < 0))
    || !Array.isArray(p.excluded) || !p.excluded.every(Number.isFinite)
    || (p.studyDays !== undefined && (!Array.isArray(p.studyDays) || !p.studyDays.every(d => Number.isInteger(d) && d >= 0 && d <= 6)))) {
    throw new Error('Choose valid study times, focus blocks, and a long break of at least 30 minutes.');
  }
}

// All reads and writes below are synchronous inside one Drizzle/Expo SQLite transaction.
// Async transaction callbacks commit too early with this driver's synchronous API.
function calculate(now: Date, override?: { id: string; prefs: ExamPreferences }) {
  const today = startOfDay(now);
  const activeSubjects = db.select().from(subjects).where(isNull(subjects.deletedAt)).all();
  const allPlans = db.select().from(studyPlans).all();
  const knownPlanIds = new Set(allPlans.map(plan => plan.id));
  const allSettings = db.select().from(settings).all();
  const stored = new Map(allSettings.map(s => [s.key, s.value]));
  const exams = allPlans.filter(e => e.deletedAt === null && e.status === 'active' && !examOver(e, stored, now)
    && activeSubjects.some(s => s.id === e.subjectId));
  const weekly = weeklyStudySlots(normalizePreferences(readJson(stored.get(PREFERENCES_KEY) ?? 'null', null)).studySlots);
  const protectedSubjectIds = readJson<string[]>(stored.get('planner.protectedSubjects') ?? '[]', []);
  const old = db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)).all();
  const allTasks = db.select().from(tasks).where(isNull(tasks.deletedAt)).all();
  const timer = readJson<{ status?: string; plannedSessionId?: string; run?: Run; cfg?: TimerConfig }>(stored.get('timer.state') ?? '{}', {});
  const prefs = new Map<string, ExamPreferences>();
  const nameOf = (id: string) => readJson(stored.get(`exam-name:${id}`) ?? 'null', null as string | null) ?? 'Exam';
  const plans: DailyPlan[] = [];
  const retained = new Set<string>();
  const fixed = new Set<string>();
  const managedIds = new Set(exams.map(e => e.id));
  const busy: BusyTime[] = [];
  const reservedSessions = new Set<string>();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  for (const exam of exams) {
    const saved = readJson<ExamPreferences | null>(stored.get(`exam-prefs:${exam.id}`) ?? 'null', null);
    let p = withAutoSize({ ...DEFAULT_EXAM_PREFERENCES, ...saved, ...(saved && { autoSize: saved.autoSize }), longBreakMin: Math.max(30, saved?.longBreakMin ?? 30) });
    const examMinute = examMinuteOf(exam.id, stored);
    if (override && (override.id === exam.id || (override.prefs.scope === 'all' && exam.examDate > today))) p = withAutoSize({ ...override.prefs });
    validate(p);
    const existing = old.filter(s => s.planId === exam.id && s.subjectId === exam.subjectId);
    const completed = existing.reduce((sum, s) => sum + s.completedBlocks, 0);
    const countDays = (from: number) => {
      let days = 0;
      // With an exam time, the exam day itself can hold study before the exam.
      const lastDay = examMinute === undefined ? addDays(startOfDay(exam.examDate), -1) : startOfDay(exam.examDate);
      for (let d = from; d <= lastDay; d = addDays(d, 1)) {
        if (!p.excluded.includes(d) && (!p.studyDays || p.studyDays.includes(new Date(d).getDay()))) days++;
      }
      return days;
    };
    // Keep the original workload on automatic regeneration; missed blocks are carried forward.
    // Only an explicit preferences save changes that workload.
    const editing = override && (override.id === exam.id || (override.prefs.scope === 'all' && exam.examDate > today))
      && (!saved || ['focusCount', 'focusMin', 'start', 'end', 'excluded', 'studyDays', 'dailyGoalMin'].some(key =>
        JSON.stringify(saved[key as keyof ExamPreferences]) !== JSON.stringify(p[key as keyof ExamPreferences])));
    p.planStartDate = saved?.planStartDate ?? today;
    const workloadChanged = !saved || ['focusCount', 'focusMin'].some(key =>
      JSON.stringify(saved[key as keyof ExamPreferences]) !== JSON.stringify(p[key as keyof ExamPreferences]));
    p.totalBlocks = editing && workloadChanged ? completed + countDays(today) * p.focusCount
      : saved?.totalBlocks ?? Math.max(existing.reduce((sum, s) => sum + s.blocks, 0), countDays(today) * p.focusCount);
    prefs.set(exam.id, p);
    let credited = 0;
    for (const row of existing) {
      const start = row.startMinute ?? p.start;
      const frozen = { ...DEFAULT_POMODORO, ...p, ...readJson(stored.get(`session.settings:${row.id}`) ?? '{}', {}) };
      const end = start + sessionMinutes(row.blocks, frozen);
      const running = timer.status !== 'idle' && timer.plannedSessionId === row.id;
      const keep = row.completedBlocks >= row.blocks || running || ((row.locked || protectedSubjectIds.includes(row.subjectId)) && row.date >= today)
        || (row.completedBlocks > 0 && (row.date > today || (row.date === today && end > currentMinute)))
        || (!editing && row.date === today && start <= currentMinute && end > currentMinute && !row.excluded);
      credited += keep ? row.blocks : row.completedBlocks;
      if (keep) fixed.add(row.id);
      if (keep || row.completedBlocks > 0) retained.add(row.id);
      if (keep && (row.date >= today || running) && !row.excluded) {
        reservedSessions.add(row.id);
        busy.push({ date: Math.max(row.date, today), startMinute: running && row.date < today ? currentMinute : start,
        endMinute: running ? Math.max(end, currentMinute + sessionMinutes(Math.max(1, row.blocks - row.completedBlocks), frozen)) : end,
        focusMinutes: row.blocks * frozen.focusMin,
        label: `${nameOf(exam.id)}: ${running ? 'timer running' : row.completedBlocks >= row.blocks ? 'finished session' : row.completedBlocks > 0 ? 'started session' : 'kept session'}` });
      } else if (row.date === addDays(today, -1) && row.completedBlocks > 0 && !row.excluded) {
        // A finished late-night run still needs recovery time after midnight.
        busy.push({ date: row.date, startMinute: start,
          endMinute: start + sessionMinutes(row.completedBlocks, frozen), focusMinutes: row.completedBlocks * frozen.focusMin,
          label: 'Late-night study from the day before' });
      }
    }
    const subject = activeSubjects.find(s => s.id === exam.subjectId)!;
    // Sessions already kept on a day (finished, started, locked, protected, running) count toward that day.
    const keptPerDay: Record<number, number> = {};
    for (const row of existing) if (fixed.has(row.id) && row.date >= today) keptPerDay[row.date] = (keptPerDay[row.date] ?? 0) + 1;
    plans.push({ ...p, id: exam.id, subjectId: exam.subjectId, examDate: exam.examDate, examMinute,
      weekly: p.useStudySlots === false ? undefined : weekly,
      difficulty: exam.difficulty, urgency: subject.urgency, remainingBlocks: Math.max(0, p.totalBlocks - credited),
      sessionsPerDay: p.sessionsPerDay ?? 1, blocksPerSession: p.focusCount, priority: subject.urgency + exam.difficulty, keptPerDay,
      autoSize: p.autoSize !== false });
  }
  // Study sessions the user skipped from the Planner: keep that time free so the plan moves the work elsewhere.
  for (const exam of exams) {
    for (const skip of readJson<SkippedTime[]>(stored.get(`exam-skip:${exam.id}`) ?? '[]', [])) {
      if (skip.date >= today) busy.push({ date: skip.date, startMinute: skip.startMinute, endMinute: skip.endMinute, focusMinutes: 0,
        label: `${nameOf(exam.id)}: removed session (kept free)`, skippedPlanId: exam.id });
    }
  }
  const externalTasks = allTasks.filter(t => !(t.source === 'generated' && knownPlanIds.has(t.planId ?? '')));
  for (const task of externalTasks) busy.push({ date: task.date, startMinute: task.startMinute, endMinute: task.endMinute,
    label: `Task: ${task.title}${task.done ? ' (done)' : ''}` });
  for (const row of old.filter(s => !managedIds.has(s.planId) && !s.excluded)) {
    const frozen = { ...DEFAULT_POMODORO, ...readJson(stored.get(`session.settings:${row.id}`) ?? '{}', {}) };
    const start = row.startMinute ?? DEFAULT_EXAM_PREFERENCES.start;
    if (knownPlanIds.has(row.planId)) {
      if (row.completedBlocks > 0 && row.date >= today) {
        reservedSessions.add(row.id);
        busy.push({ date: row.date, startMinute: start, endMinute: start + sessionMinutes(row.completedBlocks, frozen), focusMinutes: row.completedBlocks * frozen.focusMin,
          label: 'Study done for a deleted or finished plan' });
      }
      continue;
    }
    reservedSessions.add(row.id);
    if (row.planId.startsWith('task:') && externalTasks.some(t => `task:${t.id}` === row.planId)) continue;
    busy.push({ date: row.date, startMinute: start, endMinute: start + sessionMinutes(row.blocks, frozen), focusMinutes: row.blocks * frozen.focusMin,
      label: row.planId.startsWith('task:') ? 'Pomodoro for a task' : 'Pomodoro session (added in the Pomodoro tab)' });
  }
  // Deleting a plan must not erase time already studied from today's focus budget.
  // Include unplanned/canceled-session logs that are not already covered by a reservation.
  const logged = db.select().from(focusSessions).where(and(isNull(focusSessions.deletedAt), gte(focusSessions.startedAt, today), lt(focusSessions.startedAt, addDays(today, 1)))).all();
  for (const log of logged) {
    if (log.plannedSessionId && reservedSessions.has(log.plannedSessionId)) continue;
    const start = (log.startedAt - today) / 60_000;
    const minutes = Math.max(0, Math.min(log.durationSec / 60, 1440 - start));
    busy.push({ date: today, startMinute: start, endMinute: start + minutes, focusMinutes: minutes, label: 'Focus time already logged today' });
  }
  // A free timer or a timer detached from a deleted plan still occupies study time.
  if ((timer.status === 'running' || timer.status === 'paused') && timer.run && timer.cfg
    && (!timer.plannedSessionId || !reservedSessions.has(timer.plannedSessionId))) {
    const blocks = Math.max(0, timer.run.totalBlocks - timer.run.completedBlocks);
    if (blocks > 0 && timer.cfg.focusMin > 0 && timer.cfg.focusCount > 0) {
      busy.push({ date: today, startMinute: currentMinute, endMinute: Math.min(1440, currentMinute + sessionMinutes(blocks, timer.cfg)), focusMinutes: blocks * timer.cfg.focusMin,
        label: 'Pomodoro timer running now' });
    }
  }
  // This is a shared limit across exams, rather than multiplying the student's daily goal.
  const dailyGoalMin = override?.prefs.dailyGoalMin
    ?? readJson(stored.get(DAILY_GOAL_KEY) ?? 'null', null as number | null) ?? DEFAULT_DAILY_GOAL_MIN;
  const result = generateDailySchedule({ now, plans, busy, dailyGoalMin });
  return { ...result, busy, plans, dailyGoalMin, prefs, old, allTasks, stored, retained, fixed, managedIds, exams, protectedSubjectIds };
}

export async function previewStudySchedule(id: string, prefs: ExamPreferences) {
  validate(prefs);
  if (!await getExam(id)) throw new Error('This study plan is no longer active.');
  const result = calculate(new Date(), { id, prefs });
  const retained = result.old.filter(s => result.fixed.has(s.id) && s.date >= startOfDay(Date.now()) && s.completedBlocks < s.blocks)
    .map(s => {
      const p = result.prefs.get(s.planId)!;
      const frozen = { ...DEFAULT_POMODORO, ...p, ...readJson(result.stored.get(`session.settings:${s.id}`) ?? '{}', {}) };
      const startMinute = s.startMinute ?? p.start;
      return { planId: s.planId, subjectId: s.subjectId, date: s.date, startMinute,
        endMinute: startMinute + sessionMinutes(s.blocks, frozen), blocks: s.blocks };
    });
  const sessions = [...result.sessions, ...retained].sort((a, b) => a.date - b.date || a.startMinute - b.startMinute);
  const selected = prefs.scope === 'all' ? sessions : sessions.filter(s => s.planId === id);
  // Days this plan goes over the daily goal (it still plans them; the screen shows a red note).
  const planDays = new Set(selected.map(s => s.date));
  const overGoalDays = result.overGoalDays.filter(d => planDays.has(d.date));
  const resized = Object.entries(result.resized).filter(([planId]) => prefs.scope === 'all' || planId === id)
    .reduce((sum, [, r]) => ({ shrunk: sum.shrunk + r.shrunk, grown: sum.grown + r.grown }), { shrunk: 0, grown: 0 });
  return { sessions: selected, overGoalDays, dailyGoalMin: result.dailyGoalMin, resized,
    shortfallBlocks: prefs.scope === 'all' ? result.shortfallBlocks : result.shortfallByPlan[id] ?? 0 };
}

function persistSchedule(now: Date, override?: { id: string; prefs: ExamPreferences }) {
  let changed = false;
  const result = db.transaction(tx => {
    if (override && !tx.select().from(studyPlans).where(and(eq(studyPlans.id, override.id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).get()) {
      throw new Error('This study plan is no longer active.');
    }
    // Repair orphaned pending work left by old deletes, cloud sync, or an elapsed exam.
    const liveSubjects = new Set(tx.select().from(subjects).where(isNull(subjects.deletedAt)).all().map(subject => subject.id));
    const timeSettings = new Map(tx.select().from(settings).all().filter(row => row.key.startsWith('exam-time:')).map(row => [row.key, row.value]));
    const inactiveIds = tx.select().from(studyPlans).all().filter(plan => plan.deletedAt !== null || plan.status !== 'active'
      || !liveSubjects.has(plan.subjectId) || examOver(plan, timeSettings, now)).map(plan => plan.id);
    const cleanup = cancelStudyPlanWork(tx, inactiveIds, now.getTime(), false);
    if (cleanup.changed) changed = true;
    const snapshot = calculate(now, override);
    const stamp = now.getTime();
    const putSetting = (key: string, value: unknown) => {
      const json = JSON.stringify(value);
      if (snapshot.stored.get(key) === json) return;
      tx.insert(settings).values({ key, value: json, updatedAt: stamp })
        .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: stamp } }).run();
      changed = true;
    };
    for (const [id, p] of snapshot.prefs) {
      putSetting(`exam-prefs:${id}`, p);
      putSetting(`exam-shortfall:${id}`, snapshot.shortfallByPlan[id] ?? 0);
    }
    if (override?.prefs.dailyGoalMin !== undefined) putSetting(DAILY_GOAL_KEY, override.prefs.dailyGoalMin);
    const keep = new Set(snapshot.retained);
    const globalTimer = { ...DEFAULT_POMODORO, ...readJson(snapshot.stored.get('pomodoro') ?? '{}', {}) };
    const mirror = (row: typeof plannedSessions.$inferSelect, endMinute: number) => {
      const title = readJson(snapshot.stored.get(`exam-name:${row.planId}`) ?? 'null', null as string | null) ?? 'Exam study';
      const existing = snapshot.allTasks.find(t => t.id === row.id);
      const values = { title, subjectId: row.subjectId, date: row.date, startMinute: row.startMinute ?? snapshot.prefs.get(row.planId)!.start, endMinute,
        source: 'generated', planId: row.planId, movable: !row.locked && !snapshot.protectedSubjectIds.includes(row.subjectId), hasPomodoro: true,
        done: row.completedBlocks >= row.blocks, deletedAt: null };
      if (existing && Object.entries(values).every(([key, value]) => existing[key as keyof typeof existing] === value)) return;
      tx.insert(tasks).values({ id: row.id, ...values, updatedAt: stamp })
        .onConflictDoUpdate({ target: tasks.id, set: { ...values, updatedAt: stamp } }).run();
      changed = true;
    };
    for (const session of snapshot.sessions) {
      const matching = snapshot.old.find(s => !keep.has(s.id) && s.planId === session.planId && s.date === session.date
        && s.subjectId === session.subjectId && s.startMinute === session.startMinute && s.blocks === session.blocks && s.completedBlocks === 0 && !s.excluded);
      const p = snapshot.prefs.get(session.planId)!;
      const row = matching ?? { id: newId(), planId: session.planId, subjectId: session.subjectId, date: session.date,
        startMinute: session.startMinute, blocks: session.blocks, locked: false, excluded: false, completedBlocks: 0, updatedAt: stamp, deletedAt: null };
      if (!matching) { tx.insert(plannedSessions).values(row).run(); changed = true; }
      keep.add(row.id);
      // Each session keeps its own size: auto-sized plans can shorten or lengthen single sessions.
      const focusMin = session.focusMin ?? p.focusMin;
      putSetting(`session.settings:${row.id}`, { ...DEFAULT_POMODORO, ...globalTimer, focusMin,
        focusCount: Math.min(session.blocks, Math.max(1, Math.floor(120 / focusMin))), breakMin: p.breakMin, longBreakMin: p.longBreakMin });
      mirror(row, session.endMinute);
    }
    for (const row of snapshot.old.filter(s => snapshot.managedIds.has(s.planId))) {
      if (!keep.has(row.id)) {
        tx.update(plannedSessions).set({ deletedAt: stamp, updatedAt: stamp }).where(eq(plannedSessions.id, row.id)).run();
        tx.update(tasks).set({ deletedAt: stamp, updatedAt: stamp }).where(eq(tasks.id, row.id)).run();
        changed = true;
      } else if (snapshot.retained.has(row.id)) {
        const p = snapshot.prefs.get(row.planId)!;
        const frozen = { ...DEFAULT_POMODORO, ...p, ...readJson(snapshot.stored.get(`session.settings:${row.id}`) ?? '{}', {}) };
        // A partially finished missed run keeps its completed work; only its remaining blocks move.
        const timer = readJson<{ status?: string; plannedSessionId?: string }>(snapshot.stored.get('timer.state') ?? '{}', {});
        const running = timer.status !== 'idle' && timer.plannedSessionId === row.id;
        const expired = !running && row.completedBlocks > 0 && row.completedBlocks < row.blocks && !row.locked && !snapshot.protectedSubjectIds.includes(row.subjectId)
          && (row.date < startOfDay(now) || (row.date === startOfDay(now) && (row.startMinute ?? p.start) + sessionMinutes(row.blocks, frozen) <= now.getHours() * 60 + now.getMinutes()));
        if (expired) {
          tx.update(plannedSessions).set({ blocks: row.completedBlocks, updatedAt: stamp }).where(eq(plannedSessions.id, row.id)).run();
          changed = true;
        }
        const retained = expired ? { ...row, blocks: row.completedBlocks } : row;
        mirror(retained, (row.startMinute ?? p.start) + sessionMinutes(retained.blocks, frozen));
      }
    }
    return { sessions: snapshot.sessions, shortfallBlocks: snapshot.shortfallBlocks, shortfallByPlan: snapshot.shortfallByPlan };
  });
  if (changed) bumpData();
  return result;
}

/** Idempotent: unchanged schedules keep their IDs and don't trigger another database write. */
export async function regenerateSchedules(now = new Date()) { return persistSchedule(now); }

export async function saveStudySchedule(id: string, prefs: ExamPreferences) {
  validate(prefs);
  if (!await getExam(id)) throw new Error('This exam no longer exists.');
  return persistSchedule(new Date(), { id, prefs });
}

type SkippedTime = { date: number; startMinute: number; endMinute: number };

export type DayExplanation = {
  /** Study time this plan may use that day, after "now" and before the exam. */
  windows: { start: number; end: number }[];
  /** Everything already taking time that day (tasks, removed sessions, logged focus, ...). */
  used: { label: string; startMinute: number; endMinute: number; skippedPlanId?: string }[];
};

/** Why a day has the sessions it has: its open study time and what is already using time. */
export async function explainStudyDay(id: string, prefs: ExamPreferences, date: number): Promise<DayExplanation> {
  validate(prefs);
  const now = new Date();
  const result = calculate(now, { id, prefs });
  const plan = result.plans.find(p => p.id === id);
  const today = startOfDay(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const windows = plan ? studyWindows(plan, date)
    .map(w => (date === today ? { start: Math.max(w.start, nowMin), end: w.end } : w)).filter(w => w.end > w.start) : [];
  const used = result.busy.filter(b => b.date === date && b.endMinute > b.startMinute)
    .map(b => ({ label: b.label ?? 'Busy', startMinute: b.startMinute, endMinute: b.endMinute, skippedPlanId: b.skippedPlanId }))
    .sort((a, b) => a.startMinute - b.startMinute);
  return { windows, used };
}

/** Undo "remove session": that time can hold study again (from the next Reschedule). */
export async function restoreSkippedTime(planId: string, date: number, startMinute: number): Promise<void> {
  const key = `exam-skip:${planId}`;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const skips = rows.length ? readJson<SkippedTime[]>(rows[0].value, []) : [];
  const value = JSON.stringify(skips.filter(s => !(s.date === date && s.startMinute === startMinute)));
  await db.insert(settings).values({ key, value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: Date.now() } });
  bumpData();
}

/**
 * Removes one study session made by an exam plan (long press in the study plan). Its time is kept free
 * the next time the plans are rescheduled. Nothing else moves now: plans only change on Save / Reschedule.
 * Sessions with progress, or with the timer running, can't be removed.
 */
export async function skipStudySession(sessionId: string): Promise<void> {
  const now = Date.now();
  db.transaction(tx => {
    const task = tx.select().from(tasks).where(and(eq(tasks.id, sessionId), isNull(tasks.deletedAt))).get();
    const session = tx.select().from(plannedSessions).where(and(eq(plannedSessions.id, sessionId), isNull(plannedSessions.deletedAt))).get();
    if (!task || task.source !== 'generated' || !task.planId) throw new Error('This is not a study plan session.');
    if (session && session.completedBlocks > 0) throw new Error('This session already has study progress, so it stays.');
    const timer = readJson<{ status?: string; plannedSessionId?: string }>(
      tx.select().from(settings).where(eq(settings.key, 'timer.state')).get()?.value ?? '{}', {});
    if (timer.status && timer.status !== 'idle' && timer.plannedSessionId === sessionId) throw new Error('Stop the timer for this session first.');
    const key = `exam-skip:${task.planId}`;
    const today = startOfDay(now);
    const skips = readJson<SkippedTime[]>(tx.select().from(settings).where(eq(settings.key, key)).get()?.value ?? '[]', [])
      .filter(s => s.date >= today);
    skips.push({ date: task.date, startMinute: task.startMinute, endMinute: task.endMinute });
    const value = JSON.stringify(skips);
    tx.insert(settings).values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } }).run();
    tx.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, sessionId)).run();
    if (session) tx.update(plannedSessions).set({ deletedAt: now, updatedAt: now }).where(eq(plannedSessions.id, sessionId)).run();
  });
  bumpData();
  void refreshSessionReminders();
}

export async function getStudyPlanLabels(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.filter(row => row.key.startsWith('exam-name:'))
    .map(row => [row.key.slice('exam-name:'.length), readJson(row.value, 'Exam study')]));
}

export async function getProtectedSubjectIds(): Promise<string[]> {
  const rows = await db.select().from(settings).where(eq(settings.key, 'planner.protectedSubjects')).limit(1);
  return rows.length ? readJson(rows[0].value, []) : [];
}

export async function saveProtectedSubjectIds(ids: string[]) {
  const value = JSON.stringify([...new Set(ids)]);
  await db.insert(settings).values({ key: 'planner.protectedSubjects', value, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: Date.now() } });
  await regenerateSchedules();
  bumpData();
}
