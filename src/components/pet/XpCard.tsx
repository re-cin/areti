import { StyleSheet, View } from 'react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { colors, fonts, spacing } from '@/theme';

// Figma fill: terracotta -> teal, with the teal end at 156% of the bar (so it only tints the tip).
const XP_GRADIENT = [colors.pet.goal, '#94B4A0'] as const;

type Props = {
  level: number;
  totalExp: number;
  nextLevelExp: number | null;
  progress: number;
  expToday: number;
  /** "Overjoyed · Level 5"; null at max level. */
  nextUnlockText: string | null;
};

/** "LVL 4", "+40 XP today", "520 / 600 XP", gradient bar, next unlock. */
export function XpCard({ level, totalExp, nextLevelExp, progress, expToday, nextUnlockText }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.level}>LVL {level}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          {expToday > 0 && <Text style={styles.today}>+{expToday} XP today</Text>}
          <Text variant="smallStrong" color={colors.inkSoft} style={{ lineHeight: 20 }}>
            {nextLevelExp === null ? `${totalExp} XP · Max level` : `${totalExp} / ${nextLevelExp} XP`}
          </Text>
        </View>
      </View>
      <ProgressBar progress={progress} color={colors.pet.goal} gradient={XP_GRADIENT} height={22} borderWidth={2} inset={4} />
      <Text style={styles.caption}>{nextUnlockText ? `Next unlock: ${nextUnlockText}` : 'Every expression unlocked'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.lg + 2, paddingTop: spacing.lg, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 },
  // Figma uses Fredoka Bold; the app ships SemiBold as its heaviest weight.
  level: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 28, letterSpacing: -0.45 },
  today: { fontFamily: fonts.semiBold, fontSize: 10, lineHeight: 14, color: colors.pet.xpToday },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.pet.caption },
});
