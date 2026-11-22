import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import { Ghost } from './Ghost';

type Props = {
  level: number;
  xp: number;
  xpGoal: number;
  studied: string;
  sessions: number;
  xpGained: number;
};

/** Reti with a speech bubble summarising today's study. */
export function TodaySummary({ level, xp, xpGoal, studied, sessions, xpGained }: Props) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ alignItems: 'center' }}>
          <Text variant="smallStrong">LVL {level}</Text>
          <Ghost size={92} />
        </View>
        <View style={{ flex: 1, marginTop: spacing.lg }}>
          {/* bubble tail */}
          <View
            style={{
              position: 'absolute',
              left: -8,
              top: 18,
              width: 0,
              height: 0,
              borderTopWidth: 8,
              borderBottomWidth: 8,
              borderRightWidth: 10,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: colors.surface,
            }}
          />
          <View style={{ backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, gap: spacing.xs }}>
            <Text variant="subheading">Today you've:</Text>
            <Text variant="small" color={colors.muted}>
              Studied for a total of{' '}
              <Text variant="smallStrong" color={colors.terracottaDark}>
                {studied}
              </Text>{' '}
              in{' '}
              <Text variant="smallStrong" color={colors.terracottaDark}>
                {sessions} sessions
              </Text>{' '}
              and gained{' '}
              <Text variant="smallStrong" color={colors.tealDark}>
                {xpGained} XPs.
              </Text>
            </Text>
          </View>
        </View>
      </View>
      <Text variant="caption" style={{ alignSelf: 'flex-end', fontSize: 10 }}>
        {xp} / {xpGoal} XP
      </Text>
    </View>
  );
}
