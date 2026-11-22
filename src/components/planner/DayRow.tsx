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
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 42, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
  dayActive: { backgroundColor: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
});
