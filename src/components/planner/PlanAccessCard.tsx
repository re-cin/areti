import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import type { PlanInsights } from '@/features/planner/insights';
import { EXAM_PRIORITIES, type ExamPriority, type PlanTier } from '@/features/subscription/entitlements';
import { borders, colors, fonts, radii, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';

const palette = colors.studyPlan;
const PRIORITY_LABEL: Record<ExamPriority, string> = { normal: 'Normal', high: 'High', highest: 'Highest' };

export type StudyPlanAccess = {
  tier: PlanTier;
  /** False when this exam is beyond the Free plan's one automatically scheduled exam. */
  scheduled: boolean;
  priority: ExamPriority;
  insights: PlanInsights | null;
};

/**
 * Where Free and Premium differ for one exam. Both tiers share the same scheduler; this card shows
 * what the student has, and offers Premium's extras without hiding the basics.
 */
export function PlanAccessCard({ access, busy, onPriority, onUpgrade, onReschedule }: {
  access: StudyPlanAccess; busy: boolean;
  onPriority: (priority: ExamPriority) => void; onUpgrade: () => void; onReschedule: () => void;
}) {
  const premium = access.tier === 'premium';
  const { insights } = access;
  const detail = insights?.detailed;
  return (
    <NeoBox radius={18} offset={1} shadowColor={colors.divider} backgroundColor={palette.surface} style={styles.card}>
      <View style={styles.between}>
        <Text variant="smallStrong">Study progress</Text>
        <View style={styles.badge} accessibilityLabel={premium ? 'Premium plan' : 'Free plan'}>
          {premium && <Icon name="crown" size={12} color={colors.gold} strokeWidth={1} />}
          <Text variant="label">{premium ? 'PREMIUM' : 'FREE'}</Text>
        </View>
      </View>

      {insights && <>
        <ProgressBar progress={insights.progressPercent / 100} color={colors.welcomeTeal} height={10} />
        <Text variant="caption" style={styles.quiet}>
          {insights.completedBlocks} of {insights.totalBlocks} focus blocks done ({insights.progressPercent}%)
        </Text>
      </>}

      {!access.scheduled && <View style={styles.notice}>
        <Text variant="caption" style={styles.noticeText}>
          The Free plan automatically schedules your nearest exam. This exam stays on your list for manual tracking.
          Upgrade to Premium to schedule several exams together.
        </Text>
        <Pressable onPress={onUpgrade} accessibilityRole="button" style={styles.upgrade}>
          <Icon name="crown" size={13} color={colors.gold} strokeWidth={1} /><Text variant="captionStrong">See Premium</Text>
        </Pressable>
      </View>}

      {access.scheduled && !!insights?.missedSessions && !premium && <View style={styles.notice} accessibilityLiveRegion="polite">
        <Text variant="caption" style={styles.noticeText}>
          {insights.missedSessions} missed {insights.missedSessions === 1 ? 'session' : 'sessions'}. Free plans don’t move missed work automatically.
          Reschedule now, or upgrade for automatic recovery.
        </Text>
        <Pressable onPress={onReschedule} disabled={busy} accessibilityRole="button" style={styles.upgrade}>
          <Icon name="sync" size={13} color={palette.text} /><Text variant="captionStrong">Reschedule missed sessions</Text>
        </Pressable>
      </View>}

      {access.scheduled && <>
        <View style={styles.divider} />
        <View style={styles.between}>
          <View style={styles.row}><Text variant="small" style={styles.label}>Priority</Text>{!premium && <Icon name="crown" size={12} color={colors.gold} strokeWidth={1} />}</View>
          {!premium && <Pressable onPress={onUpgrade} hitSlop={8} accessibilityRole="button" accessibilityLabel="Premium feature: exam priority">
            <Text variant="caption" style={styles.quiet}>Premium</Text></Pressable>}
        </View>
        {premium
          ? <Segmented options={EXAM_PRIORITIES.map(key => ({ key, label: PRIORITY_LABEL[key] }))} value={access.priority} onChange={onPriority} />
          : <Pressable onPress={onUpgrade} accessibilityRole="button" accessibilityLabel="Unlock exam priority with Premium" style={styles.locked}>
            <Text variant="caption" style={styles.quiet}>Choose which exam gets more of your study time.</Text>
          </Pressable>}
        <Text variant="caption" style={styles.hint}>
          Priority only changes how your available time is shared between exams. It never adds study hours.
        </Text>
      </>}

      {premium && detail && <>
        <View style={styles.divider} />
        <Text variant="smallStrong">Workload insights</Text>
        <Text variant="caption" style={styles.quiet}>
          {detail.daysLeft} {detail.daysLeft === 1 ? 'day' : 'days'} left · {detail.upcomingBlocks} blocks scheduled · {insights?.missedSessions ?? 0} missed ({detail.missedBlocks} blocks)
        </Text>
        {!detail.enoughTime && <Text variant="caption" style={styles.warning}>
          Your current availability is {detail.shortfallBlocks} {detail.shortfallBlocks === 1 ? 'block' : 'blocks'} short of this plan. Widen your study range, add study days or raise the daily goal.
        </Text>}
        {detail.consistentlyMissing && <Text variant="caption" style={styles.warning}>
          You’ve missed about half of your recent sessions. Shorter or fewer daily sessions may fit your week better.
        </Text>}
        {detail.enoughTime && !detail.consistentlyMissing && <Text variant="caption" style={styles.quiet}>Your current availability covers the planned preparation.</Text>}
      </>}
    </NeoBox>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm, borderColor: palette.border },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: borders.thin, borderColor: palette.border, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  label: { fontSize: 13, lineHeight: 17 },
  quiet: { color: palette.muted, fontFamily: fonts.medium },
  hint: { color: palette.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  divider: { backgroundColor: palette.divider, height: 1, marginVertical: spacing.xs },
  notice: { gap: spacing.sm, backgroundColor: colors.splash, borderRadius: spacing.xs, padding: spacing.md },
  noticeText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: palette.text },
  upgrade: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', backgroundColor: colors.welcomeTeal, borderWidth: borders.thin, borderColor: palette.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  locked: { borderWidth: 1, borderStyle: 'dashed', borderColor: palette.border, borderRadius: radii.pill, padding: spacing.md, opacity: 0.85 },
  warning: { color: colors.dangerDark, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
});
