import { Fragment } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { formatClock, formatHM } from '@/lib/dateHelpers';
import { sessionLengthMin } from '@/features/timer/session';
import { deletePlannedSession, type UpcomingSession } from '@/features/timer/timerRepo';
import { colors, fonts, spacing } from '@/theme';
import { useToday } from '@/hooks/useToday';

type Props = {
  sessions: UpcomingSession[];
  focusMin: number;
  activeSessionId: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onAdd: () => void;
  onStart: (s: UpcomingSession) => void;
};

export function UpcomingSessions({ sessions, focusMin, activeSessionId, expanded, onToggleExpanded, onAdd, onStart }: Props) {
  const today = useToday();
  const confirmDelete = (s: UpcomingSession) =>
    Alert.alert('Remove session?', `${s.subjectName}${s.startMinute != null ? ` at ${formatClock(s.startMinute)}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void deletePlannedSession(s.id) },
    ]);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={onToggleExpanded}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show timer' : 'Expand upcoming sessions'}>
          <Text variant="heading" style={{ fontSize: 19 }}>
            Upcoming Sessions
          </Text>
          <Icon name={expanded ? 'chevronDown' : 'chevronUp'} size={18} strokeWidth={2.5} color={colors.muted} />
        </Pressable>
        <Pressable onPress={onAdd} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add a session">
          <Icon name={expanded ? 'plus' : 'plusCircle'} size={24} />
        </Pressable>
      </View>
      <View style={{ height: 2, backgroundColor: colors.ink }} />
      {/* Note: this list only covers today and tomorrow. Later days live in the Planner. */}
      <Text variant="caption" color={colors.muted}>
        Showing today’s and tomorrow’s sessions. See later days in the Planner.
      </Text>

      {sessions.length === 0 ? (
        <Text variant="body" color={colors.muted} style={{ paddingVertical: spacing.lg }}>
          Nothing planned for today or tomorrow. Tap + to add a session, or press play for a free focus run.
        </Text>
      ) : (
        sessions.map((s, index) => {
          const isTomorrow = s.date > today;
          const firstOfDay = index === 0 || sessions[index - 1].date !== s.date;
          // Tomorrow's sessions can be started early, after a quick check.
          const start = () => isTomorrow
            ? Alert.alert('Start tomorrow’s session now?', 'It counts as studying ahead, and the Planner adjusts.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', onPress: () => onStart(s) },
              ])
            : onStart(s);
          const left = s.blocks - s.completedBlocks;
          // Total session length = focus blocks + short and long breaks (session structure rules).
          const minutes = sessionLengthMin(s.settings, s.blocks);
          const active = s.id === activeSessionId;
          return (
            <Fragment key={s.id}>
            {firstOfDay && (
              <Text variant="captionStrong" color={colors.ink} style={{ marginTop: spacing.sm }}>
                {isTomorrow ? 'TOMORROW' : 'TODAY'}
              </Text>
            )}
            <Pressable
              onPress={start}
              onLongPress={() => confirmDelete(s)}
              accessibilityRole="button"
              accessibilityHint="Starts this session. Long press to remove it."
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                opacity: pressed ? 0.6 : 1,
              })}>
              <View style={{ flex: 1, gap: 4 }}>
                <Pill label={s.subjectName} color={s.subjectColor} />
                {s.taskTitle ? (
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 15, paddingLeft: 4 }} numberOfLines={1}>
                    {s.taskTitle}
                  </Text>
                ) : null}
                <Text variant="caption" color={colors.muted} style={{ fontFamily: fonts.semiBold, paddingLeft: 4 }}>
                  {active ? 'IN PROGRESS' : s.startMinute != null ? formatClock(s.startMinute) : 'Any time'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color={colors.muted} style={{ fontSize: 14 }}>
                  {left} {left === 1 ? 'block' : 'blocks'}
                </Text>
                <Text variant="bodyStrong" color={colors.muted} style={{ fontSize: 14 }}>
                  {minutes < 60 ? `${minutes} min` : formatHM(minutes)}
                </Text>
              </View>
            </Pressable>
            </Fragment>
          );
        })
      )}
    </View>
  );
}
