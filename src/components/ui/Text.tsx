import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong'
  | 'label'
  | 'caption';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.semiBold, fontSize: 64, lineHeight: 72 },
  title: { fontFamily: fonts.semiBold, fontSize: 28, lineHeight: 32 },
  heading: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 24 },
  subheading: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semiBold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
};

type Props = TextProps & { variant?: Variant; color?: string };

export function Text({ variant = 'body', color = colors.ink, style, ...rest }: Props) {
  return <RNText {...rest} style={[variants[variant], { color }, style]} />;
}
