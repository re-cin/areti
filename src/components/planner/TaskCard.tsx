import Ionicons from '@expo/vector-icons/Ionicons';
import { NeoBox } from '@/components/ui/NeoBox';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import type { CardTask } from '@/features/planner/cardTask';
import { borders, colors, radii, spacing } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { plannerColors as extra } from './plannerColors';

type Props = {
  task: CardTask;
  /** Tap on the card: ticks it (plain tasks and exams), or selects it while editing. */
  onPress: () => void;
  /** Edit mode: the tick box becomes a select box and a pencil appears. */
  editing?: boolean;
  selected?: boolean;
  onEdit?: () => void;
};

/**
 * A card in the Daily Tasks / Finished lists. Plain tasks and exams are ticked by tapping the card;
 * Pomodoro sessions show a clock instead and are not tickable. Exams are orange with a difficulty tag.
 */
export function TaskCard({ task, onPress, editing = false, selected = false, onEdit }: Props) {
  const done = task.done;
  const exam = task.kind === 'exam';
  const tickable = !task.hasPomodoro;
  const fg = colors.ink;
  const background = exam ? extra.examCard : done ? extra.finishedBg : colors.surface;
  return (
    // Finished: the whole card fades (Figma "Planner - Home"), flat with no hard shadow.
    <Pressable
      onPress={onPress}
      disabled={!editing && !tickable}
      style={done && !editing ? styles.finished : undefined}
      accessibilityRole={editing ? 'checkbox' : tickable ? 'checkbox' : undefined}
      accessibilityState={editing ? { checked: selected } : tickable ? { checked: done } : undefined}
      accessibilityLabel={`${task.title}${exam ? ', exam' : ''}${editing ? (selected ? ', selected' : '') : tickable ? (done ? ', done. Tap to mark as not done' : '. Tap to mark as done') : ''}`}>
      <NeoBox offset={3} shadow={!done || editing} backgroundColor={background} style={styles.taskBox}>
        <View style={styles.taskTime}>
          {/* One line each; wide enough for "12:22 pm", and shrinks a little rather than wrapping. */}
          <Text variant="smallStrong" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {task.time}
          </Text>
          <Text variant="caption" color={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {task.duration}
          </Text>
        </View>
        <View style={[styles.taskBar, { backgroundColor: exam ? colors.ink : task.color }]} />
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
            {exam && task.difficulty && (
              <View style={styles.difficulty}>
                <Text variant="label" style={{ fontSize: 10 }}>{task.difficulty}</Text>
              </View>
            )}
            {task.hasPomodoro && !done && <Ionicons name="time" size={16} color={task.color} />}
          </View>
        </View>

        {editing ? (
          <View style={styles.editTools}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.pencil} accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`}>
              <Ionicons name="pencil" size={14} color={colors.ink} />
            </Pressable>
            {selected ? (
              <View style={[styles.check, styles.selectOn]}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </View>
            ) : (
              <View style={styles.check} />
            )}
          </View>
        ) : (
          // Pomodoro sessions are not tickable: no tick box at all.
          tickable && (
            done ? (
              <View style={[styles.checkDone, { backgroundColor: exam ? colors.ink : task.color }]}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
              </View>
            ) : (
              <View style={styles.check} />
            )
          )
        )}
      </NeoBox>
    </Pressable>
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
  difficulty: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  editTools: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pencil: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: borders.width,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  selectOn: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  checkDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
