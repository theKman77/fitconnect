/** Domain model types — mirror the Postgres schema in supabase/migrations. */

export type UserRole = 'client' | 'trainer';
export type SessionFormat = 'in_person' | 'virtual';
export type SessionKind = 'single' | 'pack' | 'subscription';
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'en_route'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type ReviewDirection = 'client_to_trainer' | 'trainer_to_client';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'simulation';
export type TrainerOnboardingStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
  goals: string[];
  experience_level: string | null;
  injuries: string[];
  onboarded: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  high_contrast: boolean;
  large_text: boolean;
  stripe_customer_id: string | null;
  referral_code: string | null;
  push_token: string | null;
  socials: Socials;
  onboarding_status?: TrainerOnboardingStatus;
  weight_goal: number | null;
  created_at: string;
  updated_at: string;
}

/** Social handles (all optional). */
export interface Socials {
  instagram?: string;
  tiktok?: string;
  x?: string;
  youtube?: string;
  snapchat?: string;
  website?: string;
}

export interface PersonalRecord {
  id: string;
  client_id: string;
  lift: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export interface Trainer {
  id: string;
  profile_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string[];
  years_experience: number;
  gender: string | null;
  languages: string[];
  verified: boolean;
  onboarding_status?: TrainerOnboardingStatus;
  rating: number;
  review_count: number;
  city: string | null;
  lat: number | null;
  lng: number | null;
  available_now: boolean;
  video_intro_url: string | null;
  photos: string[];
  base_price: number;
  socials: Socials;
  created_at: string;
  updated_at: string;
}

export interface SessionType {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  kind: SessionKind;
  price: number;
  billing_period: string | null;
  sessions_included: number | null;
  duration_min: number;
  popular: boolean;
  active: boolean;
  sort: number;
}

export interface AvailabilitySlot {
  id: string;
  trainer_id: string;
  starts_at: string;
  ends_at: string;
  is_peak: boolean;
  booked: boolean;
}

export interface Booking {
  id: string;
  client_id: string;
  trainer_id: string;
  session_type_id: string | null;
  status: BookingStatus;
  format: SessionFormat;
  scheduled_at: string | null;
  duration_min: number;
  address_line: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  virtual_link: string | null;
  is_split: boolean;
  friend_email: string | null;
  equipment_by_trainer: boolean;
  equipment_items: string[];
  base_price: number;
  equipment_fee: number;
  peak_surge: number;
  service_fee: number;
  total: number;
  amount_due: number;
  stripe_checkout_id: string | null;
  stripe_payment_intent: string | null;
  paid: boolean;
  payment_status?: PaymentStatus;
  payment_provider?: string | null;
  quoted_at?: string;
  trainer_fee_rate?: number;
  trainer_platform_fee?: number;
  trainer_payout?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface TrainerLocation {
  booking_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  eta_minutes: number | null;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  rater_id: string;
  ratee_id: string;
  direction: ReviewDirection;
  rating: number;
  comment: string | null;
  tags: string[];
  photo_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  client_id: string;
  trainer_id: string;
  session_type_id: string | null;
  status: SubscriptionStatus;
  plan_name: string | null;
  price: number | null;
  sessions_included: number;
  sessions_used: number;
  loyalty_weeks: number;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressEntry {
  id: string;
  client_id: string;
  weight: number | null;
  unit: string;
  measured_at: string;
  created_at: string;
}

export interface Workout {
  id: string;
  client_id: string;
  booking_id: string | null;
  title: string;
  notes: string | null;
  performed_at: string;
}

export type RelationshipStatus = 'active' | 'attention' | 'paused';
export type CoachNudgeKind = 'rebook' | 'check_in' | 'celebrate';
export type CoachNudgeStatus = 'sent' | 'seen' | 'dismissed' | 'acted';

export interface TrainerClientRecord {
  trainer_id: string;
  client_id: string;
  goal_summary: string | null;
  private_notes: string | null;
  tags: string[];
  relationship_status: RelationshipStatus;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachNudge {
  id: string;
  trainer_id: string;
  client_id: string;
  kind: CoachNudgeKind;
  title: string;
  body: string;
  status: CoachNudgeStatus;
  created_at: string;
  seen_at: string | null;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  kind: 'solo' | 'circle';
  metric: 'verified_sessions';
  target: number;
  reward_xp: number;
  starts_at: string;
  ends_at: string;
  max_members: number | null;
  active: boolean;
  created_at: string;
}

export interface ChallengeMembership {
  challenge_id: string;
  client_id: string;
  display_alias: string;
  progress: number;
  joined_at: string;
  completed_at: string | null;
}

export interface ChallengeLeaderboardEntry {
  position: number;
  display_alias: string;
  progress: number;
  target: number;
  is_me: boolean;
}

export type DemandDaypart = 'morning' | 'afternoon' | 'evening';
export type SlotBroadcastStatus = 'open' | 'claimed' | 'closed' | 'expired';
export type WaitlistMatchStatus = 'new' | 'seen' | 'claimed' | 'expired';

export interface WaitlistRequest {
  id: string;
  client_id: string;
  trainer_id: string;
  session_type_id: string | null;
  format: SessionFormat;
  preferred_dayparts: DemandDaypart[];
  preferred_weekdays: number[];
  city: string | null;
  active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SlotBroadcast {
  id: string;
  availability_id: string;
  trainer_id: string;
  status: SlotBroadcastStatus;
  matched_count: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  availability?: AvailabilitySlot;
  trainer?: Trainer;
}

export interface WaitlistMatch {
  id: string;
  waitlist_id: string;
  broadcast_id: string;
  client_id: string;
  status: WaitlistMatchStatus;
  created_at: string;
  seen_at: string | null;
}

export interface TrainerDemandSummary {
  waitlisted_clients: number;
  open_broadcasts: number;
  matched_clients: number;
}

/** A trainer joined with their session types + reviews, for profile screens. */
export interface TrainerDetail extends Trainer {
  session_types: SessionType[];
  reviews: Review[];
}
