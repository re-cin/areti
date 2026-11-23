
import { colors, radii } from '@/theme';
import { View } from 'react-native';
import { Text } from './Text';

function getContrastColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return colors.ink;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const linearize = (value: number) =>
    value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b);

  return luminance > 0.179 ? colors.ink : colors.white;
}

export function Pill({
  label,
  color = colors.pill.physics,
}: {
  label: string;
  color?: string;
}) {
  const textColor = getContrastColor(color);

  return (
    <View
      style={{
        backgroundColor: color,
        borderColor: colors.ink,
        borderWidth: 1,
        borderRadius: radii.pill,
        paddingHorizontal: 9,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        variant="label"
        color={textColor}
        style={{ fontSize: 10 }}
      >
        {label}
      </Text>
    </View>
  );
}
