import dayjs from 'dayjs';
import { trainers as seedTrainers } from '@/data/seed';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import type {
  AvailabilitySlot,
  DemandDaypart,
  SessionFormat,
  SlotBroadcast,
  TrainerDemandSummary,
  WaitlistMatch,
  WaitlistRequest,
} from '@/types/domain';

let demoWaitlists: WaitlistRequest[] = [];
let demoMatches: WaitlistMatch[] = [];
let demoTrainerBroadcasts: SlotBroadcast[] = [];

function demoDrop(id: string, trainerIndex: number, hoursAhead: number, matchedCount: number): SlotBroadcast {
  const trainer = seedTrainers[trainerIndex];
  const start = dayjs().add(hoursAhead, 'hour').minute(hoursAhead % 2 ? 30 : 0).second(0);
  const availability: AvailabilitySlot = {
    id: `demo-opening-${id}`,
    trainer_id: trainer.id,
    starts_at: start.toISOString(),
    ends_at: start.add(60, 'minute').toISOString(),
    is_peak: start.hour() >= 18 && start.hour() < 20,
    booked: false,
  };
  return {
    id: `demo-drop-${id}`,
    availability_id: availability.id,
    trainer_id: trainer.id,
    status: 'open',
    matched_count: matchedCount,
    expires_at: availability.starts_at,
    created_at: dayjs().subtract(20, 'minute').toISOString(),
    updated_at: dayjs().subtract(20, 'minute').toISOString(),
    availability,
    trainer,
  };
}

function showcaseDrops(): SlotBroadcast[] {
  return [demoDrop('maya', 0, 7, 6), demoDrop('aisha', 2, 26, 11), demoDrop('diego', 1, 47, 4)];
}

export async function listOpenSlotDrops(showcase = false): Promise<SlotBroadcast[]> {
  if (!isBackendConfigured || showcase) return showcaseDrops();
  const { data, error } = await supabase
    .from('slot_broadcasts')
    .select('*, availability(*), trainer:trainers(*)')
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at')
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as SlotBroadcast[];
}

export async function listMyWaitlists(clientId: string): Promise<WaitlistRequest[]> {
  if (!isBackendConfigured || clientId === 'demo-client') return demoWaitlists.filter((row) => row.client_id === clientId && row.active);
  const { data, error } = await supabase.from('waitlist_requests').select('*')
    .eq('client_id', clientId).eq('active', true).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WaitlistRequest[];
}

export async function joinTrainerWaitlist(input: {
  clientId: string;
  trainerId: string;
  sessionTypeId?: string | null;
  format: SessionFormat;
  dayparts: DemandDaypart[];
  weekdays: number[];
  city?: string | null;
}): Promise<WaitlistRequest> {
  if (!isBackendConfigured || input.clientId === 'demo-client') {
    const previous = demoWaitlists.find((row) => row.client_id === input.clientId && row.trainer_id === input.trainerId && row.active);
    const now = new Date().toISOString();
    const row: WaitlistRequest = {
      id: previous?.id ?? `demo-wait-${Date.now()}`,
      client_id: input.clientId,
      trainer_id: input.trainerId,
      session_type_id: input.sessionTypeId ?? null,
      format: input.format,
      preferred_dayparts: input.dayparts,
      preferred_weekdays: input.weekdays,
      city: input.city ?? 'Riyadh',
      active: true,
      expires_at: dayjs().add(60, 'day').toISOString(),
      created_at: previous?.created_at ?? now,
      updated_at: now,
    };
    demoWaitlists = [...demoWaitlists.filter((item) => item.id !== row.id), row];
    return row;
  }
  const { data, error } = await supabase.rpc('join_trainer_waitlist', {
    p_trainer: input.trainerId,
    p_session_type: input.sessionTypeId ?? null,
    p_format: input.format,
    p_dayparts: input.dayparts,
    p_weekdays: input.weekdays,
    p_city: input.city ?? 'Riyadh',
  });
  if (error) throw error;
  return data as WaitlistRequest;
}

export async function leaveTrainerWaitlist(id: string, clientId: string): Promise<void> {
  if (!isBackendConfigured || clientId === 'demo-client') {
    demoWaitlists = demoWaitlists.filter((item) => item.id !== id);
    return;
  }
  const { error } = await supabase.from('waitlist_requests').delete().eq('id', id).eq('client_id', clientId);
  if (error) throw error;
}

export async function listMyWaitlistMatches(clientId: string): Promise<WaitlistMatch[]> {
  if (!isBackendConfigured || clientId === 'demo-client') return demoMatches.filter((row) => row.client_id === clientId);
  const { data, error } = await supabase.from('waitlist_matches').select('*')
    .eq('client_id', clientId).in('status', ['new', 'seen']).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WaitlistMatch[];
}

export async function markWaitlistMatchSeen(id: string, clientId: string): Promise<void> {
  if (!isBackendConfigured || clientId === 'demo-client') {
    demoMatches = demoMatches.map((item) => item.id === id ? { ...item, status: 'seen', seen_at: new Date().toISOString() } : item);
    return;
  }
  const { error } = await supabase.rpc('mark_waitlist_match_seen', { p_match: id });
  if (error) throw error;
}

export async function listTrainerBroadcasts(trainerId: string): Promise<SlotBroadcast[]> {
  if (!isBackendConfigured || trainerId.startsWith('demo-')) return demoTrainerBroadcasts.filter((row) => row.trainer_id === trainerId);
  const { data, error } = await supabase.from('slot_broadcasts').select('*')
    .eq('trainer_id', trainerId).gt('expires_at', dayjs().subtract(1, 'day').toISOString()).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SlotBroadcast[];
}

export async function broadcastOpening(slot: AvailabilitySlot): Promise<SlotBroadcast> {
  if (!isBackendConfigured || slot.trainer_id.startsWith('demo-')) {
    const now = new Date().toISOString();
    const row: SlotBroadcast = {
      id: `demo-broadcast-${slot.id}`,
      availability_id: slot.id,
      trainer_id: slot.trainer_id,
      status: 'open',
      matched_count: 7,
      expires_at: slot.starts_at,
      created_at: now,
      updated_at: now,
      availability: slot,
    };
    demoTrainerBroadcasts = [...demoTrainerBroadcasts.filter((item) => item.availability_id !== slot.id), row];
    return row;
  }
  const { data, error } = await supabase.rpc('broadcast_opening', { p_availability: slot.id });
  if (error) throw error;
  return data as SlotBroadcast;
}

export async function closeSlotBroadcast(id: string, trainerId: string): Promise<void> {
  if (!isBackendConfigured || trainerId.startsWith('demo-')) {
    demoTrainerBroadcasts = demoTrainerBroadcasts.map((item) => item.id === id ? { ...item, status: 'closed' } : item);
    return;
  }
  const { error } = await supabase.rpc('close_slot_broadcast', { p_broadcast: id });
  if (error) throw error;
}

export async function getTrainerDemandSummary(trainerId: string): Promise<TrainerDemandSummary> {
  if (!isBackendConfigured || trainerId.startsWith('demo-')) {
    return { waitlisted_clients: 14, open_broadcasts: demoTrainerBroadcasts.filter((row) => row.status === 'open').length, matched_clients: 7 };
  }
  const { data, error } = await supabase.rpc('get_trainer_demand_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    waitlisted_clients: Number(row?.waitlisted_clients ?? 0),
    open_broadcasts: Number(row?.open_broadcasts ?? 0),
    matched_clients: Number(row?.matched_clients ?? 0),
  };
}
