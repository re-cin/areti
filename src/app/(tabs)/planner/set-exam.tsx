import { NewSubjectSheet } from '@/components/planner/NewSubjectSheet';
import { Dropdown } from '@/components/ui/Dropdown';
import { NeoButton } from '@/components/ui/NeoButton';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { createExam, examName, getExam, updateExam } from '@/features/planner/examsRepo';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { useToday } from '@/hooks/useToday';
import { addDays, startOfDay } from '@/lib/dates';
import { colors, spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '@/features/preferences/preferencesStore';

function formatExamDate(ts: number, format: string) {
  const date = new Date(ts);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'mm/dd/yy':
      return `${month}/${day}/${String(year).slice(-2)}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd/mm/yy':
    default:
      return `${day}/${month}/${String(year).slice(-2)}`;
  }
}

export default function SetExamScreen() {
  const today = useToday();
  const dateFormat = usePreferences(s => s.preferences.dateFormat);
  const { id: editingId } = useLocalSearchParams<{ id?: string }>();
  const { subjects } = useSubjects();
  const { openPicker, pickerElement } = useDateTimePicker();
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('3');
  const [date, setDate] = useState(() => addDays(startOfDay(Date.now()), 1));
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editingId);
  useEffect(() => {
    if (!editingId) return;
    let live = true;
    (async () => {
      const exam = await getExam(editingId);
      if (!exam) throw new Error('This exam no longer exists.');
      const title = await examName(editingId, 'Subject');
      if (!live) return;
      setName(title); setSubjectId(exam.subjectId); setDifficulty(String(exam.difficulty)); setDate(exam.examDate); setLoading(false);
    })().catch(error => { if (live) Alert.alert('Could not load exam', String(error)); });
    return () => { live = false; };
  }, [editingId]);
  const valid = name.trim().length > 0 && subjectId !== null && date > today;

  const save = async (generate: boolean) => {
    if (!valid || loading || saving || !subjectId) return;
    setSaving(true);
    try {
      const input = { name, subjectId, date, difficulty: Number(difficulty) };
      const id = editingId ?? await createExam(input);
      if (editingId) await updateExam(editingId, input);
      if (generate) router.replace({ pathname: '/planner/exam-study-plan', params: { id } });
      else router.dismissTo('/planner');
    } catch (error) {
      Alert.alert('Could not set exam', String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.cap} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to planner">
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
          <Text variant="title" style={styles.title}>{editingId ? 'Edit Exam' : 'Set Exam'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={21} color={colors.ink} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.grow} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text variant="smallStrong">Exam Name</Text>
          <TextField value={name} onChangeText={setName} placeholder="e.g. Physics Finals" returnKeyType="done" />
          <View style={styles.subjectLabel}>
            <Text variant="smallStrong">Subject</Text>
            <Pressable onPress={() => setNewSubjectOpen(true)} style={styles.newSub} accessibilityRole="button">
              <Text variant="captionStrong" color={colors.tealText}>+  New Sub</Text>
            </Pressable>
          </View>
          <Dropdown value={subjectId} options={subjects.map(s => ({ key: s.id, label: s.name, color: s.color }))}
            onChange={setSubjectId} placeholder="Select a subject" uppercase />
          <Text variant="smallStrong" style={styles.dateLabel}>Exam difficulty</Text>
          <Segmented options={[{ key: '1', label: 'Low' }, { key: '3', label: 'Medium' }, { key: '5', label: 'High' }]}
            value={difficulty} onChange={setDifficulty} />
          <Text variant="caption" color={colors.muted}>Applies only to this exam. Harder exams receive a larger share of available study time.</Text>
          <Text variant="smallStrong" style={styles.dateLabel}>Date</Text>
          <Pressable onPress={() => openPicker('date', new Date(date), d => setDate(startOfDay(d)))}
            style={styles.dateField} accessibilityRole="button" accessibilityLabel="Choose exam date">
            <Text variant="smallStrong" style={styles.grow}>
              {formatExamDate(date, dateFormat)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.ink} />
          </Pressable>
          {date <= today && <Text variant="caption" color={colors.dangerDark}>Choose a future date.</Text>}
        </ScrollView>
        <View style={styles.actions}>
          <NeoButton label={editingId ? 'Save Exam' : 'Set Exam'} backgroundColor={colors.surface} disabled={!valid || saving || loading}
            icon={<Ionicons name="calendar-outline" size={18} color={colors.ink} />} onPress={() => save(false)} />
          <NeoButton label="Generate Schedule" backgroundColor={colors.inkSoft} textColor={colors.white}
            disabled={!valid || saving || loading} icon={<Ionicons name="sparkles-outline" size={19} color={colors.white} />}
            onPress={() => save(true)} />
        </View>
      </KeyboardAvoidingView>
      {pickerElement}
      <NewSubjectSheet visible={newSubjectOpen} onClose={() => setNewSubjectOpen(false)} onCreated={setSubjectId} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sheet },
  grow: { flex: 1 },
  cap: { height: 34, backgroundColor: colors.welcomeTeal, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  header: { marginHorizontal: spacing.xl, marginTop: 16, paddingHorizontal: 10, paddingBottom: 14,
    borderBottomWidth: 1.5, borderBottomColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: 1 },
  form: { paddingHorizontal: spacing.xl, paddingTop: 16, gap: 6, flexGrow: 1 },
  subjectLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  newSub: { borderWidth: 1.5, borderColor: colors.inkSoft, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 3 },
  dateLabel: { marginTop: 12 },
  dateField: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1.5,
    borderColor: colors.inkSoft, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 15 },
  actions: { paddingHorizontal: spacing.xl, paddingBottom: 18, gap: 16 },
});
