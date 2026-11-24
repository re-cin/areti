// "Clear study history" against the real migrations in SQLite in memory.
import { isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions, plannedSessions, settings, studyPlans, subjects, tasks } from '@/db/schema';
import { getExamCardState, setExamDone } from '@/features/planner/examsRepo';
import { clearStudyHistory } from './privacy';

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

test('erases exams, tasks, scheduled sessions, focus logs and exam ticks, and keeps subjects', async () => {
  const t = Date.now();
  db.insert(subjects).values({ id: 's1', name: 'Math', color: '#000000', updatedAt: t }).run();
  db.insert(studyPlans).values({ id: 'e1', subjectId: 's1', examDate: t + 86_400_000 * 5, updatedAt: t }).run();
  db.insert(tasks).values({ id: 't1', title: 'Read', subjectId: 's1', date: t, startMinute: 540, endMinute: 600, updatedAt: t }).run();
  db.insert(plannedSessions).values({ id: 'p1', planId: 'e1', subjectId: 's1', date: t, blocks: 2, updatedAt: t }).run();
  db.insert(focusSessions).values([
    { id: 'f1', startedAt: t - 3_600_000, durationSec: 1500, completed: true, updatedAt: t },
    { id: 'f2', startedAt: t - 1_800_000, durationSec: 600, completed: false, updatedAt: t },
  ]).run();
  await setExamDone('e1', true);

  expect(await clearStudyHistory()).toBe(2);

  expect(db.select().from(focusSessions).where(isNull(focusSessions.deletedAt)).all()).toHaveLength(0);
  expect(db.select().from(tasks).where(isNull(tasks.deletedAt)).all()).toHaveLength(0);
  expect(db.select().from(plannedSessions).where(isNull(plannedSessions.deletedAt)).all()).toHaveLength(0);
  expect((await getExamCardState()).done).toEqual([]);
  // Soft deletes with a new updatedAt, so sync uploads them.
  expect(db.select().from(tasks).all()[0].updatedAt).toBeGreaterThanOrEqual(t);
  expect(db.select().from(subjects).where(isNull(subjects.deletedAt)).all()).toHaveLength(1);
  expect(db.select().from(studyPlans).where(isNull(studyPlans.deletedAt)).all()).toHaveLength(0);
  expect(db.select().from(settings).all().some((r) => r.key === 'exam-done:e1')).toBe(true);
});
