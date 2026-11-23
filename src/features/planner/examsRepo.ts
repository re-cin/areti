import { db } from '@/db/client';
import { newId } from '@/db/id';
import { focusSessions, plannedSessions, settings, studyPlans, subjects, tasks } from '@/db/schema';
import { addDays, startOfDay } from '@/lib/dates';
import { and, asc, eq, gte, isNull, lt } from 'drizzle-orm';
import { DEFAULT_POMODORO } from '@/features/timer/pomodoroSettings';
import { bumpData } from '@/stores/dataVersion';
import { generateSchedule, sessionMinutes, type BusyTime, type SchedulePlan } from './engine';
import { cancelStudyPlanWork } from './studyPlanLifecycle';
import { buildInsights, type PlanInsights } from './insights';
import {
  PRIORITY_MULTIPLIER, PremiumRequiredError, SUBSCRIPTION_SETTING_KEY, entitlementsFor, generationsAreLimited, isExamPriority,
  parseSubscription, resolveTier, type Entitlements, type ExamPriority,
} from '@/features/subscription/entitlements';
import { reserveGeneration } from '@/features/subscription/generationQuotaRepo';
import type { Run, TimerConfig } from '@/features/timer/session';

export const examsQuery = () => db.select().from(studyPlans)
  .where(and(isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active')))
  .orderBy(asc(studyPlans.examDate));

export async function examName(id: string, subjectName: string) {
  const row = await db.select().from(settings).where(eq(settings.key, `exam-name:${id}`)).limit(1);
  return row.length ? readJson(row[0].value, `${subjectName} Exam`) : `${subjectName} Exam`;
}

export async function createExam(input: { name: string; subjectId: string; date: number; difficulty?: number }) {
  const id = newId();
  const now = Date.now();
  validateExamInput(input, now);
  if (startOfDay(input.date) <= startOfDay(now)) throw new Error('Choose an exam date after today.');
  db.transaction((tx) => {
    tx.insert(studyPlans).values({ id, subjectId: input.subjectId, examDate: startOfDay(input.date), difficulty: input.difficulty ?? 3, updatedAt: now }).run();
    tx.insert(settings).values({ key: `exam-name:${id}`, value: JSON.stringify(input.name.trim()), updatedAt: now }).run();
  });
  await regenerateSchedules();
  bumpData();
  return id;
}

export async function getExam(id: string) {
  const rows = await db.select().from(studyPlans).where(and(eq(studyPlans.id, id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).limit(1);
  return rows[0] ?? null;
}

export async function updateExam(id: string, input: { name: string; subjectId: string; date: number; difficulty?: number }) {
  const now = Date.now();
  if (!await getExam(id)) throw new Error('This exam no longer exists.');
  if (startOfDay(input.date) <= startOfDay(now)) throw new Error('Choose an exam date after today.');
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
  });
  await regenerateSchedules();
  bumpData();
}

function validateExamInput(input: { name: string; subjectId: string; date: number; difficulty?: number }, now: number) {
  if (input.difficulty !== undefined) validateDifficulty(input.difficulty);
  if (!input.name.trim()) throw new Error('Enter an exam name.');
  if (!Number.isFinite(input.date) || !Number.isFinite(startOfDay(input.date)) || startOfDay(input.date) <= startOfDay(now)) throw new Error('Choose an exam date after today.');
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
  // The parent tombstone is committed first, so automatic regeneration cannot revive it.
  await regenerateSchedules().catch(error => console.warn('[planner] Plan deleted; remaining schedules will refresh later', error));
  bumpData();
  return result;
}

export async function listPlanSessions(id: string) {
  return db.select().from(plannedSessions)
    .where(and(eq(plannedSessions.planId, id), isNull(plannedSessions.deletedAt)))
    .orderBy(asc(plannedSessions.date), asc(plannedSessions.startMinute));
}

export type ExamPreferences = { scope: 'this' | 'all'; focusCount: number; focusMin: number;
  breakMin: number; longBreakMin: number; start: number; end: number; excluded: number[];
  studyDays?: number[]; dailyGoalMin?: number; totalBlocks?: number; planStartDate?: number };

export const DEFAULT_EXAM_PREFERENCES: ExamPreferences = {
  scope: 'this', focusCount: 4, focusMin: 25, breakMin: 5, longBreakMin: 30,
  start: 19 * 60, end: 21 * 60, excluded: [],
};

export async function getExamPreferences(id: string): Promise<ExamPreferences | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, `exam-prefs:${id}`)).limit(1);
  const prefs = rows.length ? readJson<ExamPreferences | null>(rows[0].value, null) : null;
  const goal = await db.select().from(settings).where(eq(settings.key, 'planner.dailyGoalMin')).limit(1);
  return prefs && goal.length ? { ...prefs, dailyGoalMin: readJson(goal[0].value, prefs.dailyGoalMin) } : prefs;
}

export async function saveExamPreferences(id: string, prefs: ExamPreferences) {
  await saveStudySchedule(id, prefs);
}

function readJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function validate(p: ExamPreferences) {
  if (![p.focusCount, p.focusMin, p.breakMin, p.longBreakMin, p.start, p.end].every(Number.isFinite)
    || !Number.isInteger(p.focusCount) || p.focusCount < 1 || p.focusCount > 8
    || p.focusMin < 5 || p.focusMin > 120 || p.breakMin < 1 || p.longBreakMin < 30
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
  const allExams = allPlans.filter(e => e.deletedAt === null && e.status === 'active' && e.examDate >= today
    && activeSubjects.some(s => s.id === e.subjectId));
  const allSettings = db.select().from(settings).all();
  const stored = new Map(allSettings.map(s => [s.key, s.value]));
  // One engine for everyone: the tier only decides which capabilities are switched on.
  const entitlements = entitlementsAt(stored.get(SUBSCRIPTION_SETTING_KEY), now.getTime());
  // Every active exam is scheduled together; Free students reach this only by asking for a generation.
  const exams = allExams;
  // Free students recover missed sessions themselves (Regenerate); Premium recovers them automatically.
  const autoRecovery = entitlements.autoMissedRecovery || !!override;
  const protectedSubjectIds = readJson<string[]>(stored.get('planner.protectedSubjects') ?? '[]', []);
  const old = db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)).all();
  const allTasks = db.select().from(tasks).where(isNull(tasks.deletedAt)).all();
  const timer = readJson<{ status?: string; plannedSessionId?: string; run?: Run; cfg?: TimerConfig }>(stored.get('timer.state') ?? '{}', {});
  const prefs = new Map<string, ExamPreferences>();
  const plans: SchedulePlan[] = [];
  const retained = new Set<string>();
  const fixed = new Set<string>();
  const managedIds = new Set(exams.map(e => e.id));
  const busy: BusyTime[] = [];
  const reservedSessions = new Set<string>();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  for (const exam of exams) {
    const saved = readJson<ExamPreferences | null>(stored.get(`exam-prefs:${exam.id}`) ?? 'null', null);
    let p = { ...DEFAULT_EXAM_PREFERENCES, ...saved, longBreakMin: Math.max(30, saved?.longBreakMin ?? 30) };
    if (override && (override.id === exam.id || (override.prefs.scope === 'all' && exam.examDate > today))) p = { ...override.prefs };
    validate(p);
    const existing = old.filter(s => s.planId === exam.id && s.subjectId === exam.subjectId);
    const completed = existing.reduce((sum, s) => sum + s.completedBlocks, 0);
    const countDays = (from: number) => {
      let days = 0;
      for (let d = from; d < startOfDay(exam.examDate); d = addDays(d, 1)) {
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
      const heldMissed = !autoRecovery && !row.excluded && row.completedBlocks < row.blocks
        && (row.date < today || (row.date === today && end <= currentMinute));
      const keep = row.completedBlocks >= row.blocks || running || heldMissed || ((row.locked || protectedSubjectIds.includes(row.subjectId)) && row.date >= today)
        || (row.completedBlocks > 0 && (row.date > today || (row.date === today && end > currentMinute)))
        || (!editing && row.date === today && start <= currentMinute && end > currentMinute && !row.excluded);
      credited += keep ? row.blocks : row.completedBlocks;
      if (keep) fixed.add(row.id);
      if (keep || row.completedBlocks > 0) retained.add(row.id);
      if (keep && !heldMissed && (row.date >= today || running) && !row.excluded) {
        reservedSessions.add(row.id);
        busy.push({ date: Math.max(row.date, today), startMinute: running && row.date < today ? currentMinute : start,
        endMinute: running ? Math.max(end, currentMinute + sessionMinutes(Math.max(1, row.blocks - row.completedBlocks), frozen)) : end,
        focusMinutes: row.blocks * frozen.focusMin });
      } else if (row.date === addDays(today, -1) && row.completedBlocks > 0 && !row.excluded) {
        // A finished late-night run still needs recovery time after midnight.
        busy.push({ date: row.date, startMinute: start,
          endMinute: start + sessionMinutes(row.completedBlocks, frozen), focusMinutes: row.completedBlocks * frozen.focusMin });
      }
    }
    const subject = activeSubjects.find(s => s.id === exam.subjectId)!;
    const savedPriority = readJson<unknown>(stored.get(`exam-priority:${exam.id}`) ?? 'null', null);
    const priority = entitlements.priorityControls && isExamPriority(savedPriority) ? PRIORITY_MULTIPLIER[savedPriority] : 1;
    plans.push({ ...p, id: exam.id, subjectId: exam.subjectId, examDate: exam.examDate, priority,
      difficulty: exam.difficulty, urgency: subject.urgency, remainingBlocks: Math.max(0, p.totalBlocks - credited) });
  }
  const externalTasks = allTasks.filter(t => !(t.source === 'generated' && knownPlanIds.has(t.planId ?? '')));
  for (const task of externalTasks) busy.push({ date: task.date, startMinute: task.startMinute, endMinute: task.endMinute });
  for (const row of old.filter(s => !managedIds.has(s.planId) && !s.excluded)) {
    const frozen = { ...DEFAULT_POMODORO, ...readJson(stored.get(`session.settings:${row.id}`) ?? '{}', {}) };
    const start = row.startMinute ?? DEFAULT_EXAM_PREFERENCES.start;
    if (knownPlanIds.has(row.planId)) {
      if (row.completedBlocks > 0 && row.date >= today) {
        reservedSessions.add(row.id);
        busy.push({ date: row.date, startMinute: start, endMinute: start + sessionMinutes(row.completedBlocks, frozen), focusMinutes: row.completedBlocks * frozen.focusMin });
      }
      continue;
    }
    reservedSessions.add(row.id);
    if (row.planId.startsWith('task:') && externalTasks.some(t => `task:${t.id}` === row.planId)) continue;
    busy.push({ date: row.date, startMinute: start, endMinute: start + sessionMinutes(row.blocks, frozen), focusMinutes: row.blocks * frozen.focusMin });
  }
  // Deleting a plan must not erase time already studied from today's focus budget.
  // Include unplanned/canceled-session logs that are not already covered by a reservation.
  const logged = db.select().from(focusSessions).where(and(isNull(focusSessions.deletedAt), gte(focusSessions.startedAt, today), lt(focusSessions.startedAt, addDays(today, 1)))).all();
  for (const log of logged) {
    if (log.plannedSessionId && reservedSessions.has(log.plannedSessionId)) continue;
    const start = (log.startedAt - today) / 60_000;
    const minutes = Math.max(0, Math.min(log.durationSec / 60, 1440 - start));
    busy.push({ date: today, startMinute: start, endMinute: start + minutes, focusMinutes: minutes });
  }
  // A free timer or a timer detached from a deleted plan still occupies study time.
  if ((timer.status === 'running' || timer.status === 'paused') && timer.run && timer.cfg
    && (!timer.plannedSessionId || !reservedSessions.has(timer.plannedSessionId))) {
    const blocks = Math.max(0, timer.run.totalBlocks - timer.run.completedBlocks);
    if (blocks > 0 && timer.cfg.focusMin > 0 && timer.cfg.focusCount > 0) {
      busy.push({ date: today, startMinute: currentMinute, endMinute: Math.min(1440, currentMinute + sessionMinutes(blocks, timer.cfg)), focusMinutes: blocks * timer.cfg.focusMin });
    }
  }
  // This is a shared limit across exams, rather than multiplying the student's daily goal.
  const dailyGoalMin = override ? override.prefs.dailyGoalMin ?? override.prefs.focusCount * override.prefs.focusMin
    : readJson(stored.get('planner.dailyGoalMin') ?? 'null', null as number | null)
      ?? Math.max(0, ...[...prefs.values()].map(p => p.dailyGoalMin ?? p.focusCount * p.focusMin));
  const result = generateSchedule({ now, plans, busy, dailyGoalMin });
  return { ...result, prefs, old, allTasks, stored, retained, fixed, managedIds, exams, protectedSubjectIds, entitlements, autoRecovery };
}

/** The tier's capabilities from the locally cached subscription (Free when missing, unreadable or expired). */
function entitlementsAt(raw: string | undefined, now: number): Entitlements {
  return entitlementsFor(resolveTier(parseSubscription(raw), now));
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
  return { sessions: selected, shortfallBlocks: prefs.scope === 'all' ? result.shortfallBlocks : result.shortfallByPlan[id] ?? 0 };
}

function persistSchedule(now: Date, override?: { id: string; prefs: ExamPreferences }) {
  let changed = false;
  const result = db.transaction(tx => {
    if (override && !tx.select().from(studyPlans).where(and(eq(studyPlans.id, override.id), isNull(studyPlans.deletedAt), eq(studyPlans.status, 'active'))).get()) {
      throw new Error('This study plan is no longer active.');
    }
    // Repair orphaned pending work left by old deletes, cloud sync, or an elapsed exam.
    const liveSubjects = new Set(tx.select().from(subjects).where(isNull(subjects.deletedAt)).all().map(subject => subject.id));
    const inactiveIds = tx.select().from(studyPlans).all().filter(plan => plan.deletedAt !== null || plan.status !== 'active'
      || !liveSubjects.has(plan.subjectId) || plan.examDate < startOfDay(now)).map(plan => plan.id);
    const cleanup = cancelStudyPlanWork(tx, inactiveIds, now.getTime(), false);
    if (cleanup.changed) changed = true;
    // Free students keep their exams and sessions as they are; a schedule is only built when they ask for one.
    const plan = tx.select().from(settings).where(eq(settings.key, SUBSCRIPTION_SETTING_KEY)).get();
    if (!override && !entitlementsAt(plan?.value, now.getTime()).autoScheduling) {
      return { sessions: [] as ReturnType<typeof calculate>['sessions'], shortfallBlocks: 0, shortfallByPlan: {} as Record<string, number> };
    }
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
    if (override) putSetting('planner.dailyGoalMin', override.prefs.dailyGoalMin ?? override.prefs.focusCount * override.prefs.focusMin);
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
      putSetting(`session.settings:${row.id}`, { ...DEFAULT_POMODORO, ...globalTimer, focusMin: p.focusMin,
        focusCount: Math.min(p.focusCount, Math.max(1, Math.floor(120 / p.focusMin))), breakMin: p.breakMin, longBreakMin: p.longBreakMin });
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
        const expired = snapshot.autoRecovery && !running && row.completedBlocks > 0 && row.completedBlocks < row.blocks && !row.locked && !snapshot.protectedSubjectIds.includes(row.subjectId)
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

/**
 * Generates and saves the schedule. Premium is unlimited; a Free student uses one of their monthly
 * generations, which the server counts per account (GenerationLimitError / GenerationUnavailableError).
 */
export async function saveStudySchedule(id: string, prefs: ExamPreferences) {
  validate(prefs);
  if (!await getExam(id)) throw new Error('This exam no longer exists.');
  if (generationsAreLimited(await getEntitlements())) await reserveGeneration();
  return persistSchedule(new Date(), { id, prefs });
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

// ---------------------------------------------------------------------------
// Free vs Premium
// ---------------------------------------------------------------------------

/** The student's current capabilities, from the locally cached subscription (Free when unknown/expired). */
export async function getEntitlements(now = Date.now()): Promise<Entitlements> {
  const rows = await db.select().from(settings).where(eq(settings.key, SUBSCRIPTION_SETTING_KEY)).limit(1);
  return entitlementsFor(resolveTier(parseSubscription(rows[0]?.value), now));
}

export type ExamAccess = {
  entitlements: Entitlements;
  priority: ExamPriority;
};

export async function getExamAccess(id: string, now = Date.now()): Promise<ExamAccess> {
  const entitlements = await getEntitlements(now);
  const saved = await readPriority(id);
  return { entitlements, priority: entitlements.priorityControls ? saved : 'normal' };
}

async function readPriority(id: string): Promise<ExamPriority> {
  const rows = await db.select().from(settings).where(eq(settings.key, `exam-priority:${id}`)).limit(1);
  const value = rows.length ? readJson<unknown>(rows[0].value, null) : null;
  return isExamPriority(value) ? value : 'normal';
}

/** Premium: re-shares the same study time toward (or away from) one exam. Never adds study hours. */
export async function setExamPriority(id: string, priority: ExamPriority): Promise<void> {
  if (!(await getEntitlements()).priorityControls) throw new PremiumRequiredError('Priority controls');
  if (!isExamPriority(priority)) throw new Error('Choose Normal, High or Highest priority.');
  if (!await getExam(id)) throw new Error('This exam no longer exists.');
  const value = JSON.stringify(priority);
  const now = Date.now();
  await db.insert(settings).values({ key: `exam-priority:${id}`, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  await regenerateSchedules();
  bumpData();
}

/** Basic progress for everyone; missed-session, time-left and workload-fit analysis for Premium. */
export async function getPlanInsights(id: string, now = new Date()): Promise<PlanInsights> {
  const [entitlements, sessions, prefs, shortfallRow] = await Promise.all([
    getEntitlements(now.getTime()), listPlanSessions(id), getExamPreferences(id),
    db.select().from(settings).where(eq(settings.key, `exam-shortfall:${id}`)).limit(1),
  ]);
  const exam = await getExam(id);
  if (!exam) throw new Error('This exam no longer exists.');
  const p = { ...DEFAULT_EXAM_PREFERENCES, ...prefs };
  const frozen = { ...DEFAULT_POMODORO, ...p };
  return buildInsights({
    tier: entitlements.tier, examDate: exam.examDate, today: startOfDay(now),
    currentMinute: now.getHours() * 60 + now.getMinutes(),
    totalBlocks: prefs?.totalBlocks ?? sessions.reduce((sum, s) => sum + s.blocks, 0),
    shortfallBlocks: shortfallRow.length ? readJson(shortfallRow[0].value, 0) : 0,
    sessions: sessions.map(s => ({ date: s.date, blocks: s.blocks, completedBlocks: s.completedBlocks,
      endMinute: (s.startMinute ?? p.start) + sessionMinutes(s.blocks, frozen) })),
  });
}
