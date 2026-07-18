# Changelog

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
