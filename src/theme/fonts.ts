// Fredoka, three weights only. There is NO bold: React Native picks a font file per
// weight, so never use `fontWeight`. Use the <Text variant="..."> component instead.
export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semiBold: 'Fredoka_600SemiBold',
} as const;
