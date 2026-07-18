# FitConnect — Build Plan

## Current release reality — 2026-07-19

The FitConnect 2.0 visual milestone now includes a new interlocking-link identity, rebuilt welcome and responsive home experiences, refined global surfaces/navigation, a more engaging weekly Progress mission, and a dedicated Integrations Hub. The next visual wave is the screen-by-screen redesign of Discover, trainer profile, booking, trainer dashboard, and Arabic/RTL foundations.

The post-audit hardening milestone supersedes stale checklist text below. RLS, storage, Edge Functions, booking integrity, server-side fee/payout math, review aggregates, trainer availability, trainer application gating, password recovery, and cross-app error/empty states are implemented and live. Checkout is a real database reservation but explicitly **unpaid simulation** until Moyasar approves the business. See `CHANGELOG.md` and `docs/SUPABASE.md` for exact behavior.

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

### Full-empowerment pass (2026-07-17) — every visible control now works
- [x] Uploads: avatar (client + trainer sync), trainer video intro (+ in-app
      playback), review progress photos — Supabase Storage (migration 0007)
- [x] Accessibility toggles REAL: large-text scaling + high-contrast lift
      applied app-wide via AccessibilityProvider + Txt
- [x] Membership backed by the real subscriptions table (created when booking a
      monthly plan; pause/resume/cancel persist); honest empty state otherwise
- [x] Trainer settings screen (headline/bio/price/specialties/video; plan prices
      auto-sync); every trainer account row wired; clients named in trainer chat
- [x] Availability tab starts a dated booking; review-step card "Change";
      Home location row; referral share clipboard fallback on web
- [x] Google SSO button (owner must enable the Google provider in Supabase)
- [ ] **OWNER STEP:** paste `supabase/migrations/0007_storage_and_visibility.sql`
      into the Supabase SQL editor — uploads and client-name visibility need it
- Deliberate exception: light/dark theme switch — the app is dark-by-design; a
  light theme is a dedicated theming refactor, scheduled with the Arabic/RTL pass.

### Integrations (next step)
- [ ] Apple Sign-In — REQUIRED by App Store review once Google SSO ships (dev build)
- [ ] Apple Health / Google Health Connect sync (weight, workouts) — needs dev build
- [ ] Apple Pay + mada via Moyasar (needs CR + Apple Pay certificate)
- [ ] WhatsApp share deep-links for referrals (KSA-native growth channel)
- [ ] Calendar sync — add booked sessions to the phone calendar

### Remaining to reach "live production"
- [~] **4b** — Moyasar: Edge Functions `create-checkout` + `moyasar-webhook` written
      + wired (gated by EXPO_PUBLIC_PAYMENTS_ENABLED). *Owner: deploy functions +
      set keys (docs/SETUP.md §3).* Trainer payout flow still TODO.
- [x] **Web auto-deploy** — `netlify.toml` + git repo ready for GitHub→Netlify CI
- [x] **5b (chat)** — Realtime chat wired to Supabase (persists + live subscribe);
      demo mode simulates a trainer reply
- [x] **5c** — Live GPS: trainer broadcasts position (expo-location) while a session
      is active; client map (react-native-maps, Apple Maps on iOS) follows in realtime.
      Web keeps a fallback panel. *Needs the EAS dev-client build to run on device.*
- [x] **Push notifications** — device registers Expo push token; `notify-trainer`
      Edge Function alerts a trainer on new bookings. *Needs dev-client build.*
- [x] **Security hardening** — advisor search_path warnings fixed (migration 0003)
- [x] **Web build** — `web.output: single` so the app runs on the web too (demo link option)
- [x] **Backend seed** — `0002_seed.sql` loads showcase trainers/plans/reviews into Postgres
- [x] **Trainer-side surface** — become a trainer, go online, dashboard (earnings/
      upcoming), bookings list, advance session status (flows to client in realtime),
      two-way chat, switch back to client. Role-based routing at app entry.
- [ ] **Favorites, referrals, session history** — wire to backend
- [ ] **Polish** — loading/empty/error states, offline handling, accessibility pass
- [ ] **Pre-launch security pass** — move RLS helper fns to private schema (clears
      remaining SECURITY DEFINER advisor warnings); enable leaked-password protection

### Engagement / features pass (completed 2026-07-17, e2e-verified)
- [x] **Progress fully working** — per-user weights/PRs/weight-goal saved to Postgres
      (entry sheets), workouts from completed bookings, streaks; demo numbers kept
      for demo mode. Gamification: XP, 6 levels, 9 achievements.
- [x] **Trainer dashboard** — earnings chart, week-at-a-glance, client roster,
      tier ladder (Bronze→Elite, fee 10%→6%), per-client loyalty fee decay,
      payment-protection framing (anti-disintermediation levers).
- [x] **Socials** on profiles + trainers (edit + public pills).
- [x] **Polish** — skeletons, empty states, cross-platform confirm (web Alert fix),
      error surfacing on booking, date strip replacing broken web date picker.
- [x] **E2E verification harness** — scripts/e2e-run.js drives the live app in
      headless Chrome; DB evidence checked via SQL. Found+fixed: signup race,
      bookings RLS INSERT..RETURNING bug (migration 0006).
- [x] **Feasibility report** published as artifact (screenshots, analysis,
      ARPU/LTV/IAP research, disintermediation strategy).
- [ ] **Next engagement wave (concepted in report):** post-session celebration
      screen, challenges/squads/leaderboards, trainer Business Hub (payouts, CRM
      notes, rebook prompts, partner-gym perk surface).

## What needs YOU (owner-only steps) — see docs/SETUP.md
1. Create a free Supabase project → paste URL + anon key into `.env`
2. Run the SQL migrations (one paste into Supabase SQL editor)
3. Create a Stripe test account → paste test keys
4. (Later) EAS/dev-client build to enable native maps + go live on real payments
