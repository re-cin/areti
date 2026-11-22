import { Modal, Pressable, View } from 'react-native';
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
  confirmLabel: string;
  /** Red confirm button for actions that delete something. */
  destructive?: boolean;
  /** Overrides the confirm button color. */
  confirmColor?: string;
  onCancel: () => void;
  onConfirm: () => void;
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
  confirmLabel,
  destructive,
  confirmColor,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        onPress={onCancel}
        accessibilityLabel={cancelLabel}
        style={{ flex: 1, backgroundColor: 'rgba(17,17,17,0.45)', justifyContent: 'center', padding: spacing.xl }}>
        {/* Inner Pressable stops taps on the card from closing the dialog */}
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

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' }}>
                <DialogButton label={cancelLabel} backgroundColor={colors.white} onPress={onCancel} />
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
      </Pressable>
    </Modal>
  );
}

function DialogButton({ label, backgroundColor, onPress }: { label: string; backgroundColor: string; onPress: () => void }) {
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
