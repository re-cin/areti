/** Minutes from midnight -> "10 am", "1:30 pm" (12h) or "22:00" (24h). */
export function formatTime(minute: number, use24h = false): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  if (use24h) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Minutes -> "45 mins", "1 hr", "1.5 hrs", "1 hr 15 mins". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  if (minutes === 60) return '1 hr';
  if (minutes % 30 === 0) return `${minutes / 60} hrs`;
  const h = Math.floor(minutes / 60);
  const r = minutes % 60;
  return `${h} ${h === 1 ? 'hr' : 'hrs'} ${r} mins`;
}
