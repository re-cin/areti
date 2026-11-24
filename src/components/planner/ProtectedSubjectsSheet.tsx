import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ProtectedSubjectsSheet({ visible, subjects, selected, saving, onToggle, onClose }: {
  visible: boolean; subjects: { id: string; name: string; color: string }[]; selected: string[];
  saving: boolean; onToggle: (id: string) => void; onClose: () => void;
}) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.root}>
      <View style={styles.cap} />
      <View style={styles.content}>
        <Pressable onPress={onClose} disabled={saving} accessibilityLabel="Save protected subjects and return" style={styles.header}>
          <Icon name="chevronLeft" size={20} /><Text variant="heading">{saving ? 'Saving…' : 'Subjects'}</Text>
        </Pressable>
        <Text variant="small" style={styles.hint}>Selected subjects keep their upcoming sessions at the same dates and times when you regenerate All Exams. Other sessions fit around them.</Text>
        <ScrollView>{subjects.map(subject => {
          const checked = selected.includes(subject.id);
          return <Pressable key={subject.id} onPress={() => onToggle(subject.id)} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`Keep ${subject.name} sessions in place`} style={styles.subjectRow}>
            <View style={[styles.checkbox, checked && styles.checked]}>{checked && <View style={styles.dot} />}</View>
            <View style={[styles.pill, { backgroundColor: subject.color }]}><Text variant="label" color={colors.white}>{subject.name}</Text></View>
          </Pressable>;
        })}</ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.splash }, cap: { height: spacing.xl, backgroundColor: colors.welcomeTeal, borderBottomLeftRadius: radii.card, borderBottomRightRadius: radii.card }, content: { flex: 1, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, borderBottomWidth: borders.thin, borderColor: colors.studyPlan.border }, hint: { color: colors.studyPlan.muted, paddingVertical: spacing.lg },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderColor: colors.mutedSoft }, checkbox: { width: 22, height: 22, borderRadius: radii.pill, borderWidth: borders.thin, borderColor: colors.studyPlan.text, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.welcomeTeal }, dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.studyPlan.text }, pill: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: borders.thin, borderColor: colors.studyPlan.border },
});
