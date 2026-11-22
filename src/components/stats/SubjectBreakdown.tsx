import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { formatHM } from '@/lib/dateHelpers';
import { borders, colors, fonts, spacing } from '@/theme';

export type SubjectTime = { key: string; name: string; color: string; minutes: number };

type SortKey = 'time' | 'name';
const COLLAPSED_COUNT = 3;

/** "Study Time On Subjects": pill, total and a bar relative to the biggest subject. */
export function SubjectBreakdown({ items }: { items: SubjectTime[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [descending, setDescending] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const sorted = [...items].sort((a, b) => {
    const cmp = sortKey === 'time' ? a.minutes - b.minutes : a.name.localeCompare(b.name);
    return descending ? -cmp : cmp;
  });
  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const max = Math.max(...items.map((i) => i.minutes), 1);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 17 }}>Study Time On Subjects</Text>
        <Pressable
          onPress={() => setSortKey((k) => (k === 'time' ? 'name' : 'time'))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Sorted by ${sortKey}. Switch to ${sortKey === 'time' ? 'name' : 'time'}`}>
          <Icon name={sortKey === 'time' ? 'clock' : 'book'} size={18} />
        </Pressable>
        <Pressable
          onPress={() => setDescending((d) => !d)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={descending ? 'Descending, switch to ascending' : 'Ascending, switch to descending'}>
          <Icon name="sort" size={18} />
        </Pressable>
      </View>

      {items.length === 0 && (
        <Text color={colors.muted}>No focus time in this period yet.</Text>
      )}

      {visible.map((item) => (
        <View key={item.key} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pill label={item.name} color={item.color} />
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 15 }}>{formatHM(item.minutes)}</Text>
          </View>
          <View
            style={{
              height: 14,
              borderRadius: 7,
              borderWidth: borders.thin,
              borderColor: colors.ink,
              backgroundColor: colors.white,
              overflow: 'hidden',
            }}>
            <View style={{ width: `${(item.minutes / max) * 100}%`, height: '100%', backgroundColor: item.color }} />
          </View>
        </View>
      ))}

      {items.length > COLLAPSED_COUNT && (
        <>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <Pressable
            onPress={() => setShowAll((s) => !s)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            accessibilityRole="button">
            <Text variant="caption" color={colors.muted} style={{ fontSize: 13 }}>
              {showAll ? 'Show fewer subjects' : 'See all subjects'}
            </Text>
            <Icon name={showAll ? 'chevronUp' : 'chevronDown'} size={18} color={colors.muted} />
          </Pressable>
        </>
      )}
    </View>
  );
}
