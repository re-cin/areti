import { View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { Text } from './Text';

/** Colored subject tag (PHYSICS, CALCULUS ...). Bigger sibling of `Pill`. */
export function SubjectPill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color,
        borderColor: colors.ink,
        borderWidth: borders.thin,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
      }}>
      <Text variant="label" color={colors.white} style={{ fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
