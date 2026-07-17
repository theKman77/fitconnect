/**
 * Gamification: XP + levels + achievements for clients, and the trainer tier
 * ladder (a core anti-disintermediation lever — tier progress, lower fees, and
 * ranking boosts only accrue from ON-platform sessions).
 */
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

// ---------- Client XP / levels ----------

export interface ClientStats {
  sessions: number;
  streakWeeks: number;
  prCount: number;
  reviewsGiven: number;
  weightLogs: number;
}

export function computeXP(s: ClientStats): number {
  return s.sessions * 50 + s.streakWeeks * 30 + s.prCount * 40 + s.reviewsGiven * 20 + s.weightLogs * 10;
}

const LEVELS = ['Rookie', 'Mover', 'Grinder', 'Athlete', 'Beast', 'Legend'];

/** Level thresholds: 0, 150, 400, 800, 1400, 2200 XP. */
const THRESHOLDS = [0, 150, 400, 800, 1400, 2200];

export interface LevelInfo {
  level: number;        // 1-based
  name: string;
  xp: number;
  intoLevel: number;    // xp earned inside current level
  levelSpan: number;    // xp needed to clear current level
  progress: number;     // 0..1 to next level
}

export function levelFromXP(xp: number): LevelInfo {
  let i = 0;
  while (i < THRESHOLDS.length - 1 && xp >= THRESHOLDS[i + 1]) i++;
  const base = THRESHOLDS[i];
  const next = THRESHOLDS[Math.min(i + 1, THRESHOLDS.length - 1)];
  const span = Math.max(1, next - base);
  const into = Math.min(xp - base, span);
  return {
    level: i + 1,
    name: LEVELS[i],
    xp,
    intoLevel: into,
    levelSpan: span,
    progress: i === THRESHOLDS.length - 1 ? 1 : into / span,
  };
}

// ---------- Achievements ----------

export interface Achievement {
  id: string;
  title: string;
  icon: IconName;
  earned: (s: ClientStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First session', icon: 'flag', earned: (s) => s.sessions >= 1 },
  { id: 'five', title: '5 sessions', icon: 'barbell', earned: (s) => s.sessions >= 5 },
  { id: 'ten', title: '10 sessions', icon: 'trophy', earned: (s) => s.sessions >= 10 },
  { id: 'streak3', title: '3-week streak', icon: 'flame', earned: (s) => s.streakWeeks >= 3 },
  { id: 'streak6', title: '6-week streak', icon: 'bonfire', earned: (s) => s.streakWeeks >= 6 },
  { id: 'pr1', title: 'First PR', icon: 'trending-up', earned: (s) => s.prCount >= 1 },
  { id: 'pr3', title: 'PR hunter', icon: 'podium', earned: (s) => s.prCount >= 3 },
  { id: 'logger', title: 'Data driven', icon: 'analytics', earned: (s) => s.weightLogs >= 4 },
  { id: 'reviewer', title: 'Good sport', icon: 'star', earned: (s) => s.reviewsGiven >= 1 },
];

// ---------- Trainer tiers (anti-poaching ladder) ----------

export interface TrainerTier {
  name: string;
  icon: IconName;
  minSessions: number;   // completed on-platform sessions to reach
  feePct: number;        // platform fee at this tier
  perks: string[];
}

export const TRAINER_TIERS: TrainerTier[] = [
  { name: 'Bronze', icon: 'shield-outline', minSessions: 0, feePct: 10, perks: ['Standard search listing'] },
  { name: 'Silver', icon: 'shield-half', minSessions: 10, feePct: 9, perks: ['Ranking boost', 'Priority support'] },
  { name: 'Gold', icon: 'shield', minSessions: 30, feePct: 8, perks: ['Homepage featuring', 'Instant payouts'] },
  { name: 'Elite', icon: 'shield-checkmark', minSessions: 75, feePct: 6, perks: ['Top of search', 'Gym-partner access', 'Elite badge'] },
];

export function tierForSessions(completed: number): { current: TrainerTier; next: TrainerTier | null; progress: number } {
  let idx = 0;
  for (let i = 0; i < TRAINER_TIERS.length; i++) {
    if (completed >= TRAINER_TIERS[i].minSessions) idx = i;
  }
  const current = TRAINER_TIERS[idx];
  const next = TRAINER_TIERS[idx + 1] ?? null;
  const progress = next
    ? Math.min(1, (completed - current.minSessions) / (next.minSessions - current.minSessions))
    : 1;
  return { current, next, progress };
}

/**
 * Repeat-client fee discount (anti-poaching): the platform fee on a given
 * client DROPS as you complete more sessions with them, so taking a regular
 * off-platform saves almost nothing but loses protection, tier progress and
 * new-client flow.
 */
export function repeatClientFeePct(sessionsWithClient: number, baseFeePct: number): number {
  if (sessionsWithClient >= 20) return Math.max(3, baseFeePct - 5);
  if (sessionsWithClient >= 10) return Math.max(4, baseFeePct - 4);
  if (sessionsWithClient >= 5) return Math.max(5, baseFeePct - 2);
  return baseFeePct;
}
