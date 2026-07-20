# Changelog

## 2026-07-20 — Demand Engine, repeat booking, and brand exports

- Added one-tap repeat booking that preserves the previous plan, format, equipment, and location, then selects the next real opening or offers a private waitlist.
- Added bilingual Pulse Drops for real trainer openings in the next 72 hours, with clear expiry, protected-booking handoff, and logged-out showcase inventory.
- Added private trainer waitlists with day, daypart, format, and plan preferences. Trainers receive only aggregate demand and match counts—not client names, contact details, or lead lists.
- Added trainer-side slot broadcasting and closing, automatic private matching, claimed-slot cleanup, and demand summaries.
- Added RLS-protected demand tables and guarded RPCs, transaction-tested cross-client and cross-trainer isolation, an indexed session-plan relationship, and consolidated broadcast visibility policy.
- Exported production-size brand assets: a 4096px transparent mark and a 4096px dark lockup.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export and bilingual browser walkthrough cover the new demand surfaces.

## 2026-07-20 — Retention Studio and Momentum Circles

### Trainer-owned relationship value

- Added a private Retention Studio that turns completed bookings into a usable client relationship workspace: attention signals, goals, private coaching notes, tags, follow-up dates, relationship status, repeat-client economics, and suggested next actions.
- Added targeted coach prompts for rebooking, check-ins, and celebrations. Prompts are persisted for real accounts and surface in the client Home feed; the logged-out showcase remains fully interactive without writing fake records to production.
- Kept private notes trainer-only with booking-relationship checks at both the database and UI layers. The product explicitly discourages diagnoses and unnecessary sensitive data.

### Privacy-first social motivation

- Added bilingual Momentum Circles and personal missions driven only by verified completed FitConnect sessions.
- Added opt-in aliases, private membership records, member-only standings, XP rewards, progress bars, and challenge completion updates from server-side booking transitions.
- Deliberately excluded public weight/calorie rankings, progress photos, locations, failure states, and open group chat.

### Backend and verification

- Added RLS-protected `trainer_client_records`, `coach_nudges`, `challenges`, and `challenge_memberships`, plus guarded join/respond/leaderboard functions and performance indexes.
- Applied and transaction-tested both positive and negative role boundaries in the connected Supabase project.
- Expanded the bilingual browser walkthrough to cover Momentum Circles and the Arabic Retention Studio.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized bilingual browser walkthrough passes 20 routes/states with no serious browser errors.

## 2026-07-19 — Complete Arabic operational journey

- Localized the realtime client session screen, including trainer arrival states, safety guidance, protected chat, Saudi emergency calling, location-sharing readiness, and post-session rating access.
- Localized and mirrored the animated session celebration, weekly mission, XP metrics, trainer rating tags, progress-photo controls, coach note, and accessibility labels.
- Added Arabic number presentation and directional behavior without changing the stable database values used for statuses, ratings, and review tags.
- Expanded the browser walkthrough with a dedicated Arabic post-session celebration check and screenshot.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized bilingual browser walkthrough passes with no serious browser errors.

## 2026-07-19 — Arabic account and trainer operations

- Localized the client Account area, profile editor, favorites, session history, memberships, payment readiness, integrations, referrals, booking confirmation, and password recovery.
- Localized the trainer Business Hub, bookings, messages, account/application controls, availability and payout links, trainer offer editor, video upload, booking status management, and client chat.
- Added a centralized Arabic phrase catalog for operational screens, RTL row/input behavior, Arabic dates and counts, and localized share/calendar content while retaining stable backend values.
- Expanded the browser walkthrough with Arabic Account and Integrations checks.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized bilingual browser walkthrough passes with no serious browser errors.

## 2026-07-19 — Arabic client journey

### Bilingual marketplace experience

- Localized account creation, Google sign-in, password recovery, and the full three-step onboarding quiz with mirrored RTL controls and Arabic validation.
- Localized Home, Discover, Progress, trainer cards, trainer profiles, availability, and the complete four-step client booking and review flow.
- Added Arabic presentation for demo trainer biographies, specialties, plans, equipment, dates, times, counts, and validation while preserving stable English database values.
- Prevented logged-out Progress previews from sending demo identifiers to live UUID-backed Supabase tables.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized browser flow passes English and Arabic welcome, scheduling, Progress, Discover, sign-up, and onboarding states with no serious browser errors.

## 2026-07-19 — Arabic/RTL foundation

### Saudi-market localization

- Added a persisted English/Arabic language preference with a switch on the welcome and account screens.
- Added genuine RTL document direction on web, native-safe RTL handling for shared scheduling controls, Arabic system-font fallback, mirrored directional arrows, and a protected left-to-right Latin wordmark.
- Localized the welcome experience, client/trainer tab labels, trainer availability workspace, calendar controls, opening states, and Saudi Arabic date/time presentation.
- Expanded the browser harness to activate Arabic, prove the document direction is RTL, and capture both the Arabic welcome and scheduling screens.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized browser flow passes twelve states/routes, including Arabic welcome and Arabic scheduling, with all six showcase trainers when production data is reachable.

## 2026-07-19 — Scheduling clarity

### Date and time selection

- Replaced the narrow horizontal date strip with a shared, paged two-week calendar grid in both client booking and trainer availability.
- Added opening counts, unavailable-day states, an explicit selected date, 8-to-12-week navigation, and accessible labels for every date.
- Replaced the six undifferentiated time buttons with roomy morning, afternoon, and evening groups that show available, unavailable, popular, selected, and saving states.
- Reworked the trainer dashboard's compressed seven-day row into a two-column agenda with session counts, first-session times, and direct schedule actions.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized browser flow passes ten routes, including the new calendar and all three time periods, with no serious console errors.

## 2026-07-19 — Trainer Business Hub and session payoff

### Trainer retention value

- Rebuilt the trainer Today tab as a responsive Business Hub centered on the next action, current availability, revenue readiness, schedule coverage, repeat-client rate, and client follow-up.
- Made FitConnect's anti-poaching value explicit and functional: progressive trainer tiers, repeat-client fee decay, persistent client/session history, rebooking paths, profile strength, schedule publishing, and payment/discovery protection.
- Resolved client identities through the participant-protected booking counterpart function instead of exposing profile rows, while limiting dashboard lookups to recent client relationships.
- Upgraded trainer navigation and added direct access to the Integrations Hub from the trainer account.

### Client engagement

- Rebuilt the completed-session rating screen into an animated celebration with accurate session duration, +50 XP, weekly streak, weekly mission progress, progress-photo capture, trainer feedback, and a direct handoff into Progress.
- Added a reduced-motion fallback so the celebration resolves instantly when the device accessibility preference requests it.
- Expanded the browser harness to verify and capture the new celebration state without creating fake database records.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized browser flow now passes nine public routes, including the post-session celebration, with no serious console errors.

## 2026-07-19 — Handoff identity and marketplace experience

### Brand and visual system

- Replaced the interlocking-link symbol with **The Handoff**: two precisely fitted parts completing one forward-moving form, with no heart, chain-link, dating, medical, or generic fitness symbolism.
- Regenerated the app icon, adaptive Android artwork, monochrome notification mark, splash artwork, favicon, and in-app brand mark from one deterministic vector source.
- Kept the black and orange equity while giving the brand a quieter, more authored silhouette that remains legible at favicon size.

### Core marketplace screens

- Rebuilt Discover around goals and trainer fit, with Saudi-relevant language filters, collapsed advanced filters, live availability, location context, and visible vetting.
- Rebuilt the trainer profile around coach proof: photo-led identity, verified/available states, rating/experience/location metrics, video and social presence, platform protection, clearer plans, real openings, and verified-session reviews.
- Refined booking with persistent trainer context, a segmented progress track, clearer blocked-step guidance, and an always-visible price/checkout summary.
- Added a profile-shaped loading skeleton and expanded browser screenshot coverage for welcome, discovery, and trainer detail.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The automated phone-sized browser smoke test passes eight critical routes with no serious console errors.

## 2026-07-19 — FitConnect 2.0 visual identity and integrations

### Brand and experience

- Replaced the generic dumbbell with a distinctive interlocking-link mark across the app icon, splash screen, favicon, and in-app wordmark.
- Rebuilt the dark theme with graphite depth, warmer orange gradients, quieter borders, larger typography, softer cards, and clearer hierarchy.
- Redesigned the welcome experience for phone and desktop, including a branded momentum visual and above-the-fold conversion actions.
- Redesigned the client home into a responsive marketplace dashboard with quick actions, one-tap rebooking, curated coaches, and a bounded desktop layout.
- Simplified trainer cards and rebuilt the account/navigation surfaces to feel less dense and template-like.
- Upgraded Progress with a weekly mission, live completion state, XP reward, and clearer momentum framing.

### Integrations

- Added a dedicated Integrations Hub that distinguishes working web integrations, owner-setup integrations, and mobile-build integrations.
- Surfaced WhatsApp, Calendar, social profiles, Google sign-in, Moyasar/mada/Apple Pay, Apple Health/Health Connect, live location, push, and Sign in with Apple with honest readiness states.

### Verification

- `npx tsc --noEmit` passes.
- Expo SDK 54 web export passes.
- The phone-sized browser smoke test passes eight critical routes, including the new Integrations Hub.

## 2026-07-18 — Post-audit production-hardening milestone

### Security and backend

- Replaced permissive profile, booking, review, location, subscription, and storage access with participant/owner-scoped RLS.
- Moved booking pricing and payout math to protected database logic. Clients can no longer submit prices, paid state, ratings, verification, or lifecycle status directly.
- Added idempotent payment and notification event ledgers and hardened all three Edge Functions. Checkout loads the price from Postgres; the Moyasar webhook verifies secret, currency, amount, invoice, and event identity.
- Added honest payment states. With payments disabled, reservations are stored as `simulation`, `paid=false`, and never appear as cash earnings.
- Made trainer fee tiers and repeat-client discounts real in Postgres, with immutable per-booking commission and payout snapshots.
- Added atomic trainer onboarding, application submission, approval gating, and protected trust fields.
- Added real trainer availability slots, client consumption of those slots, and database enforcement/release on cancellation.
- Restored all six fixed showcase trainers while leaving two visibly unverified.

### Product and UX

- Added a trainer scheduling workspace, application state, payout clarity, and reliable status/error handling.
- Removed fake Visa details, fake successful payments, fake safety sharing, fake subscriptions, invented availability, and unsupported group checkout.
- Added password recovery, upload validation, private progress-photo paths, profile/social synchronization, and errors for failed profile/progress/chat writes.
- Ratings unlock only after a trainer completes the session; clients can no longer end sessions themselves.
- Added consistent empty/error states across onboarding, home, discovery, favorites, history, membership, progress, bookings, and trainer screens.
- Reduced exported font assets by importing only the seven fonts in use.

### Verification

- `npx tsc --noEmit` passes.
- `npx expo export --platform web` passes on Expo SDK 54.
- `node scripts/smoke-web.js http://127.0.0.1:4173` passes seven public routes and verifies all six showcase trainers and absence of fake card data.
- A rollback-only SQL test proved hostile client-supplied price/paid/status values are replaced by server-authoritative values.
