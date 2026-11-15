import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

/** "Upgrade to Premium" call-to-action card. */
export function PremiumBanner({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <NeoBox backgroundColor={colors.premium} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="crown" size={20} color={colors.gold} />
            <Text variant="subheading">Upgrade to Premium</Text>
          </View>
          <Text variant="caption" color={colors.premiumText} style={{ paddingLeft: spacing.xs }}>
            Unlock your full potential and unlimited feature usage.
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="chevron-right" size={18} color={colors.white} strokeWidth={2.8} />
        </View>
      </NeoBox>
    </Pressable>
  );
}
