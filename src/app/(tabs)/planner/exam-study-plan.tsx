import { ExamStudyPlanContent, type StudyPlanCard } from '@/components/planner/ExamStudyPlanContent';
import { ProtectedSubjectsSheet } from '@/components/planner/ProtectedSubjectsSheet';
import { Text } from '@/components/ui/Text';
import { explainStudyDay, restoreSkippedTime, type DayExplanation, examTime,
  DEFAULT_EXAM_PREFERENCES, examName, getExam, getExamPreferences, getProtectedSubjectIds,
  getStudyPlanLabels, previewStudySchedule, saveProtectedSubjectIds, saveStudySchedule, skipStudySession,
  updateExam, updateExamDifficulty, type ExamPreferences,
} from '@/features/planner/examsRepo';
import type { StudySession } from '@/features/planner/engine';
import { updateSubjectUrgency } from '@/features/subjects/subjectsRepo';
import { useStudyPlanDeletion } from '@/features/planner/useStudyPlanDeletion';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import { useToday } from '@/hooks/useToday';
import { addMonths, startOfDay } from '@/lib/dates';
import { loadDailyGoalMin } from '@/features/settings/preferences';
import { useDataVersion } from '@/stores/dataVersion';
import { colors, spacing } from '@/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Exam = NonNullable<Awaited<ReturnType<typeof getExam>>>;

export default function ExamStudyPlanScreen() {
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const deletion = useStudyPlanDeletion(() => router.dismissTo('/planner'));
  const { subjects, byId } = useSubjects();
  const { openPicker, pickerElement } = useDateTimePicker();
  const version = useDataVersion(s => s.version);
  const initialized = useRef<string | null>(null);
  const dateSelectedByUser = useRef(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [title, setTitle] = useState('Exam');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<ExamPreferences>({ ...DEFAULT_EXAM_PREFERENCES });
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(Date.now()));
  const [excludedDraft, setExcludedDraft] = useState<number[]>([]);
  const [editingDates, setEditingDates] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<StudySession[]>([]);
  const [shortfall, setShortfall] = useState(0);
  const [overGoal, setOverGoal] = useState({ days: 0, goalMin: 0 });
  const [resized, setResized] = useState({ shrunk: 0, grown: 0 });
  const [time, setTime] = useState<number | null>(null);
  const [day, setDay] = useState<DayExplanation | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [status, setStatus] = useState('');
  const [protectedIds, setProtectedIds] = useState<string[]>([]);
  const [protectedDraft, setProtectedDraft] = useState<string[]>([]);
  const [protectOpen, setProtectOpen] = useState(false);
  const today = useToday();
  const { todo } = useTasksForDate(selectedDate);
  const subject = byId.get(exam?.subjectId ?? '');

  // Reload the exam when returning from Edit, without overwriting unsaved form preferences.
  useFocusEffect(useCallback(() => {
    // Database version changes deliberately refresh the saved exam and its labels.
    void version;
    if (!id) { setLoadError('No exam was selected.'); return; }
    let live = true;
    (async () => {
      const [row, names, protectedSubjects, savedTime] = await Promise.all([getExam(id), getStudyPlanLabels(), getProtectedSubjectIds(), examTime(id)]);
      if (!row) throw new Error('This exam no longer exists.');
      const name = names[id] ?? await examName(id, 'Subject');
      const firstLoad = initialized.current !== id;
      const saved = firstLoad ? await getExamPreferences(id) : null;
      if (!live) return;
      setExam(row); setTitle(name); setLabels(names); setProtectedIds(protectedSubjects); setTime(savedTime);
      // Coming back from Preferences: pick up the daily goal set there (it's the one shared goal).
      if (!firstLoad) {
        const goal = await loadDailyGoalMin();
        if (live) setPrefs(p => (p.dailyGoalMin === goal ? p : { ...p, dailyGoalMin: goal }));
      }
      if (firstLoad) {
        setPrefs({ ...DEFAULT_EXAM_PREFERENCES, ...saved, longBreakMin: Math.max(30, saved?.longBreakMin ?? 30) });
        // Opened from a Planner task: show that day.
        const opened = dateParam ? startOfDay(Number(dateParam)) : NaN;
        setSelectedDate(Number.isFinite(opened) ? opened : startOfDay(Date.now()));
        dateSelectedByUser.current = Number.isFinite(opened);
        initialized.current = id;
      }
      setLoadError(''); setLoaded(true);
    })().catch(error => { if (live) setLoadError(String(error)); });
    return () => { live = false; };
  }, [id, version, dateParam]));

  useEffect(() => {
    if (!loaded || !id) return;
    let live = true;
    const timeout = setTimeout(() => {
      setLoadingPreview(true);
      previewStudySchedule(id, prefs).then(result => {
        if (!live) return;
        setPreview(result.sessions); setShortfall(result.shortfallBlocks); setPreviewError('');
        setOverGoal({ days: result.overGoalDays.length, goalMin: result.dailyGoalMin }); setResized(result.resized);
        if (!dateSelectedByUser.current && result.sessions[0]) setSelectedDate(result.sessions[0].date);
      }).catch(error => { if (live) { setPreview([]); setPreviewError(String(error)); } })
        .finally(() => { if (live) setLoadingPreview(false); });
    }, 180);
    return () => { live = false; clearTimeout(timeout); };
  }, [id, loaded, prefs, version]);

  // What the selected day has to work with: open study time and what's already using time.
  useEffect(() => {
    if (!loaded || !id) return;
    let live = true;
    const t = setTimeout(() => {
      explainStudyDay(id, prefs, selectedDate).then(result => { if (live) setDay(result); }).catch(() => { if (live) setDay(null); });
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [id, loaded, prefs, version, selectedDate]);

  const cards = useMemo<StudyPlanCard[]>(() => {
    const generated = preview.filter(session => session.date === selectedDate).map((session, index) => {
      const subject = byId.get(session.subjectId);
      // The saved session behind this preview card (none while unsaved changes are previewed).
      const saved = todo.find(task => task.source === 'generated' && task.planId === session.planId
        && task.startMinute === session.startMinute && task.endMinute === session.endMinute);
      return { key: `${session.planId}:${session.date}:${index}`, title: labels[session.planId] ?? `${subject?.name ?? 'Subject'} study`,
        subject: subject?.name ?? 'Subject', color: subject?.color ?? colors.exam,
        startMinute: session.startMinute, endMinute: session.endMinute, blocks: session.blocks,
        locked: protectedIds.includes(session.subjectId), sessionId: saved?.id };
    });
    const manual = prefs.scope === 'all' ? todo.filter(task => task.source !== 'generated').map(task => {
      const subject = byId.get(task.subjectId);
      return { key: task.id, title: task.title, subject: subject?.name ?? 'Subject', color: subject?.color ?? colors.exam,
        startMinute: task.startMinute, endMinute: task.endMinute, locked: true };
    }) : [];
    return [...generated, ...manual].sort((a, b) => a.startMinute - b.startMinute);
  }, [preview, selectedDate, byId, labels, protectedIds, prefs.scope, todo]);

  const persist = async (next: ExamPreferences, leave: boolean) => {
    if (!exam || saving) return;
    setSaving(true);
    try {
      await saveStudySchedule(exam.id, next);
      setPrefs(next); setEditingDates(false); setPreviewError(''); setStatus('Study plan saved. Your sessions were rearranged.');
      const result = await previewStudySchedule(exam.id, next);
      setPreview(result.sessions); setShortfall(result.shortfallBlocks);
      setOverGoal({ days: result.overGoalDays.length, goalMin: result.dailyGoalMin }); setResized(result.resized);
      if (leave) router.dismissTo('/planner');
    } catch (error) { Alert.alert('Could not save study plan', String(error)); }
    finally { setSaving(false); }
  };
  const pickTime = (key: 'start' | 'end') => {
    const value = prefs[key];
    const date = new Date();
    date.setHours(Math.floor(value / 60), value % 60, 0, 0);
    openPicker('time', date, d => setPrefs(p => ({ ...p, [key]: d.getHours() * 60 + d.getMinutes(), useStudySlots: false })));
  };
  const pickExamDate = () => {
    if (!exam || saving) return;
    openPicker('date', new Date(exam.examDate), date => {
      const next = startOfDay(date);
      // updateExam checks the date against the exam's time (today is fine if the exam is later today).
      setSaving(true);
      updateExam(exam.id, { name: title, subjectId: exam.subjectId, date: next })
        .then(() => updateSubjectUrgency(exam.subjectId, 5))
        .then(() => { setExam(old => old ? { ...old, examDate: next } : old); setStatus('Exam date updated. Your sessions were rescheduled.'); })
        .catch(error => Alert.alert('Could not update exam', String(error)))
        .finally(() => setSaving(false));
    });
  };
  const pickExamTime = () => {
    if (!exam || saving) return;
    const start = new Date(exam.examDate);
    start.setHours(Math.floor((time ?? 540) / 60), (time ?? 540) % 60, 0, 0);
    openPicker('time', start, picked => {
      const next = picked.getHours() * 60 + picked.getMinutes();
      setSaving(true);
      updateExam(exam.id, { name: title, subjectId: exam.subjectId, date: exam.examDate, time: next })
        .then(() => { setTime(next); setStatus('Exam time updated. Your sessions were rescheduled.'); })
        .catch(error => Alert.alert('Could not update exam', error instanceof Error ? error.message : String(error)))
        .finally(() => setSaving(false));
    });
  };
  const changeDifficulty = (value: number) => {
    if (!exam || saving) return;
    setSaving(true);
    void updateExamDifficulty(exam.id, value).then(() => {
      setExam(old => old ? { ...old, difficulty: value } : old);
      setStatus('Exam difficulty updated. Your sessions were rescheduled.');
    }).catch(error => Alert.alert('Could not update difficulty', String(error)))
      .finally(() => setSaving(false));
  };
  const defaultUrgency = () => {
    if (!exam || saving) return;
    void updateSubjectUrgency(exam.subjectId, 1).then(() => setStatus('Default urgency selected. Your exam deadline still applies.'))
      .catch(error => Alert.alert('Could not update urgency', String(error)));
  };
  const closeProtectedSubjects = async () => {
    if (saving) return;
    setSaving(true);
    try { await saveProtectedSubjectIds(protectedDraft); setProtectedIds(protectedDraft); setProtectOpen(false); }
    catch (error) { Alert.alert('Could not save protected subjects', String(error)); }
    finally { setSaving(false); }
  };

  if (loadError || !loaded || !exam) return <SafeAreaView style={styles.root}>
    <Pressable onPress={() => router.back()} style={styles.loading}><Text variant="smallStrong">Back to planner</Text></Pressable>
    <Text style={styles.loading}>{loadError || 'Loading study plan…'}</Text>
  </SafeAreaView>;

  return <SafeAreaView style={styles.root} edges={['top']}>
    <ExamStudyPlanContent title={title} subjectName={subject?.name ?? 'Subject'} subjectColor={subject?.color ?? colors.exam}
      difficulty={exam.difficulty} urgency={subject?.urgency === 1 ? 'default' : 'exam'} examDate={exam.examDate}
      today={today} selectedDate={selectedDate} prefs={prefs} excluded={editingDates ? excludedDraft : prefs.excluded}
      editingDates={editingDates} extraOpen={extraOpen} sessions={cards} shortfall={shortfall} overGoalDays={overGoal.days} dailyGoalMin={overGoal.goalMin} resized={resized} examTime={time} day={day} error={previewError} status={status}
      saving={saving || deletion.busy} deleting={deletion.busy} loadingPreview={loadingPreview} protectedCount={protectedIds.length}
      actions={{
        back: () => router.back(), settings: () => router.push('/settings'),
        subject: () => router.push({ pathname: '/planner/set-exam', params: { id } }),
        difficulty: changeDifficulty, defaultUrgency, examDate: pickExamDate, examTime: pickExamTime,
        scope: scope => setPrefs(p => ({ ...p, scope })),
        changeCalendar: direction => { dateSelectedByUser.current = true; setSelectedDate(date => addMonths(date, direction)); },
        selectDate: date => {
          if (editingDates) {
            if (date < today || date >= exam.examDate) return;
            setExcludedDraft(old => old.includes(date) ? old.filter(d => d !== date) : [...old, date]);
          } else { dateSelectedByUser.current = true; setSelectedDate(date); }
        },
        editDates: () => { setExcludedDraft([...prefs.excluded]); setEditingDates(true); },
        cancelDates: () => setEditingDates(false), saveDates: () => void persist({ ...prefs, excluded: excludedDraft }, false),
        pickStart: () => pickTime('start'), pickEnd: () => pickTime('end'),
        useStudySlots: () => setPrefs(p => ({ ...p, useStudySlots: true })),
        autoSize: () => setPrefs(p => ({ ...p, autoSize: true })),
        openPreferences: () => router.push('/settings/preferences'),
        skipSession: card => {
          if (!card.sessionId) return;
          const sessionId = card.sessionId;
          Alert.alert(`Remove "${card.title}"?`, 'This time is kept free. Nothing else moves until you reschedule.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => void skipStudySession(sessionId)
              .then(() => setStatus('Session removed. Tap Reschedule to plan around the freed time.'))
              .catch(error => Alert.alert('Could not remove session', error instanceof Error ? error.message : String(error))) },
          ]);
        },
        undoSkip: item => {
          if (!item.skippedPlanId) return;
          void restoreSkippedTime(item.skippedPlanId, selectedDate, item.startMinute)
            .then(() => setStatus('That time can hold study again.'))
            .catch(error => Alert.alert('Could not undo', String(error)));
        },
        cannotSkip: card => Alert.alert('Can’t remove this one here',
          card.locked && !card.blocks ? 'This is your own task. Delete it from the Planner with Edit.'
            : 'Save the study plan first, then long press the session to remove it.'),
        adjust: (key, direction) => setPrefs(p => {
          const limits = key === 'sessionsPerDay' ? [1, 6, 1] : key === 'focusCount' ? [1, 8, 1] : key === 'focusMin' ? [5, 120, 5] : key === 'breakMin' ? [1, 60, 5] : key === 'longBreakMin' ? [30, 60, 5] : [p.focusMin, 720, p.focusMin];
          const value = key === 'dailyGoalMin' ? p.dailyGoalMin ?? p.focusCount * p.focusMin : key === 'sessionsPerDay' ? p.sessionsPerDay ?? 1 : p[key];
          const next = Math.min(limits[1], Math.max(limits[0], value + direction * limits[2]));
          // Choosing a size yourself turns off auto size: Reschedule then keeps it as set.
          return { ...p, [key]: next, ...((key === 'focusCount' || key === 'focusMin') && next !== value && { autoSize: false }) };
        }),
        toggleExtra: () => setExtraOpen(open => !open),
        toggleWeekday: day => setPrefs(p => {
          const days = p.studyDays ?? [0, 1, 2, 3, 4, 5, 6];
          return { ...p, studyDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() };
        }),
        protectSubjects: () => { setProtectedDraft([...protectedIds]); setProtectOpen(true); },
        regenerate: () => void persist(prefs, false), save: () => void persist(prefs, true),
        deletePlan: () => { if (!saving) deletion.request(exam.id, title); },
      }} />
    <ProtectedSubjectsSheet visible={protectOpen} subjects={subjects} selected={protectedDraft} saving={saving}
      onToggle={id => setProtectedDraft(old => old.includes(id) ? old.filter(value => value !== id) : [...old, id])}
      onClose={() => void closeProtectedSubjects()} />
    {pickerElement}
    {deletion.dialog}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.welcomeTeal }, loading: { padding: spacing.xl },
});
