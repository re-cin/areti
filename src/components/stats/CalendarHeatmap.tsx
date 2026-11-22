import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { addMonths, dayKey, isSameDay, monthGrid, MONTHS, WEEKDAYS_SHORT } from '@/lib/dateHelpers';
import { intensityLevel } from '@/features/stats/stats';
import { borders, colors, fonts, spacing } from '@/theme';

type Props = {
  month: Date; // any day in the shown month
  selected: Date;
  today: Date;
  minutesByDay: Map<string, number>;
  streak: number;
  peakStreak: number;
  onSelect: (d: Date) => void;
  onChangeMonth: (d: Date) => void;
};

export function CalendarHeatmap({ month, selected, today, minutesByDay, streak, peakStreak, onSelect, onChangeMonth }: Props) {
  const days = monthGrid(month);
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  // Hide a 6th row that belongs entirely to the next month.
  const visibleWeeks = weeks.filter((w, i) => i < 5 || w.some((d) => d.getMonth() === month.getMonth()));

  return (
    <NeoBox style={{ padding: spacing.lg, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Pressable onPress={() => onChangeMonth(addMonths(month, -1))} hitSlop={12} accessibilityLabel="Previous month">
          <Icon name="chevronLeft" size={20} strokeWidth={2.5} />
        </Pressable>
        <Text variant="heading" style={{ fontSize: 18, minWidth: 150, textAlign: 'center' }}>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <Pressable onPress={() => onChangeMonth(addMonths(month, 1))} hitSlop={12} accessibilityLabel="Next month">
          <Icon name="chevronRight" size={20} strokeWidth={2.5} />
        </Pressable>
      </View>
      <View style={{ height: 1, backgroundColor: colors.line }} />

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} variant="caption" color={colors.muted} style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </Text>
        ))}
      </View>

      {visibleWeeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((d) => {
            const inMonth = d.getMonth() === month.getMonth();
            const mins = minutesByDay.get(dayKey(d)) ?? 0;
            const level = intensityLevel(mins);
            const isSelected = isSameDay(d, selected);
            const isToday = isSameDay(d, today);
            const tiled = inMonth && (level > 0 || isSelected);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => onSelect(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${MONTHS[d.getMonth()]} ${d.getDate()}, ${Math.round(mins)} minutes`}
                style={{ flex: 1, aspectRatio: 1, padding: 2 }}>
                <View style={{ flex: 1 }}>
                  {tiled && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 9,
                        backgroundColor: colors.ink,
                      }}
                    />
                  )}
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 9,
                      borderWidth: tiled ? borders.thin : 0,
                      borderColor: colors.ink,
                      backgroundColor: isSelected ? colors.ink : tiled ? colors.heat[level] : 'transparent',
                    }}>
                    <Text
                      style={{
                        fontFamily: isToday || tiled ? fonts.semiBold : fonts.medium,
                        fontSize: 15,
                        textDecorationLine: isToday && !isSelected ? 'underline' : 'none',
                      }}
                      color={isSelected ? colors.white : inMonth ? colors.ink : colors.mutedSoft}>
                      {d.getDate()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={{ height: 1, backgroundColor: colors.line, marginTop: spacing.xs }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="flame" size={22} color={colors.terracottaDark} fill={colors.terracotta} strokeWidth={1.2} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 15 }} color={colors.terracottaDark}>
            {streak} Day Streak
          </Text>
          <Text variant="caption" style={{ fontFamily: fonts.medium }}>
            Peak streak: {peakStreak}
          </Text>
        </View>
        <Text variant="caption" color={colors.muted} style={{ fontSize: 9 }}>
          LESS
        </Text>
        {colors.heat.map((c, i) => (
          <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c, borderWidth: 1, borderColor: colors.mutedSoft }} />
        ))}
        <Text variant="caption" color={colors.muted} style={{ fontSize: 9 }}>
          MORE
        </Text>
      </View>
    </NeoBox>
  );
}
