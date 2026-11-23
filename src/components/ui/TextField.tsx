import { borders, colors, fonts } from '@/theme';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

type Props = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Optional element on the right inside the box (e.g. an icon button). */
  right?: React.ReactNode;
  /** Forwarded to the inner TextInput (e.g. to focus it from an edit button). */
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Thin-outlined cream input used on forms. */
export function TextField({ style, right, ref, ...rest }: Props) {
  return (
    <View style={[styles.box, style]}>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.ink}
        {...rest}
        style={styles.input}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: borders.thin,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 10,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 10,
  },
});