import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { startOfDay } from '@/lib/dates';

/** Local calendar day, refreshed across midnight and when returning to the app. */
export function useToday(): number {
  const [today, setToday] = useState(() => startOfDay(Date.now()));
  useEffect(() => {
    const refresh = () => setToday(startOfDay(Date.now()));
    const interval = setInterval(refresh, 60_000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  return today;
}
