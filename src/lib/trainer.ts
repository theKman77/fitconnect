/**
 * Trainer-side data access. A user becomes a trainer by getting a `trainers`
 * row and `role='trainer'`; the app then shows the trainer tabs. Works in live
 * mode (Postgres) and demo mode (in-memory).
 */
import { supabase, isBackendConfigured } from './supabase';
import { demoBookings } from '@/data/store';
import type { Booking, BookingStatus, Profile, Trainer } from '@/types/domain';

let demoTrainer: Trainer | null = null;

function synthTrainer(profile: Profile): Trainer {
  return {
    id: 'demo-trainer-self',
    profile_id: profile.id,
    display_name: profile.full_name ?? 'You',
    avatar_url: profile.avatar_url,
    headline: 'Personal trainer',
    bio: null,
    specialties: ['Strength', 'Conditioning'],
    years_experience: 3,
    gender: null,
    languages: ['English', 'Arabic'],
    verified: false,
    rating: 5,
    review_count: 0,
    city: profile.city ?? 'Riyadh',
    lat: 24.7136,
    lng: 46.6753,
    available_now: false,
    video_intro_url: null,
    photos: [],
    base_price: 200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** The trainer record owned by the given user, if they are a trainer. */
export async function getMyTrainer(profile: Profile | null): Promise<Trainer | null> {
  if (!profile) return null;
  if (!isBackendConfigured) return demoTrainer;
  const { data } = await supabase.from('trainers').select('*').eq('profile_id', profile.id).maybeSingle();
  return (data as Trainer) ?? null;
}

/** Promote the current user to a trainer (creates trainer + default plans). */
export async function becomeTrainer(profile: Profile): Promise<void> {
  if (!isBackendConfigured) {
    demoTrainer = synthTrainer(profile);
    return;
  }
  const { data: t } = await supabase
    .from('trainers')
    .insert({
      profile_id: profile.id,
      display_name: profile.full_name ?? 'New trainer',
      avatar_url: profile.avatar_url,
      headline: 'Personal trainer',
      city: profile.city ?? 'Riyadh',
      base_price: 200,
      languages: ['English', 'Arabic'],
      specialties: ['Strength', 'Conditioning'],
    })
    .select()
    .single();

  if (t) {
    const trainerId = (t as Trainer).id;
    await supabase.from('session_types').insert([
      { trainer_id: trainerId, name: 'Single session', description: 'One-off, in-person or virtual', kind: 'single', price: 200, billing_period: 'session', sessions_included: 1, sort: 0 },
      { trainer_id: trainerId, name: 'Pro plan', description: '8 sessions / month + chat support', kind: 'subscription', price: 1080, billing_period: 'mo', sessions_included: 8, sort: 1 },
    ]);
  }
  await supabase.from('profiles').update({ role: 'trainer' }).eq('id', profile.id);
}

/** Bookings assigned to this trainer. */
export async function listTrainerBookings(trainer: Trainer | null): Promise<Booking[]> {
  if (!isBackendConfigured) {
    // Demo: surface every booking the demo client created so the loop is testable.
    return [...demoBookings.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (!trainer) return [];
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('trainer_id', trainer.id)
    .order('created_at', { ascending: false });
  return (data as Booking[]) ?? [];
}

export async function setTrainerOnline(trainer: Trainer | null, online: boolean): Promise<void> {
  if (!trainer) return;
  if (!isBackendConfigured) {
    if (demoTrainer) demoTrainer = { ...demoTrainer, available_now: online };
    return;
  }
  await supabase.from('trainers').update({ available_now: online }).eq('id', trainer.id);
}

/** The next status in the session lifecycle, or null if terminal. */
export function nextStatus(status: BookingStatus): BookingStatus | null {
  const flow: BookingStatus[] = ['confirmed', 'en_route', 'arriving', 'in_progress', 'completed'];
  const i = flow.indexOf(status);
  if (i === -1 || i === flow.length - 1) return null;
  return flow[i + 1];
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  en_route: 'On the way',
  arriving: 'Arriving',
  in_progress: 'In session',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

/** Label for the button that moves a booking to its next status. */
export function advanceLabel(status: BookingStatus): string | null {
  switch (status) {
    case 'confirmed': return 'Start heading over';
    case 'en_route': return "I've arrived";
    case 'arriving': return 'Start session';
    case 'in_progress': return 'Complete session';
    default: return null;
  }
}

/** Trainer earnings from completed/paid bookings = total minus platform fee. */
export function estimateEarnings(bookings: Booking[]): number {
  return bookings
    .filter((b) => b.status === 'completed' || b.paid)
    .reduce((sum, b) => sum + (b.total - b.service_fee), 0);
}
