import dayjs from 'dayjs';
import { demoBookings } from '@/data/store';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import type {
  Challenge,
  ChallengeLeaderboardEntry,
  ChallengeMembership,
  CoachNudge,
  CoachNudgeKind,
  CoachNudgeStatus,
  RelationshipStatus,
  TrainerClientRecord,
} from '@/types/domain';

const now = dayjs();
const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 'demo-three-session-week', slug: 'three-session-week', title: 'Three-session week', title_ar: 'ثلاث جلسات في أسبوع',
    description: 'Build momentum with three verified FitConnect sessions before the week ends.',
    description_ar: 'ابنِ زخمك بإكمال ثلاث جلسات موثقة على FitConnect قبل نهاية الأسبوع.',
    kind: 'solo', metric: 'verified_sessions', target: 3, reward_xp: 150,
    starts_at: now.startOf('week').toISOString(), ends_at: now.endOf('week').toISOString(), max_members: null, active: true, created_at: now.toISOString(),
  },
  {
    id: 'demo-riyadh-circle', slug: 'riyadh-momentum-circle', title: 'Riyadh Momentum Circle', title_ar: 'دائرة زخم الرياض',
    description: 'A small, privacy-first circle chasing eight verified sessions together.',
    description_ar: 'دائرة صغيرة تراعي الخصوصية وتسعى لإكمال ثماني جلسات موثقة معاً.',
    kind: 'circle', metric: 'verified_sessions', target: 8, reward_xp: 400,
    starts_at: now.startOf('week').toISOString(), ends_at: now.add(28, 'day').toISOString(), max_members: 24, active: true, created_at: now.toISOString(),
  },
  {
    id: 'demo-consistency', slug: 'consistency-over-intensity', title: 'Consistency over intensity', title_ar: 'الاستمرارية أهم من الشدة',
    description: 'Six weeks, twelve sessions, and no public body metrics—only showing up counts.',
    description_ar: 'ستة أسابيع واثنتا عشرة جلسة، بلا قياسات جسدية عامة—الحضور هو ما يُحتسب.',
    kind: 'circle', metric: 'verified_sessions', target: 12, reward_xp: 650,
    starts_at: now.startOf('week').toISOString(), ends_at: now.add(42, 'day').toISOString(), max_members: 40, active: true, created_at: now.toISOString(),
  },
];

let demoMemberships: ChallengeMembership[] = [{
  challenge_id: 'demo-three-session-week', client_id: 'demo-client', display_alias: 'Khalid K.', progress: 2,
  joined_at: now.subtract(3, 'day').toISOString(), completed_at: null,
}];
let demoRecords = new Map<string, TrainerClientRecord>();
let demoNudges: CoachNudge[] = [{
  id: 'demo-nudge-1', trainer_id: '22222222-2222-4222-8222-222222222203', client_id: 'demo-client', kind: 'celebrate',
  title: 'You are one session from your weekly mission', body: 'Your consistency is showing. I saved two openings that fit your usual time.',
  status: 'sent', created_at: now.subtract(2, 'hour').toISOString(), seen_at: null,
}];

export async function getTrainerClientRecord(trainerId: string, clientId: string): Promise<TrainerClientRecord | null> {
  if (!isBackendConfigured) return demoRecords.get(`${trainerId}:${clientId}`) ?? null;
  const { data, error } = await supabase.from('trainer_client_records').select('*')
    .eq('trainer_id', trainerId).eq('client_id', clientId).maybeSingle();
  if (error) throw error;
  return data as TrainerClientRecord | null;
}

export async function saveTrainerClientRecord(
  trainerId: string,
  clientId: string,
  values: Partial<Pick<TrainerClientRecord, 'goal_summary' | 'private_notes' | 'tags' | 'relationship_status' | 'next_follow_up_at' | 'last_contacted_at'>>,
): Promise<TrainerClientRecord> {
  if (!isBackendConfigured) {
    const key = `${trainerId}:${clientId}`;
    const current = demoRecords.get(key);
    const value: TrainerClientRecord = {
      trainer_id: trainerId, client_id: clientId, goal_summary: null, private_notes: null, tags: [], relationship_status: 'active',
      next_follow_up_at: null, last_contacted_at: null, created_at: current?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString(),
      ...current, ...values,
    };
    demoRecords.set(key, value);
    return value;
  }
  const { data, error } = await supabase.from('trainer_client_records').upsert({ trainer_id: trainerId, client_id: clientId, ...values }, { onConflict: 'trainer_id,client_id' }).select().single();
  if (error) throw error;
  return data as TrainerClientRecord;
}

export async function sendCoachNudge(trainerId: string, clientId: string, kind: CoachNudgeKind, title: string, body: string): Promise<CoachNudge> {
  if (!isBackendConfigured) {
    const value: CoachNudge = { id: `nudge-${Date.now()}`, trainer_id: trainerId, client_id: clientId, kind, title, body, status: 'sent', created_at: new Date().toISOString(), seen_at: null };
    demoNudges = [value, ...demoNudges];
    return value;
  }
  const { data, error } = await supabase.from('coach_nudges').insert({ trainer_id: trainerId, client_id: clientId, kind, title, body }).select().single();
  if (error) throw error;
  return data as CoachNudge;
}

export async function listMyCoachNudges(clientId: string): Promise<CoachNudge[]> {
  if (!isBackendConfigured || clientId === 'demo-client') return demoNudges.filter((item) => item.client_id === clientId);
  const { data, error } = await supabase.from('coach_nudges').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  return data as CoachNudge[];
}

export async function respondToCoachNudge(id: string, status: CoachNudgeStatus): Promise<void> {
  if (!isBackendConfigured) {
    demoNudges = demoNudges.map((item) => item.id === id ? { ...item, status, seen_at: status === 'seen' || status === 'acted' ? new Date().toISOString() : item.seen_at } : item);
    return;
  }
  const { error } = await supabase.rpc('respond_to_coach_nudge', { p_nudge: id, p_status: status });
  if (error) throw error;
}

export async function listChallenges(showcase = false): Promise<Challenge[]> {
  if (!isBackendConfigured || showcase) return DEMO_CHALLENGES;
  const { data, error } = await supabase.from('challenges').select('*').eq('active', true).gt('ends_at', new Date().toISOString()).order('ends_at');
  if (error) throw error;
  return data as Challenge[];
}

export async function listMyChallengeMemberships(clientId: string): Promise<ChallengeMembership[]> {
  if (!isBackendConfigured || clientId === 'demo-client') return demoMemberships.filter((item) => item.client_id === clientId);
  const { data, error } = await supabase.from('challenge_memberships').select('*').eq('client_id', clientId);
  if (error) throw error;
  return data as ChallengeMembership[];
}

export async function joinChallenge(challengeId: string, clientId: string, alias: string): Promise<ChallengeMembership> {
  if (!isBackendConfigured) {
    const challenge = DEMO_CHALLENGES.find((item) => item.id === challengeId);
    if (!challenge) throw new Error('Challenge unavailable');
    const completed = [...demoBookings.values()].filter((booking) => booking.client_id === clientId && booking.status === 'completed').length;
    const value: ChallengeMembership = { challenge_id: challengeId, client_id: clientId, display_alias: alias.trim(), progress: challenge.slug === 'three-session-week' ? Math.max(2, completed) : completed, joined_at: new Date().toISOString(), completed_at: null };
    demoMemberships = [...demoMemberships.filter((item) => !(item.challenge_id === challengeId && item.client_id === clientId)), value];
    return value;
  }
  const { data, error } = await supabase.rpc('join_challenge', { p_challenge: challengeId, p_alias: alias.trim() });
  if (error) throw error;
  return data as ChallengeMembership;
}

export async function leaveChallenge(challengeId: string, clientId: string): Promise<void> {
  if (!isBackendConfigured) {
    demoMemberships = demoMemberships.filter((item) => !(item.challenge_id === challengeId && item.client_id === clientId));
    return;
  }
  const { error } = await supabase.from('challenge_memberships').delete().eq('challenge_id', challengeId).eq('client_id', clientId);
  if (error) throw error;
}

export async function getChallengeLeaderboard(challengeId: string, clientId: string): Promise<ChallengeLeaderboardEntry[]> {
  if (!isBackendConfigured || clientId === 'demo-client') {
    const mine = demoMemberships.find((item) => item.challenge_id === challengeId && item.client_id === clientId);
    const target = DEMO_CHALLENGES.find((item) => item.id === challengeId)?.target ?? 8;
    const samples = [
      { display_alias: 'Desert Falcon', progress: Math.min(target, 6), is_me: false },
      { display_alias: 'Noor Moves', progress: Math.min(target, 5), is_me: false },
      { display_alias: mine?.display_alias ?? 'Khalid K.', progress: mine?.progress ?? 2, is_me: true },
      { display_alias: 'Riyadh Runner', progress: Math.min(target, 1), is_me: false },
    ].sort((a, b) => b.progress - a.progress);
    return samples.map((item, index) => ({ position: index + 1, target, ...item }));
  }
  const { data, error } = await supabase.rpc('get_challenge_leaderboard', { p_challenge: challengeId });
  if (error) throw error;
  return ((data ?? []) as Array<Omit<ChallengeLeaderboardEntry, 'position'> & { rank_position: number }>).map((row) => ({
    position: row.rank_position,
    display_alias: row.display_alias,
    progress: row.progress,
    target: row.target,
    is_me: row.is_me,
  }));
}

export function relationshipSignal(lastSessionAt: string | null, hasUpcoming: boolean): RelationshipStatus {
  if (hasUpcoming) return 'active';
  if (!lastSessionAt || dayjs().diff(dayjs(lastSessionAt), 'day') >= 21) return 'attention';
  return 'active';
}
