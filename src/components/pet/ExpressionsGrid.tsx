import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { EXPRESSIONS, type ExpressionInfo } from '@/features/pet';
import { colors, fonts, spacing } from '@/theme';
import { MiniGhost } from './MiniGhost';

type Props = {
  level: number;
  unlockedCount: number;
  totalCount: number;
};

const COLUMNS = 4;
const GAP = 10;

/**
 * "Expressions · 5 of 8" card with a 4-column grid of tiles. Display only: tiles can't be tapped and
 * none is highlighted (admins try expressions out on the admin site's Test Reti page).
 */
export function ExpressionsGrid({ level, unlockedCount, totalCount }: Props) {
  // Pad the last row so tiles keep their width.
  const filler = (COLUMNS - (EXPRESSIONS.length % COLUMNS)) % COLUMNS;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Expressions</Text>
        <Text variant="small" style={{ lineHeight: 20 }}>
          {unlockedCount} of {totalCount}
        </Text>
      </View>
      <View style={styles.grid}>
        {EXPRESSIONS.map((e) => (
          <View key={e.id} style={styles.cell}>
            <Tile info={e} locked={level < e.unlockLevel} />
          </View>
        ))}
        {Array.from({ length: filler }, (_, i) => (
          <View key={`f${i}`} style={styles.cell} />
        ))}
      </View>
    </View>
  );
}

function Tile({ info, locked }: { info: ExpressionInfo; locked: boolean }) {
  if (locked) {
    return (
      <View
        style={[styles.fill, styles.tile, styles.locked]}
        accessible
        accessibilityLabel={`${info.label}, locked, unlocks at level ${info.unlockLevel}`}>
        <View style={{ opacity: 0.7 }}>
          <MiniGhost expression={info.id} bodyColor={colors.pet.lockedGhost} blank width={40} />
        </View>
        <View style={styles.lockIcon}>
          <Icon name="lock" size={26} color={colors.pet.lockedBorder} strokeWidth={2.2} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.pet.lockedText, lineHeight: 12 }]}>
            {info.label}
          </Text>
          <Text style={styles.lockLevel}>Lv {info.unlockLevel}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.fill, styles.tile, { backgroundColor: colors.pet.sheet }]} accessible accessibilityLabel={info.label}>
      <MiniGhost expression={info.id} width={40} />
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.name}>
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.pet.card,
    borderRadius: 24,
    paddingTop: 13,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  title: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 28, letterSpacing: -0.45 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { flexBasis: `${100 / COLUMNS - 4}%`, flexGrow: 1, height: 86 },
  fill: { flex: 1 },
  tile: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.pet.outline,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9.5,
    paddingHorizontal: 4,
  },
  locked: { backgroundColor: colors.pet.lockedBg, borderColor: colors.pet.lockedBorder, paddingTop: 6, paddingBottom: 7 },
  lockIcon: { position: 'absolute', top: 13, alignSelf: 'center' },
  name: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 16.5, color: colors.ink },
  lockLevel: { fontFamily: fonts.medium, fontSize: 9, lineHeight: 11.25, color: colors.pet.lockedLevel },
});
