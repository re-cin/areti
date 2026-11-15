import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import { BlockDots } from './BlockDots';

type Props = { level: number; xp: number; xpGoal: number; blocks: number; activeBlock: number };

/** "LVL 4" + block dots + "320 / 500 XP" above the timer. */
export function LevelProgress({ level, xp, xpGoal, blocks, activeBlock }: Props) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Text variant="smallStrong">LVL {level}</Text>
      <BlockDots total={blocks} active={activeBlock} />
      <Text variant="caption" color={colors.muted} style={{ fontSize: 10 }}>
        {xp} / {xpGoal} XP
      </Text>
    </View>
  );
}
