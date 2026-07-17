# FitConnect — Setup & Run Guide

This app runs in two modes:

- **Demo mode (default, zero setup):** sample trainers, simulated payments,
  everything explorable. Great for showing people the app right now.
- **Live mode:** real accounts, real database, real (test-mode) Stripe payments.
  Turned on by adding keys to a `.env` file — no code changes.

---

## 1. Run the app right now (demo mode)

You need the free **Expo Go** app on your phone (App Store / Play Store).

```bash
cd D:\Fitconnect
npm start
```

A QR code appears in the terminal. Scan it with your phone's camera (iPhone) or
the Expo Go app (Android). The app opens on your phone. That's it — you're
running FitConnect.

> Tip: press `w` in the terminal to also open it in a web browser for a quick look.

---

## 2. Turn on the real backend (Supabase)

**a. Create the project (2 min, free)**
1. Go to https://supabase.com and sign up.
2. Click **New project**. Pick a name and a strong database password (save it).
3. Choose the region closest to your users.

**b. Create the database**
1. In your project, open **SQL Editor** (left sidebar).
2. Open the file `supabase/migrations/0001_init.sql` from this project, copy all
   of it, paste into the SQL editor, and click **Run**. This creates every table
   and security rule.
3. Do the same with `supabase/migrations/0002_seed.sql` — this loads the 6
   showcase trainers (plans, reviews) into your live database.

**b2. Make sign-up instant (recommended for now)**
By default Supabase asks new users to confirm their email before the first
sign-in. For faster testing: **Authentication -> Sign In / Providers -> Email ->
turn OFF "Confirm email"**. (Turn it back on before real users.)

**c. Get your keys**
1. Open **Project Settings -> API**.
2. Copy the **Project URL** and the **anon public** key.

**d. Add them to the app**
1. In `D:\Fitconnect`, copy `.env.example` to a new file named `.env`.
2. Paste your values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Stop the app (Ctrl+C) and run `npm start` again.

The app now uses real accounts and a real database. Sign up creates your profile
automatically.

---

## 3. Turn on payments (Moyasar — test mode)

Market is **Saudi Arabia**, so payments run on **Moyasar** (Saudi payment
gateway: mada, Apple Pay, Visa/Mastercard). Stripe doesn't onboard KSA-based
businesses, which is why we don't use it.

1. Sign up at https://moyasar.com (test mode needs no CR/business docs).
2. In the dashboard, copy your **test secret key** (`sk_test_...`).
3. When we reach the payments milestone, that key goes into a Supabase Edge
   Function secret — I'll wire the checkout call; you only paste the key.
4. Test cards are listed in Moyasar's docs (e.g. mada/Visa test numbers).

> Going **live** with real money requires Moyasar's business verification
> (CR number, bank IBAN) — a step only you can do.

---

## 4. Native features that need a "dev build" (later)

Live map tracking uses a native module that Expo Go can't load. When you're
ready, we build a custom **dev client** (free, via EAS Build) to enable the live
map. Everything else — booking, payments, chat, ratings — works in Expo Go today.

---

## Market / currency

**Decided: Saudi Arabia.** SAR is the app default (demo data is Riyadh-based).
No `.env` changes needed unless the market ever changes.
