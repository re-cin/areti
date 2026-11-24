import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { premiumDateTimeText, type PremiumInfo } from '@/features/subscription/premiumInfo';
import { timeLeftText, useNow } from '@/features/subscription/timeLeft';
import { colors, fonts, spacing } from '@/theme';

const MASCOT = require('../../../assets/images/areti-mascot.png');

/**
 * Shown in User Settings instead of "Upgrade to Premium" once the user has Premium:
 * a black card with Reti (wearing the crown) and when Premium runs until.
 * Tapping it opens the Subscription page, which shows the full status.
 */
export function PremiumCard({ info }: { info: PremiumInfo }) {
  const now = useNow(); // keeps the countdown current while User Settings is open
  const left = info.expiresAt ? timeLeftText(info.expiresAt, now) : 'Active';
  const until = info.expiresAt ? `Until ${premiumDateTimeText(info.expiresAt)}` : 'Thanks for supporting areti!';
  return (
    <Pressable
      onPress={() => router.push('/settings/subscription')}
      accessibilityRole="button"
      accessibilityLabel={`areti Premium. ${left}. ${until}. Open subscription`}>
      <NeoBox backgroundColor={colors.wordmark} shadowColor={colors.tealDark} offset={3} style={styles.card}>
        {/* Reti in a teal bubble (he is dark, so he needs a light background on the black card) */}
        <View style={styles.bubble}>
          <Image source={MASCOT} style={styles.reti} accessibilityIgnoresInvertColors />
          <View style={styles.crown} pointerEvents="none">
            <Icon name="crown" size={20} color={colors.ink} fill={colors.gold} strokeWidth={1.3} />
          </View>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>areti Premium</Text>
          <Text style={styles.line}>{left}</Text>
          <Text style={styles.thanks}>{until}</Text>
        </View>

        <View style={styles.arrow}>
          <Icon name="chevronRight" size={18} color={colors.ink} strokeWidth={2.5} />
        </View>
      </NeoBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.welcomeTeal,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  reti: { width: 38, height: 44, resizeMode: 'contain', marginBottom: 2 },
  crown: { position: 'absolute', top: -12, right: -6, transform: [{ rotate: '18deg' }] },
  title: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.white },
  line: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  thanks: { fontFamily: fonts.regular, fontSize: 12, color: colors.mutedSoft },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
