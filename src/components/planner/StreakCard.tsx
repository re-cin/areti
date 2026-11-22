import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { StyleSheet, View } from 'react-native';
import { plannerColors as extra } from './plannerColors';

/** Speech-bubble card: current streak, minutes studied today and tasks remaining. */
export function StreakCard({ remaining }: { remaining: number }) {
  // TODO: streak and minutes studied come from the daily statistics.
  return (
    <View style={styles.streakWrap}>
      <View style={styles.streakCard}>
        <Ionicons name="flame-outline" size={22} color={extra.terracotta} style={{ marginTop: 4 }} />
        <View style={{ width: 88 }}>
          <Text variant="caption" color={extra.muted}>Current streak</Text>
          <Text variant="heading" style={{ marginTop: -2 }}>12 days</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={{ flex: 1, paddingLeft: 4 }}>
          <Text variant="captionStrong">30 mins. studied today</Text>
          <Text variant="captionStrong" color={extra.tealText}>
            {remaining} {remaining === 1 ? 'task' : 'tasks'} remaining
          </Text>
        </View>
      </View>
      <View style={styles.bubbleTail} />
    </View>
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
