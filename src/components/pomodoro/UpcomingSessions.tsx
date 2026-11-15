import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { SubjectPill } from '@/components/ui/SubjectPill';
import { Text } from '@/components/ui/Text';
import { borders, colors, spacing } from '@/theme';

export type UpcomingSession = {
  id: string;
  subject: string;
  color: string;
  time: string;
  blocks: number;
  minutes: number;
};

type Props = {
  sessions: UpcomingSession[];
  /** Expanded = the full-height "all tasks" sheet (plain + instead of circled +). */
  expanded?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
};

/** "Upcoming Sessions" list. Tapping the title expands / collapses the sheet. */
export function UpcomingSessions({ sessions, expanded, onToggle, onAdd }: Props) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingBottom: spacing.sm,
          borderBottomWidth: borders.thin,
          borderBottomColor: colors.ink,
        }}>
        <Pressable
          onPress={onToggle}
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show timer' : 'Show all sessions'}>
          <Text variant="subheading">Upcoming Sessions</Text>
        </Pressable>
        <Pressable onPress={onAdd} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add session">
          <Icon name={expanded ? 'plus' : 'plus-circle'} size={expanded ? 20 : 22} strokeWidth={2.2} />
        </Pressable>
      </View>
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} />
      ))}
    </View>
  );
}

function SessionRow({ session }: { session: UpcomingSession }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <View style={{ flex: 1, gap: 2 }}>
        <SubjectPill label={session.subject} color={session.color} />
        <Text variant="smallStrong" color={colors.muted} style={{ marginLeft: spacing.sm }}>
          {session.time}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="small" color={colors.muted}>
          {session.blocks} blocks
        </Text>
        <Text variant="smallStrong" color={colors.muted}>
          {session.minutes} min
        </Text>
      </View>
    </View>
  );
}
