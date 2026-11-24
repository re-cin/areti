// Sign in with a username instead of an email.
// POST { username, password } -> { access_token, refresh_token }
//   or { error: 'wrong-credentials' | 'confirm-email' | 'rate-limited' | 'bad-request' | 'unknown', email? }
//
// The username -> email lookup happens here with the service role, so emails are never exposed to
// the app. The email is only returned for 'confirm-email', which Supabase reports only after the
// password was right (the app needs it to show the code screen).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'bad-request' }, 405);

  let username = '';
  let password = '';
  try {
    const body = await req.json();
    username = String(body?.username ?? '').trim().toLowerCase();
    password = String(body?.password ?? '');
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  if (!username || !password) return json({ error: 'bad-request' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: row } = await admin.from('usernames').select('user_id').eq('username', username).maybeSingle();
  // Unknown username: same answer as a wrong password.
  if (!row) return json({ error: 'wrong-credentials' }, 400);

  const { data: found, error: lookupError } = await admin.auth.admin.getUserById(row.user_id);
  const email = found?.user?.email;
  if (lookupError || !email) return json({ error: 'wrong-credentials' }, 400);

  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') return json({ error: 'confirm-email', email }, 400);
    if (error.code === 'invalid_credentials') return json({ error: 'wrong-credentials' }, 400);
    if (error.code === 'over_request_rate_limit') return json({ error: 'rate-limited' }, 429);
    return json({ error: 'unknown', message: error.message }, 400);
  }
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
