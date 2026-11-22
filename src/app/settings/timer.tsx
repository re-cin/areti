import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useAudioFocus } from '@/stores/audioFocus';
import { Alert, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dropdown } from '@/components/ui/Dropdown';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Slider } from '@/components/ui/Slider';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import {
  BACKGROUND_SOUNDS,
  DEFAULT_POMODORO,
  loadPomodoroSettings,
  NOTIFICATION_SOUNDS,
  POMODORO_LIMITS,
  savePomodoroSettings,
  type PomodoroSettings,
} from '@/features/timer/pomodoroSettings';
import { useTimer } from '@/features/timer/timerStore';
import { getTaskSummary, scheduleTaskPomodoro, type TaskSummary } from '@/features/timer/timerRepo';
import { formatClock, startOfDay } from '@/lib/dateHelpers';
import { Pill } from '@/components/ui/Pill';
import { backgroundSource, notificationSource } from '@/features/audio/sounds';
import { useSoundPreview } from '@/features/audio/useSoundPreview';
import { colors, fonts, spacing } from '@/theme';

const minutes = (v: number) => `${v} min`;

export default function TimerSettingsScreen() {
  const { width } = useWindowDimensions();
  const [form, setForm] = useState<PomodoroSettings>(DEFAULT_POMODORO);
  const [loaded, setLoaded] = useState(false);
  const running = useTimer((s) => s.status !== 'idle');
  const preview = useSoundPreview();
  // Opened from Planner > Add Task > Schedule Pomodoro: saving also schedules that task.
  // Only a task passed in by Add Task counts; a plain visit (gear button) never shows the scheduling card.
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = typeof params.taskId === 'string' && params.taskId.length > 0 ? params.taskId : undefined;

  // Pause the running session's background sound while this screen is open, so previews don't overlap it.
  const setSettingsOpen = useAudioFocus((st) => st.setSettingsOpen);
  useFocusEffect(
    useCallback(() => {
      setSettingsOpen(true);
      return () => setSettingsOpen(false);
    }, [setSettingsOpen]),
  );
  const [task, setTask] = useState<TaskSummary | null>(null);
  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    getTaskSummary(taskId).then(setTask).catch(() => setTask(null));
  }, [taskId]);
  const insets = useSafeAreaInsets();
  // Locked while a volume slider is being dragged, so the page does not scroll with your finger.
  const [scrollLocked, setScrollLocked] = useState(false);
  const sliderLock = { onDragStart: () => setScrollLocked(true), onDragEnd: () => setScrollLocked(false) };

  useEffect(() => {
    loadPomodoroSettings().then((s) => {
      setForm(s);
      setLoaded(true);
    });
  }, []);

  const set = <K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    preview.stop();
    await savePomodoroSettings(form);
    if (taskId) {
      let scheduled: { date: number } | null = null;
      try {
        scheduled = await scheduleTaskPomodoro(taskId, form);
      } catch (e) {
        Alert.alert('Could not schedule the Pomodoro', e instanceof Error ? e.message : String(e));
        return;
      }
      if (!scheduled) {
        Alert.alert('Task not found', 'This task was deleted, so there is nothing to schedule.');
        return;
      }
      router.setParams({ taskId: '' });
      if (scheduled.date !== startOfDay(new Date()).getTime()) {
        Alert.alert(
          'Pomodoro scheduled',
          `It will show in Upcoming Sessions on ${new Date(scheduled.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.`,
        );
      }
      // Show it in Upcoming Sessions
      if (router.canDismiss()) router.dismissAll();
      router.navigate('/pomodoro');
      return;
    }
    router.back();
  };

  const interval = (key: keyof typeof POMODORO_LIMITS, label: string, format?: (v: number) => string) => {
    const [min, max, step] = POMODORO_LIMITS[key];
    return (
      <Row label={label}>
        <Stepper
          value={form[key]}
          onChange={(v) => {
            preview.stop(); // touching the timer settings ends the sound preview
            set(key, v);
          }}
          min={min} max={max} step={step} format={format} accessibilityLabel={label} />
      </Row>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: -width * 0.25,
          width: width * 1.5,
          height: 460,
          backgroundColor: colors.teal,
          borderBottomLeftRadius: width * 0.75,
          borderBottomRightRadius: width * 0.75,
        }}
      />
      {/* No swipe-to-go-back here: leave only with the < button (or Save Settings). */}
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      {/* Sticky header: stays at the top while the settings scroll */}
      <View style={{ backgroundColor: colors.teal, paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, zIndex: 2 }}>
        <ScreenHeader title="Settings" back />
      </View>
      <ScrollView
        scrollEnabled={!scrollLocked}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled">

        {task && (
          <NeoBox style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text variant="caption" color={colors.muted} style={{ fontFamily: fonts.semiBold }}>
              SCHEDULING A POMODORO FOR
            </Text>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>{task.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pill label={task.subjectName} color={task.subjectColor} />
              <Text variant="caption" color={colors.muted}>
                {new Date(task.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                {formatClock(task.startMinute)} – {formatClock(task.endMinute)}
              </Text>
            </View>
          </NeoBox>
        )}

        <NeoBox style={{ padding: spacing.lg, gap: spacing.xs }}>
          <SectionTitle>Time Interval</SectionTitle>
          {interval('focusCount', 'Focus count')}
          {interval('focusMin', 'Focus time', minutes)}
          {interval('breakMin', 'Break time', minutes)}
          {interval('longBreakMin', 'Long break time', minutes)}
          {running && (
            <Text variant="caption" color={colors.muted} style={{ marginTop: spacing.xs }}>
              A session is running. Your changes (times and sounds) apply from the next session.
            </Text>
          )}

          <SectionTitle style={{ marginTop: spacing.lg }}>Audio & Ambience</SectionTitle>
          <Label>Background Sound</Label>
          <Dropdown
            value={form.backgroundSound}
            options={BACKGROUND_SOUNDS}
            onChange={(v) => {
              set('backgroundSound', v);
              preview.play(backgroundSource(v), form.backgroundVolume, { background: v });
            }}
            accessibilityLabel="Background sound"
          />
          <VolumeLabel label="Background Volume" value={form.backgroundVolume} />
          <Slider
            value={form.backgroundVolume}
            onChange={(v) => {
              set('backgroundVolume', v);
              preview.setVolume(v);
            }}
            accessibilityLabel="Background volume"
            onDragStart={() => {
              sliderLock.onDragStart();
              // Keep (or start) the background preview so you hear the volume while dragging
              if (!preview.isPlayingBackground(form.backgroundSound))
                preview.play(backgroundSource(form.backgroundSound), form.backgroundVolume, { background: form.backgroundSound });
            }}
            onDragEnd={sliderLock.onDragEnd}
          />

          <Label>Notification Sound</Label>
          <Dropdown
            value={form.notificationSound}
            options={NOTIFICATION_SOUNDS}
            onChange={(v) => {
              set('notificationSound', v);
              preview.play(notificationSource(v), form.notificationVolume);
            }}
            accessibilityLabel="Notification sound"
          />
          <VolumeLabel label="Notification Volume" value={form.notificationVolume} />
          <Slider
            value={form.notificationVolume}
            onChange={(v) => {
              set('notificationVolume', v);
              preview.setVolume(v);
            }}
            accessibilityLabel="Notification volume"
            onDragStart={sliderLock.onDragStart}
            onDragEnd={() => {
              sliderLock.onDragEnd();
              // Let you hear the new level
              preview.play(notificationSource(form.notificationSound), form.notificationVolume);
            }}
          />
        </NeoBox>

        <NeoButton label={taskId && task ? 'Save & Schedule' : 'Save Settings'} backgroundColor={colors.terracotta} onPress={save} disabled={!loaded} />
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children, style }: { children: string; style?: object }) {
  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: spacing.sm, marginBottom: spacing.xs }, style]}>
      <Text variant="bodyStrong" style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>
        {children}
      </Text>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}>
      <Text color={colors.muted}>{label}</Text>
      {children}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text color={colors.muted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
      {children}
    </Text>
  );
}

function VolumeLabel({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.md }}>
      <Text color={colors.muted}>{label}</Text>
      <Text variant="caption" style={{ fontFamily: fonts.semiBold }}>
        {value}%
      </Text>
    </View>
  );
}
