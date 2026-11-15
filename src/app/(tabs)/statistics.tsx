import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvgFocusChart } from '@/components/statistics/AvgFocusChart';
import { StatRow } from '@/components/statistics/StatRow';
import { StreakCalendar } from '@/components/statistics/StreakCalendar';
import { SubjectTimeList } from '@/components/statistics/SubjectTimeList';
import { TodaySummary } from '@/components/statistics/TodaySummary';
import { NeoBox } from '@/components/ui/NeoBox';
import { HeaderGear, ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TealBackdrop } from '@/components/ui/TealBackdrop';
import {
  mockAvgPerDay,
  mockCalendar,
  mockHeatmap,
  mockLevel,
  mockPeriodStats,
  mockStreak,
  mockSubjectTime,
  mockToday,
} from '@/mocks/ui';
import { colors, spacing } from '@/theme';

const PERIODS = ['Week', 'Month', 'All Time'] as const;
type Period = (typeof PERIODS)[number];

// UI only: all numbers are mock data. The period switch only changes the selected tab.
export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('Month');

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <TealBackdrop height={insets.top + 440} curve={0.5} />
        <ScreenHeader
          title="Statistics"
          leading="avatar"
          onAvatarPress={() => router.push('/settings')}
          trailing={<HeaderGear onPress={() => router.push('/settings')} />}
        />

        <TodaySummary
          level={mockLevel.level}
          xp={mockLevel.xp}
          xpGoal={mockLevel.xpGoal}
          studied={mockToday.studied}
          sessions={mockToday.sessions}
          xpGained={mockToday.xpGained}
        />

        <StreakCalendar
          year={mockCalendar.year}
          month={mockCalendar.month}
          today={mockCalendar.today}
          heat={mockHeatmap}
          streak={mockStreak.current}
          peakStreak={mockStreak.peak}
        />

        <View style={{ marginTop: spacing.lg }}>
          <NeoBox style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.lg }}>
            <View>
              <StatRow label="Focus Time" value={mockPeriodStats.focusTime} />
              <StatRow label="Sessions" value={mockPeriodStats.sessions} />
              <StatRow label="Daily Avg Time" value={mockPeriodStats.dailyAvg} />
            </View>
            <AvgFocusChart data={mockAvgPerDay} />
            <SubjectTimeList
              items={mockSubjectTime.map((s) => ({
                subject: s.subject,
                color: colors.pill[s.subjectKey],
                label: s.label,
                progress: s.progress,
              }))}
            />
          </NeoBox>
          {/* Period switch sits across the card's top border. */}
          <View style={{ position: 'absolute', top: -spacing.lg, left: spacing.xl, right: spacing.xl + 4 }}>
            <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
