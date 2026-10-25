import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { setTaskDone } from '@/db/queries/tasks';
import { toCardTask, type CardTask } from '@/features/planner/cardTask';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaskDays } from '@/hooks/useTaskDays';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import { DAY_NAMES, addDays, sameDay, startOfDay, startOfWeek, weekDays, weekLabel } from '@/lib/dates';
import { borders, colors, radii, spacing } from '@/theme';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: move these into @/theme
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
const dotColor = colors.pill.physics;

function Header() {
  // TODO: show the profile picture the user chose in Account settings, and open Settings from the gear.
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

function WeekBar({ title, onPrev, onNext }: { title: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={styles.weekBar}>
      <View style={styles.weekNav}>
        <Pressable onPress={onPrev} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text variant="subheading">{title}</Text>
        <Pressable onPress={onNext} hitSlop={10}>
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

function DayStrip({
  days,
  selectedDate,
  markedDays,
  onSelect,
}: {
  days: number[];
  selectedDate: number;
  markedDays: Set<number>;
  onSelect: (day: number) => void;
}) {
  return (
    <View style={styles.dayStrip}>
      <View style={styles.dayStripInner}>
        {days.map((day) => {
          const active = sameDay(day, selectedDate);
          const fg = active ? colors.white : colors.ink;
          const date = new Date(day);
          return (
            <Pressable key={day} onPress={() => onSelect(day)} style={[styles.day, active && styles.dayActive]}>
              <Text variant="captionStrong" color={fg}>{DAY_NAMES[date.getDay()]}</Text>
              <Text variant="smallStrong" color={fg}>{date.getDate()}</Text>
              {active && <View style={[styles.dot, { backgroundColor: colors.white }]} />}
              {!active && markedDays.has(day) && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ExamBanner() {
  // TODO: nearest upcoming exam from the database; "No upcoming exams" when there is none.
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={[styles.bannerDot, { backgroundColor: dotColor }]} />
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

function StreakCard({ remaining }: { remaining: number }) {
  // TODO: streak and minutes studied come from the daily statistics.
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
          <Text variant="captionStrong" color={extra.tealText}>
            {remaining} {remaining === 1 ? 'task' : 'tasks'} remaining
          </Text>
        </View>
      </View>
      <View style={styles.bubbleTail} />
    </View>
  );
}

function Mascot() {
  // TODO: level and XP come from the ghost state.
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

function TaskCard({ task, onToggle }: { task: CardTask; onToggle: () => void }) {
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
          {/* TODO: only show the clock when the task has a linked Pomodoro (task.hasPomodoro) */}
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
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const { date: dateParam, n } = useLocalSearchParams<{ date?: string; n?: string }>();

  useEffect(() => {
    if (dateParam) setSelectedDate(startOfDay(new Date(Number(dateParam))));
  }, [dateParam, n]);

  const weekStart = startOfWeek(selectedDate); // TODO: follow the "first day of week" setting
  const days = weekDays(weekStart);

  const { byId } = useSubjects();
  const { todo, finished } = useTasksForDate(selectedDate);
  const { todo: todayTodo } = useTasksForDate(today);
  const markedDays = useTaskDays(days[0], days[6]);

  // Layout measurements for the sticky header and the cream sheet
  const [viewportH, setViewportH] = useState(0);
  const [stickyH, setStickyH] = useState(0);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        stickyHeaderIndices={[1]}
        onLayout={(e: LayoutChangeEvent) => setViewportH(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}>
        {/* 0: scrolls away */}
        <View style={styles.pad}>
          <Header />
        </View>

        {/* 1: pinned to the top once the header has scrolled off */}
        <View style={styles.sticky} onLayout={(e) => setStickyH(e.nativeEvent.layout.height)}>
          <WeekBar
            title={weekLabel(weekStart)}
            onPrev={() => setSelectedDate(addDays(selectedDate, -7))}
            onNext={() => setSelectedDate(addDays(selectedDate, 7))}
          />
          <DayStrip days={days} selectedDate={selectedDate} markedDays={markedDays} onSelect={setSelectedDate} />
        </View>

        {/* 2: slides up underneath the pinned block */}
        <View style={styles.pad}>
          <ExamBanner />
          <StreakCard remaining={todayTodo.length} />
          <Mascot />
        </View>

        {/* 3: the cream panel */}
        <View style={[styles.sheet, { minHeight: Math.max(viewportH - stickyH, 0) }]}>
          <View style={styles.sectionRow}>
            <Text variant="smallStrong" color={extra.muted}>Daily Tasks</Text>
            <Pressable style={styles.editBtn} hitSlop={10}>
              <Ionicons name="pencil" size={13} color={extra.muted} />
              <Text variant="smallStrong" color={extra.muted}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.taskList}>
            {todo.map((t) => (
              <TaskCard key={t.id} task={toCardTask(t, byId)} onToggle={() => setTaskDone(t.id, true)} />
            ))}
          </View>

          <View style={[styles.sectionRow, { marginTop: spacing.md }]}>
            <Text variant="smallStrong" color={extra.muted}>Finished</Text>
            <Text variant="caption" color={extra.muted}>{finished.length} done</Text>
          </View>

          <View style={styles.taskList}>
            {finished.map((t) => (
              <TaskCard key={t.id} task={toCardTask(t, byId)} onToggle={() => setTaskDone(t.id, false)} />
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
            onPress={() =>
              router.push({ pathname: '/planner/add-task', params: { date: String(selectedDate) } })
            }
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
  day: { width: 42, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
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
    backgroundColor: colors.ink,
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
    paddingTop: 35, // Controls the height of the fade area above the buttons
    paddingBottom: 15, // Keeps buttons positioned above the bottom safe area
  },
});