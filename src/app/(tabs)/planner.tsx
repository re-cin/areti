import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const extra = {
  sheet: '#E9E3DC',
  dayStrip: '#F2EDE4',
  terracotta: '#D99A7C',
  orange: '#C2570C',
  tealText: '#1E8A8A',
  muted: '#2D2D2D',
  finishedBg: '#EFE9E1',
  finishedShadow: '#6B6560',
};
const subject = {
  physics: colors.pill.physics,
  calculus: '#D0605E',
  biology: '#4FA66B',
};

type Task = {
  id: string;
  time: string;
  duration: string;
  title: string;
  subject: string;
  color: string;
  done: boolean;
};

const DAYS = [
  { label: 'Mon', date: 14, dot: false },
  { label: 'Tue', date: 14, dot: false },
  { label: 'Wed', date: 16, dot: false },
  { label: 'Thu', date: 17, dot: false },
  { label: 'Fri', date: 18, dot: false },
  { label: 'Sat', date: 19, dot: true },
  { label: 'Sun', date: 20, dot: false },
];

// TODO: replace with data from the planner store / db
const INITIAL_TASKS: Task[] = [
  { id: '1', time: '10 am', duration: '1 hr', title: 'Physics Finals', subject: 'Physics', color: subject.physics, done: false },
  { id: '2', time: '2 pm', duration: '1 hr', title: 'Calculus Prep & Limits', subject: 'Calculus', color: subject.calculus, done: false },
  { id: '3', time: '1 pm', duration: '1 hr', title: 'Chapter 1 - Cells', subject: 'Biology', color: subject.biology, done: true },
  { id: '4', time: '3 pm', duration: '45 mins', title: 'Thermodynamics Problem Set', subject: 'Physics', color: subject.physics, done: false },
  { id: '5', time: '4 pm', duration: '1.5 hrs', title: 'Integration by Parts Drills', subject: 'Calculus', color: subject.calculus, done: false },
  { id: '6', time: '5 pm', duration: '1 hr', title: 'Genetics & DNA Lab Review', subject: 'Biology', color: subject.biology, done: false },
  { id: '7', time: '6 pm', duration: '30 mins', title: 'Electromagnetism Formulas', subject: 'Physics', color: subject.physics, done: false },
  { id: '8', time: '7 pm', duration: '1 hr', title: 'Derivatives & Chain Rule', subject: 'Calculus', color: subject.calculus, done: true },
];

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          <Feather name="user" size={16} color={colors.ink} />
        </View>
        <Text variant="title">Pomodoro</Text>
      </View>
      <Pressable hitSlop={10}>
        <Ionicons name="settings-outline" size={24} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function WeekBar({ title }: { title: string }) {
  return (
    <View style={styles.weekBar}>
      <View style={styles.weekNav}>
        <Pressable hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text variant="subheading">{title}</Text>
        <Pressable hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.weekIcons}>
        <Pressable hitSlop={10}>
          <Ionicons name="calendar-outline" size={17} color={colors.ink} />
        </Pressable>
        <Pressable hitSlop={10}>
          <Ionicons name="grid-outline" size={17} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function DayStrip({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <View style={styles.dayStrip}>
      <View style={styles.dayStripInner}>
        {DAYS.map((d, i) => {
          const active = i === selected;
          const fg = active ? colors.white : colors.ink;
          return (
            <Pressable key={d.label} onPress={() => onSelect(i)} style={[styles.day, active && styles.dayActive]}>
              <Text variant="captionStrong" color={fg}>{d.label}</Text>
              <Text variant="smallStrong" color={fg}>{d.date}</Text>
              {active && <View style={[styles.dot, { backgroundColor: colors.white }]} />}
              {!active && d.dot && <View style={[styles.dot, { backgroundColor: subject.physics }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ExamBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={[styles.bannerDot, { backgroundColor: subject.physics }]} />
        <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          Physics exam and 3 more in <Text variant="captionStrong" color={extra.orange}>9 days</Text>
        </Text>
      </View>
      <Pressable style={styles.viewBtn}>
        <Text variant="captionStrong">View</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function StreakCard() {
  return (
    <View style={styles.streakWrap}>
      <View style={styles.streakCard}>
        <Ionicons name="flame-outline" size={22} color={extra.terracotta} style={{ marginTop: 4 }} />
        <View style={{ width: 88 }}>
          <Text variant="caption" color={extra.muted}>Current streak</Text>
          <Text variant="heading" style={{ marginTop: -2 }}>12 days</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={{ flex: 1, paddingLeft: 4 }}>
          <Text variant="captionStrong">30 mins. studied today</Text>
          <Text variant="captionStrong" color={extra.tealText}>3 tasks remaining</Text>
        </View>
      </View>
      <View style={styles.bubbleTail} />
    </View>
  );
}

function Mascot() {
  return (
    <View style={styles.mascotRow}>
      <View style={styles.mascotSide}>
        <Text variant="captionStrong" style={{ textAlign: 'right' }}>LVL 4</Text>
        <Text variant="caption" color={extra.muted} style={{ textAlign: 'right' }}>320 / 500 XP</Text>
      </View>
      <View style={styles.mascot}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </View>
    </View>
  );
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done = task.done;
  const fg = done ? extra.muted : colors.ink;
  return (
    <NeoBox
      offset={3}
      backgroundColor={done ? extra.finishedBg : colors.surface}
      shadowColor={done ? extra.finishedShadow : colors.ink}
      style={styles.taskBox}>
      <View style={styles.taskTime}>
        <Text variant="smallStrong" color={fg}>{task.time}</Text>
        <Text variant="caption" color={fg}>{task.duration}</Text>
      </View>
      <View style={[styles.taskBar, { backgroundColor: task.color }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          variant="subheading"
          color={fg}
          numberOfLines={1}
          style={done ? { textDecorationLine: 'line-through' } : undefined}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <Pill label={task.subject} color={task.color} />
          {!done && <Ionicons name="time" size={16} color={task.color} />}
        </View>
      </View>
      <Pressable onPress={onToggle} hitSlop={10}>
        {done ? (
          <View style={styles.checkDone}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
        ) : (
          <View style={styles.check} />
        )}
      </Pressable>
    </NeoBox>
  );
}

export default function PlannerScreen() {
  const [selected, setSelected] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  // Collapsing-header measurements
  const [viewportH, setViewportH] = useState(0);
  const [stickyH, setStickyH] = useState(0);
  const [sheetY, setSheetY] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const todo = tasks.filter((t) => !t.done);
  const finished = tasks.filter((t) => t.done);

  // Scroll distance at which the sheet's top edge reaches the pinned week bar + day strip.
  const collapseY = Math.max(sheetY - stickyH - 8, 1);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y >= collapseY;
    if (next !== collapsedRef.current) {
      collapsedRef.current = next;
      setCollapsed(next);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e: LayoutChangeEvent) => setViewportH(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}>
        {/* 0: scrolls away */}
        <View style={styles.pad}>
          <Header />
        </View>

        {/* 1: pinned to the top once the header has scrolled off */}
        <View style={styles.sticky} onLayout={(e) => setStickyH(e.nativeEvent.layout.height)}>
          <WeekBar title='September Week 3' />
          <DayStrip selected={selected} onSelect={setSelected} />
        </View>

        {/* 2: slides up underneath the pinned block */}
        <View style={styles.pad}>
          <ExamBanner />
          <StreakCard />
          <Mascot />
        </View>

        {/* 3: the cream panel */}
        <View
          style={[styles.sheet, { minHeight: Math.max(viewportH - stickyH, 0) }]}
          onLayout={(e) => setSheetY(e.nativeEvent.layout.y)}>
          <View style={styles.sectionRow}>
            <Text variant="smallStrong" color={extra.muted}>Daily Tasks</Text>
            <Pressable style={styles.editBtn} hitSlop={10}>
              <Ionicons name="pencil" size={13} color={extra.muted} />
              <Text variant="smallStrong" color={extra.muted}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.taskList}>
            {todo.map((t) => (
              <TaskCard key={t.id} task={t} onToggle={() => toggle(t.id)} />
            ))}
          </View>

          <View style={[styles.sectionRow, { marginTop: spacing.md }]}>
            <Text variant="smallStrong" color={extra.muted}>Finished</Text>
            <Text variant="caption" color={extra.muted}>{finished.length} done</Text>
          </View>

          <View style={styles.taskList}>
            {finished.map((t) => (
              <TaskCard key={t.id} task={t} onToggle={() => toggle(t.id)} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky buttons: outside the ScrollView so they stay put above the tab bar */}
      <View style={styles.actions} pointerEvents="box-none">
        <LinearGradient
          colors={['transparent', extra.sheet, extra.sheet]}
          style={styles.actions}
          pointerEvents="box-none">
          <NeoButton
            label="Add Task"
            backgroundColor={extra.terracotta}
            icon={<Ionicons name="add-circle-outline" size={20} color={colors.ink} />}
            style={{ flex: 1 }}
            onPress={() => {}}
          />
          <NeoButton
            label="Set Exam"
            backgroundColor={colors.ink}
            textColor={colors.white}
            shadowColor={extra.finishedShadow}
            icon={<Ionicons name="calendar-outline" size={18} color={colors.white} />}
            style={{ flex: 1 }}
            onPress={() => {}}
          />
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.teal },
  scroll: { flex: 1, backgroundColor: colors.teal },
  pad: { paddingHorizontal: spacing.xl },
  // Opaque teal so content sliding up hides behind it; bottom padding is the gap above the sheet.
  sticky: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.xl,
    paddingBottom: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: 0,
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, justifyContent: 'flex-start', paddingLeft: 5 },
  weekIcons: { flexDirection: 'row', gap: spacing.lg },

  dayStrip: {
    marginTop: spacing.md,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    borderRadius: 26,
    backgroundColor: colors.teal,
    padding: 4,
  },
  dayStripInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: extra.dayStrip,
    borderRadius: 22,
  },
  day: { width: 42, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginVertical: 3,},
  dayActive: { backgroundColor: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },

  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  bannerDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.ink },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  streakWrap: { marginTop: spacing.lg, marginHorizontal: spacing.md },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  streakDivider: { width: 1.5, alignSelf: 'stretch', backgroundColor: colors.ink },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    right: 40,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },

  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    height: 56,
    gap: 16,
  },
  mascotSide: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  mascot: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.ink,
    alignItems: 'center',
    paddingTop: 22,
    marginBottom: -24, // tucks behind the sheet
  },
  eyes: { flexDirection: 'row', gap: 14 },
  eye: { width: 6, height: 10, borderRadius: 3, backgroundColor: colors.white },

  sheet: {
    backgroundColor: extra.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 110, // clears the sticky buttons; raise/lower to taste
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  taskList: { gap: spacing.md },
  taskBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  taskTime: { width: 44, alignItems: 'flex-end' },
  taskBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borders.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  checkDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: subject.biology,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pinned to the bottom of the screen area (which already ends above the tab bar).
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: 35,         // Controls the height of the fade area above the buttons
    paddingBottom: 15, // Keeps buttons positioned above the bottom safe area
  },
});