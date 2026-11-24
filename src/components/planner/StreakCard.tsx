import { StreakIcon } from '@/components/ui/StreakIcon';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { daySummary, streakDays, streaks } from '@/features/stats/stats';
import { loadStatSessions } from '@/features/stats/statsRepo';
import { useDbQuery } from '@/lib/useDbQuery';

/** Current streak and minutes studied today, from logged focus sessions (same math as Statistics). */
async function loadToday() {
  const sessions = await loadStatSessions();
  const today = new Date();
  return { streak: streaks(streakDays(sessions), today).current, minutes: Math.round(daySummary(sessions, today).minutes) };
}

const fmtMinutes = (m: number) => (m < 60 ? `${m} ${m === 1 ? 'min' : 'mins'}` : `${Math.floor(m / 60)} hr ${m % 60 ? `${m % 60} min` : ''}`.trim());
import { plannerColors as extra } from './plannerColors';

/**
 * Speech-bubble card: current streak and minutes studied today (the same numbers as Statistics),
 * and how many of the selected day's Daily Tasks are still open. Tapping it opens Statistics.
 */
export function StreakCard({ remaining }: { remaining: number }) {
  // Re-reads when the Planner is shown and after any data change (a finished focus block, a sync).
  const { streak, minutes } = useDbQuery(loadToday, { streak: 0, minutes: 0 });
  return (
    <Pressable style={styles.streakWrap} onPress={() => router.navigate('/statistics')}
      accessibilityRole="button" accessibilityLabel={`Current streak ${streak} days. Open Statistics`}>
      <View style={styles.streakCard}>
        <StreakIcon size={22} />
        <View style={{ width: 88 }}>
          <Text variant="caption" color={extra.muted}>Current streak</Text>
          <Text variant="heading" style={{ marginTop: -2 }}>{streak} {streak === 1 ? 'day' : 'days'}</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={{ flex: 1, paddingLeft: 4 }}>
          <Text variant="captionStrong">{fmtMinutes(minutes)} studied today</Text>
          <Text variant="captionStrong" color={extra.tealText}>
            {remaining} {remaining === 1 ? 'task' : 'tasks'} remaining
          </Text>
        </View>
      </View>
      <View style={styles.bubbleTail} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  streakWrap: { marginTop: spacing.lg, marginHorizontal: spacing.md },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  streakDivider: { width: 1.5, alignSelf: 'stretch', backgroundColor: colors.ink },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    right: 40,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },
});
