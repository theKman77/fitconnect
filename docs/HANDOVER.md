# FitConnect — AI Reviewer Handover Brief

> Current-state update (2026-07-20): the post-audit remediation, complete bilingual journey, trainer Retention Studio, and privacy-first Momentum Circles are implemented. Read `CHANGELOG.md`, `docs/SUPABASE.md`, and `docs/RETENTION_RESEARCH.md` first. Pricing, payment state, status transitions, ratings and trainer payouts are server-authoritative; profiles, progress media, and trainer coaching notes are private; trainer availability, fee tiers, coach prompts, and challenge progress are real database logic. Payments remain explicitly simulated and unpaid until Moyasar/CR approval.

> Current-state update (2026-07-18): the post-audit remediation milestone is implemented. Read `CHANGELOG.md` and `docs/SUPABASE.md` before relying on historical descriptions below. Pricing, payment state, status transitions, ratings and trainer payouts are server-authoritative; profiles and progress media are private; trainer availability and fee tiers are real database logic; fake card/payment/safety/subscription claims were removed; and all six showcase trainers are visible. Payments remain explicitly simulated and unpaid until Moyasar/CR approval.

You are reading the handover for **FitConnect**, a two-sided marketplace app
(clients book personal trainers on demand) targeting **Saudi Arabia**. It was
built end-to-end by an AI coding agent (Claude) working for a **first-time,
non-technical founder** who directs product decisions but writes no code.
You are being asked to **critique this project**: code quality, architecture,
product, UX, security, and business logic. This document gives you full context
so you can start immediately. Be direct — the owner explicitly wants honest
findings, not praise.

---

## 1. What the product is

- Clients: onboarding quiz → browse/filter trainers → trainer profile (video
  intro, socials, reviews, plans) → 4-step booking (plan, equipment/split,
  date+time with peak pricing, review & pay) → live session tracking (status +
  GPS + chat + SOS) → two-way rating → progress tracking (weight, PRs, XP/levels/
  achievements/streaks) → membership management.
- Trainers: become-a-trainer flow → dashboard (earnings chart, tier ladder,
  client roster, week view) → bookings → advance session status (flows to the
  client in realtime) → chat → profile/pricing/video settings.
- Anti-disintermediation is a core design constraint (the owner's #1 named
  risk is trainers taking clients off-platform): tier ladder with declining
  platform fees (10%→6%), per-client loyalty fee decay, payment protection
  framing, on-platform-only reputation, chat warnings, a private trainer CRM,
  relationship attention signals, follow-up scheduling, and coach prompts.
- Social retention uses small opt-in Momentum Circles and personal missions.
  Only verified completed sessions affect progress; aliases replace full names,
  standings are member-only, and no body metrics, photos, location, or open chat
  are exposed.

## 2. Stack and architecture

- **App:** Expo SDK 54 (pinned — matches the owner's Expo Go), React Native,
  TypeScript strict, expo-router file routing. One codebase → iOS, Android, web.
- **Backend:** Supabase — Postgres (18+ application tables, RLS on all), Auth, Realtime
  (chat, booking status, GPS), Storage (avatars/videos/progress), Edge
  Functions (Deno): `create-checkout` + `moyasar-webhook` (payments),
  `notify-trainer` (Expo push).
- **Payments:** Moyasar (Saudi gateway; Stripe doesn't onboard KSA businesses).
  Functions are deployed; live activation is blocked until the owner obtains a
  CR (commercial registration). Until then checkout is **simulated** behind
  `EXPO_PUBLIC_PAYMENTS_ENABLED`.
- **Key pattern — dual mode:** every data path runs in *live mode* (Supabase)
  or *demo mode* (in-memory seed, `isBackendConfigured === false`) so the app
  is fully explorable without credentials. Screens call `src/lib/*` only and
  never touch Supabase directly.

### Repo map
```
src/app/            screens (expo-router): (auth), (tabs) client, (trainer),
                    booking/, session/, trainer/, trainer-session/, misc
src/components/     ui kit (Txt, Card, Button, Chip, Badge, Skeleton,
                    EmptyState, InputSheet…), TrainerCard, TrackMap, video modal
src/context/        auth (session+profile), booking draft, accessibility
src/lib/            api, bookings, chat, realtime, favorites, progress, retention,
                    gamification, subscriptions, storage, payments, push,
                    integrations, confirm, config, supabase
src/data/seed.ts    demo-mode data (6 trainers, Riyadh, SAR)
src/theme/          design tokens extracted from the original HTML design
supabase/migrations 0001 schema+RLS · 0002 seed · 0003 security hardening ·
                    0004 push token · 0005 socials/PRs/goal · 0006 RLS
                    INSERT..RETURNING fix · 0007 storage buckets + policies
supabase/functions  the three edge functions (also deployed live)
scripts/            e2e-run.js (headless-Chrome full-journey test),
                    build-report.js, generate-icons.js
design/FitConnect.html   the original approved design (source of truth for UI)
docs/               PROJECT_PLAN.md (phased status), SETUP.md (owner runbook)
```

## 3. What is verified working (not just claimed)

An automated headless-Chrome user ran the full journey against the **production**
backend (2026-07-17): signup → onboarding → browse → book → pay(sim) → track →
rate → log weight/PR/goal → socials → become trainer → trainer flows. SQL checks
confirmed: booking row (correct price SAR 1386, correct Riyadh time, paid flag),
progress rows, socials JSON, trainer row + auto-created plans. Bugs found by that
run were fixed (signup redirect race; bookings RLS failure on INSERT..RETURNING
via STABLE helper — see migration 0006; RN-web Alert callbacks never firing —
replaced with `lib/confirm.ts`; native date picker dead on web — replaced with a
date strip).

## 4. Known gaps and deliberate exceptions (be critical, but these are known)

1. **Payments simulated** until owner gets a CR → Moyasar keys. Code path ready.
2. **Dev-build-gated:** live GPS map, remote push, Apple Health, Apple Pay,
   Apple/Google native Sign-In — require an EAS dev build the owner has deferred
   (no $99 Apple account yet). Code for maps/push/location exists and is
   verified compiling; Expo Go shows a map placeholder.
3. **Localization is complete for the operational MVP:** the persisted
   English/Arabic preference, real web RTL, native-safe shared controls, client
   acquisition and booking, account utilities, trainer operations, live-session
   tracking/chat, and post-session celebration are localized. User-generated
   content and Supabase error text remain in their source language. Light theme
   remains intentionally absent.
4. **Availability is intentionally fixed-slot for the MVP:** trainers publish
   one-hour openings from six daily time options in a paged calendar; clients
   consume the same persisted slots. Recurrence, blackout rules, buffers, custom
   durations, and external-calendar conflict detection are not built yet.
5. **Membership counters:** `sessions_used` is not auto-incremented on completed
   sessions yet; loyalty_weeks not computed server-side.
6. **Reviews aggregate:** trainer `rating`/`review_count` are not recomputed
   from new reviews (seeded values persist).
7. **Supabase advisors:** two low-severity SECURITY DEFINER warnings remain on
   RLS helper functions (documented in migration 0003 header); leaked-password
   protection toggle not enabled by owner yet.
8. **No tests beyond the e2e script**; no CI. TypeScript strict + tsc is the gate.
9. **Trainer "Payouts" and client "Add payment method"** are honest
   notify-stubs pending Moyasar live.
10. Demo trainers use pravatar placeholder portraits (no real photos/videos).
11. Challenge seasons are operator-seeded rather than generated by a scheduled
    lifecycle job. Coach prompts refresh when Home opens; remote push for these
    prompts is not enabled in the web-only milestone.
12. Private coaching notes may still contain sensitive data if trainers type it.
    The UI warns against diagnoses; production launch also needs a formal privacy
    notice, retention/deletion policy, operator moderation process for aliases,
    and a data-subject request workflow.

## 5. Environment / how to run

- `npm install && npm start` → Expo Go (demo mode without `.env`).
- Web: `npx expo export --platform web` → `dist/` (SPA; `netlify.toml` carries
  publishable env for CI builds).
- `.env` (gitignored) holds `EXPO_PUBLIC_SUPABASE_URL` + anon key. The anon key
  is publishable-by-design (it ships in every client bundle); real secrets live
  only in Supabase function secrets. **A reviewer does not need any credentials:
  demo mode covers the full UX, and the live web demo is linked below.**
- E2E: `node scripts/e2e-run.js partA <url> <shotsDir> <email> <pw>` (needs
  local Chrome; creates a throwaway user — use only against a dev project).

## 6. Links

- Live web demo: https://magical-yeot-41384a.netlify.app
- Repo: https://github.com/theKman77/fitconnect
- Feasibility report (screens, monetization research, disintermediation
  strategy): shared separately by the owner as a web page.

## 7. What the owner wants from your critique

Ranked by usefulness:
1. **Security review** — RLS policies (0001/0003/0006/0007), edge functions,
   storage policies, anything exploitable between the two roles.
2. **Visual design & looks** — walk the live demo screen by screen: hierarchy,
   spacing, typography, color use, consistency with the original design
   (`design/FitConnect.html`), polish level vs. real production apps
   (Uber/Calm/ClassPass tier). Call out anything that looks amateur, cramped,
   inconsistent, or template-y — and what it should look like instead.
3. **Functionality** — actually operate the app (live demo or `npm start`):
   press every control, run the booking flow end to end, try edge inputs, break
   things. Report anything that is dead, wrong, confusing, or silently failing.
4. **Architecture** — the dual demo/live pattern, lib-layer boundaries, state
   management choices (contexts vs alternatives), realtime usage, and what will
   hurt first at 10k users.
5. **Product/UX** — booking funnel friction, trainer-side depth, gamification
   coherence, KSA-market fit (RTL/Arabic absence, gender preferences, prayer
   times), retention mechanics.
6. **Business logic correctness** — pricing math (`context/booking.tsx`,
   `lib/gamification.ts` fee ladder), subscription lifecycle, streak/XP rules.
7. **Code quality** — duplication, dead paths, error handling consistency,
   anything the fast pace left behind.

### Required output format (per finding)
- **Severity:** blocker / should-fix / nice-to-have
- **Where:** exact screen and/or file (line-level when possible)
- **What's wrong:** the concrete failure or design weakness
- **What should change:** the specific recommended change, not just the complaint
- **Agent action:** concrete instructions the owner's AI coding agent (Claude,
  full codebase + Supabase + deploy access) can execute — or state clearly if it
  needs an owner-only step (accounts, money, legal) or a dev build.

Finish with a prioritized top-10 change list the agent should implement first.
The owner will hand your findings back to that agent for implementation.
