import { Text } from '@/components/ui/Text';
import { DAY_NAMES, sameDay } from '@/lib/dates';
import { colors } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { dotColor } from './plannerColors';

/** One week of day cells. The selected day is filled; days with tasks get a dot. */
export function DayRow({
  days,
  selectedDate,
  markedDays,
  onSelect,
}: {
  days: number[];
  selectedDate: number;
  markedDays: Set<number>;
  onSelect: (day: number) => void;
}) {
  return (
    <View style={styles.dayRow}>
        {days.map((day) => {
          const active = sameDay(day, selectedDate);
          const fg = active ? colors.white : colors.ink;
          const date = new Date(day);
          return (
            <Pressable key={day} onPress={() => onSelect(day)} style={[styles.day, active && styles.dayActive]}>
              <Text variant="captionStrong" color={fg}>{DAY_NAMES[date.getDay()]}</Text>
              <Text variant="smallStrong" color={fg}>{date.getDate()}</Text>
              {active && <View style={[styles.dot, { backgroundColor: colors.white }]} />}
              {!active && markedDays.has(day) && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 4px inset on every side, so the selected day (even Mon/Sun at the ends) never touches or gets clipped
  // by the track's rounded edge. Total height stays 60 (52 + 4 + 4) to match STRIP_INNER_H.
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  day: { width: 42, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
});
