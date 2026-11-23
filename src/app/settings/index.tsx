import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useDbQuery } from '@/lib/useDbQuery';
import { showComingSoon, showSignOutInfo } from '@/features/account/accountAlerts';
import { getProfile, type Profile } from '@/features/account/accountRepo';
import { colors, fonts, spacing } from '@/theme';

const EMPTY_PROFILE: Profile = { id: '', name: '', email: '', pictureUri: null, plan: 'free', joinedAt: Date.now() };
const comingSoon = showComingSoon;

export default function UserSettingsScreen() {
  const profile = useDbQuery(getProfile, EMPTY_PROFILE);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const rows: { icon: IconName; label: string; href?: Href; onPress?: () => void }[] = [
    { icon: 'book', label: 'Subjects', href: '/settings/subjects' },
    { icon: 'sliders', label: 'Preferences' }, // TODO: Preferences page not built yet
    { icon: 'shield', label: 'Data & Privacy', href: '/settings/privacy' },
    { icon: 'help', label: 'Help & Support', onPress: () => comingSoon('Help & Support') },
    { icon: 'info', label: 'Terms & Policies', onPress: () => comingSoon('Terms & Policies') },
  ];

  return (
    <SettingsScaffold
      title="User Settings"
      footer={
        <Text variant="caption" color={colors.muted} style={{ textAlign: 'center', paddingTop: spacing.xl }}>
          areti v{version}
        </Text>
      }>
      {/* Profile card */}
      <Pressable onPress={() => router.push('/settings/account')} accessibilityRole="button" accessibilityLabel="Account settings">
        <NeoBox style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
          <Avatar size={52} backgroundColor={colors.page} uri={profile.pictureUri} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 17, textTransform: 'uppercase' }} numberOfLines={1}>
              {profile.name || 'Your name'}
            </Text>
            <Text variant="caption" color={colors.muted} numberOfLines={1}>
              {profile.email || 'Add your email'}
            </Text>
          </View>
          <IconButton icon="logout" backgroundColor={colors.dangerSoft} accessibilityLabel="Sign out" onPress={showSignOutInfo} />
        </NeoBox>
      </Pressable>

      {/* Upgrade banner */}
      {profile.plan !== 'pro' && (
        <Pressable onPress={() => comingSoon('Premium')} accessibilityRole="button" accessibilityLabel="Upgrade to Premium">
          <NeoBox backgroundColor={colors.terracotta} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="crown" size={20} color={colors.ink} fill={colors.gold} strokeWidth={1.2} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>Upgrade to Premium</Text>
              </View>
              <Text variant="caption" style={{ fontFamily: fonts.medium }}>
                Unlock your full potential and unlimited feature usage.
              </Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevronRight" size={18} color={colors.white} strokeWidth={2.5} />
            </View>
          </NeoBox>
        </Pressable>
      )}

      {/* Menu */}
      <NeoBox style={{ overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <Pressable
            key={row.label}
            onPress={() => (row.href ? router.push(row.href) : row.onPress?.())}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.lg + 2,
              borderTopWidth: i === 0 ? 0 : 1.5,
              borderTopColor: colors.ink,
              backgroundColor: pressed ? colors.page : 'transparent',
            })}>
            <Icon name={row.icon} size={22} strokeWidth={1.8} />
            <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 16 }}>{row.label}</Text>
            <Icon name="chevronRight" size={20} strokeWidth={2.5} />
          </Pressable>
        ))}
      </NeoBox>
    </SettingsScaffold>
  );
}
