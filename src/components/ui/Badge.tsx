import { View } from 'react-native';
import { borders, colors, radii, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: IconName;
  iconColor?: string;
};

/** Small rounded status tag ("Synced", "PRO", "FOCUS"). */
export function Badge({ label, backgroundColor = colors.teal, textColor = colors.ink, icon, iconColor }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor,
        borderWidth: borders.thin,
        borderColor: colors.ink,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 2,
      }}>
      {icon && <Icon name={icon} size={14} color={iconColor ?? textColor} />}
      <Text variant="smallStrong" color={textColor}>
        {label}
      </Text>
    </View>
  );
}
