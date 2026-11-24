import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTimer } from './timerStore';

/**
 * Mount once at the root. Restores a saved timer, re-renders the countdown twice a second
 * while it runs, and catches up immediately when the app returns to the foreground.
 */
export function useTimerDriver(enabled: boolean) {
  const status = useTimer((s) => s.status);

  useEffect(() => {
    if (enabled) void useTimer.getState().hydrate();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || status !== 'running') return;
    const id = setInterval(() => void useTimer.getState().tick(), 500);
    return () => clearInterval(id);
  }, [enabled, status]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useTimer.getState().tick();
    });
    return () => sub.remove();
  }, [enabled]);
}
