# FitConnect Supabase runbook

Project ref: `nglvwjspifjkzktjbkeb`
Market: Saudi Arabia (`Asia/Riyadh`, SAR)

## Source of truth

All database and storage changes live in `supabase/migrations`. Never repair production only through the dashboard: create a migration, apply it, and keep the file in Git. Edge Functions live in `supabase/functions` and must keep their JWT/secret checks when redeployed.

The current security sequence after the original numbered migrations is:

- `20260718201116_security_foundation.sql`
- `20260718202037_payment_integrity.sql`
- `20260718203452_trainer_value_engine.sql`
- `20260718204056_trainer_onboarding_submit.sql`
- `20260718204646_availability_booking_enforcement.sql`
- `20260718205905_advisor_hardening.sql`
- `20260718210000_restore_guarded_rpc_privileges.sql`
- `20260718211046_restore_showcase_trainers.sql`

These are already applied to the connected production project.

## Security invariants

- `profiles` are private to their owner. Booking participants see only the counterpart name/avatar through `get_booking_counterpart`.
- Only approved trainers are public. Trainers cannot edit verification, approval, rating, review count, or profile ownership.
- Clients insert booking intent only. A trigger validates plan, trainer, future time, address, schedule and conflicts; calculates all money fields; and resets paid/status/provider fields.
- Booking status moves through guarded RPCs. Only the assigned trainer advances a session; only the booking client cancels before travel starts.
- Reviews require a completed booking and the correct participant/ratee pair.
- Avatar/video uploads are public portfolio media in an owner folder. Progress images are private and owner-readable only.
- Payment and notification event tables are service-role-only. Their lack of client policies is intentional.

The public SECURITY DEFINER RPC warnings from the Supabase advisor are expected for guarded multi-table workflows. Each uses `auth.uid()`, strict ownership/transition checks, and an empty `search_path`. Do not bypass their validation merely to silence a heuristic warning.

## Payments

`private.marketplace_config.payments_enabled` and `EXPO_PUBLIC_PAYMENTS_ENABLED` remain false until Moyasar approves the business. In this state bookings are real database reservations but `payment_status=simulation`, `paid=false`, no cash payout is shown, and no card is collected.

Activation requires the owner to obtain a CR/provider account, configure Moyasar function secrets and webhook, test exact amount/currency/idempotency behavior, then enable backend and client flags together.

## Owner-only dashboard actions

- Enable Auth leaked-password protection: Supabase Dashboard → Authentication → Security. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Configure Google provider Client ID/secret and allow `https://magical-yeot-41384a.netlify.app` plus `https://magical-yeot-41384a.netlify.app/reset-password`.
- Review submitted trainers manually until an admin console exists. Only an operator/service-role action should set `onboarding_status='approved'` and `verified=true` after identity/credential checks.

## Routine release checks

1. Apply new migrations and deploy changed Edge Functions.
2. Run Supabase security and performance advisors.
3. Run `npx tsc --noEmit` and `npm run export:web`.
4. Run `node scripts/smoke-web.js http://127.0.0.1:4173`.
5. Push the verified commit; Netlify builds from GitHub.
