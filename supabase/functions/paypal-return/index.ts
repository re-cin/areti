// Where PayPal sends the browser after the user pays or cancels. It only hands control back to the
// areti app (?to=areti://... or exp://... in Expo Go) with the result; it never changes anything.
// Public on purpose (PayPal can't send a login), so it only redirects to app deep links.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const isAppLink = (url: string | null): url is string =>
  !!url && /^(areti|exp|exps):\/\//.test(url) && url.length < 500;

Deno.serve((req) => {
  const url = new URL(req.url);
  const to = url.searchParams.get('to');
  if (!isAppLink(to)) return new Response('Missing app link.', { status: 400 });

  const result = url.searchParams.get('result') === 'success' ? 'success' : 'cancel';
  const back = new URL(to);
  back.searchParams.set('result', result);
  const token = url.searchParams.get('token'); // PayPal order id
  if (token && /^[A-Z0-9-]{5,40}$/i.test(token)) back.searchParams.set('token', token);

  // A plain page with a button too, in case the browser blocks the automatic jump back to the app.
  const href = back.toString().replace(/"/g, '&quot;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${href}"><title>Back to areti</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 24px;background:#E8E2DA;color:#111">
<p>${result === 'success' ? 'Payment approved.' : 'Payment canceled.'} Returning to areti…</p>
<p><a href="${href}" style="color:#111;font-weight:600">Open areti</a></p></body></html>`;
  return new Response(html, { status: 302, headers: { Location: back.toString(), 'Content-Type': 'text/html; charset=utf-8' } });
});
