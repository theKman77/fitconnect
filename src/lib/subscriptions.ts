/**
 * Memberships/subscriptions. Live mode persists to the `subscriptions` table —
 * booking a subscription-kind plan creates one; membership screen manages it.
 * Demo mode returns the showcase membership.
 */
import dayjs from 'dayjs';
import { supabase, isBackendConfigured } from './supabase';
import type { Subscription, SubscriptionStatus } from '@/types/domain';

const demoSub: Subscription = {
  id: 'demo-sub', client_id: 'demo-client', trainer_id: 't-maya', session_type_id: null,
  status: 'active', plan_name: 'Pro plan', price: 1512, sessions_included: 8,
  sessions_used: 5, loyalty_weeks: 5, stripe_subscription_id: null,
  current_period_end: dayjs().add(17, 'day').toISOString(),
  created_at: '2026-05-01', updated_at: '2026-07-01',
};
let demoState: Subscription | null = { ...demoSub };

export async function getMySubscription(clientId: string): Promise<Subscription | null> {
  if (!isBackendConfigured) return demoState;
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

export async function createSubscription(
  clientId: string,
  trainerId: string,
  sessionTypeId: string | null,
  planName: string,
  price: number,
  sessionsIncluded: number,
): Promise<void> {
  if (!isBackendConfigured) return;
  await supabase.from('subscriptions').insert({
    client_id: clientId,
    trainer_id: trainerId,
    session_type_id: sessionTypeId,
    status: 'active',
    plan_name: planName,
    price,
    sessions_included: sessionsIncluded,
    sessions_used: 0,
    current_period_end: dayjs().add(1, 'month').toISOString(),
  });
}

export async function setSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void> {
  if (!isBackendConfigured) {
    if (demoState) demoState = status === 'cancelled' ? null : { ...demoState, status };
    return;
  }
  await supabase.from('subscriptions').update({ status }).eq('id', id);
}
