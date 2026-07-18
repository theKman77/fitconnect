/**
 * Payments. In demo mode this resolves immediately (no charge). When the
 * backend + payment provider (Moyasar — KSA market) are configured, it asks a
 * Supabase Edge Function to create a hosted checkout and opens it in the
 * browser (Expo Go compatible — no native payment SDK required).
 */
import * as WebBrowser from 'expo-web-browser';
import { supabase, isBackendConfigured } from './supabase';
import { config } from './config';

export interface CheckoutResult {
  ok: boolean;
  simulated?: boolean;
  cancelled?: boolean;
  error?: string;
}

export async function payForBooking(bookingId: string): Promise<CheckoutResult> {
  if (!isBackendConfigured || !config.paymentsEnabled) {
    // Honest demo checkout: the booking is stored, but no money is collected.
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, simulated: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { bookingId },
    });
    if (error) return { ok: false, error: error.message };

    const url = (data as { url?: string })?.url;
    if (!url) return { ok: false, error: 'No checkout URL returned' };

    const result = await WebBrowser.openAuthSessionAsync(url, 'fitconnect://booking/confirmation');
    if (result.type === 'success') return { ok: true };
    return { ok: false, cancelled: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Payment failed' };
  }
}
