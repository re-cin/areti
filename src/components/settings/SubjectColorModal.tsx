import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { DialogButton } from '@/components/ui/ConfirmDialog';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useQuickFade } from '@/components/ui/useQuickFade';
import { borders, colors, spacing } from '@/theme';

type Props = {
  visible: boolean;
  subjectName: string;
  current: string;
  onPick: (color: string) => void;
  onClose: () => void;
};

/** White popup with the subject color swatches; tapping one picks it. */
export function SubjectColorModal({ visible, subjectName, current, onPick, onClose }: Props) {
  const { mounted, backdropStyle, cardStyle } = useQuickFade(visible);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.45)' }, backdropStyle]} />
        <Animated.View style={cardStyle}>
          <Pressable onPress={() => {}} accessibilityViewIsModal>
            <NeoBox backgroundColor={colors.white} style={{ padding: spacing.xl, gap: spacing.lg }}>
              <Text variant="heading" style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }} accessibilityRole="header">
                {subjectName} color
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md }}>
                {colors.subjectPalette.map((c) => {
                  const selected = c.toLowerCase() === current.toLowerCase();
                  return (
                    <Pressable
                      key={c}
                      onPress={() => onPick(c)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Color ${c}`}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: c,
                        borderWidth: selected ? 3 : borders.thin,
                        borderColor: colors.ink,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {selected && <Ionicons name="checkmark" size={22} color={colors.white} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row' }}>
                <DialogButton label="Cancel" backgroundColor={colors.white} onPress={onClose} />
              </View>
            </NeoBox>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
