import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

/** "Focus Time ........ 23h 30m" */
export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}
