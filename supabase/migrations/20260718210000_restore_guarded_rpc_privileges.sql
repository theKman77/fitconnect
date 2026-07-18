-- These RPCs intentionally use definer privileges because their multi-table
-- transactions cross private helper functions and RLS boundaries. Both derive
-- identity from auth.uid(), operate only on that account, validate transitions,
-- use an empty search_path, and expose no caller-controlled trust fields.
alter function public.become_trainer() security definer;
alter function public.submit_trainer_application() security definer;
