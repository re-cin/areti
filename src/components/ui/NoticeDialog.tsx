import { useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useQuickFade } from './useQuickFade';
import { useNotice } from '@/stores/notice';
import { colors, spacing } from '@/theme';
import { ConfirmDialog, DialogButton } from './ConfirmDialog';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

/**
 * Renders the current notice from showNotice(): white card, terracotta main button. Mounted once in the
 * root layout. With `actions` it shows a stacked list of choices (e.g. the profile picture menu).
 */
export function NoticeDialog() {
  const current = useNotice((s) => s.notice);
  const hide = useNotice((s) => s.hide);
  // Keep showing the last notice while it fades out (the store clears it right away).
  const last = useRef(current);
  if (current) last.current = current;
  const notice = current ?? last.current;
  const visible = current !== null;
  const fade = useQuickFade(visible && Boolean(notice?.actions));

  if (notice?.actions) {
    return (
      <Modal visible={fade.mounted} transparent animationType="none" onRequestClose={hide} statusBarTranslucent>
        <Pressable onPress={hide} style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.45)' }, fade.backdropStyle]} />
          <Animated.View style={fade.cardStyle}>
          <Pressable onPress={() => {}} accessibilityViewIsModal>
            <NeoBox backgroundColor={colors.white} style={{ padding: spacing.xl, gap: spacing.md }}>
              <Text variant="heading" style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }} accessibilityRole="header">
                {notice.title}
              </Text>
              {notice.message ? (
                <Text color={colors.muted} style={{ textAlign: 'center' }}>
                  {notice.message}
                </Text>
              ) : null}
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                {notice.actions.map((a) => (
                  <View key={a.label} style={{ flexDirection: 'row' }}>
                    <DialogButton
                      label={a.label}
                      backgroundColor={a.color ?? colors.white}
                      onPress={() => {
                        hide();
                        a.onPress?.();
                      }}
                    />
                  </View>
                ))}
              </View>
            </NeoBox>
          </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <ConfirmDialog
      visible={visible && !notice?.actions}
      title={notice?.title ?? ''}
      message={notice?.message}
      hideCancel={!notice?.cancelLabel}
      cancelLabel={notice?.cancelLabel}
      confirmLabel={notice?.buttonLabel ?? 'Okay'}
      confirmColor={colors.terracotta}
      onCancel={hide}
      onConfirm={() => {
        const action = notice?.onPress;
        hide();
        action?.();
      }}
    />
  );
}
