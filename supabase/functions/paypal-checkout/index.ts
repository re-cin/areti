// PayPal (sandbox by default) checkout for areti Premium. One-time payment per period.
//
// POST { action: "create", plan: "monthly" | "yearly", student?: boolean, returnTo: "<app deep link>" }
//   -> { orderId, approveUrl }      open approveUrl in a browser; PayPal sends the user back to returnTo
// POST { action: "capture", orderId }
//   -> { ok: true, plan, currentPeriodEnd }
//
// The phone never decides the price or the result. This function sets the price, checks with PayPal
// that the order belongs to the signed-in user and was paid in full, and only then writes the user's
// row in public.subscriptions (with the service role, since users can only read that table).
//
// Prices, plan length and the student price come from the public.plan_prices table.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET   from developer.paypal.com > Apps & Credentials (Sandbox)
//   PAYPAL_ENV                               "sandbox" (default) or "live"
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Plan = 'monthly' | 'yearly';

type PriceRow = { plan: Plan; label: string; period_months: number; price: string | number; currency: string; student_price: string | number | null };

const PAYPAL_BASE =
  (Deno.env.get('PAYPAL_ENV') ?? 'sandbox') === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, error: string, message: string) => json({ error, message }, status);

/** Only deep links back into the app (areti:// in builds, exp:// in Expo Go). */
const isAppLink = (url: unknown): url is string =>
  typeof url === 'string' && /^(areti|exp|exps):\/\//.test(url) && url.length < 500;

async function paypalToken(): Promise<string> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!id || !secret) throw new HttpError(503, 'paypal_not_configured', 'PayPal keys are not set on the server yet.');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new HttpError(502, 'paypal_auth_failed', `PayPal rejected the keys (${res.status}).`);
  return (await res.json()).access_token;
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function paypal(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** The plan's row from public.plan_prices (active plans only). */
async function loadPrice(admin: ReturnType<typeof createClient>, plan: Plan): Promise<PriceRow | null> {
  const { data, error } = await admin
    .from('plan_prices')
    .select('plan, label, period_months, price, currency, student_price')
    .eq('plan', plan)
    .eq('active', true)
    .maybeSingle();
  if (error) throw new HttpError(500, 'prices_unavailable', 'Could not load the plan prices.');
  return data as PriceRow | null;
}

/** Amount to charge, as PayPal's "1234.50" string: the student price when asked for and set. */
function amountFor(row: PriceRow, student: boolean): string {
  const amount = student && row.student_price !== null ? Number(row.student_price) : Number(row.price);
  return amount.toFixed(2);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');
  try {
    // Who is paying (the gateway already checked the JWT; this resolves it to a user).
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const asUser = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await asUser.auth.getUser(jwt);
    const user = userData?.user;
    if (userError || !user) return fail(401, 'not_signed_in', 'Sign in to buy Premium.');

    const body = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ---- 1) create the PayPal order
    if (body.action === 'create') {
      const plan: Plan | null = body.plan === 'monthly' || body.plan === 'yearly' ? body.plan : null;
      if (!plan) return fail(400, 'bad_plan', 'Choose the monthly or yearly plan.');
      if (!isAppLink(body.returnTo)) return fail(400, 'bad_return', 'Missing app return link.');

      const price = await loadPrice(admin, plan);
      if (!price) return fail(404, 'plan_unavailable', 'That plan is not available right now.');
      // NOTE: student status is not verified yet; anyone who switches it on gets the student price.
      const student = body.student === true && price.student_price !== null;
      const value = amountFor(price, student);

      const back = (result: 'success' | 'cancel') =>
        `${SUPABASE_URL}/functions/v1/paypal-return?result=${result}&to=${encodeURIComponent(body.returnTo)}`;

      const token = await paypalToken();
      const order = await paypal(token, '/v2/checkout/orders', {
        method: 'POST',
        headers: { 'PayPal-Request-Id': crypto.randomUUID() },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: plan,
              custom_id: user.id,
              description: `areti Premium, ${price.label}${student ? ' (student)' : ''}`,
              amount: { currency_code: price.currency, value },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'areti',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                return_url: back('success'),
                cancel_url: back('cancel'),
              },
            },
          },
        }),
      });
      if (!order.ok) return fail(502, 'paypal_create_failed', order.body?.message ?? `PayPal error ${order.status}.`);
      const approveUrl = order.body.links?.find((l: { rel: string }) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
      if (!approveUrl) return fail(502, 'paypal_no_link', 'PayPal did not return a checkout link.');
      return json({ orderId: order.body.id, approveUrl, amount: value, currency: price.currency, student });
    }

    // ---- 2) capture: confirm with PayPal, then switch Premium on
    if (body.action === 'capture') {
      const orderId = typeof body.orderId === 'string' && /^[A-Z0-9-]{5,40}$/i.test(body.orderId) ? body.orderId : null;
      if (!orderId) return fail(400, 'bad_order', 'Missing order.');

      const token = await paypalToken();
      const details = await paypal(token, `/v2/checkout/orders/${orderId}`);
      if (!details.ok) return fail(404, 'order_not_found', 'That PayPal order was not found.');
      const unit = details.body.purchase_units?.[0];
      if (unit?.custom_id !== user.id) return fail(403, 'not_your_order', 'This order belongs to another account.');
      const plan: Plan | null = unit?.reference_id === 'monthly' || unit?.reference_id === 'yearly' ? unit.reference_id : null;
      if (!plan) return fail(400, 'bad_order', 'Unknown plan on this order.');
      if (details.body.status === 'COMPLETED') return fail(409, 'already_processed', 'This payment was already applied.');
      if (details.body.status !== 'APPROVED') return fail(402, 'not_approved', 'The payment was not approved on PayPal.');

      const captured = await paypal(token, `/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': `capture-${orderId}` },
      });
      const capture = captured.body?.purchase_units?.[0]?.payments?.captures?.[0];
      if (!captured.ok || captured.body.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
        return fail(402, 'capture_failed', captured.body?.message ?? 'PayPal could not complete the payment.');
      }
      // Only this function can create orders (it holds the PayPal secret), so the order's own amount
      // is the price we set. The capture must match it exactly.
      const ordered = unit?.amount;
      if (!ordered || capture.amount?.currency_code !== ordered.currency_code || capture.amount?.value !== ordered.value) {
        return fail(402, 'amount_mismatch', 'The paid amount does not match the order.');
      }

      // How long one payment lasts (from the table; falls back to the plan type).
      const price = await loadPrice(admin, plan);
      const months = price?.period_months ?? (plan === 'yearly' ? 12 : 1);

      // Paid: extend from the current end if Premium is still running, otherwise from now.
      const { data: existing } = await admin
        .from('subscriptions')
        .select('plan, status, started_at, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      const now = new Date();
      const currentEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null;
      const stillPremium = existing?.plan === 'premium' && existing.status !== 'expired' && (!currentEnd || currentEnd > now);
      const periodEnd = addMonths(stillPremium && currentEnd ? currentEnd : now, months);

      const row = {
        user_id: user.id,
        plan: 'premium',
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
        ...(stillPremium && existing?.started_at ? {} : { started_at: now.toISOString() }),
      };
      const { error: writeError } = await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
      if (writeError) {
        console.error('[paypal] paid but could not save subscription', orderId, user.id, writeError.message);
        return fail(500, 'save_failed', 'Payment received, but Premium could not be switched on. Contact support with your PayPal receipt.');
      }
      return json({ ok: true, plan, currentPeriodEnd: periodEnd.toISOString(), captureId: capture.id });
    }

    return fail(400, 'bad_action', 'Unknown action.');
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.code, e.message);
    console.error('[paypal]', e);
    return fail(500, 'server_error', 'Something went wrong. Please try again.');
  }
});
