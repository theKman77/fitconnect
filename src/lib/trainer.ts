/**
 * Trainer-side data access. A user becomes a trainer by getting a `trainers`
 * row and `role='trainer'`; the app then shows the trainer tabs. Works in live
 * mode (Postgres) and demo mode (in-memory).
 */
import { supabase, isBackendConfigured } from './supabase';
import { demoBookings } from '@/data/store';
import type { AvailabilitySlot, Booking, BookingStatus, Profile, Trainer } from '@/types/domain';

let demoTrainer: Trainer | null = null;
let demoAvailability: AvailabilitySlot[] = [];

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
    socials: profile.socials ?? {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** The trainer record owned by the given user, if they are a trainer. */
export async function getMyTrainer(profile: Profile | null): Promise<Trainer | null> {
  if (!profile) return null;
  if (!isBackendConfigured) return demoTrainer;
  const { data, error } = await supabase.from('trainers').select('*').eq('profile_id', profile.id).maybeSingle();
  if (error) throw error;
  return (data as Trainer) ?? null;
}

/** Promote the current user to a trainer (creates trainer + default plans). */
export async function becomeTrainer(profile: Profile): Promise<void> {
  if (!isBackendConfigured) {
    demoTrainer = synthTrainer(profile);
    return;
  }
  const { error } = await supabase.rpc('become_trainer');
  if (error) throw error;
}

/** Bookings assigned to this trainer. */
export async function listTrainerBookings(trainer: Trainer | null): Promise<Booking[]> {
  if (!isBackendConfigured) {
    // Demo: surface every booking the demo client created so the loop is testable.
    return [...demoBookings.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (!trainer) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('trainer_id', trainer.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Booking[]) ?? [];
}

export async function setTrainerOnline(trainer: Trainer | null, online: boolean): Promise<void> {
  if (!trainer) return;
  if (!isBackendConfigured) {
    if (demoTrainer) demoTrainer = { ...demoTrainer, available_now: online };
    return;
  }
  const { error } = await supabase.from('trainers').update({ available_now: online }).eq('id', trainer.id);
  if (error) throw error;
}

export async function submitTrainerApplication(): Promise<Trainer | null> {
  if (!isBackendConfigured) {
    if (demoTrainer) demoTrainer = { ...demoTrainer, onboarding_status: 'submitted' };
    return demoTrainer;
  }
  const { data, error } = await supabase.rpc('submit_trainer_application');
  if (error) throw error;
  return (data as Trainer) ?? null;
}

export async function listAvailability(trainer: Trainer | null): Promise<AvailabilitySlot[]> {
  if (!trainer) return [];
  if (!isBackendConfigured) return demoAvailability.filter((s) => s.trainer_id === trainer.id && new Date(s.ends_at) > new Date());
  const { data, error } = await supabase.from('availability').select('*')
    .eq('trainer_id', trainer.id).gte('ends_at', new Date().toISOString()).order('starts_at').limit(100);
  if (error) throw error;
  return (data as AvailabilitySlot[]) ?? [];
}

export async function addAvailability(trainer: Trainer, startsAt: Date, durationMin = 60): Promise<void> {
  if (startsAt.getTime() < Date.now() + 15 * 60 * 1000) throw new Error('Availability must start at least 15 minutes from now.');
  const slot = {
    trainer_id: trainer.id,
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + durationMin * 60 * 1000).toISOString(),
    is_peak: startsAt.getHours() >= 18 && startsAt.getHours() < 20,
    booked: false,
  };
  if (!isBackendConfigured) {
    demoAvailability = [...demoAvailability, { ...slot, id: `av-${Date.now()}` }];
    return;
  }
  const { error } = await supabase.from('availability').insert(slot);
  if (error) throw error;
}

export async function removeAvailability(id: string): Promise<void> {
  if (!isBackendConfigured) {
    demoAvailability = demoAvailability.filter((s) => s.id !== id);
    return;
  }
  const { error } = await supabase.from('availability').delete().eq('id', id).eq('booked', false);
  if (error) throw error;
}

export interface BookingCounterpart { profile_id: string; full_name: string | null; avatar_url: string | null }

export async function getBookingCounterpart(bookingId: string): Promise<BookingCounterpart | null> {
  if (!isBackendConfigured) return { profile_id: 'demo-client', full_name: 'Demo client', avatar_url: null };
  const { data, error } = await supabase.rpc('get_booking_counterpart', { p_booking_id: bookingId });
  if (error) throw error;
  return ((data as BookingCounterpart[] | null)?.[0]) ?? null;
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
    .filter((b) => b.status === 'completed' && b.paid)
    .reduce((sum, b) => sum + (b.trainer_payout ?? 0), 0);
}
