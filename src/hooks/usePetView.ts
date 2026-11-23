import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_DAILY_GOAL,
  focusLogQuery,
  ghostQuery,
  nextExamQuery,
  petSettingsQuery,
  PET_SETTINGS,
  renameGhost,
  setPetSetting,
} from '@/db/queries/pet';
import {
  DEFAULT_SLEEP,
  EXPRESSIONS,
  focusStats,
  getExpression,
  goalProgress,
  inWindow,
  levelProgress,
  linesFor,
  momentumNow,
  nextUnlock,
  resolveExpression,
  unlockedExpressions,
} from '@/features/pet';
import { startOfDay } from '@/lib/dates';
import { EXPRESSION_PREVIEW, PET_NAME_MAX, usePetStore } from '@/stores/petStore';

const DAY_MS = 86_400_000;

/** Re-renders once a minute so momentum decay, sleep time and day changes show up. */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function parse<T>(value: string | undefined, fallback: T): T {
  if (value === undefined) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Everything the Reti screen shows, live from the database and the spec rules. */
export function usePetView() {
  const now = useMinuteClock();
  const today = startOfDay(now);

  const { data: log, updatedAt: logLoadedAt } = useLiveQuery(focusLogQuery());
  const { data: exams } = useLiveQuery(nextExamQuery(today), [today]);
  const { data: ghostRows } = useLiveQuery(ghostQuery());
  const { data: settingRows, updatedAt: settingsLoadedAt } = useLiveQuery(petSettingsQuery());

  const session = usePetStore((s) => s.session);
  const brief = usePetStore((s) => s.brief);
  const talkIndex = usePetStore((s) => s.talkIndex);
  const preview = usePetStore((s) => (EXPRESSION_PREVIEW ? s.preview : null));

  return useMemo(() => {
    const setting = (key: string) => settingRows?.find((r) => r.key === key)?.value;
    const goalMinutes = parse(setting(PET_SETTINGS.dailyGoal), DEFAULT_DAILY_GOAL);
    const lastLevelSeen = parse<number | null>(setting(PET_SETTINGS.lastLevelSeen), null);
    const lastCelebrationDay = parse<number | null>(setting(PET_SETTINGS.lastCelebrationDay), null);

    const records = log ?? [];
    const stats = focusStats(records, now);
    const momentum = momentumNow(records, now);
    const lvl = levelProgress(stats.totalExp);
    const examDate = exams?.[0]?.examDate ?? null;
    const examInDays = examDate === null ? null : Math.round((startOfDay(examDate) - today) / DAY_MS);

    const resolved = resolveExpression({
      level: lvl.level,
      momentum,
      minutesToday: stats.minutesToday,
      goalMinutes,
      session,
      examInDays,
      isSleepPeriod: inWindow(now, DEFAULT_SLEEP),
      brief,
    });
    // DEV preview from the Expressions grid overrides what the rules picked.
    const displayed = preview ? { ...resolved, id: preview, overlay: undefined } : resolved;
    const progress = goalProgress(stats.minutesToday, goalMinutes);
    const restMode = progress >= 1 && session !== 'focus' && brief === null;

    return {
      name: ghostRows?.[0]?.name ?? 'Reti',
      level: lvl,
      expToday: stats.expToday,
      streakDays: stats.streakDays,
      next: nextUnlock(lvl.level),
      expression: getExpression(displayed.id),
      overlay: displayed.overlay,
      lines: preview ? linesFor(preview, 99) : linesFor(displayed.id, lvl.level, restMode),
      preview,
      talkIndex,
      momentum,
      minutesToday: stats.minutesToday,
      goalMinutes,
      goalProgress: progress,
      unlockedCount: unlockedExpressions(lvl.level).length,
      totalCount: EXPRESSIONS.length,
      today,
      lastLevelSeen,
      lastCelebrationDay,
      /** True once the focus log and settings have loaded (so events don't fire on empty data). */
      loaded: Boolean(logLoadedAt && settingsLoadedAt),
    };
  }, [log, exams, ghostRows, settingRows, logLoadedAt, settingsLoadedAt, session, brief, talkIndex, preview, now, today]);
}

export async function renamePet(name: string) {
  const clean = name.trim().slice(0, PET_NAME_MAX);
  if (clean) await renameGhost(clean);
}

/**
 * Plays the brief expressions (spec 4): the memory flash when a new level is reached, and
 * the goal celebration the first time the goal hits 100% each day. Mount on the Reti screen.
 */
export function usePetEvents(view: ReturnType<typeof usePetView>) {
  const brief = usePetStore((s) => s.brief);
  const playBrief = usePetStore((s) => s.playBrief);
  const endBrief = usePetStore((s) => s.endBrief);
  const { loaded, level, lastLevelSeen, lastCelebrationDay, goalProgress: progress, today } = view;
  // Events already played while the app is open, so a slow save can't replay them.
  const played = useRef(new Set<string>());

  // Start a brief expression when its trigger is met (one at a time).
  useEffect(() => {
    if (!loaded || brief) return;
    const once = (key: string) => (played.current.has(key) ? false : (played.current.add(key), true));
    // First run: remember the current level without flashing.
    if (lastLevelSeen === null) {
      setPetSetting(PET_SETTINGS.lastLevelSeen, level.level);
    } else if (level.level > lastLevelSeen && once(`level:${level.level}`)) {
      playBrief('memoryFlash');
      setPetSetting(PET_SETTINGS.lastLevelSeen, level.level);
    } else if (progress >= 1 && lastCelebrationDay !== today && once(`goal:${today}`)) {
      playBrief('goalCelebration');
      setPetSetting(PET_SETTINGS.lastCelebrationDay, today);
    }
  }, [loaded, brief, level.level, lastLevelSeen, lastCelebrationDay, progress, today, playBrief]);

  // End it after its duration (3-5 s), then the ghost returns to its base mood.
  useEffect(() => {
    if (!brief) return;
    const t = setTimeout(endBrief, getExpression(brief).durationMs ?? 3500);
    return () => clearTimeout(t);
  }, [brief, endBrief]);
}
