import { useEffect, useState } from 'react';

/**
 * "2 days 5 h 12 min left": how long until Premium ends. The admin site uses the same wording
 * (admin/src/lib/timeLeft.ts), so its preview matches what users see here.
 */
export function timeLeftText(endMs: number, nowMs = Date.now()): string {
  const ms = endMs - nowMs;
  if (ms <= 0) return 'Ended';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return 'Less than a minute left';
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours) parts.push(`${hours} h`);
  if (mins || parts.length === 0) parts.push(`${mins} min`);
  return `${parts.join(' ')} left`;
}

/** The current time, refreshed every `everyMs` while the screen is mounted (for countdowns). */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
