import { DayRow } from '@/components/planner/DayRow';
import { ExamBanner } from '@/components/planner/ExamBanner';
import { MonthGrid } from '@/components/planner/MonthGrid';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { PlannerMascot } from '@/components/planner/PlannerMascot';
import { StreakCard } from '@/components/planner/StreakCard';
import { TaskCard } from '@/components/planner/TaskCard';
import { WeekBar } from '@/components/planner/WeekBar';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { deleteTask, setTaskDone } from '@/db/queries/tasks';
import type { CardTask } from '@/features/planner/cardTask';
import { toCardTask } from '@/features/planner/cardTask';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaskDays } from '@/hooks/useTaskDays';
import { useTasksByDay } from '@/hooks/useTasksByDay';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import {
  addDays,
  addMonths,
  monthLabel,
  monthWeeks,
  startOfDay,
  startOfWeek,
  weekDays,
  weekLabel,
} from '@/lib/dates';
import { borders, colors, spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { plannerColors as extra } from '@/components/planner/plannerColors';

// Calendar expand / collapse
const STRIP_INNER_H = 60; // one row of day cells: 54 tall + 3 margin above and below
const CARD_CHROME = 11; // outline (1.5 x 2) + teal padding (4 x 2) around the calendar's cream track
const BUTTONS_H = 100; // the Add Task / Set Exam bar drawn over the bottom of the screen
const EXPAND_MS = 380;


export default function PlannerScreen() {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const { date: dateParam, n } = useLocalSearchParams<{ date?: string; n?: string }>();

  const routeSelection = `${dateParam ?? ''}:${n ?? ''}`;
  const [previousRouteSelection, setPreviousRouteSelection] = useState<string | null>(null);
  if (previousRouteSelection !== routeSelection) {
    setPreviousRouteSelection(routeSelection);
    const next = dateParam ? startOfDay(Number(dateParam)) : NaN;
    if (Number.isFinite(next)) setSelectedDate(next);
  }

  const weekStart = startOfWeek(selectedDate); // TODO: follow the "first day of week" setting
  const days = weekDays(weekStart);

  const { byId } = useSubjects();
  const { todo, finished } = useTasksForDate(selectedDate);
  const { todo: todayTodo } = useTasksForDate(today);
  const markedDays = useTaskDays(days[0], days[6]);

  // Edit mode (Edit button or long press on a task): your own tasks show a delete button. "Done" just exits.
  // Study plan sessions are never deleted here: tapping one opens its plan, where it can be removed.
  const [editing, setEditing] = useState(false);
  const openPlan = (task: CardTask) => {
    if (task.generated && task.planId) {
      router.push({ pathname: '/planner/exam-study-plan', params: { id: task.planId, date: String(selectedDate) } });
    }
  };
  const confirmDelete = (task: CardTask) => {
    Alert.alert(`Delete "${task.title}"?`, task.hasPomodoro ? 'Its Pomodoro session is removed too.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteTask(task.id) },
    ]);
  };

  // Month view (opened from the calendar icon)
  const [expanded, setExpanded] = useState(false);
  const weeks = monthWeeks(selectedDate); // TODO: follow the "first day of week" setting
  const tasksByDay = useTasksByDay(weeks[0][0], weeks[weeks.length - 1][6]);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const progress = useSharedValue(0); // 0 = week strip, 1 = full month

  // Leaving the tab resets the page (scrolled to the top, week view), so it looks fresh when you come back.
  useFocusEffect(
    useCallback(
      () => () => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setExpanded(false);
        setEditing(false);
        progress.set(0);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
  );

  useEffect(() => {
    progress.set(withTiming(expanded ? 1 : 0, { duration: EXPAND_MS, easing: Easing.out(Easing.cubic) }));
  }, [expanded, progress]);

  const toggleCalendar = () => {
    if (!expanded) scrollRef.current?.scrollTo({ y: 0, animated: true });
    setExpanded(!expanded);
  };

  // Layout measurements for the sticky header and the cream sheet
  const [viewportH, setViewportH] = useState(0);
  const [stickyH, setStickyH] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [weekBarH, setWeekBarH] = useState(0);

  // The month fills the screen down to the action buttons.
  const monthInnerH = Math.max(
    viewportH - headerH - weekBarH - spacing.md - CARD_CHROME - styles.sticky.paddingBottom - BUTTONS_H,
    320,
  );

  // Slide down: the cream track grows from one row to the whole month, revealing it top to bottom.
  const trackStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.get(), [0, 1], [STRIP_INNER_H, monthInnerH]),
  }));
  const weekRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));
  const monthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.1, 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const spacerStyle = useAnimatedStyle(() => ({ height: progress.get() * BUTTONS_H }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!expanded}
        style={styles.scroll}
        stickyHeaderIndices={[1]}
        onLayout={(e: LayoutChangeEvent) => setViewportH(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}>
        {/* 0: scrolls away */}
        <View style={styles.pad} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          <PlannerHeader />
        </View>

        {/* 1: pinned to the top once the header has scrolled off */}
        <View style={styles.sticky} onLayout={(e) => setStickyH(e.nativeEvent.layout.height)}>
          {/* Cream backdrop that rises behind the open month */}
          <Animated.View pointerEvents="none" style={[styles.monthBackdrop, backdropStyle]} />

          <View onLayout={(e) => setWeekBarH(e.nativeEvent.layout.height)}>
            <WeekBar
              title={expanded ? monthLabel(selectedDate) : weekLabel(weekStart)}
              expanded={expanded}
              onPrev={() => setSelectedDate(expanded ? addMonths(selectedDate, -1) : addDays(selectedDate, -7))}
              onNext={() => setSelectedDate(expanded ? addMonths(selectedDate, 1) : addDays(selectedDate, 7))}
              onToggleCalendar={toggleCalendar}
            />
          </View>

          <View style={styles.dayStrip}>
            <Animated.View style={[styles.dayStripInner, trackStyle]}>
              <Animated.View style={weekRowStyle} pointerEvents={expanded ? 'none' : 'auto'}>
                <DayRow days={days} selectedDate={selectedDate} markedDays={markedDays} onSelect={setSelectedDate} />
              </Animated.View>
              <Animated.View
                style={[styles.monthLayer, { height: monthInnerH }, monthStyle]}
                pointerEvents={expanded ? 'auto' : 'none'}>
                <MonthGrid
                  weeks={weeks}
                  selectedDate={selectedDate}
                  tasksByDay={tasksByDay}
                  subjectsById={byId}
                  onSelect={(day) => {
                    setSelectedDate(day);
                    setExpanded(false);
                  }}
                />
              </Animated.View>
            </Animated.View>
          </View>
          <Animated.View style={spacerStyle} />
        </View>

        {/* 2: slides up underneath the pinned block */}
        <View style={styles.pad}>
          <ExamBanner />
          <StreakCard remaining={todayTodo.length} />
          <PlannerMascot />
        </View>

        {/* 3: the cream panel */}
        <View style={[styles.sheet, { minHeight: Math.max(viewportH - stickyH, 0) }]}>
          {/* Cream continues below the panel, so pulling past the bottom never shows the teal page. */}
          <View pointerEvents="none" style={styles.sheetOverscroll} />
          <View style={styles.sectionRow}>
            <Text variant="smallStrong" color={extra.muted}>Daily Tasks</Text>
            <Pressable style={styles.editBtn} hitSlop={10} onPress={() => setEditing(e => !e)}
              accessibilityRole="button" accessibilityLabel={editing ? 'Done editing tasks' : 'Edit tasks'}>
              <Ionicons name={editing ? 'checkmark' : 'pencil'} size={13} color={editing ? colors.ink : extra.muted} />
              <Text variant="smallStrong" color={editing ? colors.ink : extra.muted}>{editing ? 'Done' : 'Edit'}</Text>
            </Pressable>
          </View>

          <View style={styles.taskList}>
            {todo.map((t) => {
              const card = toCardTask(t, byId);
              return <TaskCard key={t.id} task={card} editing={editing} onToggle={() => setTaskDone(t.id, true)}
                onDelete={card.generated ? undefined : () => confirmDelete(card)}
                onPress={card.generated && !editing ? () => openPlan(card) : undefined} onLongPress={() => setEditing(true)} />;
            })}
          </View>

          <View style={[styles.sectionRow, { marginTop: spacing.md }]}>
            <Text variant="smallStrong" color={extra.muted}>Finished</Text>
            <Text variant="caption" color={extra.muted}>{finished.length} done</Text>
          </View>

          <View style={styles.taskList}>
            {finished.map((t) => {
              const card = toCardTask(t, byId);
              return <TaskCard key={t.id} task={card} editing={editing} onToggle={() => setTaskDone(t.id, false)}
                onDelete={card.generated ? undefined : () => confirmDelete(card)}
                onPress={card.generated && !editing ? () => openPlan(card) : undefined} onLongPress={() => setEditing(true)} />;
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky buttons: outside the ScrollView so they stay put above the tab bar */}
      <View style={styles.actions} pointerEvents="box-none">
        <LinearGradient
          // Fade from the page color itself. Plain 'transparent' is transparent BLACK, which made a gray band.
          colors={[`${extra.sheet}00`, extra.sheet, extra.sheet]}
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
            onPress={() => router.push('/planner/set-exam')}
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

  dayStrip: {
    marginTop: spacing.md,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    borderRadius: 26,
    backgroundColor: colors.teal,
    padding: 4,
  },
  dayStripInner: {
    backgroundColor: extra.dayStrip,
    borderRadius: 22,
    overflow: 'hidden', // clips the month while it slides open
  },
  monthLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  monthBackdrop: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: extra.sheet,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
  },

  sheet: {
    backgroundColor: extra.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 110, // clears the sticky buttons; raise/lower to taste
  },
  sheetOverscroll: { position: 'absolute', left: 0, right: 0, top: '100%', height: 2000, backgroundColor: extra.sheet },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  taskList: { gap: spacing.md },

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
