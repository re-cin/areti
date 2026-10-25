import { Dropdown } from '@/components/ui/Dropdown';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { addTask } from '@/db/queries/tasks';
import { NewSubjectSheet } from '@/features/planner/newSubjectSheet';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { startOfDay } from '@/lib/dates';
import { borders, colors, radii, spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TODO: replace with the real sound list / settings once notifications are built.
const SOUNDS = ['Silent', 'Default', 'Chime', 'Bell'];

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/** minutes since midnight -> "7 : 30 am" */
function fmtTime(min: number) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12} : ${String(m).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

function fmtDuration(min: number) {
  if (min <= 0) return '--';
  if (min < 60) return `${min} mins`;
  const hrs = Math.round((min / 60) * 10) / 10;
  return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
}

const minToDate = (min: number) => {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
};

function TimePill({ min, color, onPress }: { min: number; color: string; onPress: () => void }) {
  const offset = borders.shadowOffset;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="button">
      {({ pressed }) => (
        <View style={{ transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            radius={radii.pill}
            backgroundColor={color}
            style={{ paddingVertical: 10, alignItems: 'center' }}>
            <Text variant="smallStrong">{fmtTime(min)}</Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}

export default function AddTaskScreen() {
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();

  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const goBack = () => {
    navigation.setOptions({ animation: 'none' }); // we already animated it out ourselves
    requestAnimationFrame(() => router.back());
  };

  const onBackPress = () => {
    x.value = withTiming(width, { duration: 220 }, (finished) => {
      if (finished) runOnJS(goBack)();
    });
  };
  
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { subjects } = useSubjects();
  const { openPicker, pickerElement } = useDateTimePicker();

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [date, setDate] = useState(() => startOfDay(dateParam ? new Date(Number(dateParam)) : new Date()));
  const [startMin, setStartMin] = useState(9 * 60);
  const [endMin, setEndMin] = useState(10 * 60);
  const [sound, setSound] = useState('Silent');
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

  const subjectOptions = subjects.map((s) => ({ key: s.id, label: s.name, color: s.color }));
  const soundOptions = SOUNDS.map((s) => ({ key: s, label: s }));

  const pickDate = () => openPicker('date', new Date(date), (d) => setDate(startOfDay(d)));

  const pickStart = () =>
    openPicker('time', minToDate(startMin), (d) => {
      const m = d.getHours() * 60 + d.getMinutes();
      setStartMin(m);
      if (endMin <= m) setEndMin(Math.min(m + 60, 23 * 60 + 59)); // keep end after start
    });

  const pickEnd = () =>
    openPicker('time', minToDate(endMin), (d) => setEndMin(d.getHours() * 60 + d.getMinutes()));

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

  const onSchedulePomodoro = async () => {
    const id = await save();
    if (id === null) return;
    backToPlanner();
    // TODO: have the Pomodoro screen read `taskId` and pre-link the session to this task.
    router.navigate({ pathname: '/pomodoro', params: { taskId: String(id) } });
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

      <ScrollView
        style={{ flex: 1 }}
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

        <View style={styles.soundRow}>
          <Text variant="smallStrong">Notification Sound</Text>
          <Dropdown style={{ flex: 1 }} value={sound} options={soundOptions} onChange={setSound} />
        </View>
      </ScrollView>

      {!keyboardOpen && (
        <View style={styles.actions}>
          <NeoButton
            label="Add Task"
            backgroundColor={colors.surface}
            icon={<Ionicons name="add-circle-outline" size={20} color={colors.ink} />}
            disabled={!valid || saving}
            onPress={onAddTask}
          />
          <NeoButton
            label="Schedule Pomodoro"
            backgroundColor={colors.terracotta}
            icon={<Ionicons name="time-outline" size={20} color={colors.ink} />}
            disabled={!valid || saving}
            onPress={onSchedulePomodoro}
          />
        </View>
      )}

      {pickerElement}

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
  soundRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },

  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 15,
    gap: spacing.md,
  },
});