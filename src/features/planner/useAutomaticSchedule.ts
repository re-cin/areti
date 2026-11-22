import { useEffect } from 'react';
import { AppState } from 'react-native';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useTimer } from '@/features/timer/timerStore';
import { isPlannedSessionActive } from '@/features/timer/timerRepo';
import { regenerateSchedules } from './examsRepo';

/** Refresh locally on launch, foreground, relevant edits, and missed-session boundaries. */
export function useAutomaticSchedule(dbReady: boolean) {
  const hydrated = useTimer(s => s.hydrated);
  useEffect(() => {
    if (!dbReady || !hydrated) return;
    let disposed = false;
    let running = false;
    let pending = false;
    let debounce: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (disposed || (AppState.currentState && AppState.currentState !== 'active')) return;
      if (running) { pending = true; return; }
      running = true;
      try {
        // Credit blocks finished while backgrounded before moving any missed work.
        await useTimer.getState().tick();
        if (!disposed) {
          await regenerateSchedules();
          const timer = useTimer.getState();
          if (timer.plannedSessionId && !await isPlannedSessionActive(timer.plannedSessionId)) {
            await useTimer.getState().detachPlannedSession(timer.plannedSessionId);
          }
        }
      } catch (error) { console.warn('[planner] Could not refresh schedule', error); }
      finally {
        running = false;
        if (pending && !disposed) { pending = false; soon(); }
      }
    };
    const soon = () => { clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 300); };
    const changes = addDatabaseChangeListener(event => {
      if (['tasks', 'planned_sessions', 'study_plans', 'subjects'].includes(event.tableName)) soon();
    });
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') soon(); });
    const interval = setInterval(soon, 60_000);
    soon();
    return () => { disposed = true; clearTimeout(debounce); clearInterval(interval); changes.remove(); foreground.remove(); };
  }, [dbReady, hydrated]);
}
