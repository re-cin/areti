import { useCallback, useState } from 'react';
import { loadGoalState, saveTodayGoal, type GoalState } from '@/db/queries/pet';
import { usePreferences } from '@/features/preferences/preferencesStore';
import { useToday } from '@/hooks/useToday';
import { useDbQuery } from '@/lib/useDbQuery';
import { showNotice } from '@/stores/notice';
import { DailyGoalDialog } from './DailyGoalDialog';

/**
 * The first time the app is opened each day, Reti asks for today's study goal.
 * Mounted once in the tab layout (so it never shows during sign-in or onboarding).
 */
export function DailyGoalPrompt() {
  const today = useToday();
  const load = useCallback(() => loadGoalState(), []);
  // Re-reads on a new day (today changes) and after data changes (e.g. a goal synced from another phone).
  const state = useDbQuery<GoalState | null>(load, null, today);
  const updatePreferences = usePreferences((s) => s.updatePreferences);
  const [answeredDay, setAnsweredDay] = useState<number | null>(null);
  const visible = Boolean(state?.needsPrompt && state.today === today && answeredDay !== today);

  return (
    <DailyGoalDialog
      visible={visible}
      required
      initialMinutes={state?.goalMinutes ?? 120}
      title="What's your study goal today?"
      message="Reti cheers you on as you get closer. You can change it in Settings until you start studying."
      onSave={async (minutes) => {
        try {
          await saveTodayGoal(minutes);
          setAnsweredDay(today);
          updatePreferences({ dailyGoal: minutes / 60 }); // Settings › Preferences shows the same goal
        } catch (e) {
          showNotice({ title: "Couldn't save your goal", message: e instanceof Error ? e.message : String(e) });
        }
      }}
    />
  );
}
