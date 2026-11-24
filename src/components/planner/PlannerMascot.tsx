import { Text } from '@/components/ui/Text';
import { DEFAULT_GHOST, getGhost } from '@/features/pet/petRepo';
import { useDbQuery } from '@/lib/useDbQuery';
import { colors } from '@/theme';
import { StyleSheet, View } from 'react-native';

/** The ghost peeking over the task sheet, with Reti's real level and XP (same numbers as the Reti tab). */
export function PlannerMascot() {
  // Re-reads when the Planner is shown and after any data change (a finished focus block, a sync).
  const ghost = useDbQuery(getGhost, DEFAULT_GHOST);
  return (
    <View style={styles.mascotRow}>
      <View style={styles.levelBox}>
        <Text variant="captionStrong" color={colors.white}>LVL {ghost.level}</Text>
        <Text variant="caption" color={colors.white}>{ghost.label}</Text>
      </View>
      <View style={styles.mascot}>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 8,
    height: 56,
    gap: 16,
  },
  // Black box with white text, lifted a little off the sheet's edge.
  levelBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  mascot: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.ink,
    alignItems: 'center',
    paddingTop: 22,
    marginBottom: -24, // tucks behind the sheet
  },
  eyes: { flexDirection: 'row', gap: 14 },
  eye: { width: 6, height: 10, borderRadius: 3, backgroundColor: colors.white },
});
