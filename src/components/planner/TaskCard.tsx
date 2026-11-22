import Ionicons from '@expo/vector-icons/Ionicons';
import { NeoBox } from '@/components/ui/NeoBox';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import type { CardTask } from '@/features/planner/cardTask';
import { borders, colors, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { plannerColors as extra } from './plannerColors';

/** A task in the Daily Tasks / Finished lists, with its done checkbox. */
export function TaskCard({ task, onToggle }: { task: CardTask; onToggle: () => void }) {
  const done = task.done;
  const fg = done ? extra.muted : colors.ink;
  return (
    <NeoBox
      offset={3}
      backgroundColor={done ? extra.finishedBg : colors.surface}
      shadowColor={done ? extra.finishedShadow : colors.ink}
      style={styles.taskBox}>
      <View style={styles.taskTime}>
        <Text variant="smallStrong" color={fg}>{task.time}</Text>
        <Text variant="caption" color={fg}>{task.duration}</Text>
      </View>
      <View style={[styles.taskBar, { backgroundColor: task.color }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          variant="subheading"
          color={fg}
          numberOfLines={1}
          style={done ? { textDecorationLine: 'line-through' } : undefined}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <Pill label={task.subject} color={task.color} />
          {/* TODO: only show the clock when the task has a linked Pomodoro (task.hasPomodoro) */}
          {!done && <Ionicons name="time" size={16} color={task.color} />}
        </View>
      </View>
      <Pressable onPress={onToggle} hitSlop={10}>
        {done ? (
          <View style={styles.checkDone}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
        ) : (
          <View style={styles.check} />
        )}
      </Pressable>
    </NeoBox>
  );
}

const styles = StyleSheet.create({
  taskBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  taskTime: { width: 44, alignItems: 'flex-end' },
  taskBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borders.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  checkDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
