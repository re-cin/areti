import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { borders, colors, radii } from '@/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  radius?: number;
  offset?: number;
  /** Set false to hide the shadow (e.g. while pressed). Layout space is always reserved. */
  shadow?: boolean;
};

/**
 * Thick outline + hard offset shadow. Android's `elevation` cannot draw a hard shadow,
 * so the shadow is a real second View behind the box. Use this for every card and button.
 */
export function NeoBox({
  children,
  style,
  backgroundColor = colors.surface,
  radius = radii.card,
  offset = borders.shadowOffset,
  shadow = true,
}: Props) {
  return (
    <View style={{ marginRight: offset, marginBottom: offset }}>
      {shadow && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: colors.ink, borderRadius: radius },
          ]}
        />
      )}
      <View
        style={[
          { backgroundColor, borderColor: colors.ink, borderWidth: borders.width, borderRadius: radius },
          style,
        ]}>
        {children}
      </View>
    </View>
  );
}
