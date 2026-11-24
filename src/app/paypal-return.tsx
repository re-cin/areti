import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';

/**
 * PayPal sends the browser back to areti://paypal-return. The checkout code
 * (src/features/subscription/paypalCheckout.ts) already handles the result, so this
 * route only steps out of the way and returns to the Subscription page.
 */
export default function PayPalReturn() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings/subscription');
  }, []);
  return <View style={{ flex: 1, backgroundColor: colors.page }} />;
}
