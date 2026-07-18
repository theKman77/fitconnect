/**
 * In-app chat for a booking. Live mode persists to the `messages` table and
 * subscribes to Supabase Realtime so both sides see messages instantly. Demo
 * mode uses an in-memory store and simulates a trainer reply so the thread
 * feels alive without a second device.
 */
import { supabase, isBackendConfigured } from './supabase';
import { demoMessages, uid } from '@/data/store';
import type { Message } from '@/types/domain';

const DEMO_TRAINER_SENDER = 'demo-trainer';

const demoSeed: Omit<Message, 'booking_id'>[] = [
  { id: 'seed-1', sender_id: DEMO_TRAINER_SENDER, body: 'On my way! I have the bands and mat you asked for.', created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'seed-2', sender_id: 'demo-client', body: 'Perfect, the door code is 4B 👍', created_at: new Date(Date.now() - 90000).toISOString() },
];

const demoListeners = new Map<string, Set<(m: Message) => void>>();

function emitDemo(bookingId: string, msg: Message) {
  demoListeners.get(bookingId)?.forEach((fn) => fn(msg));
}

export async function listMessages(bookingId: string): Promise<Message[]> {
  if (!isBackendConfigured) {
    if (!demoMessages.has(bookingId)) {
      demoMessages.set(bookingId, demoSeed.map((m) => ({ ...m, booking_id: bookingId })));
    }
    return demoMessages.get(bookingId)!;
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at');
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function sendMessage(bookingId: string, senderId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  if (!isBackendConfigured) {
    const msg: Message = { id: uid('msg'), booking_id: bookingId, sender_id: senderId, body: trimmed, created_at: new Date().toISOString() };
    const list = demoMessages.get(bookingId) ?? [];
    demoMessages.set(bookingId, [...list, msg]);
    emitDemo(bookingId, msg);
    // Simulate the trainer typing back.
    setTimeout(() => {
      const reply: Message = {
        id: uid('msg'), booking_id: bookingId, sender_id: DEMO_TRAINER_SENDER,
        body: pickReply(trimmed), created_at: new Date().toISOString(),
      };
      demoMessages.set(bookingId, [...(demoMessages.get(bookingId) ?? []), reply]);
      emitDemo(bookingId, reply);
    }, 1600);
    return;
  }

  if (trimmed.length > 2000) throw new Error('Messages must be under 2,000 characters.');
  const { error } = await supabase.from('messages').insert({ booking_id: bookingId, sender_id: senderId, body: trimmed });
  if (error) throw error;
}

/** Subscribe to new messages. Returns an unsubscribe function. */
export function subscribeMessages(bookingId: string, onMessage: (m: Message) => void): () => void {
  if (!isBackendConfigured) {
    const set = demoListeners.get(bookingId) ?? new Set();
    set.add(onMessage);
    demoListeners.set(bookingId, set);
    return () => set.delete(onMessage);
  }
  const channel = supabase
    .channel(`messages:${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

function pickReply(_incoming: string): string {
  const replies = [
    'Got it 👍',
    'See you shortly!',
    'Sounds good — warming up now.',
    'Perfect, thanks for letting me know.',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
