import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { borders, radii } from '@/theme';
import { Pressable, View } from 'react-native';
import { use24Hour } from '@/features/preferences/preferencesStore';

/** minutes since midnight -> "7 : 30 am", or "19 : 30" in 24-hour format */
function fmtTime(min: number, use24h: boolean) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  if (use24h) return `${String(h24).padStart(2, '0')} : ${String(m).padStart(2, '0')}`;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12} : ${String(m).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

/** Tappable time (start or end) on the Add Task screen. */
export function TimePill({ min, color, onPress }: { min: number; color: string; onPress: () => void }) {
  const use24h = use24Hour();
  const offset = borders.shadowOffset;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="button">
      {({ pressed }) => (
        <View style={{ transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            radius={radii.pill}
            backgroundColor={color}
            style={{ paddingVertical: 10, alignItems: 'center' }}>
            <Text variant="smallStrong">{fmtTime(min, use24h)}</Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}
