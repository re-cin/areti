import Ionicons from '@expo/vector-icons/Ionicons';
import { NeoBox } from '@/components/ui/NeoBox';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import type { CardTask } from '@/features/planner/cardTask';
import { borders, colors, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { plannerColors as extra } from './plannerColors';

/**
 * A task in the Daily Tasks / Finished lists. Plain tasks have a done tick box;
 * tasks scheduled as a Pomodoro session show a clock instead and no tick box.
 */
export function TaskCard({ task, onToggle }: { task: CardTask; onToggle: () => void }) {
  const done = task.done;
  const fg = colors.ink;
  return (
    // Finished: the whole card fades (Figma "Planner - Home"), flat with no hard shadow.
    <View style={done ? styles.finished : undefined}>
    <NeoBox
      offset={3}
      shadow={!done}
      backgroundColor={done ? extra.finishedBg : colors.surface}
      style={styles.taskBox}>
      <View style={styles.taskTime}>
        {/* One line each; wide enough for "12:22 pm", and shrinks a little rather than wrapping. */}
        <Text variant="smallStrong" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {task.time}
        </Text>
        <Text variant="caption" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {task.duration}
        </Text>
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
          {task.hasPomodoro && !done && <Ionicons name="time" size={16} color={task.color} />}
        </View>
      </View>
      {/* Pomodoro sessions are not tickable: no tick box at all. */}
      {!task.hasPomodoro && (
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? 'Mark as not done' : 'Mark as done'}>
          {done ? (
            <View style={[styles.checkDone, { backgroundColor: task.color }]}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
            </View>
          ) : (
            <View style={styles.check} />
          )}
        </Pressable>
      )}
    </NeoBox>
    </View>
  );
}

const styles = StyleSheet.create({
  finished: { opacity: 0.5 },
  taskBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  taskTime: { width: 68, alignItems: 'flex-end' },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
