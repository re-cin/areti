import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlockDots } from '@/components/pomodoro/BlockDots';
import { LevelProgress } from '@/components/pomodoro/LevelProgress';
import { TimerCircle } from '@/components/pomodoro/TimerCircle';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { UpcomingSessions, type UpcomingSession } from '@/components/pomodoro/UpcomingSessions';
import { HeaderGear, ScreenHeader } from '@/components/ui/ScreenHeader';
import { Sheet } from '@/components/ui/Sheet';
import { TealBackdrop } from '@/components/ui/TealBackdrop';
import { Text } from '@/components/ui/Text';
import { mockLevel, mockUpcomingSessions } from '@/mocks/ui';
import { colors, spacing } from '@/theme';

// UI only. `running` and `expanded` just switch between the Figma states
// (Timer / Timer WORKING / CLICK TO SEE ALL TASKS); the time shown is static.
const BLOCKS = 4;

export default function PomodoroScreen() {
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const time = running ? '23:49' : '00:00';
  const sessions: UpcomingSession[] = mockUpcomingSessions.map((s) => ({
    id: s.id,
    subject: s.subject,
    color: colors.pill[s.subjectKey],
    time: s.time,
    blocks: s.blocks,
    minutes: s.minutes,
  }));

  if (expanded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.teal }}>
        <View style={{ paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxl, alignItems: 'center', gap: spacing.sm }}>
          <BlockDots total={BLOCKS} active={running ? 0 : -1} shape="pill" />
          <Text variant="display" style={{ fontSize: 56, lineHeight: 62 }}>
            {time}
          </Text>
        </View>
        <Sheet style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <UpcomingSessions sessions={sessions} expanded onToggle={() => setExpanded(false)} />
          </ScrollView>
        </Sheet>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <TealBackdrop height={insets.top + 470} />
        <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <ScreenHeader
            title="Pomodoro"
            leading="avatar"
            onAvatarPress={() => router.push('/settings')}
            trailing={<HeaderGear onPress={() => router.push('/pomodoro/settings')} />}
          />
          <LevelProgress
            level={mockLevel.level}
            xp={mockLevel.xp}
            xpGoal={mockLevel.xpGoal}
            blocks={BLOCKS}
            activeBlock={running ? 0 : -1}
          />
          <View style={{ alignItems: 'center' }}>
            <TimerCircle time={time} phase={running ? 'FOCUS' : undefined} />
          </View>
        </View>

        <View style={{ paddingVertical: spacing.xl + spacing.sm }}>
          <TimerControls
            running={running}
            onStart={() => setRunning(true)}
            onPause={() => setRunning(false)}
            onStop={() => setRunning(false)}
            onSettings={() => router.push('/pomodoro/settings')}
          />
        </View>

        <Sheet style={{ flexGrow: 1 }}>
          <UpcomingSessions sessions={sessions} onToggle={() => setExpanded(true)} />
        </Sheet>
      </ScrollView>
    </View>
  );
}
