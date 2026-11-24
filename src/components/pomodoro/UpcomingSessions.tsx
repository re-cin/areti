
import { Alert, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { formatClock, formatHM } from '@/lib/dateHelpers';
import { sessionLengthMin } from '@/features/timer/session';
import { deletePlannedSession, type UpcomingSession } from '@/features/timer/timerRepo';
import { usePreferences } from '@/features/preferences/preferencesStore';
import { colors, fonts, spacing } from '@/theme';

type Props = {
  sessions: UpcomingSession[];
  focusMin: number;
  activeSessionId: string | null;
  /** The session whose details are shown on the timer (tapped, not started yet). */
  selectedSessionId?: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onAdd: () => void;
  /** Tap: shows the session's details on the timer. It starts with the play button. */
  onSelect: (s: UpcomingSession) => void;
};

export function UpcomingSessions({ sessions, focusMin, activeSessionId, selectedSessionId, expanded, onToggleExpanded, onAdd, onSelect }: Props) {
  const timeFormat = usePreferences(s => s.preferences.timeFormat);

  const confirmDelete = (s: UpcomingSession) =>
    Alert.alert('Remove session?', `${s.subjectName}${s.startMinute != null ? ` at ${formatClock(s.startMinute, timeFormat)}` : ''}`, [
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
        </Pressable>
        <Pressable onPress={onAdd} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add a session">
          <Icon name={expanded ? 'plus' : 'plusCircle'} size={24} />
        </Pressable>
      </View>
      <View style={{ height: 2, backgroundColor: colors.ink }} />

      {sessions.length === 0 ? (
        <Text variant="body" color={colors.muted} style={{ paddingVertical: spacing.lg }}>
          Nothing planned for the rest of today. Tap + to add a session, or press play for a free focus run.
        </Text>
      ) : (
        sessions.map((s) => {
          const left = s.blocks - s.completedBlocks;
          // Total session length = focus blocks + short and long breaks (session structure rules).
          const minutes = sessionLengthMin(s.settings, s.blocks);
          const active = s.id === activeSessionId;
          const picked = !active && s.id === selectedSessionId;
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelect(s)}
              onLongPress={() => confirmDelete(s)}
              accessibilityRole="button"
              accessibilityHint="Shows this session on the timer. Long press to remove it."
              accessibilityState={{ selected: picked }}
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
                <Text variant="caption" color={active ? colors.orange : colors.muted} style={{ fontFamily: fonts.semiBold, paddingLeft: 4 }}>
                  {active ? 'IN PROGRESS' : s.startMinute != null ? formatClock(s.startMinute, timeFormat) : 'Any time'}
                </Text>
              </View>
              {picked && <Ionicons name="checkmark-circle" size={20} color={colors.ink} style={{ marginRight: spacing.sm }} />}
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color={colors.muted} style={{ fontSize: 14 }}>
                  {left} {left === 1 ? 'block' : 'blocks'}
                </Text>
                <Text variant="bodyStrong" color={colors.muted} style={{ fontSize: 14 }}>
                  {minutes < 60 ? `${minutes} min` : formatHM(minutes)}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
