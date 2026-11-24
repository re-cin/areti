/**
 * "2 days 5 h 12 min left": how long until a Premium due date. Same wording as the app
 * (src/features/subscription/timeLeft.ts there), so the admin preview matches what users see.
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
