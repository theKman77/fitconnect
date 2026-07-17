// notify-trainer: sends the trainer a push notification about a new booking.
// Deployed via the Supabase connector. Called by the app after a booking is made.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { bookingId } = await req.json();
    if (!bookingId) return new Response(JSON.stringify({ error: 'bookingId required' }), { status: 400, headers: cors });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: booking } = await supabase
      .from('bookings').select('trainer_id, scheduled_at').eq('id', bookingId).single();
    if (!booking) return new Response(JSON.stringify({ error: 'booking not found' }), { status: 404, headers: cors });

    const { data: trainer } = await supabase
      .from('trainers').select('profile_id, display_name').eq('id', booking.trainer_id).single();
    if (!trainer) return new Response(JSON.stringify({ sent: false }), { headers: cors });

    const { data: profile } = await supabase
      .from('profiles').select('push_token').eq('id', trainer.profile_id).single();
    const token = profile?.push_token;
    if (!token) return new Response(JSON.stringify({ sent: false, reason: 'no token' }), { headers: cors });

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: 'New booking 🎉',
        body: 'You have a new session request on FitConnect.',
        data: { bookingId },
      }),
    });
    const result = await res.json();
    return new Response(JSON.stringify({ sent: true, result }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
