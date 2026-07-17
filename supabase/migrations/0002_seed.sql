-- FitConnect — showcase seed data
-- Run AFTER 0001_init.sql in the Supabase SQL editor. Safe to re-run.
-- Creates 6 demo trainer accounts (they can't log in — random passwords),
-- their offerings, one showcase client, and a few completed bookings + reviews.

-- ---------------------------------------------------------------------------
-- Demo auth users -> the handle_new_user trigger auto-creates their profiles
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111101',
   'authenticated', 'authenticated', 'maya@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Okafor"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111102',
   'authenticated', 'authenticated', 'diego@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Santos"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111103',
   'authenticated', 'authenticated', 'aisha@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Aisha Rahman"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111104',
   'authenticated', 'authenticated', 'liam@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Liam Chen"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111105',
   'authenticated', 'authenticated', 'sofia@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sofia Marin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111106',
   'authenticated', 'authenticated', 'marcus@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Bell"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111199',
   'authenticated', 'authenticated', 'showcase@demo.fitconnect.app',
   crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Showcase Client"}', now(), now())
on conflict (id) do nothing;

-- Ensure profiles exist even if the trigger was missing, then mark as trainers.
insert into profiles (id, full_name)
select u.id, u.raw_user_meta_data->>'full_name' from auth.users u
where u.email like '%@demo.fitconnect.app'
on conflict (id) do nothing;

update profiles set role = 'trainer', city = 'Riyadh'
where id in (
  '11111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111102',
  '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111104',
  '11111111-1111-4111-8111-111111111105', '11111111-1111-4111-8111-111111111106');

-- ---------------------------------------------------------------------------
-- Trainers
-- ---------------------------------------------------------------------------
insert into trainers
  (id, profile_id, display_name, avatar_url, headline, bio, specialties,
   years_experience, gender, languages, verified, rating, review_count,
   city, lat, lng, available_now, photos, base_price)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101',
   'Maya Okafor', 'https://i.pravatar.cc/300?img=5', 'Strength & conditioning coach',
   '10+ years coaching strength athletes and everyday clients. I build progressive, joint-friendly programs and keep every rep honest.',
   array['Strength','Conditioning','Mobility'], 10, 'Female', array['English','Arabic'],
   true, 4.9, 128, 'Riyadh', 24.7136, 46.6753, true,
   array['https://picsum.photos/seed/maya1/640/420','https://picsum.photos/seed/maya2/640/420'], 280),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102',
   'Diego Santos', 'https://i.pravatar.cc/300?img=11', 'HIIT & boxing',
   'High-energy conditioning and boxing fundamentals. Sweat guaranteed, form first.',
   array['HIIT','Boxing','Cardio'], 7, 'Male', array['English','Spanish'],
   true, 4.8, 96, 'Riyadh', 24.7010, 46.6910, true,
   array['https://picsum.photos/seed/diego1/640/420'], 220),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111103',
   'Aisha Rahman', 'https://i.pravatar.cc/300?img=9', 'Yoga & mobility',
   'Vinyasa flow, breathwork, and mobility for people who sit at a desk all day.',
   array['Yoga','Mobility','Recovery'], 8, 'Female', array['English','Arabic'],
   true, 4.9, 74, 'Riyadh', 24.7255, 46.6468, false,
   array['https://picsum.photos/seed/aisha1/640/420'], 200),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111104',
   'Liam Chen', 'https://i.pravatar.cc/300?img=15', 'Powerlifting coach',
   'Squat, bench, deadlift. Competition prep and raw strength for all levels.',
   array['Powerlifting','Strength'], 9, 'Male', array['English','Mandarin'],
   true, 4.7, 58, 'Riyadh', 24.6900, 46.7000, false,
   array['https://picsum.photos/seed/liam1/640/420'], 300),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111105',
   'Sofia Marin', 'https://i.pravatar.cc/300?img=20', 'Pilates & core',
   'Reformer-inspired mat pilates. Core stability, posture, and control.',
   array['Pilates','Core','Posture'], 6, 'Female', array['English','Portuguese'],
   false, 4.8, 41, 'Riyadh', 24.7420, 46.6600, true,
   array['https://picsum.photos/seed/sofia1/640/420'], 240),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111106',
   'Marcus Bell', 'https://i.pravatar.cc/300?img=33', 'Running & endurance',
   'From couch to 10k and beyond. Gait analysis, pacing, and smart mileage.',
   array['Running','Endurance'], 5, 'Male', array['English'],
   false, 4.6, 33, 'Riyadh', 24.7100, 46.6300, false,
   array['https://picsum.photos/seed/marcus1/640/420'], 180)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Session types: single / 5-pack (popular) / Pro subscription for each trainer
-- ---------------------------------------------------------------------------
insert into session_types
  (trainer_id, name, description, kind, price, billing_period, sessions_included, duration_min, popular, sort)
select t.id, x.name, x.description, x.kind::session_kind, round(t.base_price * x.mult), x.period, x.included, 60, x.popular, x.sort
from trainers t
cross join (values
  ('Single session', 'One-off, in-person or virtual', 'single', 1.0, 'session', 1, false, 0),
  ('5-session pack', 'Save when you commit to five', 'pack', 4.5, 'pack', 5, true, 1),
  ('Pro plan', '8 sessions / month + chat support', 'subscription', 5.4, 'mo', 8, false, 2)
) as x(name, description, kind, mult, period, included, popular, sort)
where t.id::text like '22222222-%'
  and not exists (select 1 from session_types s where s.trainer_id = t.id);

-- ---------------------------------------------------------------------------
-- Showcase reviews for Maya (via completed bookings from the showcase client)
-- ---------------------------------------------------------------------------
insert into bookings (id, client_id, trainer_id, status, format, scheduled_at,
                      base_price, service_fee, total, amount_due, paid)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111199',
   '22222222-2222-4222-8222-222222222201', 'completed', 'in_person', now() - interval '10 days',
   280, 28, 308, 308, true),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111199',
   '22222222-2222-4222-8222-222222222201', 'completed', 'in_person', now() - interval '24 days',
   280, 28, 308, 308, true),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111199',
   '22222222-2222-4222-8222-222222222201', 'completed', 'virtual', now() - interval '40 days',
   280, 28, 308, 308, true)
on conflict (id) do nothing;

insert into reviews (booking_id, rater_id, ratee_id, direction, rating, comment, tags)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111199',
   '11111111-1111-4111-8111-111111111101', 'client_to_trainer', 5,
   'Ready on time with space cleared. Great energy!', array['Punctual','Motivating']),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111199',
   '11111111-1111-4111-8111-111111111101', 'client_to_trainer', 5,
   'Best coach I have worked with. Programming is spot on.', array['Knowledgeable']),
  ('33333333-3333-4333-8333-333333333303', '11111111-1111-4111-8111-111111111199',
   '11111111-1111-4111-8111-111111111101', 'client_to_trainer', 4,
   'Tough but fair. Felt it the next day!', array['Challenging'])
on conflict (booking_id, direction) do nothing;
