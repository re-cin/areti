
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { SubjectColorModal } from '@/components/settings/SubjectColorModal';
import { addSubject } from '@/db/queries/subjects';
import { useSubjects } from '@/hooks/useSubjects';
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

const DIFFICULTY_VALUE: Record<Difficulty, number> = {
  low: 1,
  medium: 3,
  high: 5,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (subjectId: string) => void;
};

export function NewSubjectSheet({ visible, onClose, onCreated }: Props) {
  const { subjects } = useSubjects();

  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(520);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      const unused = SUBJECT_COLORS.find(
        (c) => !subjects.some((s) => s.color.toLowerCase() === c.toLowerCase()),
      );

      setName('');
      setColor(unused ?? SUBJECT_COLORS[0]);
      setPaletteOpen(false);
      setCustomColorOpen(false);
      setDifficulty('medium');
      setMounted(true);

      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    setCustomColorOpen(false);
    onClose();
  };

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;

    setSaving(true);

    try {
      const id = await addSubject({
        name: name.trim(),
        color,
        difficulty: DIFFICULTY_VALUE[difficulty],
        examDate: null,
      });

      onCreated(id);
      close();
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={close}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.kav}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetH, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text variant="title" style={{ fontSize: 22 }}>
              New Subject
            </Text>

            <Pressable onPress={close} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <Text variant="smallStrong" style={styles.label}>
            Subject Name
          </Text>

          <TextField
            value={name}
            onChangeText={setName}
            placeholder="e.g. Physics"
            autoCapitalize="characters"
            returnKeyType="done"
            right={
              <Pressable
                onPress={() => setPaletteOpen((o) => !o)}
                hitSlop={8}
                accessibilityLabel="Pick a color"
              >
                {({ pressed }) => (
                  <View
                    style={{
                      transform: pressed
                        ? [{ translateX: 2 }, { translateY: 2 }]
                        : [],
                    }}
                  >
                    <NeoBox
                      offset={2}
                      shadow={!pressed}
                      radius={16}
                      backgroundColor={color}
                      style={styles.paletteBtn}
                    >
                      <Ionicons
                        name="color-palette-outline"
                        size={16}
                        color={getContrastColor(color)}
                      />
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
                  style={[styles.swatch, { backgroundColor: c }]}
                >
                  {c.toLowerCase() === color.toLowerCase() && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={getContrastColor(c)}
                    />
                  )}
                </Pressable>
              ))}

              <Pressable
                onPress={() => {
                  setPaletteOpen(false);
                  setCustomColorOpen(true);
                }}
                style={[
                  styles.swatch,
                  { backgroundColor: colors.white },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Choose custom color"
              >
                <Ionicons
                  name="color-palette-outline"
                  size={18}
                  color={colors.ink}
                />
              </Pressable>
            </View>
          )}

          <Text variant="smallStrong" style={styles.label}>
            Difficulty
          </Text>

          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { key: 'low', label: 'Low' },
              { key: 'medium', label: 'Medium' },
              { key: 'high', label: 'High' },
            ]}
          />

          <View style={{ marginTop: spacing.lg }}>
            <NeoButton
              label="Add Subject"
              backgroundColor={colors.teal}
              icon={
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={colors.ink}
                />
              }
              disabled={!valid || saving}
              onPress={submit}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <SubjectColorModal
        visible={customColorOpen}
        subjectName={name.trim() || 'New Subject'}
        current={color}
        onPick={(selectedColor) => {
          setColor(selectedColor);
          setCustomColorOpen(false);
        }}
        onClose={() => setCustomColorOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    marginTop: 8,
  },
  paletteBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
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

function getContrastColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return colors.ink;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const linearize = (value: number) =>
    value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b);

  return luminance > 0.179 ? colors.ink : colors.white;
}
