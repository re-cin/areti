import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/theme';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { dotColor, plannerColors as extra } from './plannerColors';
import { examsQuery, getStudyPlanLabels } from '@/features/planner/examsRepo';
import { useStudyPlanDeletion } from '@/features/planner/useStudyPlanDeletion';
import { useDbQuery } from '@/lib/useDbQuery';
import { useRef, useState } from 'react';
import { StudyPlansSheet } from './StudyPlansSheet';
import { useSubjects } from '@/hooks/useSubjects';
import { startOfDay } from '@/lib/dates';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';

/** Next upcoming exam, with a View button. */
export function ExamBanner() {
  const { data: exams } = useLiveQuery(examsQuery());
  const { byId } = useSubjects();
  const labels = useDbQuery(getStudyPlanLabels, [], {} as Record<string, string>);
  const [plansOpen, setPlansOpen] = useState(false);
  const deletion = useStudyPlanDeletion();
  const afterDismiss = useRef<(() => void) | null>(null);
  const closeThen = (action: () => void) => {
    if (Platform.OS === 'ios') afterDismiss.current = action;
    setPlansOpen(false);
    if (Platform.OS !== 'ios') action();
  };
  const today = startOfDay(Date.now());
  const upcoming = exams.filter(exam => exam.examDate >= today && byId.has(exam.subjectId));
  const availablePlans = exams.filter(exam => byId.has(exam.subjectId));
  const next = upcoming[0];
  const subject = next ? byId.get(next.subjectId) : null;
  const days = next ? Math.max(0, Math.round((next.examDate - today) / 86400000)) : 0;
  return (
    <><View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={[styles.bannerDot, { backgroundColor: dotColor }]} />
        <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          {next ? `${subject?.name ?? 'Subject'} exam${upcoming.length > 1 ? ` and ${upcoming.length - 1} more` : ''} in ` : 'No upcoming exams'}
          {next && <Text variant="captionStrong" color={extra.orange}>{days} {days === 1 ? 'day' : 'days'}</Text>}
        </Text>
      </View>
      <Pressable style={styles.viewBtn} accessibilityLabel={availablePlans.length ? 'View all study plans' : 'Set exam'} onPress={() => availablePlans.length ? setPlansOpen(true) : router.push('/planner/set-exam')}>
        <Text variant="captionStrong">{availablePlans.length ? 'View' : 'Set Exam'}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.ink} />
      </Pressable>
    </View>
    <StudyPlansSheet visible={plansOpen} plans={availablePlans.map(exam => ({ id: exam.id,
      title: labels[exam.id] ?? `${byId.get(exam.subjectId)?.name ?? 'Subject'} Exam`, subject: byId.get(exam.subjectId)!.name,
      color: byId.get(exam.subjectId)!.color, examDate: exam.examDate }))}
      onClose={() => setPlansOpen(false)}
      onDismiss={() => { const action = afterDismiss.current; afterDismiss.current = null; action?.(); }}
      onView={id => closeThen(() => router.push({ pathname: '/planner/exam-study-plan', params: { id } }))}
      onDelete={plan => closeThen(() => deletion.request(plan.id, plan.title))}
      onCreate={() => closeThen(() => router.push('/planner/set-exam'))} />
    {deletion.dialog}</>
  );
}

const styles = StyleSheet.create({
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
});
