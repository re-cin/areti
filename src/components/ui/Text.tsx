import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption';

const variants: Record<Variant, TextStyle> = {
  title: { fontFamily: fonts.semiBold, fontSize: 28, lineHeight: 32 },
  heading: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
};

type Props = TextProps & { variant?: Variant; color?: string };

export function Text({ variant = 'body', color = colors.ink, style, ...rest }: Props) {
  return <RNText {...rest} style={[variants[variant], { color }, style]} />;
}
