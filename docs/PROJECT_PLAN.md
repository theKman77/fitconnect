# FitConnect — Build Plan

A native marketplace app connecting clients with fitness trainers. Built full-scope
from the approved design, with a real backend and test-mode payments.

## Stack
- **App:** Expo (SDK 54 — matches the owner's Expo Go) + React Native + TypeScript, expo-router
- **Backend:** Supabase — Postgres, Auth, Realtime (chat + live location), Storage (photos)
- **Payments:** Moyasar (KSA market: mada, Apple Pay, cards) — **test mode** first.
  (Stripe ruled out: not available to KSA-based businesses.)
- **Market:** Saudi Arabia — SAR currency, Riyadh demo data. Arabic/RTL = later phase.
- **Maps/Location:** react-native-maps + expo-location (needs a dev client build)
- **Design system:** `src/theme` — tokens taken directly from the design file

## Screens (from the design)
1. Onboarding quiz — goals, experience, injuries
2. Home — search, instant vs subscriptions, favorite + top-rated trainers
3. Discover — search + filters (type, price, rating, gender, language)
4. Trainer profile — video intro, verification, bio, pricing, reviews, availability
5. Booking flow — format, train-with-friend split, equipment, when/where, review & pay
6. Booking confirmation
7. Live tracking — trainer en route, safety/SOS, in-app chat
8. Rating — two-way rating + progress photo
9. Membership — plan status, pause/resume, loyalty, perks
10. Progress — weight, milestones, recent workouts
11. Account — profile, favorites, payments, referrals, safety & accessibility
12. Tab bar — Home, Discover, Progress, Account

## Build phases
- [x] **Phase 0** — Scaffold, dependencies, design system, folder structure
- [x] **Phase 1** — Foundation: theme, fonts, Supabase client, DB schema, types, auth context, navigation shell, reusable UI components
- [x] **Phase 2** — Auth + onboarding (welcome, sign in/up, 3-step quiz)
- [x] **Phase 3** — Browse: Home + Discover (search/filters) + Trainer profile
- [x] **Phase 4** — Booking flow (4 steps) + confirmation. *Payment: demo simulated;
      Stripe Edge Function + webhooks still to wire (see Phase 4b).*
- [~] **Phase 5** — Sessions: tracking screen + phase stepper + chat + safety/SOS UI
      built and working in demo. *Still to wire: Supabase realtime location/chat,
      native map (needs dev-client build).*
- [~] **Phase 6** — Two-way rating built; progress screen (weight/milestones/workouts)
      built. *Still to wire: progress photo upload to Supabase Storage, live data.*
- [~] **Phase 7** — Membership screen (status, sessions, loyalty, pause/resume, perks)
      built. *Still to wire: Stripe recurring billing.*
- [x] **Phase 8** — Account (profile, sections, safety & accessibility toggles, sign out)

### Remaining to reach "live production"
- [~] **4b** — Moyasar: Edge Functions `create-checkout` + `moyasar-webhook` written
      + wired (gated by EXPO_PUBLIC_PAYMENTS_ENABLED). *Owner: deploy functions +
      set keys (docs/SETUP.md §3).* Trainer payout flow still TODO.
- [x] **Web auto-deploy** — `netlify.toml` + git repo ready for GitHub→Netlify CI
- [x] **5b (chat)** — Realtime chat wired to Supabase (persists + live subscribe);
      demo mode simulates a trainer reply
- [ ] **5c** — Live location broadcast (needs trainer-side app) + native-maps dev-client build
- [x] **Web build** — `web.output: single` so the app runs on the web too (demo link option)
- [x] **Backend seed** — `0002_seed.sql` loads showcase trainers/plans/reviews into Postgres
- [x] **Trainer-side surface** — become a trainer, go online, dashboard (earnings/
      upcoming), bookings list, advance session status (flows to client in realtime),
      two-way chat, switch back to client. Role-based routing at app entry.
- [ ] **Favorites, referrals, session history** — wire to backend
- [ ] **Push notifications** (expo-notifications)
- [ ] **Polish** — loading/empty/error states, offline handling, accessibility pass

### Engagement / "make it interesting" (owner feedback 2026-07-17)
The Progress section (and engagement generally) feels flat. Make both sides more
compelling — ideas to design later:
- **Client:** richer progress (photos timeline, PRs, body measurements, charts
  with real data), streaks/challenges, goals with milestones, celebratory moments
  after sessions, weekly recap.
- **Trainer:** earnings dashboard, client roster & retention, ratings trend,
  streaks/badges, upcoming schedule at a glance.
- Treat this as a dedicated "engagement" phase after core flows + trainer app.

## What needs YOU (owner-only steps) — see docs/SETUP.md
1. Create a free Supabase project → paste URL + anon key into `.env`
2. Run the SQL migrations (one paste into Supabase SQL editor)
3. Create a Stripe test account → paste test keys
4. (Later) EAS/dev-client build to enable native maps + go live on real payments
