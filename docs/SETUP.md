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

Market is **Saudi Arabia**, so payments run on **Moyasar** (mada, Apple Pay,
cards). The checkout code + two backend functions are already written; you just
create the account, deploy the functions, and flip a switch.

**a. Get a Moyasar test key**
1. Sign up at https://moyasar.com (test mode needs no CR/business docs).
2. In the dashboard, switch to **Test mode** and copy your **secret key** (`sk_test_...`).

**b. Deploy the two Edge Functions** (needs the free Supabase CLI once)
```bash
npm install -g supabase
supabase login                       # opens browser
supabase link --project-ref <your-project-ref>   # from your Supabase URL
supabase secrets set MOYASAR_SECRET_KEY=sk_test_xxxxx
supabase secrets set MOYASAR_WEBHOOK_SECRET=any-long-random-string
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy moyasar-webhook --no-verify-jwt
```

**c. Point Moyasar at the webhook**
In the Moyasar dashboard → Webhooks, add:
- URL: `https://<your-project-ref>.functions.supabase.co/moyasar-webhook`
- Secret token: the same `MOYASAR_WEBHOOK_SECRET` you set above
- Event: `payment_paid`

**d. Turn it on in the app**
Add to `.env`, then restart `npm start`:
```
EXPO_PUBLIC_PAYMENTS_ENABLED=true
```
Now checkout opens the real Moyasar page. Use a test card (Moyasar docs list
them, e.g. Visa `4111 1111 1111 1111`, any future expiry/CVC). Until you set this
flag, payment is simulated (no charge).

> Going **live** with real money later requires Moyasar's business verification
> (CR number, bank IBAN) — a step only you can do.

---

## 3b. Google sign-in (the "Client ID" Supabase asks for)

Supabase needs a Google OAuth Client ID before the Google provider can be
enabled. One-time, ~5 minutes, free:

1. Go to https://console.cloud.google.com → sign in with your Google account.
2. Top bar → project dropdown → **New project** → name it `fitconnect` → Create.
3. Menu → **APIs & Services → OAuth consent screen** → External → fill in the
   app name (FitConnect) and your email → Save through the steps (no scopes needed).
4. **APIs & Services → Credentials → + Create credentials → OAuth client ID**
   → Application type: **Web application**.
5. Under **Authorized redirect URIs**, add EXACTLY:
   `https://nglvwjspifjkzktjbkeb.supabase.co/auth/v1/callback`
   Under **Authorized JavaScript origins**, add:
   `https://magical-yeot-41384a.netlify.app`
6. Create → copy the **Client ID** (ends in `.apps.googleusercontent.com`) and
   the **Client secret**.
7. In Supabase → Authentication → Providers → Google: paste the Client ID into
   the "Client IDs" box and the secret into "Client Secret", then Save.

Also set the app's redirect: Supabase → Authentication → URL Configuration →
Site URL = `https://magical-yeot-41384a.netlify.app`.

## 4. Auto-deploy the web demo (GitHub → Netlify)

So your web link updates itself whenever the app changes:

1. **Put the code on GitHub** (one time). Create an empty repo at
   github.com/new (e.g. `fitconnect`), then in `D:\Fitconnect`:
   ```bash
   git remote add origin https://github.com/<you>/fitconnect.git
   git push -u origin main
   ```
   (`.env` is gitignored, so your keys are NOT uploaded.)
2. **Connect Netlify.** At app.netlify.com → **Add new site → Import an existing
   project → GitHub** → pick the repo. Netlify reads `netlify.toml` for the build
   settings automatically.
3. **Add env vars** in Netlify → Site settings → Environment variables:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (and
   `EXPO_PUBLIC_CURRENCY=SAR`). Deploy.

From then on, every `git push` auto-builds and updates your live link.

---

## 5. Native features that need a "dev build" (maps + push)

Live map tracking and push notifications use native code that Expo Go can't
load. To enable them we build a free custom **dev client** with EAS:
```bash
npm install -g eas-cli
eas login                    # free Expo account
eas build:configure
eas build --profile development --platform ios   # or android
```
Install the resulting build on your phone (link/QR from EAS). From then you run
`npx expo start --dev-client` instead of plain Expo Go. Everything else —
booking, payments, chat, ratings, trainer side — works in Expo Go today.

---

## Market / currency

**Decided: Saudi Arabia.** SAR is the app default (demo data is Riyadh-based).
No `.env` changes needed unless the market ever changes.
