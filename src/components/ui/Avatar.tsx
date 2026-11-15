import { Pressable, View } from 'react-native';
import { borders, colors } from '@/theme';
import { Icon } from './Icon';

type Props = {
  size?: number;
  /** Draw an ink outline (used in screen headers). */
  outlined?: boolean;
  /** Show the teal camera badge (Account Settings). */
  editable?: boolean;
  backgroundColor?: string;
  onPress?: () => void;
};

/** Round profile picture placeholder. Shows a person glyph until photos exist. */
export function Avatar({ size = 48, outlined, editable, backgroundColor = colors.avatar, onPress }: Props) {
  const badge = Math.round(size * 0.3);
  const body = (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth: outlined ? borders.thin : 0,
          borderColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="user" size={Math.round(size * 0.42)} strokeWidth={2.2} />
      </View>
      {editable && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: 0,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: colors.teal,
            borderWidth: borders.thin,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="camera" size={Math.round(badge * 0.55)} />
        </View>
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open profile">
      {body}
    </Pressable>
  );
}
