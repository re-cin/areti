import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GhostAvatar } from '@/components/GhostAvatar';
import { CalendarHeatmap } from '@/components/stats/CalendarHeatmap';
import { FocusBarChart } from '@/components/stats/FocusBarChart';
import { SubjectBreakdown, type SubjectTime } from '@/components/stats/SubjectBreakdown';
import { NeoBox } from '@/components/ui/NeoBox';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { formatHM, formatLongDuration, isSameDay, MONTHS, startOfDay, startOfMonth } from '@/lib/dateHelpers';
import { useDbQuery } from '@/lib/useDbQuery';
import { useToday } from '@/hooks/useToday';
import { getGhost } from '@/features/pet/petRepo';
import { daySummary, minutesByDay, periodSummary, streaks, subjectTotals, type Period, type StatSession } from '@/features/stats/stats';
import { loadStatSessions } from '@/features/stats/statsRepo';
import { subjectLookup, type SubjectRow } from '@/features/subjects/subjectsRepo';
import { colors, fonts, radii, spacing } from '@/theme';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All Time' },
];

export default function StatisticsScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const todayStamp = useToday();
  const today = useMemo(() => new Date(todayStamp), [todayStamp]);
  const [selected, setSelected] = useState<Date>(today);
  const [month, setMonth] = useState<Date>(startOfMonth(today));
  const [period, setPeriod] = useState<Period>('month');

  // Leaving the tab resets the page (top of the page, today, this month), so it looks fresh when you come back.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        const t = startOfDay(new Date());
        setSelected(t);
        setMonth(startOfMonth(t));
        setPeriod('month');
      },
      [],
    ),
  );

  const sessions = useDbQuery(loadStatSessions, [] as StatSession[]);
  const subjects = useDbQuery(subjectLookup, new Map<string, SubjectRow>());
  const ghost = useDbQuery(getGhost, { id: '', level: 1, xp: 0, xpToNext: 200 });

  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const streak = useMemo(() => streaks(new Set(byDay.keys()), today), [byDay, today]);
  const day = useMemo(() => daySummary(sessions, selected), [sessions, selected]);

  // Month stats follow the month shown in the calendar; week stats follow the selected day.
  const anchor = period === 'month' ? month : selected;
  const summary = useMemo(() => periodSummary(sessions, period, anchor, today), [sessions, period, anchor, today]);
  const subjectItems: SubjectTime[] = useMemo(
    () =>
      // Only real subjects: focus time without a subject (the plain play button), or for a subject that
      // was deleted, is left out of this list. It still counts toward the totals and the streak.
      subjectTotals(sessions, summary.range).flatMap(({ subjectId, minutes }) => {
        const s = subjectId ? subjects.get(subjectId) : undefined;
        return s ? [{ key: subjectId!, name: s.name, color: s.color, minutes }] : [];
      }),
    [sessions, summary.range, subjects],
  );

  const isToday = isSameDay(selected, today);
  const isFuture = selected.getTime() > today.getTime();

  const selectDay = (d: Date) => {
    setSelected(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) setMonth(startOfMonth(d));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {/* Sticky header: stays put while the page scrolls */}
      <View style={{ backgroundColor: colors.teal, paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, zIndex: 2 }}>
        <ScreenHeader title="Statistics" gearHref="/settings/account" />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* Teal backdrop with a rounded bottom edge, scrolls with the content */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -400,
            left: -width * 0.25,
            width: width * 1.5,
            height: 400 + 400,
            backgroundColor: colors.teal,
            borderBottomLeftRadius: width * 0.75,
            borderBottomRightRadius: width * 0.75,
          }}
        />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
          {/* Reti + speech bubble */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ alignItems: 'center', width: 96 }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13 }}>LVL {ghost.level}</Text>
              <GhostAvatar size={88} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  gap: 4,
                  marginTop: spacing.sm,
                }}>
                {/* bubble tail */}
                <View
                  style={{
                    position: 'absolute',
                    left: -8,
                    top: 22,
                    width: 16,
                    height: 16,
                    backgroundColor: colors.surface,
                    transform: [{ rotate: '45deg' }],
                  }}
                />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 16 }}>
                  {isToday ? 'Today you’ve:' : `On ${MONTHS[selected.getMonth()]} ${selected.getDate()} you${isFuture ? '’ll' : '’ve'}:`}
                </Text>
                {isFuture ? (
                  <Text variant="caption" style={{ fontSize: 14, lineHeight: 19 }}>
                    Nothing logged yet. Plan a session and I&apos;ll cheer you on!
                  </Text>
                ) : day.sessions === 0 ? (
                  <Text variant="caption" style={{ fontSize: 14, lineHeight: 19 }}>
                    {isToday ? 'Not studied yet. Start a focus block and I’ll gain XP!' : 'Taken a rest day. No focus sessions logged.'}
                  </Text>
                ) : (
                  <Text variant="caption" style={{ fontSize: 14, lineHeight: 19 }}>
                    Studied for a total of{' '}
                    <Text variant="caption" color={colors.terracottaDark} style={{ fontSize: 14, fontFamily: fonts.medium }}>
                      {formatLongDuration(day.minutes)}
                    </Text>{' '}
                    in{' '}
                    <Text variant="caption" color={colors.terracottaDark} style={{ fontSize: 14, fontFamily: fonts.medium }}>
                      {day.sessions} {day.sessions === 1 ? 'session' : 'sessions'}
                    </Text>{' '}
                    and gained{' '}
                    <Text variant="caption" color={colors.tealDark} style={{ fontSize: 14, fontFamily: fonts.medium }}>
                      {day.xp} XPs
                    </Text>
                    .
                  </Text>
                )}
              </View>
              <Text style={{ alignSelf: 'flex-end', fontFamily: fonts.semiBold, fontSize: 11 }}>
                {ghost.xp} / {ghost.xpToNext} XP
              </Text>
            </View>
          </View>

          <CalendarHeatmap
            month={month}
            selected={selected}
            today={today}
            minutesByDay={byDay}
            streak={streak.current}
            peakStreak={streak.peak}
            onSelect={selectDay}
            onChangeMonth={setMonth}
          />

          {/* Period stats */}
          <View style={{ marginTop: spacing.md }}>
            <NeoBox style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xxl, gap: spacing.md }}>
              <StatRow label="Focus Time" value={formatHM(summary.totalMin)} />
              <StatRow label="Sessions" value={String(summary.sessions)} />
              <StatRow label="Daily Avg Time" value={formatHM(summary.dailyAvgMin)} />

              <Text style={{ fontFamily: fonts.semiBold, fontSize: 18, marginTop: spacing.xs }}>
                {summary.barsAreAverages ? 'Avg Focus Time Per Day' : 'Focus Time Per Day'}
              </Text>
              <FocusBarChart minutes={summary.bars} />

              <View style={{ height: 1, backgroundColor: colors.line, marginVertical: spacing.xs }} />
              <SubjectBreakdown items={subjectItems} />
            </NeoBox>
            <View style={{ position: 'absolute', top: -20, left: spacing.xxl, right: spacing.xxl + 4 }}>
              <SegmentedControl value={period} options={PERIODS} onChange={setPeriod} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}>
      <Text style={{ fontSize: 17 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>{value}</Text>
    </View>
  );
}
