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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteTask, setTaskDone, type Task as DbTask } from '@/db/queries/tasks';
import { examCardTask, toCardTask, type CardTask } from '@/features/planner/cardTask';
import { deleteStudyPlan, examsQuery, getExamCardState, getStudyPlanLabels, setExamDone } from '@/features/planner/examsRepo';
import { useTimer } from '@/features/timer/timerStore';
import { useSubjects } from '@/hooks/useSubjects';
import { useTaskDays } from '@/hooks/useTaskDays';
import { useTasksByDay } from '@/hooks/useTasksByDay';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import { useDbQuery } from '@/lib/useDbQuery';
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
import { use24Hour, usePreferences } from '@/features/preferences/preferencesStore';

// Calendar expand / collapse
const STRIP_INNER_H = 60; // one row of day cells: 54 tall + 3 margin above and below
const CARD_CHROME = 11; // outline (1.5 x 2) + teal padding (4 x 2) around the calendar's cream track
const BUTTONS_H = 100; // the Add Task / Set Exam bar drawn over the bottom of the screen
const EXPAND_MS = 380;
const loadExams = async () => examsQuery();
const loadLabels = async () => getStudyPlanLabels();
const loadExamState = async () => getExamCardState();

type Exam = Awaited<ReturnType<typeof loadExams>>[number];
/** One card in Daily Tasks / Finished: a task row, or an exam on its exam day. */
type Item = { key: string; card: CardTask } & ({ task: DbTask; exam?: undefined } | { exam: Exam; task?: undefined });


export default function PlannerScreen() {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  // The month shown in the month view. Moving months changes only this, so the highlighted day stays
  // the day you picked (today by default) instead of the same date in every month.
  const [visibleMonth, setVisibleMonth] = useState(today);

  const firstDay = usePreferences(s => s.preferences.firstDay);
  const use24h = use24Hour();
  const weekStartsOn = firstDay === 'Sunday' ? 0 : 1;

  const { date: dateParam, n } = useLocalSearchParams<{ date?: string; n?: string }>();

  const routeSelection = `${dateParam ?? ''}:${n ?? ''}`;
  const [previousRouteSelection, setPreviousRouteSelection] = useState<string | null>(null);
  if (previousRouteSelection !== routeSelection) {
    setPreviousRouteSelection(routeSelection);
    const next = dateParam ? startOfDay(Number(dateParam)) : NaN;
    if (Number.isFinite(next)) {
      setSelectedDate(next);
      setVisibleMonth(next);
    }
  }

  const weekStart = startOfWeek(selectedDate, weekStartsOn);
  const days = weekDays(weekStart);

  const { byId } = useSubjects();
  const exams = useDbQuery(loadExams, [] as Exam[]);
  const labels = useDbQuery(loadLabels, {} as Record<string, string>);
  const examState = useDbQuery(loadExamState, { done: [] as string[], generated: [] as string[] });
  const examsByDay = new Map<number, { id: string; subject: string; color: string }[]>();
  for (const exam of exams) {
    const subject = byId.get(exam.subjectId);
    if (!subject) continue;
    const onDay = examsByDay.get(exam.examDate) ?? [];
    onDay.push({ id: exam.id, subject: subject.name, color: subject.color });
    examsByDay.set(exam.examDate, onDay);
  }
  const { todo, finished } = useTasksForDate(selectedDate);

  // Exams sit at the top of the selected day's list, as orange cards.
  const doneExams = new Set(examState.done);
  const examItems: Item[] = exams
    .filter(exam => exam.examDate === selectedDate && byId.has(exam.subjectId))
    .map(exam => ({
      key: `exam:${exam.id}`,
      exam,
      card: examCardTask(exam, labels[exam.id] ?? `${byId.get(exam.subjectId)!.name} Exam`, doneExams.has(exam.id), byId),
    }));
  const taskItem = (task: DbTask): Item => ({ key: `task:${task.id}`, task, card: toCardTask(task, byId, use24h) });
  const todoItems = [...examItems.filter(i => !i.card.done), ...todo.map(taskItem)];
  const finishedItems = [...examItems.filter(i => i.card.done), ...finished.map(taskItem)];

  // Edit mode: tap cards to select them for deleting; the pencil opens the right editor.
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const stopEditing = () => {
    setEditing(false);
    setSelected(new Set());
  };
  const allItems = [...todoItems, ...finishedItems];
  const selectedItems = allItems.filter(i => selected.has(i.key));

  const onCardPress = (item: Item) => {
    if (editing) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(item.key)) next.delete(item.key);
        else next.add(item.key);
        return next;
      });
      return;
    }
    if (item.exam) void setExamDone(item.exam.id, !item.card.done);
    else if (!item.card.hasPomodoro) void setTaskDone(item.task.id, !item.card.done);
  };

  const onCardEdit = (item: Item) => {
    stopEditing();
    if (item.exam) {
      // An exam with a generated study plan opens the study planner; a plain exam opens Edit Exam.
      if (examState.generated.includes(item.exam.id)) {
        router.push({ pathname: '/planner/exam-study-plan', params: { id: item.exam.id } });
      } else {
        router.push({ pathname: '/planner/set-exam', params: { id: item.exam.id } });
      }
      return;
    }
    const task = item.task;
    if (task.source === 'generated' && task.planId) {
      router.push({ pathname: '/planner/exam-study-plan', params: { id: task.planId } });
    } else if (task.hasPomodoro) {
      router.navigate('/pomodoro');
    } else {
      router.push({ pathname: '/planner/add-task', params: { id: task.id } });
    }
  };

  const deleteSelected = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      for (const item of selectedItems) {
        if (item.exam) {
          const result = await deleteStudyPlan(item.exam.id);
          if (result.detachedSessionId) await useTimer.getState().detachPlannedSession(result.detachedSessionId)
            .catch(error => console.warn('[planner] Exam deleted; timer persistence will retry', error));
        } else {
          await deleteTask(item.task.id);
        }
      }
      setConfirmDelete(false);
      stopEditing();
    } catch (error) {
      setConfirmDelete(false);
      Alert.alert('Could not delete', String(error));
    } finally {
      setDeleting(false);
    }
  };
  const deletingExams = selectedItems.some(i => i.exam);
  const markedDays = useTaskDays(days[0], days[6]);

  // Month view (opened from the calendar icon)
  const [expanded, setExpanded] = useState(false);
  const weeks = monthWeeks(visibleMonth, weekStartsOn);
  const tasksByDay = useTasksByDay(weeks[0][0], weeks[weeks.length - 1][6]);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const progress = useSharedValue(0); // 0 = week strip, 1 = full month

  // Leaving the tab resets the page (scrolled to the top, week view), so it looks fresh when you come back.
  useFocusEffect(
    useCallback(
      () => () => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setExpanded(false);
        progress.set(0);
        setEditing(false);
        setSelected(new Set());
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
  );

  useEffect(() => {
    progress.set(withTiming(expanded ? 1 : 0, { duration: EXPAND_MS, easing: Easing.out(Easing.cubic) }));
  }, [expanded, progress]);

  const toggleCalendar = () => {
    if (!expanded) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setVisibleMonth(selectedDate);
    }
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

  const selectDay = (day: number) => {
    setSelectedDate(day);
    setVisibleMonth(day);
    setSelected(new Set());
  };
  const goToToday = () => selectDay(startOfDay(new Date()));

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
              title={expanded ? monthLabel(visibleMonth) : weekLabel(weekStart)}
              expanded={expanded}
              onPrev={() => (expanded ? setVisibleMonth(addMonths(visibleMonth, -1)) : selectDay(addDays(selectedDate, -7)))}
              onNext={() => (expanded ? setVisibleMonth(addMonths(visibleMonth, 1)) : selectDay(addDays(selectedDate, 7)))}
              onToday={goToToday}
              onToggleCalendar={toggleCalendar}
            />
          </View>

          <View style={styles.dayStrip}>
            <Animated.View style={[styles.dayStripInner, trackStyle]}>
              <Animated.View style={weekRowStyle} pointerEvents={expanded ? 'none' : 'auto'}>
                <DayRow days={days} selectedDate={selectedDate} markedDays={markedDays} examDays={new Set(examsByDay.keys())} onSelect={selectDay} />
              </Animated.View>
              <Animated.View
                style={[styles.monthLayer, { height: monthInnerH }, monthStyle]}
                pointerEvents={expanded ? 'auto' : 'none'}>
                <MonthGrid
                  weeks={weeks}
                  selectedDate={selectedDate}
                  month={visibleMonth}
                  tasksByDay={tasksByDay}
                  examsByDay={examsByDay}
                  subjectsById={byId}
                  onSelect={(day) => {
                    selectDay(day);
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
          <StreakCard remaining={todoItems.length} />
          <PlannerMascot />
        </View>

        {/* 3: the cream panel */}
        <View style={[styles.sheet, { minHeight: Math.max(viewportH - stickyH, 0) }]}>
          {/* Cream continues below the panel, so pulling past the bottom never shows the teal page. */}
          <View pointerEvents="none" style={styles.sheetOverscroll} />
          <View style={styles.sectionRow}>
            <Text variant="smallStrong" color={extra.muted}>Daily Tasks</Text>
            {editing ? (
              <View style={styles.editActions}>
                <Pressable
                  style={[styles.editBtn, !selected.size && styles.editBtnOff]}
                  hitSlop={10}
                  disabled={!selected.size}
                  onPress={() => setConfirmDelete(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete selected">
                  <Ionicons name="trash-outline" size={13} color={colors.dangerDark} />
                  <Text variant="smallStrong" color={colors.dangerDark}>
                    Delete{selected.size ? ` (${selected.size})` : ''}
                  </Text>
                </Pressable>
                <Pressable style={styles.editBtn} hitSlop={10} onPress={stopEditing} accessibilityRole="button">
                  <Ionicons name="close" size={14} color={extra.muted} />
                  <Text variant="smallStrong" color={extra.muted}>Cancel edit</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editBtn} hitSlop={10} onPress={() => setEditing(true)} accessibilityRole="button">
                <Ionicons name="pencil" size={13} color={extra.muted} />
                <Text variant="smallStrong" color={extra.muted}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.taskList}>
            {todoItems.map((item) => (
              <TaskCard key={item.key} task={item.card} editing={editing} selected={selected.has(item.key)}
                onPress={() => onCardPress(item)} onEdit={() => onCardEdit(item)} />
            ))}
          </View>

          <View style={[styles.sectionRow, { marginTop: spacing.md }]}>
            <Text variant="smallStrong" color={extra.muted}>Finished</Text>
            <Text variant="caption" color={extra.muted}>{finishedItems.length} done</Text>
          </View>

          <View style={styles.taskList}>
            {finishedItems.map((item) => (
              <TaskCard key={item.key} task={item.card} editing={editing} selected={selected.has(item.key)}
                onPress={() => onCardPress(item)} onEdit={() => onCardEdit(item)} />
            ))}
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

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'}?`}
        icon="trash"
        destructive
        message={deletingExams
          ? 'Selected exams also lose their unfinished study sessions. Completed tasks, recorded focus time and earned XP are kept.'
          : 'The selected tasks will be removed from your planner.'}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={() => void deleteSelected()}
        onCancel={() => { if (!deleting) setConfirmDelete(false); }}
      />
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
  editBtnOff: { opacity: 0.4 },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },

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
