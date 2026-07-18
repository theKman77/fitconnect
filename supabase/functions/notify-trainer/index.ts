import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Authentication required' }, 401);

    const { bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== 'string') return json({ error: 'bookingId required' }, 400);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: booking } = await service
      .from('bookings')
      .select('id,client_id,trainer_id,scheduled_at,created_at')
      .eq('id', bookingId)
      .single();
    if (!booking) return json({ error: 'Booking not found' }, 404);
    if (booking.client_id !== user.id) return json({ error: 'Not authorized for this booking' }, 403);

    const { data: trainer } = await service
      .from('trainers')
      .select('profile_id,display_name')
      .eq('id', booking.trainer_id)
      .single();
    if (!trainer) return json({ sent: false, reason: 'trainer not found' }, 404);

    const { error: eventError } = await service.from('notification_events').insert({
      booking_id: booking.id,
      recipient_id: trainer.profile_id,
      event_type: 'new_booking',
      status: 'pending',
    });
    if (eventError?.code === '23505') return json({ sent: false, reason: 'already notified' });
    if (eventError) return json({ sent: false, reason: 'could not reserve notification' }, 500);

    const { data: profile } = await service
      .from('profiles')
      .select('push_token')
      .eq('id', trainer.profile_id)
      .single();
    const token = profile?.push_token;
    if (!token) {
      await service.from('notification_events').update({ status: 'skipped' })
        .eq('booking_id', booking.id).eq('event_type', 'new_booking');
      return json({ sent: false, reason: 'trainer has no push token' });
    }

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: 'New booking request',
        body: 'Open FitConnect to review the session details.',
        data: { bookingId: booking.id },
      }),
    });
    const providerResponse = await pushResponse.json().catch(() => ({}));

    await service.from('notification_events').update({
      status: pushResponse.ok ? 'sent' : 'failed',
      provider_response: providerResponse,
      sent_at: pushResponse.ok ? new Date().toISOString() : null,
    }).eq('booking_id', booking.id).eq('event_type', 'new_booking');

    if (!pushResponse.ok) return json({ sent: false, reason: 'push provider rejected notification' }, 502);
    return json({ sent: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Notification failed' }, 500);
  }
});
