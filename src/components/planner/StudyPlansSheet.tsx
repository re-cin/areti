
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { NeoButton } from '@/components/ui/NeoButton';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';
import { usePreferences } from '@/features/preferences/preferencesStore';

export type StudyPlanListItem = {
  id: string;
  title: string;
  subject: string;
  color: string;
  examDate: number;
};

const formatDate = (ts: number, format: string) => {
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
};

export function StudyPlansSheet({
  visible,
  plans,
  onClose,
  onDismiss,
  onView,
  onDelete,
  onCreate,
}: {
  visible: boolean;
  plans: StudyPlanListItem[];
  onClose: () => void;
  onView: (id: string) => void;
  onDismiss?: () => void;
  onDelete: (plan: StudyPlanListItem) => void;
  onCreate: () => void;
}) {
  const dateFormat = usePreferences(s => s.preferences.dateFormat);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Back to planner"
            style={styles.row}
          >
            <Icon name="chevronLeft" size={20} />
            <Text variant="heading">Study plans</Text>
          </Pressable>
          <Text variant="caption" color={colors.muted}>
            {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {!plans.length && (
            <Text color={colors.muted}>
              No study plans. Set an exam to create one.
            </Text>
          )}

          {plans.map(plan => (
            <View key={plan.id} style={styles.plan}>
              <Pressable
                onPress={() => onView(plan.id)}
                style={styles.details}
                accessibilityRole="button"
                accessibilityLabel={`Open ${plan.title} study plan`}
              >
                <Text variant="smallStrong">{plan.title}</Text>

                <View
                  style={[styles.subject, { backgroundColor: plan.color }]}
                >
                  <Text variant="label" color={colors.white}>
                    {plan.subject}
                  </Text>
                </View>

                <Text variant="caption" color={colors.muted}>
                  {formatDate(plan.examDate, dateFormat)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onDelete(plan)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${plan.title} study plan`}
                hitSlop={8}
                style={styles.delete}
              >
                <Icon name="trash" size={20} color={colors.dangerDark} />
              </Pressable>

              <Pressable
                onPress={() => onView(plan.id)}
                accessibilityLabel={`View ${plan.title}`}
                hitSlop={8}
              >
                <Icon name="chevronRight" size={20} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <NeoButton label="Set exam" icon="calendar" onPress={onCreate} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.splash,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: borders.thin,
    borderColor: colors.studyPlan.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.lg,
  },
  details: {
    flex: 1,
    gap: spacing.sm,
  },
  subject: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.studyPlan.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  delete: {
    padding: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.tile,
  },
  footer: {
    padding: spacing.xl,
  },
});
