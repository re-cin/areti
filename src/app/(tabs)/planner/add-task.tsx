import { Dropdown } from '@/components/ui/Dropdown';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { addTask } from '@/db/queries/tasks';
import { NewSubjectSheet } from '@/components/planner/NewSubjectSheet';
import { TimePill } from '@/components/planner/TimePill';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import { useDbQuery } from '@/lib/useDbQuery';
import { DEFAULT_DAILY_GOAL_MIN, loadDailyGoalMin } from '@/features/settings/preferences';
import { formatDuration } from '@/lib/format';
import { startOfDay } from '@/lib/dates';
import { borders, colors, radii, spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { showNotice } from '@/stores/notice';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getSetting, setSetting } from '@/features/settings/settingsRepo';

/** Settings key: true once "Don't remind me again" was ticked on the Schedule Pomodoro warning. */
const SCHEDULE_WARNING_OFF = 'hint.schedulePomodoroWarning.off';
import { useNotificationSoundNames } from '@/features/audio/sounds';
import { playChime } from '@/features/audio/playChime';
import { loadPomodoroSettings } from '@/features/timer/pomodoroSettings';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Same list as Pomodoro settings (src/features/audio/sounds.ts), including Silent.

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

function fmtDuration(min: number) {
  if (min <= 0) return '--';
  if (min < 60) return `${min} mins`;
  const hrs = Math.round((min / 60) * 10) / 10;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}

const isToday = (day: number) => day === startOfDay(Date.now());

/** Earliest start (minutes from midnight) allowed on `day`: now for today, midnight otherwise. */
function earliestStartMin(day: number) {
  if (!isToday(day)) return 0;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** 9:00 am, or on today once that has passed, the next half hour from now (at most 11:00 pm). */
function defaultStart(day: number) {
  const earliest = earliestStartMin(day);
  if (earliest <= 9 * 60) return 9 * 60;
  return Math.min(Math.ceil((earliest + 1) / 30) * 30, 23 * 60);
}

const minToDate = (min: number) => {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
};

export default function AddTaskScreen() {
  const soundNames = useNotificationSoundNames();
  const SOUND_OPTIONS = soundNames.map((s) => ({ key: s, label: s }));
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();

  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const goBack = () => {
    navigation.setOptions({ animation: 'none' }); // we already animated it out ourselves
    requestAnimationFrame(() => {
      router.back();
      if (fromPomodoro) router.navigate('/pomodoro');
    });
  };

  const onBackPress = () => {
    x.set(withTiming(width, { duration: 220 }, (finished) => {
      if (finished) runOnJS(goBack)();
    }));
  };
  
  const { date: dateParam, from } = useLocalSearchParams<{ date?: string; from?: string }>();
  // Opened from the Pomodoro page's +: "Add Task" is disabled, only "Schedule Pomodoro" works,
  // and "<" goes back to the Pomodoro page.
  const fromPomodoro = from === 'pomodoro';
  const { subjects } = useSubjects();
  const { openPicker, pickerElement } = useDateTimePicker();

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState(() => startOfDay(dateParam ? new Date(Number(dateParam)) : new Date()));
  // Default 9:00–10:00, or for today (once 9:00 has passed) the next half hour from now.
  const [startMin, setStartMin] = useState(() => defaultStart(date));
  const [endMin, setEndMin] = useState(() => Math.min(defaultStart(date) + 60, 23 * 60 + 59));
  // Every new task starts on Silent (also after Cancel / back: Add Task opens fresh each time).
  const [sound, setSound] = useState('Silent');
  // Notification volume from Pomodoro settings, used when previewing a sound.
  const [soundVolume, setSoundVolume] = useState(80);
  useEffect(() => {
    loadPomodoroSettings()
      .then((s) => setSoundVolume(s.notificationVolume)) // only the volume, for the preview
      .catch(() => {});
  }, []);
  // Picking a sound plays it once, so you hear what it is (Silent plays nothing).
  const chooseSound = (v: string) => {
    setSound(v);
    playChime(v, soundVolume);
  };
  const [saving, setSaving] = useState(false);
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);

  // The bottom buttons are hidden while the keyboard is open, so they never ride up on top of it.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const duration = endMin - startMin;
  const valid = name.trim().length > 0 && subjectId !== null && duration > 0;

  // The daily goal never blocks a task; it only warns when this day would go over it.
  const goalMin = useDbQuery(loadDailyGoalMin, DEFAULT_DAILY_GOAL_MIN);
  const { todo: dayTodo, finished: dayDone } = useTasksForDate(date);
  const dayMinutes = [...dayTodo, ...dayDone].reduce((sum, t) => sum + Math.max(0, t.endMinute - t.startMinute), 0);
  const overGoal = duration > 0 && dayMinutes + duration > goalMin;
  // Study plans don't move on their own any more, so point out a clash with a planned study session.
  const clash = dayTodo.find(t => t.source === 'generated' && t.startMinute < endMin && startMin < t.endMinute);

  const subjectOptions = subjects.map((s) => ({ key: s.id, label: s.name, color: s.color }));

  // No past days. Moving to today pushes a start time that has already passed to the next half hour.
  const pickDate = () =>
    openPicker(
      'date',
      new Date(date),
      (d) => {
        const day = startOfDay(d);
        setDate(day);
        const earliest = earliestStartMin(day);
        if (startMin < earliest) {
          const length = endMin > startMin ? endMin - startMin : 60;
          const start = defaultStart(day);
          setStartMin(start);
          setEndMin(Math.min(start + length, 23 * 60 + 59));
        }
      },
      new Date(startOfDay(Date.now())),
    );

  const LAST_MIN = 23 * 60 + 59;

  // New start: the end moves with it, keeping the same length (like most calendars).
  const pickStart = () =>
    openPicker('time', minToDate(startMin), (d) => {
      const m = d.getHours() * 60 + d.getMinutes();
      const length = endMin > startMin ? endMin - startMin : 60;
      // Today: a time that has already passed can't be chosen.
      if (m < earliestStartMin(date)) {
        setTimeout(() => showNotice({ title: 'That time has passed', message: 'Pick a start time later than now.' }), 450);
        return;
      }
      if (m >= LAST_MIN) {
        // Wait for the time picker sheet to close first (iOS shows one popup at a time).
        setTimeout(() => showNotice({ title: 'Too late in the day', message: 'Pick a start time before 11:59 pm.', icon: 'clock' }), 450);
        return;
      }
      setStartMin(m);
      setEndMin(Math.min(m + length, LAST_MIN));
    }, isToday(date) ? new Date() : undefined);

  // New end: must be after the start, otherwise it is not applied.
  const pickEnd = () =>
    openPicker('time', minToDate(endMin), (d) => {
      const m = d.getHours() * 60 + d.getMinutes();
      if (m <= startMin) {
        setTimeout(() => showNotice({ title: 'Check the end time', message: 'The end time has to be after the start time.', icon: 'clock' }), 450);
        return;
      }
      setEndMin(m);
    }, isToday(date) ? new Date() : undefined);

  // Saves the task; returns its id, or null if it couldn't be saved.
  const save = async () => {
    if (!valid || saving) return null;
    setSaving(true);
    try {
      return await addTask({
        title: name.trim(),
        subjectId: subjectId!,
        date, // local midnight, epoch ms
        startMinute: startMin,
        endMinute: endMin,
        notificationSound: sound,
      });
    } catch (e) {
      console.error('addTask failed', e);
      Alert.alert('Could not save the task', String(e));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Back to the Planner, showing the day the task was added to so the new card is visible.
  const backToPlanner = () =>
    router.dismissTo({ pathname: '/planner', params: { date: String(date), n: String(Date.now()) } });

  const onAddTask = async () => {
    const id = await save();
    if (id === null) return;
    backToPlanner();
  };

  // Warning before "Schedule Pomodoro", unless the user ticked "Don't remind me again".
  const [warnOpen, setWarnOpen] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);
  const onSchedulePress = async () => {
    if (!valid || saving) return;
    const skip = await getSetting<boolean>(SCHEDULE_WARNING_OFF, false);
    if (skip) return void onSchedulePomodoro();
    setDontRemind(false);
    setWarnOpen(true);
  };
  const confirmSchedule = async () => {
    setWarnOpen(false);
    if (dontRemind) await setSetting(SCHEDULE_WARNING_OFF, true);
    // Let the warning finish closing before moving to the Pomodoro settings (iOS).
    setTimeout(() => void onSchedulePomodoro(), 300);
  };

  const onSchedulePomodoro = async () => {
    const id = await save();
    if (id === null) return;
    backToPlanner();
    // Pomodoro settings for this task. Saving there adds it to Upcoming Sessions; "<" leaves it as a plain task.
    router.push({ pathname: '/settings/timer', params: { taskId: String(id), sound } });
  };

  return (
    <Animated.View style={[styles.root, slideStyle]}>
      {/* Teal cap with the curved bottom, like the mockup */}
      <View style={[styles.cap, { height: insets.top + 14 }]} />

      <View style={styles.header}>
        <Pressable onPress={onBackPress} hitSlop={10} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
          <Text variant="title" style={{ fontSize: 24 }}>Add Task</Text>
        </Pressable>
        <Pressable hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {/* The form itself doesn't scroll (it fits the screen); only the sound list scrolls. */}
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={false}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <Text variant="smallStrong">Task Name</Text>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Physics Study Chapter 1"
          returnKeyType="done"
          onFocus={() => setKeyboardOpen(true)}
        />

        <View style={styles.labelRow}>
          <Text variant="smallStrong">Subject</Text>
          <Pressable style={styles.newSub} hitSlop={8} onPress={() => setNewSubjectOpen(true)}>
            <Text variant="captionStrong" color={colors.tealText}>+</Text>
            <Text variant="captionStrong" color={colors.inkSoft}>New Sub</Text>
          </Pressable>
        </View>
        <Dropdown
          uppercase
          value={subjectId}
          options={subjectOptions}
          placeholder="Select a subject"
          onChange={setSubjectId}
          emptyLabel="No subjects yet"
        />

        <Text variant="smallStrong">Date</Text>
        <Pressable onPress={pickDate} style={styles.dateField}>
          <Text variant="smallStrong" style={{ flex: 1 }}>{fmtDate(date)}</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.ink} />
        </Pressable>

        <View style={styles.timeRow}>
          <View style={styles.timeLabel}>
            <Text variant="smallStrong">Time</Text>
            <Text variant="caption" color={colors.placeholder}>{fmtDuration(duration)}</Text>
          </View>
          <TimePill min={startMin} color={colors.teal} onPress={pickStart} />
          <Text variant="smallStrong">-</Text>
          <TimePill min={endMin} color={colors.terracotta} onPress={pickEnd} />
        </View>

        {clash && (
          <Text variant="caption" color={colors.dangerDark} style={{ marginTop: 8 }}>
            This overlaps the study session “{clash.title}”. You can still add it; Reschedule that exam’s study plan to move the session.
          </Text>
        )}
        {overGoal && (
          <View style={{ marginTop: 8, gap: 6 }}>
            <Text variant="caption" color={colors.dangerDark}>
              This day will have {formatDuration(dayMinutes + duration)} of study, over your daily goal of {formatDuration(goalMin)}. You can still add it.
            </Text>
            <Pressable onPress={() => router.push('/settings/preferences')} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
              <Ionicons name="options-outline" size={15} color={colors.ink} />
              <Text variant="captionStrong">Change daily goal in Preferences</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.ink} />
            </Pressable>
          </View>
        )}

        <Text variant="smallStrong" style={{ marginTop: 14 }}>Notification Sound</Text>
        {/* Full width like the other fields. Opens downward in the form (pushing the space below), so it
            never slides under the Add Task / Schedule Pomodoro buttons; the form scrolls if needed. */}
        <Dropdown value={sound} options={SOUND_OPTIONS} onChange={chooseSound} inline visibleRows={3} selectedColor={colors.tealSoft} />
      </ScrollView>

      {!keyboardOpen && (
        <View style={styles.actions}>
          <NeoButton
            label="Add Task"
            backgroundColor={colors.surface}
            icon={<Ionicons name="add-circle-outline" size={20} color={colors.ink} />}
            disabled={fromPomodoro || !valid || saving}
            onPress={onAddTask}
          />
          <NeoButton
            label="Schedule Pomodoro"
            backgroundColor={colors.terracotta}
            icon={<Ionicons name="time-outline" size={20} color={colors.ink} />}
            disabled={!valid || saving}
            onPress={onSchedulePress}
          />
        </View>
      )}

      {pickerElement}

      <ConfirmDialog
        visible={warnOpen}
        title="Schedule Pomodoro?"
        message="Choosing Schedule Pomodoro will overwrite the scheduled time."
        checkboxLabel="Don't remind me again"
        checked={dontRemind}
        onToggleChecked={() => setDontRemind((v) => !v)}
        cancelLabel="Cancel"
        confirmLabel="Continue"
        confirmColor={colors.terracotta}
        onCancel={() => setWarnOpen(false)}
        onConfirm={confirmSchedule}
      />

      {/* Keep last so it draws on top of everything above the tab bar */}
      <NewSubjectSheet
        visible={newSubjectOpen}
        onClose={() => setNewSubjectOpen(false)}
        onCreated={setSubjectId}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sheet },
  cap: {
    backgroundColor: colors.teal,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  newSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: borders.thin,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  timeLabel: { width: 52 },

  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 15,
    gap: spacing.md,
  },
});
