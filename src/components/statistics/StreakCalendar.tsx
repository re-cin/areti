import { Pressable, View } from 'react-native';
import { StreakIcon } from '@/components/ui/StreakIcon';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Props = {
  year: number;
  /** 0-based month. */
  month: number;
  /** Day of month to highlight as today (only if it is in this month). */
  today?: number;
  /** Day of month -> heat level 0..4. Days not in the map are future / unstudied. */
  heat: Record<number, number>;
  streak: number;
  peakStreak: number;
  onPrev?: () => void;
  onNext?: () => void;
};

type Cell = { day: number; inMonth: boolean };

function buildGrid(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];
  for (let i = lead; i > 0; i--) cells.push({ day: daysInPrev - i + 1, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ day: next++, inMonth: false });
  return cells;
}

/** Month heatmap card with streak footer and less/more legend. */
export function StreakCalendar({ year, month, today, heat, streak, peakStreak, onPrev, onNext }: Props) {
  const cells = buildGrid(year, month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Pressable onPress={onPrev} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous month">
          <Icon name="chevron-left" size={20} strokeWidth={2.6} />
        </Pressable>
        <Text variant="subheading">
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={onNext} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month">
          <Icon name="chevron-right" size={20} strokeWidth={2.6} />
        </Pressable>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.sm, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((d) => (
            <Text key={d} variant="caption" color={colors.muted} style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={{ flexDirection: 'row' }}>
            {week.map((cell, ci) => (
              <View key={ci} style={{ flex: 1, alignItems: 'center' }}>
                <DayTile cell={cell} isToday={cell.inMonth && cell.day === today} level={cell.inMonth ? heat[cell.day] : undefined} />
              </View>
            ))}
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          paddingTop: spacing.sm,
          gap: spacing.sm,
        }}>
        <StreakIcon size={20} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" color={colors.terracottaDark} style={{ fontSize: 15 }}>
            {streak} Day Streak
          </Text>
          <Text variant="caption">Peak streak: {peakStreak}</Text>
        </View>
        <Text variant="caption" color={colors.muted} style={{ fontSize: 9 }}>
          LESS
        </Text>
        {colors.heat.map((c, i) => (
          <View
            key={i}
            style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c, borderWidth: 1, borderColor: colors.mutedSoft }}
          />
        ))}
        <Text variant="caption" color={colors.muted} style={{ fontSize: 9 }}>
          MORE
        </Text>
      </View>
    </NeoBox>
  );
}

function DayTile({ cell, isToday, level }: { cell: Cell; isToday: boolean; level?: number }) {
  const size = 38;
  // Out-of-month and future days are plain numbers without a tile.
  if (!cell.inMonth || (level === undefined && !isToday)) {
    return (
      <View style={{ width: size, height: size + borders.smallShadowOffset, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyStrong" color={cell.inMonth ? colors.ink : colors.mutedSoft}>
          {cell.day}
        </Text>
      </View>
    );
  }
  const bg = isToday ? colors.ink : colors.heat[level ?? 0];
  return (
    <NeoBox
      radius={radii.tile}
      offset={borders.smallShadowOffset}
      backgroundColor={bg}
      style={{ width: size - 2, height: size - 2, borderWidth: borders.thin, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="bodyStrong" color={isToday ? colors.white : colors.ink}>
        {cell.day}
      </Text>
    </NeoBox>
  );
}
