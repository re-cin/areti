
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useQuickFade } from '@/components/ui/useQuickFade';
import { borders, colors, fonts, radii, spacing } from '@/theme';

type Props = {
  visible: boolean;
  subjectName: string;
  current: string;
  onPick: (color: string) => void;
  onClose: () => void;
};

export function SubjectColorModal({
  visible,
  subjectName,
  current,
  onPick,
  onClose,
}: Props) {
  const { mounted, backdropStyle, cardStyle } = useQuickFade(visible);
  const { height: windowHeight } = useWindowDimensions();

  const [draftColor, setDraftColor] = useState(current);
  const [previous, setPrevious] = useState({ visible, current });
  if (visible !== previous.visible || (visible && current !== previous.current)) {
    setPrevious({ visible, current });
    if (visible) setDraftColor(current);
  }

  const handleApply = () => {
    onPick(draftColor);
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(17,17,17,0.45)' },
            backdropStyle,
          ]}
        />

        <Animated.View
          style={[
            cardStyle,
            styles.cardWrapper,
            { maxHeight: windowHeight * 0.88 },
          ]}
        >
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            style={{ flexShrink: 1 }}
          >
            <NeoBox
              backgroundColor={colors.white}
              style={[
                styles.card,
                { maxHeight: windowHeight * 0.88 },
              ]}
            >
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <Text
                  variant="heading"
                  style={styles.title}
                  accessibilityRole="header"
                >
                  {subjectName} color
                </Text>

                {/* Preset colors */}
                <View style={styles.presets}>
                  {colors.subjectPalette.map((c) => {
                    const selected =
                      c.toLowerCase() === draftColor.toLowerCase();

                    return (
                      <Pressable
                        key={c}
                        onPress={() => setDraftColor(c)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Color ${c}`}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: c,
                            borderWidth: selected ? 3 : borders.thin,
                          },
                        ]}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={getContrastColor(c)}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Selected color preview */}
                <View style={styles.preview}>
                  <View style={[styles.previewSwatch, { backgroundColor: draftColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="smallStrong">{subjectName}</Text>
                    <Text variant="caption" color={colors.muted}>
                      Pick one of the {colors.subjectPalette.length} colors
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  style={styles.actionButton}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        transform: pressed
                          ? [{ translateX: 3 }, { translateY: 3 }]
                          : [],
                      }}
                    >
                      <NeoBox
                        backgroundColor={colors.white}
                        radius={radii.button}
                        offset={3}
                        shadow={!pressed}
                        style={styles.buttonContent}
                      >
                        <Text style={styles.buttonText}>
                          Cancel
                        </Text>
                      </NeoBox>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={handleApply}
                  accessibilityRole="button"
                  style={styles.actionButton}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        transform: pressed
                          ? [{ translateX: 3 }, { translateY: 3 }]
                          : [],
                      }}
                    >
                      <NeoBox
                        backgroundColor={colors.teal}
                        radius={radii.button}
                        offset={3}
                        shadow={!pressed}
                        style={styles.buttonContent}
                      >
                        <Text style={styles.buttonText}>
                          Apply Color
                        </Text>
                      </NeoBox>
                    </View>
                  )}
                </Pressable>
              </View>
            </NeoBox>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  cardWrapper: {
    width: '100%',
    flexShrink: 1,
  },
  card: {
    padding: spacing.xl,
    gap: spacing.lg,
    flexShrink: 1,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: borders.thin,
    borderColor: colors.ink,
    borderRadius: 12,
    padding: spacing.sm,
  },
  previewSwatch: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: borders.thin,
    borderColor: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  actionButton: {
    flex: 1,
  },
  buttonContent: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  buttonText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
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
