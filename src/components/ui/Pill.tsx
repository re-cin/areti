import { View } from 'react-native';
import { borders, colors, radii } from '@/theme';
import { Text } from './Text';

export function Pill({ label, color = colors.pill.physics }: { label: string; color?: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderColor: colors.ink,
        borderWidth: 2,
        borderRadius: radii.pill,
        paddingHorizontal: 9,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}>
      <Text variant="label" color={colors.white} style={{ fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}
