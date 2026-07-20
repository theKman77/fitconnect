/**
 * Minimal `Database` type for the typed Supabase client. Row types reuse the
 * domain models (good read typing); Insert/Update are permissive partials.
 * Replace with `supabase gen types typescript` output once the project is live
 * for exact write typing.
 */
import type {
  Profile,
  Trainer,
  SessionType,
  AvailabilitySlot,
  Booking,
  Message,
  TrainerLocation,
  Review,
  Subscription,
  ProgressEntry,
  Workout,
  TrainerClientRecord,
  CoachNudge,
  Challenge,
  ChallengeMembership,
} from './domain';

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

interface BookingParticipant {
  id: string;
  booking_id: string;
  profile_id: string | null;
  email: string | null;
  paid: boolean;
  created_at: string;
}

interface Favorite {
  client_id: string;
  trainer_id: string;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  code: string;
  credited: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      trainers: Table<Trainer>;
      session_types: Table<SessionType>;
      availability: Table<AvailabilitySlot>;
      bookings: Table<Booking>;
      booking_participants: Table<BookingParticipant>;
      messages: Table<Message>;
      trainer_locations: Table<TrainerLocation>;
      reviews: Table<Review>;
      subscriptions: Table<Subscription>;
      favorites: Table<Favorite>;
      progress_entries: Table<ProgressEntry>;
      workouts: Table<Workout>;
      referrals: Table<Referral>;
      trainer_client_records: Table<TrainerClientRecord>;
      coach_nudges: Table<CoachNudge>;
      challenges: Table<Challenge>;
      challenge_memberships: Table<ChallengeMembership>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
