import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { refreshSubscription } from './subscriptionRepo';

/**
 * PayPal checkout for Premium (PayPal Sandbox while testing).
 *
 * 1. The `paypal-checkout` Edge Function creates a PayPal order. The server sets the price.
 * 2. PayPal's own page opens in a secure browser window; the user pays there (never inside areti).
 * 3. PayPal sends the browser to `paypal-return`, which hands control back to the app.
 * 4. `paypal-checkout` confirms the payment with PayPal and only then sets the user's
 *    subscriptions row to Premium. The app just refreshes its cached plan afterwards.
 *
 * Server code: supabase/functions/paypal-checkout and supabase/functions/paypal-return.
 */

export type PaidPlan = 'monthly' | 'yearly';

export type CheckoutResult =
  | { kind: 'paid'; currentPeriodEnd: number }
  | { kind: 'canceled' }
  | { kind: 'error'; code: string; message: string };

/** Return link into the app: areti://paypal-return in builds, exp://…/--/paypal-return in Expo Go. */
const RETURN_PATH = 'paypal-return';

async function call<T>(body: Record<string, unknown>): Promise<{ data?: T; code?: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke('paypal-checkout', { body });
  if (!error) return { data: data as T };
  // FunctionsHttpError carries the server's { error, message } JSON.
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    const payload = await ctx.json().catch(() => null);
    if (payload?.error) return { code: payload.error, message: payload.message };
  }
  return { code: 'offline', message: "Can't reach the server. Check your internet connection and try again." };
}

export async function payWithPayPal(plan: PaidPlan): Promise<CheckoutResult> {
  if (!supabaseConfigured) return { kind: 'error', code: 'not_configured', message: 'Supabase is not set up in .env.' };

  const returnTo = Linking.createURL(RETURN_PATH);
  const created = await call<{ orderId: string; approveUrl: string }>({ action: 'create', plan, returnTo });
  if (!created.data) return { kind: 'error', code: created.code ?? 'unknown', message: created.message ?? 'Could not start checkout.' };

  const session = await WebBrowser.openAuthSessionAsync(created.data.approveUrl, returnTo);
  if (session.type !== 'success') return { kind: 'canceled' };
  const { queryParams } = Linking.parse(session.url);
  if (queryParams?.result !== 'success') return { kind: 'canceled' };

  const captured = await call<{ ok: boolean; currentPeriodEnd: string }>({ action: 'capture', orderId: created.data.orderId });
  if (!captured.data?.ok) return { kind: 'error', code: captured.code ?? 'unknown', message: captured.message ?? 'Payment could not be confirmed.' };

  await refreshSubscription(); // pulls the new Premium row into the phone's cache
  return { kind: 'paid', currentPeriodEnd: Date.parse(captured.data.currentPeriodEnd) };
}
