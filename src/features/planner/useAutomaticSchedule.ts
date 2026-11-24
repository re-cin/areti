import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTimer } from '@/features/timer/timerStore';
import { isPlannedSessionActive } from '@/features/timer/timerRepo';

/**
 * Study plans only change when the user saves a plan or taps Reschedule (team rule, Nov 2026),
 * so this no longer re-plans on its own. On launch and when returning to the app it only:
 *  - credits focus blocks finished while the app was in the background, and
 *  - lets go of a timer whose study session no longer exists (its plan was deleted).
 */
export function useAutomaticSchedule(dbReady: boolean) {
  const hydrated = useTimer(s => s.hydrated);
  useEffect(() => {
    if (!dbReady || !hydrated) return;
    let disposed = false;
    const refresh = async () => {
      if (disposed || (AppState.currentState && AppState.currentState !== 'active')) return;
      try {
        await useTimer.getState().tick();
        const timer = useTimer.getState();
        if (!disposed && timer.plannedSessionId && !await isPlannedSessionActive(timer.plannedSessionId)) {
          await useTimer.getState().detachPlannedSession(timer.plannedSessionId);
        }
      } catch (error) { console.warn('[planner] Could not refresh the timer', error); }
    };
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    void refresh();
    return () => { disposed = true; foreground.remove(); };
  }, [dbReady, hydrated]);
}
