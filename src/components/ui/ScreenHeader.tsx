import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { getProfile } from '@/features/account/accountRepo';
import { useDbQuery } from '@/lib/useDbQuery';
import { borders, colors, spacing } from '@/theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';

// Two ways to use this header (both versions of the app use it):
//  1. Pomodoro / Statistics / Settings:  <ScreenHeader title="..." back? gearHref?="/settings" />
// On every screen the profile picture opens Account Settings and the gear opens Settings.
//  2. Ryan's screens (Planner):           <ScreenHeader title="..." leading="back|avatar|none" onAvatarPress trailing={...} />
type Props = {
  title: string;
  /** Show a back chevron (sub-pages) instead of the profile avatar (tab pages). */
  back?: boolean;
  /** Where the gear goes. Omit to hide it. */
  gearHref?: Href;
  /** Ryan's API: "back" shows a chevron that pops the stack; "avatar" shows the profile button. */
  leading?: 'back' | 'avatar' | 'none';
  onAvatarPress?: () => void;
  /** Ryan's API: element on the right, e.g. a settings gear. */
  trailing?: ReactNode;
};

/** The signed-in user's profile picture link (null = default icon). Re-reads on focus and after edits/sync. */
async function getProfilePicture() { return (await getProfile()).pictureUri; }
function useProfilePicture(): string | null {
  return useDbQuery(getProfilePicture, null);
}

/** "Avatar  Title ........ gear" with the thick rule underneath, as in the Figma screens. */
export function ScreenHeader(props: Props) {
  if (props.leading !== undefined || props.trailing !== undefined || props.onAvatarPress !== undefined) {
    return <LeadingHeader {...props} />;
  }
  return <DefaultHeader {...props} />;
}

function DefaultHeader(props: Props) {
  const { title, back, gearHref } = props;
  const pictureUri = useProfilePicture();
  return (
    <View style={{ paddingTop: spacing.sm, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 }}>
        {back ? (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevronLeft" size={24} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/settings/account')} accessibilityRole="button" accessibilityLabel="Account settings">
            <Avatar size={36} backgroundColor={colors.surface} uri={pictureUri} />
          </Pressable>
        )}
        <Text variant="title" style={{ flex: 1, fontSize: back ? 24 : 28 }} numberOfLines={1}>
          {title}
        </Text>
        {gearHref && (
          <Pressable onPress={() => router.push(gearHref)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
            <Icon name="settings" size={22} />
          </Pressable>
        )}
      </View>
      <View style={{ height: 2, backgroundColor: colors.ink }} />
    </View>
  );
}

/** Ryan's header layout (title row with the underline as a bottom border). */
function LeadingHeader({ title, leading = 'none', onAvatarPress, trailing }: Props) {
  const pictureUri = useProfilePicture();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: borders.thin,
        borderBottomColor: colors.ink,
      }}>
      {leading === 'back' && (
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="chevron-left" size={24} strokeWidth={2.8} />
        </Pressable>
      )}
      {leading === 'avatar' && <Avatar size={40} backgroundColor={colors.surface} uri={pictureUri} onPress={onAvatarPress} />}
      <Text variant={leading === 'back' ? 'heading' : 'title'} style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** Small gear button for the right side of a header. Opens Settings unless given another action. */
export function HeaderGear({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress ?? (() => router.push('/settings'))} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
      <Icon name="settings" size={22} />
    </Pressable>
  );
}
