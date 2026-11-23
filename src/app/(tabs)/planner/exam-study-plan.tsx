import { ExamStudyPlanContent, type StudyPlanCard } from '@/components/planner/ExamStudyPlanContent';
import { ProtectedSubjectsSheet } from '@/components/planner/ProtectedSubjectsSheet';
import type { StudyPlanAccess } from '@/components/planner/PlanAccessCard';
import { Text } from '@/components/ui/Text';
import {
  DEFAULT_EXAM_PREFERENCES, examName, getExam, getExamAccess, getExamPreferences, getPlanInsights, getProtectedSubjectIds,
  getStudyPlanLabels, previewStudySchedule, saveProtectedSubjectIds, saveStudySchedule, setExamPriority,
  updateExam, updateExamDifficulty, type ExamPreferences,
} from '@/features/planner/examsRepo';
import { showComingSoon } from '@/features/account/accountAlerts';
import { PremiumRequiredError, type ExamPriority } from '@/features/subscription/entitlements';
import { GenerationLimitError } from '@/features/subscription/generationQuota';
import { getGenerationQuota } from '@/features/subscription/generationQuotaRepo';
import type { StudySession } from '@/features/planner/engine';
import { updateSubjectUrgency } from '@/features/subjects/subjectsRepo';
import { useStudyPlanDeletion } from '@/features/planner/useStudyPlanDeletion';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { useTasksForDate } from '@/hooks/useTasksForDate';
import { useToday } from '@/hooks/useToday';
import { addMonths, startOfDay } from '@/lib/dates';
import { useDataVersion } from '@/stores/dataVersion';
import { colors, spacing } from '@/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Exam = NonNullable<Awaited<ReturnType<typeof getExam>>>;

export default function ExamStudyPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [previewError, setPreviewError] = useState('');
  const [status, setStatus] = useState('');
  const [protectedIds, setProtectedIds] = useState<string[]>([]);
  const [protectedDraft, setProtectedDraft] = useState<string[]>([]);
  const [protectOpen, setProtectOpen] = useState(false);
  // Free until the server confirms otherwise; `loaded` stops us previewing before we know the tier.
  const [access, setAccess] = useState<StudyPlanAccess & { loaded: boolean }>({ tier: 'free', generation: null, priority: 'normal', insights: null, loaded: false });
  // This month's Free generations come from the server. Read without blocking the screen; unknown stays null.
  const refreshQuota = useCallback(() => {
    void getGenerationQuota().then(generation => setAccess(old => old.tier === 'premium' ? old : { ...old, generation }));
  }, []);
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
      const [row, names, protectedSubjects, planAccess, insights] = await Promise.all([getExam(id), getStudyPlanLabels(), getProtectedSubjectIds(),
        getExamAccess(id), getPlanInsights(id)]);
      if (!row) throw new Error('This exam no longer exists.');
      const name = names[id] ?? await examName(id, 'Subject');
      const firstLoad = initialized.current !== id;
      const saved = firstLoad ? await getExamPreferences(id) : null;
      if (!live) return;
      setExam(row); setTitle(name); setLabels(names); setProtectedIds(protectedSubjects);
      setAccess(old => ({ tier: planAccess.entitlements.tier, generation: planAccess.entitlements.tier === 'premium' ? null : old.generation,
        priority: planAccess.priority, insights, loaded: true }));
      if (planAccess.entitlements.tier !== 'premium') refreshQuota();
      if (firstLoad) {
        setPrefs({ ...DEFAULT_EXAM_PREFERENCES, ...saved, longBreakMin: Math.max(30, saved?.longBreakMin ?? 30) });
        setSelectedDate(startOfDay(Date.now()));
        dateSelectedByUser.current = false;
        initialized.current = id;
      }
      setLoadError(''); setLoaded(true);
    })().catch(error => { if (live) setLoadError(String(error)); });
    return () => { live = false; };
  }, [id, version, refreshQuota]));

  useEffect(() => {
    if (!loaded || !id || !access.loaded) return;
    let live = true;
    const timeout = setTimeout(() => {
      // Previewing never uses a generation; only saving does.
      setLoadingPreview(true);
      previewStudySchedule(id, prefs).then(result => {
        if (!live) return;
        setPreview(result.sessions); setShortfall(result.shortfallBlocks); setPreviewError('');
        if (!dateSelectedByUser.current && result.sessions[0]) setSelectedDate(result.sessions[0].date);
      }).catch(error => { if (live) { setPreview([]); setPreviewError(String(error)); } })
        .finally(() => { if (live) setLoadingPreview(false); });
    }, 180);
    return () => { live = false; clearTimeout(timeout); };
  }, [id, loaded, prefs, version, access.loaded]);

  const cards = useMemo<StudyPlanCard[]>(() => {
    const generated = preview.filter(session => session.date === selectedDate).map((session, index) => {
      const subject = byId.get(session.subjectId);
      return { key: `${session.planId}:${session.date}:${index}`, title: labels[session.planId] ?? `${subject?.name ?? 'Subject'} study`,
        subject: subject?.name ?? 'Subject', color: subject?.color ?? colors.exam,
        startMinute: session.startMinute, endMinute: session.endMinute, blocks: session.blocks,
        locked: protectedIds.includes(session.subjectId) };
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
      setPrefs(next); setEditingDates(false); setPreviewError('');
      setStatus(access.tier === 'premium' ? 'Study schedule saved. Automatic updates are on.'
        : 'Study schedule saved. It stays as it is until you generate again.');
      refreshQuota();
      const result = await previewStudySchedule(exam.id, next);
      setPreview(result.sessions); setShortfall(result.shortfallBlocks);
      if (leave) router.dismissTo('/planner');
    } catch (error) {
      if (error instanceof GenerationLimitError) refreshQuota();
      if (error instanceof PremiumRequiredError) upgrade(error.message);
      else Alert.alert('Could not save study plan', error instanceof Error ? error.message : String(error));
    }
    finally { setSaving(false); }
  };
  const upgrade = (message?: string) => {
    // Payments aren't built yet; this is the single place that will open the upgrade flow.
    if (message) Alert.alert('Premium feature', message, [{ text: 'Not now', style: 'cancel' }, { text: 'See Premium', onPress: () => showComingSoon('Premium') }]);
    else showComingSoon('Premium');
  };
  const changePriority = (priority: ExamPriority) => {
    if (!exam || saving) return;
    setSaving(true);
    void setExamPriority(exam.id, priority).then(() => setStatus('Priority updated. Your available time is shared again; total study time is unchanged.'))
      .catch(error => { if (error instanceof PremiumRequiredError) upgrade(error.message); else Alert.alert('Could not update priority', String(error)); })
      .finally(() => setSaving(false));
  };
  const pickTime = (key: 'start' | 'end') => {
    const value = prefs[key];
    const date = new Date();
    date.setHours(Math.floor(value / 60), value % 60, 0, 0);
    openPicker('time', date, d => setPrefs(p => ({ ...p, [key]: d.getHours() * 60 + d.getMinutes() })));
  };
  const pickExamDate = () => {
    if (!exam || saving) return;
    openPicker('date', new Date(exam.examDate), date => {
      const next = startOfDay(date);
      if (next <= today) { Alert.alert('Choose another date', 'The exam must be after today.'); return; }
      setSaving(true);
      updateExam(exam.id, { name: title, subjectId: exam.subjectId, date: next })
        .then(() => updateSubjectUrgency(exam.subjectId, 5))
        .then(() => { setExam(old => old ? { ...old, examDate: next } : old); setStatus('Exam date updated. Your study schedule adjusts automatically.'); })
        .catch(error => Alert.alert('Could not update exam', String(error)))
        .finally(() => setSaving(false));
    });
  };
  const changeDifficulty = (value: number) => {
    if (!exam || saving) return;
    setSaving(true);
    void updateExamDifficulty(exam.id, value).then(() => {
      setExam(old => old ? { ...old, difficulty: value } : old);
      setStatus('Exam difficulty updated. Your study schedule adjusts automatically.');
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
      editingDates={editingDates} extraOpen={extraOpen} sessions={cards} shortfall={shortfall} error={previewError} status={status}
      access={access}
      saving={saving || deletion.busy} deleting={deletion.busy} loadingPreview={loadingPreview} protectedCount={protectedIds.length}
      actions={{
        back: () => router.back(), settings: () => router.push('/settings'),
        subject: () => router.push({ pathname: '/planner/set-exam', params: { id } }),
        difficulty: changeDifficulty, defaultUrgency, examDate: pickExamDate,
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
        adjust: (key, direction) => setPrefs(p => {
          const limits = key === 'focusCount' ? [1, 8, 1] : key === 'focusMin' ? [5, 120, 5] : key === 'breakMin' ? [1, 60, 5] : key === 'longBreakMin' ? [30, 60, 5] : [p.focusMin, 720, p.focusMin];
          const value = key === 'dailyGoalMin' ? p.dailyGoalMin ?? p.focusCount * p.focusMin : p[key];
          return { ...p, [key]: Math.min(limits[1], Math.max(limits[0], value + direction * limits[2])) };
        }),
        toggleExtra: () => setExtraOpen(open => !open),
        toggleWeekday: day => setPrefs(p => {
          const days = p.studyDays ?? [0, 1, 2, 3, 4, 5, 6];
          return { ...p, studyDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() };
        }),
        protectSubjects: () => { setProtectedDraft([...protectedIds]); setProtectOpen(true); },
        regenerate: () => void persist(prefs, false), save: () => void persist(prefs, true),
        deletePlan: () => { if (!saving) deletion.request(exam.id, title); },
        priority: changePriority, upgrade: () => upgrade(), rescheduleMissed: () => void persist(prefs, false),
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
