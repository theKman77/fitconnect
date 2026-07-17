// Supabase Edge Function: create-checkout
// Creates a Moyasar hosted invoice (Saudi payment gateway: mada, Apple Pay,
// cards) and returns its payment URL. The app opens that URL in a browser.
//
// Deploy: supabase functions deploy create-checkout --no-verify-jwt
// Secret:  supabase secrets set MOYASAR_SECRET_KEY=sk_test_xxx
//
// Test mode uses Moyasar test keys + test cards (see docs/SETUP.md).

const MOYASAR_SECRET = Deno.env.get('MOYASAR_SECRET_KEY') ?? '';
// After payment, Moyasar returns the user here; the app's deep link closes the
// in-app browser. Actual "paid" confirmation comes from the webhook.
const RETURN_URL = 'fitconnect://booking/confirmation';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!MOYASAR_SECRET) return json({ error: 'MOYASAR_SECRET_KEY not set' }, 500);

  try {
    const { bookingId, amount } = await req.json();
    if (!bookingId || !amount) return json({ error: 'bookingId and amount required' }, 400);

    // Moyasar expects the amount in halalas (SAR * 100).
    const halalas = Math.round(Number(amount) * 100);
    const redirect = `${RETURN_URL}?bookingId=${encodeURIComponent(bookingId)}`;

    const res = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Moyasar uses HTTP Basic auth: secret key as username, blank password.
        Authorization: `Basic ${btoa(`${MOYASAR_SECRET}:`)}`,
      },
      body: JSON.stringify({
        amount: halalas,
        currency: 'SAR',
        description: `FitConnect session ${bookingId}`,
        callback_url: redirect,
        success_url: redirect,
        back_url: redirect,
        metadata: { booking_id: bookingId },
      }),
    });

    const invoice = await res.json();
    if (!res.ok) return json({ error: invoice?.message ?? 'Moyasar error', detail: invoice }, 400);

    return json({ url: invoice.url, id: invoice.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
