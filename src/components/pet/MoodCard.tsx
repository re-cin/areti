import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { formatShortDuration, type ExpressionInfo } from '@/features/pet';
import { colors, fonts } from '@/theme';

type Props = {
  expression: ExpressionInfo;
  momentum: number; // 0..100
  minutesToday: number;
  goalMinutes: number;
};

/** "Mood" title with the current expression badge, then Momentum and Daily goal bars. */
export function MoodCard({ expression, momentum, minutesToday, goalMinutes }: Props) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mood</Text>
        <Badge label={expression.label} backgroundColor={colors.pet.badge[expression.id]} textColor={colors.white} />
      </View>

      <View style={styles.metric}>
        <Text variant="smallStrong" style={styles.metricLabel}>Momentum</Text>
        <ProgressBar progress={momentum / 100} color={colors.pet.momentum} height={20} borderWidth={2} inset={4} />
      </View>

      <View style={styles.metric}>
        <View style={styles.metricRow}>
          <Text variant="smallStrong" style={styles.metricLabel}>Daily goal</Text>
          <Text variant="smallStrong" style={styles.metricLabel}>
            {formatShortDuration(minutesToday)} / {formatShortDuration(goalMinutes)}
          </Text>
        </View>
        <ProgressBar
          progress={goalMinutes > 0 ? minutesToday / goalMinutes : 0}
          color={colors.pet.goal}
          height={20}
          borderWidth={2}
          inset={4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 },
  title: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 28, letterSpacing: -0.45 },
  metric: { gap: 4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { lineHeight: 20 },
});
