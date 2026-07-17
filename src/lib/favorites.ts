/**
 * Favorites. Demo mode keeps an in-memory set (Maya starts favorited to match
 * the design); live mode reads/writes the `favorites` table.
 */
import { supabase, isBackendConfigured } from './supabase';

const demoFavorites = new Set<string>(['t-maya']);
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to favorite changes (demo mode). Returns an unsubscribe fn. */
export function onFavoritesChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function listFavoriteIds(clientId: string): Promise<string[]> {
  if (!isBackendConfigured) return [...demoFavorites];
  const { data } = await supabase.from('favorites').select('trainer_id').eq('client_id', clientId);
  return (data ?? []).map((r: { trainer_id: string }) => r.trainer_id);
}

export async function isFavorite(clientId: string, trainerId: string): Promise<boolean> {
  const ids = await listFavoriteIds(clientId);
  return ids.includes(trainerId);
}

/** Toggle; resolves to the new state (true = now favorited). */
export async function toggleFavorite(clientId: string, trainerId: string): Promise<boolean> {
  if (!isBackendConfigured) {
    const now = !demoFavorites.has(trainerId);
    if (now) demoFavorites.add(trainerId);
    else demoFavorites.delete(trainerId);
    notify();
    return now;
  }
  const { data } = await supabase
    .from('favorites')
    .select('trainer_id')
    .eq('client_id', clientId)
    .eq('trainer_id', trainerId)
    .maybeSingle();
  if (data) {
    await supabase.from('favorites').delete().eq('client_id', clientId).eq('trainer_id', trainerId);
    return false;
  }
  await supabase.from('favorites').insert({ client_id: clientId, trainer_id: trainerId });
  return true;
}
