import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SubjectPill } from '@/components/ui/SubjectPill';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

export type SubjectTime = { subject: string; color: string; label: string; progress: number };

type Props = {
  items: SubjectTime[];
  onToggleUnit?: () => void;
  onSort?: () => void;
  onSeeAll?: () => void;
};

/** "Study Time On Subjects" with a progress bar per subject. */
export function SubjectTimeList({ items, onToggleUnit, onSort, onSeeAll }: Props) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="body" style={{ flex: 1 }}>
          Study Time On Subjects
        </Text>
        <Pressable onPress={onToggleUnit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change time unit">
          <Icon name="clock" size={18} />
        </Pressable>
        <Pressable onPress={onSort} hitSlop={8} accessibilityRole="button" accessibilityLabel="Sort subjects">
          <Icon name="sort" size={18} />
        </Pressable>
      </View>

      {items.map((item) => (
        <View key={item.subject} style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SubjectPill label={item.subject} color={item.color} />
            </View>
            <Text variant="bodyStrong">{item.label}</Text>
          </View>
          <ProgressBar progress={item.progress} color={item.color} />
        </View>
      ))}

      <Pressable
        onPress={onSeeAll}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          paddingTop: spacing.md,
        }}>
        <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
          See all subjects
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}
