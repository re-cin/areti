import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { borders, colors, spacing } from '@/theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  /** "back" shows a chevron that pops the stack; "avatar" shows the profile button. */
  leading?: 'back' | 'avatar' | 'none';
  onAvatarPress?: () => void;
  /** Element on the right, e.g. a settings gear. */
  trailing?: ReactNode;
};

/** Title row with the thick underline used at the top of every screen. */
export function ScreenHeader({ title, leading = 'none', onAvatarPress, trailing }: Props) {
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
      {leading === 'avatar' && <Avatar size={40} backgroundColor={colors.surface} onPress={onAvatarPress} />}
      <Text variant={leading === 'back' ? 'heading' : 'title'} style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

/** Small gear button for the right side of a header. */
export function HeaderGear({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
      <Icon name="settings" size={22} />
    </Pressable>
  );
}
