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
  created_at: string;
  updated_at: string;
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
  rating: number;
  review_count: number;
  city: string | null;
  lat: number | null;
  lng: number | null;
  available_now: boolean;
  video_intro_url: string | null;
  photos: string[];
  base_price: number;
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

/** A trainer joined with their session types + reviews, for profile screens. */
export interface TrainerDetail extends Trainer {
  session_types: SessionType[];
  reviews: Review[];
}
