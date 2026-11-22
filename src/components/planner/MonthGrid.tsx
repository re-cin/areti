import { Text } from '@/components/ui/Text';
import type { TaskChip } from '@/db/queries/tasks';
import { DAY_NAMES, sameDay, sameMonth } from '@/lib/dates';
import { colors, fonts } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';

const MAX_CHIPS = 2;

type Props = {
  weeks: number[][];
  selectedDate: number;
  tasksByDay: Map<number, TaskChip[]>;
  subjectsById: Map<string, { color: string }>;
  onSelect: (day: number) => void;
};

/** Full month view of the planner calendar: one row per week, up to two task chips per day. */
export function MonthGrid({ weeks, selectedDate, tasksByDay, subjectsById, onSelect }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.headRow}>
        {weeks[0].map((day) => (
          <Text key={day} variant="caption" color={colors.muted} style={styles.headCell}>
            {DAY_NAMES[new Date(day).getDay()]}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0]} style={styles.weekRow}>
          {week.map((day) => {
            const active = sameDay(day, selectedDate);
            const inMonth = sameMonth(day, selectedDate);
            const chips = tasksByDay.get(day) ?? [];
            const extra = chips.length - MAX_CHIPS;
            const numColor = active ? colors.white : inMonth ? colors.ink : colors.mutedSoft;
            return (
              <Pressable
                key={day}
                onPress={() => onSelect(day)}
                style={[styles.cell, !inMonth && styles.cellOutside, active && styles.cellActive]}>
                <Text variant="heading" color={numColor} style={styles.dayNum}>
                  {new Date(day).getDate()}
                </Text>
                {chips.slice(0, MAX_CHIPS).map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.chip,
                      { backgroundColor: subjectsById.get(t.subjectId)?.color ?? colors.pill.other },
                      t.done && styles.chipDone,
                    ]}>
                    <Text numberOfLines={1} color={colors.white} style={styles.chipText}>
                      {t.title}
                    </Text>
                  </View>
                ))}
                {extra > 0 && (
                  <Text color={active ? colors.white : colors.muted} style={styles.chipText}>
                    +{extra} more
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 6, paddingBottom: 8 },
  headRow: { flexDirection: 'row', paddingTop: 14, paddingBottom: 6 },
  headCell: { flex: 1, textAlign: 'center' },
  weekRow: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderRadius: 10, paddingHorizontal: 3, paddingTop: 4, gap: 3, overflow: 'hidden' },
  cellOutside: { backgroundColor: colors.finishedBg },
  cellActive: { backgroundColor: colors.ink },
  dayNum: { fontSize: 17, lineHeight: 22, paddingLeft: 4, marginBottom: 2 },
  chip: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  chipDone: { opacity: 0.45 },
  chipText: { fontFamily: fonts.semiBold, fontSize: 9, lineHeight: 12 },
});
