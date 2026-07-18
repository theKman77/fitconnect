/**
 * Data access layer. Every screen calls these functions and never touches
 * Supabase or seed data directly. When the backend is configured we hit
 * Postgres; otherwise we serve the in-memory seed so the app is fully usable.
 */
import { supabase, isBackendConfigured } from './supabase';
import { trainers as seedTrainers, getTrainerDetail as seedDetail, sessionTypes } from '@/data/seed';
import type { Trainer, TrainerDetail, Review } from '@/types/domain';

export interface TrainerFilter {
  query?: string;
  availableNow?: boolean;
  minRating?: number;
  gender?: string;
  language?: string;
  maxPrice?: number;
}

export async function listTrainers(filter: TrainerFilter = {}): Promise<Trainer[]> {
  let rows: Trainer[];
  if (isBackendConfigured) {
    let q = supabase.from('trainers').select('*').order('rating', { ascending: false }).limit(50);
    if (filter.availableNow) q = q.eq('available_now', true);
    if (filter.minRating) q = q.gte('rating', filter.minRating);
    if (filter.gender) q = q.eq('gender', filter.gender);
    if (filter.maxPrice) q = q.lte('base_price', filter.maxPrice);
    const { data, error } = await q;
    if (error) throw error;
    rows = (data as Trainer[]) ?? [];
  } else {
    rows = [...seedTrainers];
  }

  // Client-side refinement (also applied to seed data).
  return rows.filter((t) => {
    if (filter.query) {
      const hay = `${t.display_name} ${t.headline ?? ''} ${t.specialties.join(' ')}`.toLowerCase();
      if (!hay.includes(filter.query.toLowerCase())) return false;
    }
    if (filter.availableNow && !t.available_now) return false;
    if (filter.minRating && t.rating < filter.minRating) return false;
    if (filter.gender && t.gender !== filter.gender) return false;
    if (filter.language && !t.languages.includes(filter.language)) return false;
    if (filter.maxPrice && t.base_price > filter.maxPrice) return false;
    return true;
  });
}

export async function getTrainer(id: string): Promise<TrainerDetail | undefined> {
  if (!isBackendConfigured) return seedDetail(id);

  const { data: t, error: trainerError } = await supabase.from('trainers').select('*').eq('id', id).single();
  if (trainerError) throw trainerError;
  if (!t) return undefined;
  const { data: st, error: plansError } = await supabase
    .from('session_types')
    .select('*')
    .eq('trainer_id', id)
    .eq('active', true)
    .order('sort');
  if (plansError) throw plansError;
  const { data: rv, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .eq('ratee_id', (t as Trainer).profile_id)
    .eq('direction', 'client_to_trainer')
    .order('created_at', { ascending: false })
    .limit(20);
  if (reviewsError) throw reviewsError;
  return {
    ...(t as Trainer),
    session_types: st ?? [],
    reviews: (rv as Review[]) ?? [],
  };
}

export function getSeedSessionTypes(trainerId: string) {
  return sessionTypes[trainerId] ?? [];
}
