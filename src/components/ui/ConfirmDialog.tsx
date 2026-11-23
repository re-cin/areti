import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useQuickFade } from './useQuickFade';
import { borders, colors, fonts, radii, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** Optional highlighted line under the message (e.g. "4 min will be saved"). */
  highlight?: string;
  /** Optional round badge on the top edge of the card. Omit for no badge. */
  icon?: IconName;
  iconBackground?: string;
  cancelLabel?: string;
  /** One-button notice (e.g. "Okay"): hides the cancel button. */
  hideCancel?: boolean;
  confirmLabel: string;
  /** Red confirm button for actions that delete something. */
  destructive?: boolean;
  /** Overrides the confirm button color. */
  confirmColor?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Optional check box under the message, e.g. "Don't remind me again". */
  checkboxLabel?: string;
  checked?: boolean;
  onToggleChecked?: () => void;
};

/** areti-styled replacement for Alert.alert confirmations: outlined card, hard shadow, two buttons. */
export function ConfirmDialog({
  visible,
  title,
  message,
  highlight,
  icon,
  iconBackground = colors.terracotta,
  cancelLabel = 'Cancel',
  hideCancel,
  confirmLabel,
  destructive,
  confirmColor,
  onCancel,
  onConfirm,
  checkboxLabel,
  checked,
  onToggleChecked,
}: Props) {
  const { mounted, backdropStyle, cardStyle } = useQuickFade(visible);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
        style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.45)' }, backdropStyle]} />
        {/* Inner Pressable stops taps on the card from closing the dialog */}
        <Animated.View style={cardStyle}>
        <Pressable onPress={() => {}} accessibilityViewIsModal>
          <View style={{ paddingTop: icon ? 30 : 0 }}>
            <NeoBox backgroundColor={colors.white} style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: icon ? 40 : spacing.xl, gap: spacing.sm, alignItems: 'center' }}>
              <Text variant="heading" style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }} accessibilityRole="header">
                {title}
              </Text>
              {message ? (
                <Text color={colors.muted} style={{ textAlign: 'center' }}>
                  {message}
                </Text>
              ) : null}
              {highlight ? (
                <View
                  style={{
                    marginTop: spacing.xs,
                    backgroundColor: colors.tealSoft,
                    borderRadius: radii.pill,
                    borderWidth: borders.thin,
                    borderColor: colors.ink,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 3,
                  }}>
                  <Text variant="caption" style={{ fontFamily: fonts.semiBold, fontSize: 13 }}>
                    {highlight}
                  </Text>
                </View>
              ) : null}

              {checkboxLabel ? (
                <Pressable
                  onPress={onToggleChecked}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(checked) }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: borders.thin,
                      borderColor: colors.ink,
                      backgroundColor: checked ? colors.ink : colors.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {checked && <Ionicons name="checkmark" size={16} color={colors.white} />}
                  </View>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14 }}>{checkboxLabel}</Text>
                </Pressable>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' }}>
                {!hideCancel && <DialogButton label={cancelLabel} backgroundColor={colors.white} onPress={onCancel} />}
                <DialogButton
                  label={confirmLabel}
                  backgroundColor={confirmColor ?? (destructive ? colors.danger : colors.teal)}
                  onPress={onConfirm}
                />
              </View>
            </NeoBox>

            {/* Icon badge sitting on the top edge of the card */}
            {icon && (
            <View style={{ position: 'absolute', top: 0, alignSelf: 'center', marginLeft: -borders.shadowOffset }}>
              <NeoBox
                radius={30}
                offset={3}
                backgroundColor={iconBackground}
                style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={28} strokeWidth={2.2} color={colors.ink} />
              </NeoBox>
            </View>
            )}
          </View>
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export function DialogButton({ label, backgroundColor, onPress }: { label: string; backgroundColor: string; onPress: () => void }) {
  const offset = 3;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1 }}>
      {({ pressed }) => (
        <View style={{ transform: pressed ? [{ translateX: offset }, { translateY: offset }] : [] }}>
          <NeoBox
            shadow={!pressed}
            offset={offset}
            radius={radii.button}
            backgroundColor={backgroundColor}
            style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 16 }} numberOfLines={1}>
              {label}
            </Text>
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}
