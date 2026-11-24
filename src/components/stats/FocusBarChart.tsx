import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { formatChartLabel, WEEKDAYS_LETTER } from '@/lib/dateHelpers';
import { borders, colors, fonts, spacing } from '@/theme';

const HEIGHT = 150;

/** Seven teal bars (Mon..Sun) with their value on top. */
export function FocusBarChart({ minutes }: { minutes: number[] }) {
  const max = Math.max(...minutes, 1);
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          backgroundColor: colors.chartBg,
          borderRadius: 14,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.lg,
          height: HEIGHT + spacing.lg + 18,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
        }}>
        {minutes.map((m, i) => {
          const h = m > 0 ? Math.max(8, (m / max) * HEIGHT) : 0;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 10, marginBottom: 2 }}>{formatChartLabel(m)}</Text>
              <View
                style={{
                  width: '100%',
                  height: h,
                  backgroundColor: colors.teal,
                  borderWidth: h > 0 ? borders.thin : 0,
                  borderBottomWidth: 0,
                  borderColor: colors.ink,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.sm, gap: spacing.sm }}>
        {WEEKDAYS_LETTER.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 13 }}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}
