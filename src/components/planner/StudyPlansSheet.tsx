import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

export type StudyPlanListItem = { id: string; title: string; subject: string; color: string; examDate: number;
  /** false = listed for manual tracking only (beyond the Free plan's one automatically scheduled exam). */
  autoScheduled?: boolean };

export function StudyPlansSheet({ visible, plans, onClose, onDismiss, onView, onDelete, onCreate }: {
  visible: boolean; plans: StudyPlanListItem[]; onClose: () => void; onView: (id: string) => void;
  onDismiss?: () => void;
  onDelete: (plan: StudyPlanListItem) => void; onCreate: () => void;
}) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityLabel="Back to planner" style={styles.row}><Icon name="chevronLeft" size={20} /><Text variant="heading">Study plans</Text></Pressable>
        <Text variant="caption" color={colors.muted}>{plans.length} {plans.length === 1 ? 'plan' : 'plans'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {!plans.length && <Text color={colors.muted}>No study plans. Set an exam to create one.</Text>}
        {plans.map(plan => <View key={plan.id} style={styles.plan}>
          <Pressable onPress={() => onView(plan.id)} style={styles.details} accessibilityRole="button" accessibilityLabel={`Open ${plan.title} study plan`}>
            <Text variant="smallStrong">{plan.title}</Text>
            <View style={[styles.subject, { backgroundColor: plan.color }]}><Text variant="label" color={colors.white}>{plan.subject}</Text></View>
            <Text variant="caption" color={colors.muted}>{new Date(plan.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            {plan.autoScheduled === false && <Text variant="caption" color={colors.muted}>Manual tracking · Premium schedules several exams</Text>}
          </Pressable>
          <Pressable onPress={() => onDelete(plan)} accessibilityRole="button" accessibilityLabel={`Delete ${plan.title} study plan`} hitSlop={8} style={styles.delete}><Icon name="trash" size={20} color={colors.dangerDark} /></Pressable>
          <Pressable onPress={() => onView(plan.id)} accessibilityLabel={`View ${plan.title}`} hitSlop={8}><Icon name="chevronRight" size={20} /></Pressable>
        </View>)}
      </ScrollView>
      <View style={styles.footer}><NeoButton label="Set exam" icon="calendar" onPress={onCreate} /></View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.splash }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: borders.thin, borderColor: colors.studyPlan.border }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }, plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderColor: colors.divider, paddingVertical: spacing.lg }, details: { flex: 1, gap: spacing.sm }, subject: { alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 1, borderColor: colors.studyPlan.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }, delete: { padding: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: radii.tile }, footer: { padding: spacing.xl },
});
