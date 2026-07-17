# FitConnect

An on-demand marketplace app that connects clients with personal trainers —
browse, book, pay, train, and rate. Built with Expo (React Native) and Supabase.

## Quick start

```bash
npm install      # first time only
npm start        # then scan the QR code with Expo Go on your phone
```

Runs in **demo mode** out of the box (sample data, simulated payments). To
connect a real backend and payments, see **[docs/SETUP.md](docs/SETUP.md)**.

## What's inside

- **App:** Expo SDK 57, React Native, TypeScript, expo-router (`src/app`)
- **Design system:** `src/theme` — tokens from the approved design
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage) — schema in
  `supabase/migrations/0001_init.sql`
- **Payments:** Stripe Checkout (test mode) via `src/lib/payments.ts`

## Project layout

| Path | What it is |
|------|------------|
| `src/app` | Screens & navigation (file-based routes) |
| `src/components` | Reusable UI (cards, buttons, chips…) |
| `src/context` | Auth + booking-draft state |
| `src/lib` | Supabase client, data access, payments, config |
| `src/data` | Seed/demo data |
| `src/theme` | Colors, fonts, spacing |
| `supabase/` | Database migrations & (soon) edge functions |
| `docs/` | Setup guide & build plan |
| `design/` | The original approved design file |

## Build progress

See **[docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)** for the phased roadmap and
what's done vs. next.
