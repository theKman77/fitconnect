/**
 * Seed / demo data. Powers the app when the backend isn't configured yet
 * (isBackendConfigured === false) so the full UI is explorable in Expo Go.
 * The same shape is inserted server-side by supabase/migrations/0002_seed.sql.
 */
import type { Profile, Review, SessionType, Trainer, TrainerDetail } from '@/types/domain';

const avatar = (n: number) => `https://i.pravatar.cc/300?img=${n}`;
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/640/420`;

export const demoProfile: Profile = {
  id: 'demo-client',
  role: 'client',
  full_name: 'Alex Rivera',
  avatar_url: avatar(12),
  city: 'Riyadh',
  phone: null,
  goals: ['Build muscle', 'Lose weight'],
  experience_level: 'Intermediate',
  injuries: ['Lower back'],
  onboarded: true,
  emergency_contact_name: 'Sam',
  emergency_contact_phone: '+966 55 123 4410',
  high_contrast: false,
  large_text: false,
  stripe_customer_id: null,
  referral_code: 'FIT-ALEX',
  push_token: null,
  socials: { instagram: 'alex.lifts' },
  weight_goal: 78,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

function makeTrainer(t: Partial<Trainer> & { id: string; display_name: string }): Trainer {
  return {
    profile_id: `p-${t.id}`,
    avatar_url: null,
    headline: null,
    bio: null,
    specialties: [],
    years_experience: 5,
    gender: null,
    languages: ['English', 'Arabic'],
    verified: false,
    rating: 4.8,
    review_count: 40,
    city: 'Riyadh',
    lat: 24.7136,
    lng: 46.6753,
    available_now: false,
    video_intro_url: null,
    photos: [],
    base_price: 220,
    socials: { instagram: 'fitconnect.coach' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...t,
  } as Trainer;
}

export const trainers: Trainer[] = [
  makeTrainer({
    id: 't-maya',
    display_name: 'Maya Okafor',
    avatar_url: avatar(5),
    headline: 'Strength & conditioning coach',
    bio: '10+ years coaching strength athletes and everyday clients. I build progressive, joint-friendly programs and keep every rep honest.',
    specialties: ['Strength', 'Conditioning', 'Mobility'],
    years_experience: 10,
    gender: 'Female',
    languages: ['English', 'Arabic'],
    verified: true,
    rating: 4.9,
    review_count: 128,
    available_now: true,
    video_intro_url: 'https://example.com/maya-intro.mp4',
    photos: [],
    base_price: 280,
  }),
  makeTrainer({
    id: 't-diego',
    display_name: 'Diego Santos',
    avatar_url: avatar(11),
    headline: 'HIIT & boxing',
    bio: 'High-energy conditioning and boxing fundamentals. Sweat guaranteed, form first.',
    specialties: ['HIIT', 'Boxing', 'Cardio'],
    years_experience: 7,
    gender: 'Male',
    languages: ['English', 'Spanish'],
    verified: true,
    rating: 4.8,
    review_count: 96,
    available_now: true,
    photos: [],
    base_price: 220,
  }),
  makeTrainer({
    id: 't-aisha',
    display_name: 'Aisha Rahman',
    avatar_url: avatar(9),
    headline: 'Yoga & mobility',
    bio: 'Vinyasa flow, breathwork, and mobility for people who sit at a desk all day.',
    specialties: ['Yoga', 'Mobility', 'Recovery'],
    years_experience: 8,
    gender: 'Female',
    languages: ['English', 'Arabic'],
    verified: true,
    rating: 4.9,
    review_count: 74,
    available_now: false,
    photos: [],
    base_price: 200,
  }),
  makeTrainer({
    id: 't-liam',
    display_name: 'Liam Chen',
    avatar_url: avatar(15),
    headline: 'Powerlifting coach',
    bio: 'Squat, bench, deadlift. Competition prep and raw strength for all levels.',
    specialties: ['Powerlifting', 'Strength'],
    years_experience: 9,
    gender: 'Male',
    languages: ['English', 'Mandarin'],
    verified: true,
    rating: 4.7,
    review_count: 58,
    available_now: false,
    photos: [],
    base_price: 300,
  }),
  makeTrainer({
    id: 't-sofia',
    display_name: 'Sofia Marin',
    avatar_url: avatar(20),
    headline: 'Pilates & core',
    bio: 'Reformer-inspired mat pilates. Core stability, posture, and control.',
    specialties: ['Pilates', 'Core', 'Posture'],
    years_experience: 6,
    gender: 'Female',
    languages: ['English', 'Portuguese'],
    verified: false,
    rating: 4.8,
    review_count: 41,
    available_now: true,
    photos: [],
    base_price: 240,
  }),
  makeTrainer({
    id: 't-marcus',
    display_name: 'Marcus Bell',
    avatar_url: avatar(33),
    headline: 'Running & endurance',
    bio: 'From couch to 10k and beyond. Gait analysis, pacing, and smart mileage.',
    specialties: ['Running', 'Endurance'],
    years_experience: 5,
    gender: 'Male',
    languages: ['English'],
    verified: false,
    rating: 4.6,
    review_count: 33,
    available_now: false,
    photos: [],
    base_price: 180,
  }),
];

export const sessionTypes: Record<string, SessionType[]> = Object.fromEntries(
  trainers.map((t) => [
    t.id,
    [
      {
        id: `${t.id}-single`,
        trainer_id: t.id,
        name: 'Single session',
        description: 'One-off, in-person or virtual',
        kind: 'single',
        price: t.base_price,
        billing_period: 'session',
        sessions_included: 1,
        duration_min: 60,
        popular: false,
        active: true,
        sort: 0,
      },
      {
        id: `${t.id}-pack`,
        trainer_id: t.id,
        name: '5-session pack',
        description: 'Save when you commit to five',
        kind: 'pack',
        price: Math.round(t.base_price * 4.5),
        billing_period: 'pack',
        sessions_included: 5,
        duration_min: 60,
        popular: true,
        active: true,
        sort: 1,
      },
      {
        id: `${t.id}-pro`,
        trainer_id: t.id,
        name: 'Pro plan',
        description: '8 sessions / month + chat support',
        kind: 'subscription',
        price: Math.round(t.base_price * 5.4),
        billing_period: 'mo',
        sessions_included: 8,
        duration_min: 60,
        popular: false,
        active: true,
        sort: 2,
      },
    ],
  ]),
);

const mayaReviews: Review[] = [
  {
    id: 'r1', booking_id: 'b1', rater_id: 'demo-client', ratee_id: 'p-t-maya',
    direction: 'client_to_trainer', rating: 5,
    comment: 'Ready on time with space cleared. Great energy!', tags: ['Punctual', 'Motivating'],
    photo_url: null, created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'r2', booking_id: 'b2', rater_id: 'c2', ratee_id: 'p-t-maya',
    direction: 'client_to_trainer', rating: 5,
    comment: 'Best coach I have worked with. Programming is spot on.', tags: ['Knowledgeable'],
    photo_url: null, created_at: '2025-05-20T00:00:00Z',
  },
  {
    id: 'r3', booking_id: 'b3', rater_id: 'c3', ratee_id: 'p-t-maya',
    direction: 'client_to_trainer', rating: 4,
    comment: 'Tough but fair. Felt it the next day!', tags: ['Challenging'],
    photo_url: null, created_at: '2025-05-02T00:00:00Z',
  },
];

export function getTrainerDetail(id: string): TrainerDetail | undefined {
  const t = trainers.find((x) => x.id === id);
  if (!t) return undefined;
  return {
    ...t,
    session_types: sessionTypes[t.id] ?? [],
    reviews: t.id === 't-maya' ? mayaReviews : [],
  };
}

export const goalOptions = [
  'Build muscle', 'Lose weight', 'Improve mobility', 'Boost endurance',
  'Sport-specific', 'General fitness',
];
export const experienceLevels = [
  { key: 'beginner', label: 'Beginner', sub: 'New to training or returning' },
  { key: 'intermediate', label: 'Intermediate', sub: 'Comfortable with the basics' },
  { key: 'advanced', label: 'Advanced', sub: 'Training consistently for years' },
];
export const injuryOptions = [
  'None', 'Lower back', 'Knee', 'Shoulder', 'Wrist', 'Neck', 'Ankle',
];
