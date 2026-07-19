# Changelog

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
