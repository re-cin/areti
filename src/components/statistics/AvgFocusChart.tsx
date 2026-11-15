import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { borders, colors, radii, spacing } from '@/theme';

type Props = { data: { day: string; hours: number }[]; height?: number };

/** "Avg Focus Time Per Day" bar chart. Bars scale to the busiest day. */
export function AvgFocusChart({ data, height = 140 }: Props) {
  const max = Math.max(...data.map((d) => d.hours), 1);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="body">Avg Focus Time Per Day</Text>
      <View style={{ backgroundColor: colors.page, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingTop: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            height,
            gap: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.mutedSoft,
          }}>
          {data.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Text variant="caption" style={{ fontSize: 10, marginBottom: 2 }}>
                {d.hours.toFixed(1)}h
              </Text>
              <View
                style={{
                  width: '100%',
                  height: (d.hours / max) * (height - 18),
                  backgroundColor: colors.teal,
                  borderWidth: borders.thin,
                  borderBottomWidth: 0,
                  borderColor: colors.ink,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
        {data.map((d, i) => (
          <Text key={i} variant="smallStrong" style={{ flex: 1, textAlign: 'center' }}>
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  );
}
