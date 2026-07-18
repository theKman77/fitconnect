import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

const MOYASAR_SECRET = Deno.env.get('MOYASAR_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RETURN_URL = Deno.env.get('PAYMENT_RETURN_URL')
  ?? 'https://magical-yeot-41384a.netlify.app/booking/confirmation';
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS')
    ?? 'https://magical-yeot-41384a.netlify.app,http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

function cors(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : RETURN_URL.split('/booking/')[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: 'Origin not allowed' }, 403);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  if (!MOYASAR_SECRET) return json(req, { error: 'Payments are not available yet' }, 503);

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(req, { error: 'Authentication required' }, 401);

    const { bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== 'string') {
      return json(req, { error: 'A valid bookingId is required' }, 400);
    }

    const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: booking, error: bookingError } = await service
      .from('bookings')
      .select('id,client_id,amount_due,payment_status,status,stripe_checkout_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) return json(req, { error: 'Booking not found' }, 404);
    if (booking.client_id !== user.id) return json(req, { error: 'Not authorized for this booking' }, 403);
    if (booking.payment_status !== 'pending' || booking.status !== 'pending') {
      return json(req, { error: 'This booking is not awaiting payment' }, 409);
    }
    if (booking.stripe_checkout_id) {
      return json(req, { error: 'A checkout already exists for this booking' }, 409);
    }

    const amountHalalas = Math.round(Number(booking.amount_due) * 100);
    if (!Number.isSafeInteger(amountHalalas) || amountHalalas < 100) {
      return json(req, { error: 'Invalid booking amount' }, 400);
    }

    const redirect = `${RETURN_URL}?bookingId=${encodeURIComponent(booking.id)}`;
    const response = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${MOYASAR_SECRET}:`)}`,
      },
      body: JSON.stringify({
        amount: amountHalalas,
        currency: 'SAR',
        description: `FitConnect booking ${booking.id}`,
        callback_url: redirect,
        success_url: redirect,
        back_url: redirect,
        metadata: { booking_id: booking.id, client_id: user.id },
      }),
    });

    const invoice = await response.json().catch(() => ({}));
    if (!response.ok || !invoice?.id || !invoice?.url) {
      return json(req, { error: invoice?.message ?? 'Payment provider rejected checkout' }, 502);
    }

    const { error: updateError } = await service
      .from('bookings')
      .update({ stripe_checkout_id: invoice.id, payment_provider: 'moyasar' })
      .eq('id', booking.id)
      .eq('payment_status', 'pending');
    if (updateError) return json(req, { error: 'Could not attach checkout to booking' }, 500);

    return json(req, { url: invoice.url, id: invoice.id });
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : 'Checkout failed' }, 500);
  }
});
