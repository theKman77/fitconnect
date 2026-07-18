/**
 * Progress data: weight entries, personal records, workouts, streaks.
 * Live mode reads/writes Supabase; demo mode serves the showcase numbers.
 */
import dayjs from 'dayjs';
import { supabase, isBackendConfigured } from './supabase';
import type { Booking, PersonalRecord, ProgressEntry } from '@/types/domain';

// ---------- Weight ----------

export const DEMO_WEIGHTS = [84, 83.2, 82.5, 82, 81.4, 80.8];

export async function listWeights(clientId: string): Promise<ProgressEntry[]> {
  if (!isBackendConfigured) {
    return DEMO_WEIGHTS.map((w, i) => ({
      id: `dw${i}`,
      client_id: clientId,
      weight: w,
      unit: 'kg',
      measured_at: dayjs().subtract(DEMO_WEIGHTS.length - 1 - i, 'week').format('YYYY-MM-DD'),
      created_at: new Date().toISOString(),
    }));
  }
  const { data, error } = await supabase
    .from('progress_entries')
    .select('*')
    .eq('client_id', clientId)
    .order('measured_at')
    .limit(24);
  if (error) throw error;
  return (data as ProgressEntry[]) ?? [];
}

export async function addWeight(clientId: string, kg: number): Promise<void> {
  if (!isBackendConfigured) return;
  const { error } = await supabase.from('progress_entries').insert({
    client_id: clientId,
    weight: kg,
    unit: 'kg',
    measured_at: dayjs().format('YYYY-MM-DD'),
  });
  if (error) throw error;
}

// ---------- Personal records ----------

export const DEMO_PRS: PersonalRecord[] = [
  { id: 'p1', client_id: 'demo-client', lift: 'Back squat', value: 120, unit: 'kg', achieved_at: '2026-07-01' },
  { id: 'p2', client_id: 'demo-client', lift: 'Bench press', value: 85, unit: 'kg', achieved_at: '2026-07-08' },
  { id: 'p3', client_id: 'demo-client', lift: 'Deadlift', value: 150, unit: 'kg', achieved_at: '2026-07-15' },
];

export async function listPRs(clientId: string): Promise<PersonalRecord[]> {
  if (!isBackendConfigured) return DEMO_PRS;
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at');
  if (error) throw error;
  return (data as PersonalRecord[]) ?? [];
}

export async function upsertPR(clientId: string, lift: string, value: number): Promise<void> {
  if (!isBackendConfigured) return;
  const { error } = await supabase.from('personal_records').upsert(
    { client_id: clientId, lift, value, unit: 'kg', achieved_at: dayjs().format('YYYY-MM-DD') },
    { onConflict: 'client_id,lift' },
  );
  if (error) throw error;
}

export async function countReviewsGiven(clientId: string): Promise<number> {
  if (!isBackendConfigured) return 6;
  const { count, error } = await supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('rater_id', clientId);
  if (error) throw error;
  return count ?? 0;
}

// ---------- Workouts / streak ----------

/** Completed bookings double as the workout history. */
export function workoutsFromBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.status === 'completed')
    .sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at));
}

/** Consecutive weeks (ending this week) with at least one completed session. */
export function weeklyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const weeks = new Set(dates.map((d) => dayjs(d).startOf('week').format('YYYY-MM-DD')));
  let streak = 0;
  let cursor = dayjs().startOf('week');
  while (weeks.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'week');
  }
  return streak;
}
