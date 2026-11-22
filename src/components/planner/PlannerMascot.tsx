import { Text } from '@/components/ui/Text';
import { colors } from '@/theme';
import { StyleSheet, View } from 'react-native';
import { plannerColors as extra } from './plannerColors';

/** The ghost peeking over the task sheet, with its level and XP. */
export function PlannerMascot() {
  // TODO: level and XP come from the ghost state.
  return (
    <View style={styles.mascotRow}>
      <View style={styles.mascotSide}>
        <Text variant="captionStrong" style={{ textAlign: 'right' }}>LVL 4</Text>
        <Text variant="caption" color={extra.muted} style={{ textAlign: 'right' }}>320 / 500 XP</Text>
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
  mascotSide: {
    alignItems: 'flex-end',
    marginBottom: 4,
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
