import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';

/** Week (or month) title with previous / next arrows, a "back to today" target and the calendar toggle. */
export function WeekBar({
  title,
  expanded,
  onPrev,
  onNext,
  onToday,
  onToggleCalendar,
}: {
  title: string;
  expanded: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleCalendar: () => void;
}) {
  return (
    <View style={styles.weekBar}>
      <View style={styles.weekNav}>
        <Pressable onPress={onPrev} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text variant="subheading">{title}</Text>
        <Pressable onPress={onNext} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.weekIcons}>
        <Pressable onPress={onToday} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go to today">
          <Ionicons name="locate-outline" size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={onToggleCalendar} hitSlop={10} accessibilityRole="button" accessibilityLabel={expanded ? 'Show week' : 'Show month'}>
          <Ionicons name={expanded ? 'calendar' : 'calendar-outline'} size={17} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 0,
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, justifyContent: 'flex-start', paddingLeft: 5 },
  weekIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
