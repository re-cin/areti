import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { addSubject } from '@/db/queries/subjects';
import { useDateTimePicker } from '@/hooks/useDateTimePicker';
import { useSubjects } from '@/hooks/useSubjects';
import { startOfDay } from '@/lib/dates';
import { borders, colors, spacing } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const SUBJECT_COLORS = colors.subjectPalette;

type Difficulty = 'low' | 'medium' | 'high';
type Urgency = 'default' | 'exam';

// TODO: the schema says the difficulty scale is TBD (docs/planner-rules.md). Adjust these numbers to match.
const DIFFICULTY_VALUE: Record<Difficulty, number> = { low: 1, medium: 3, high: 5 };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with the new subject's id so the caller can select it. */
  onCreated: (subjectId: string) => void;
};

/**
 * Bottom sheet drawn INSIDE the screen (not a native Modal) so the tab bar stays visible under it.
 * Render it last in the screen's root View so it sits on top.
 */
export function NewSubjectSheet({ visible, onClose, onCreated }: Props) {
  const { subjects } = useSubjects();
  const { openPicker, pickerElement } = useDateTimePicker();

  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(520);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [urgency, setUrgency] = useState<Urgency>('default');
  const [examDate, setExamDate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Slide in/out, and reset the form every time it opens.
  useEffect(() => {
    if (visible) {
      const unused = SUBJECT_COLORS.find(
        (c) => !subjects.some((s) => s.color.toLowerCase() === c.toLowerCase()),
      );
      setName('');
      setColor(unused ?? SUBJECT_COLORS[0]);
      setPaletteOpen(false);
      setDifficulty('medium');
      setUrgency('default');
      setExamDate(null);
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Android back button closes the sheet.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const valid = name.trim().length > 0;

  const onUrgencyChange = (key: Urgency) => {
    if (key === 'default') {
      setUrgency('default');
      setExamDate(null);
      return;
    }
    openPicker('date', new Date(examDate ?? Date.now()), (d) => {
      setExamDate(startOfDay(d));
      setUrgency('exam');
    });
  };

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const id = await addSubject({
        name: name.trim(),
        color,
        difficulty: DIFFICULTY_VALUE[difficulty],
        examDate: urgency === 'exam' ? examDate : null,
      });
      onCreated(id);
      close();
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const examLabel = examDate
    ? new Date(examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Set Exam Date';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* dimmed backdrop; tapping it closes the sheet */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={close} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.kav}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] },
          ]}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text variant="title" style={{ fontSize: 22 }}>New Subject</Text>
            <Pressable onPress={close} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <Text variant="smallStrong" style={styles.label}>Subject Name</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="e.g. Physics"
            autoCapitalize="characters"
            returnKeyType="done"
            right={
              <Pressable onPress={() => setPaletteOpen((o) => !o)} hitSlop={8} accessibilityLabel="Pick a color">
                {({ pressed }) => (
                  <View style={{ transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [] }}>
                    <NeoBox offset={2} shadow={!pressed} radius={16} backgroundColor={color} style={styles.paletteBtn}>
                      <Ionicons name="color-palette-outline" size={16} color={colors.white} />
                    </NeoBox>
                  </View>
                )}
              </Pressable>
            }
          />

          {paletteOpen && (
            <View style={styles.swatches}>
              {SUBJECT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setColor(c);
                    setPaletteOpen(false);
                  }}
                  style={[styles.swatch, { backgroundColor: c }]}>
                  {c === color && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </Pressable>
              ))}
            </View>
          )}

          <Text variant="smallStrong" style={styles.label}>Difficulty</Text>
          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { key: 'low', label: 'Low' },
              { key: 'medium', label: 'Medium' },
              { key: 'high', label: 'High' },
            ]}
          />

          <Text variant="smallStrong" style={styles.label}>Urgency</Text>
          <Segmented
            value={urgency}
            onChange={onUrgencyChange}
            options={[
              { key: 'default', label: 'Default' },
              { key: 'exam', label: examLabel, icon: 'calendar-outline', flex: 1.3 },
            ]}
          />

          <View style={{ marginTop: spacing.lg }}>
            <NeoButton
              label="Add Subject"
              backgroundColor={colors.teal}
              icon={<Ionicons name="add-circle-outline" size={22} color={colors.ink} />}
              disabled={!valid || saving}
              onPress={submit}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {pickerElement}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.sheetRaised,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.mutedSoft,
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { marginTop: 8 },
  paletteBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});