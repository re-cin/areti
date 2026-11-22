import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { borders, colors } from '@/theme';
import { Icon } from './Icon';

type Props = {
  size?: number;
  /** Draw an ink outline (used in screen headers). */
  outlined?: boolean;
  /** Show the teal camera badge (Account Settings). */
  editable?: boolean;
  backgroundColor?: string;
  /** Profile picture link; shows the person glyph when empty. */
  uri?: string | null;
  /** Show a spinner over the picture (e.g. while uploading). */
  loading?: boolean;
  onPress?: () => void;
};

/** Round profile picture. Shows a person glyph when there's no photo. */
export function Avatar({ size = 48, outlined, editable, backgroundColor = colors.avatar, uri, loading, onPress }: Props) {
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
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={150}
            accessibilityLabel="Profile picture"
          />
        ) : (
          <Icon name="user" size={Math.round(size * 0.42)} strokeWidth={2.2} />
        )}
        {loading && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: size / 2,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
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
