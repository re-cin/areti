// Workload insights. Pure TypeScript, no Expo/React Native/database imports.
// These describe the student's workload so they can adjust their plan.
// They never predict academic performance.
import type { PlanTier } from '@/features/subscription/entitlements';

export type InsightSession = {
  date: number;        // start of day, epoch ms
  endMinute: number;   // minutes from midnight when the session finishes
  blocks: number;
  completedBlocks: number;
};

/** A session is missed once its time has fully passed with focus blocks still unfinished. */
export function isMissedSession(s: InsightSession, today: number, currentMinute: number): boolean {
  if (s.completedBlocks >= s.blocks) return false;
  return s.date < today || (s.date === today && s.endMinute <= currentMinute);
}

export type PlanInsights = {
  tier: PlanTier;
  totalBlocks: number;
  completedBlocks: number;
  /** 0-100, rounded. */
  progressPercent: number;
  /** Sessions whose time passed unfinished. Both tiers see these; only Premium recovers them automatically. */
  missedSessions: number;
  /** Premium only. */
  detailed?: {
    missedBlocks: number;
    /** Blocks currently scheduled from now until the exam. */
    upcomingBlocks: number;
    /** Blocks that cannot fit before the exam with the current availability. */
    shortfallBlocks: number;
    daysLeft: number;
    /** True when at least half of three or more due sessions were missed. */
    consistentlyMissing: boolean;
    /** False when the available time cannot cover the planned preparation. */
    enoughTime: boolean;
  };
};

export function buildInsights(input: {
  tier: PlanTier; sessions: InsightSession[]; totalBlocks: number; shortfallBlocks: number;
  examDate: number; today: number; currentMinute: number;
}): PlanInsights {
  const { sessions, today, currentMinute } = input;
  const completedBlocks = sessions.reduce((sum, s) => sum + s.completedBlocks, 0);
  const total = Math.max(input.totalBlocks, completedBlocks);
  const missed = sessions.filter(s => isMissedSession(s, today, currentMinute));
  const base: PlanInsights = {
    tier: input.tier, totalBlocks: total, completedBlocks,
    progressPercent: total > 0 ? Math.round(completedBlocks / total * 100) : 0,
    missedSessions: missed.length,
  };
  if (input.tier !== 'premium') return base;

  const due = sessions.filter(s => s.date < today || (s.date === today && s.endMinute <= currentMinute));
  const upcomingBlocks = sessions
    .filter(s => !isMissedSession(s, today, currentMinute) && (s.date > today || (s.date === today && s.endMinute > currentMinute)))
    .reduce((sum, s) => sum + Math.max(0, s.blocks - s.completedBlocks), 0);
  return {
    ...base,
    detailed: {
      missedBlocks: missed.reduce((sum, s) => sum + (s.blocks - s.completedBlocks), 0),
      upcomingBlocks,
      shortfallBlocks: input.shortfallBlocks,
      daysLeft: Math.max(0, Math.round((input.examDate - today) / 86_400_000)),
      consistentlyMissing: due.length >= 3 && missed.length / due.length >= 0.5,
      enoughTime: input.shortfallBlocks === 0,
    },
  };
}
