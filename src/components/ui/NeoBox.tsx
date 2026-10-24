import { colors, radii } from '@/theme';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  radius?: number;
  offset?: number;
  /** Color of the hard offset shadow. Defaults to ink. */
  shadowColor?: string;
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
  offset = 2, // Default drop shadow offset set to 2
  shadowColor = colors.ink,
  shadow = true,
}: Props) {
  return (
    <View style={{ marginRight: offset, marginBottom: offset }}>
      {shadow && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: shadowColor, borderRadius: radius },
          ]}
        />
      )}
      <View
        style={[
          { backgroundColor, borderColor: colors.ink, borderWidth: 1.5, borderRadius: radius }, // Border line set to 1.5
          style,
        ]}>
        {children}
      </View>
    </View>
  );
}