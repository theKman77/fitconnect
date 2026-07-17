/**
 * App-wide configuration. Values read from environment (Expo public env vars)
 * with safe fallbacks so the app boots even before the backend is wired up.
 */

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  /**
   * Currency for display + payments. Market is Saudi Arabia -> SAR by default;
   * override via EXPO_PUBLIC_CURRENCY / EXPO_PUBLIC_CURRENCY_SYMBOL.
   */
  currency: process.env.EXPO_PUBLIC_CURRENCY ?? 'SAR',
  currencySymbol: process.env.EXPO_PUBLIC_CURRENCY_SYMBOL ?? 'SAR ',

  /**
   * Real checkout (Moyasar via Edge Function) switches on only when this is
   * set; until then payment is simulated even with a live backend.
   */
  paymentsEnabled: process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === 'true',

  /** Marketplace commission taken from each booking (fraction). */
  serviceFeeRate: 0.1,
  /** Peak surcharge applied to peak time slots (fraction). */
  peakSurgeRate: 0.2,
  /** Flat fee when the trainer brings equipment (in app currency). */
  equipmentDeliveryFee: 45,
};

/** True once Supabase credentials are present. */
export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

/** Format a numeric amount as a currency string, e.g. 45 -> "$45". */
export function formatMoney(amount: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? !Number.isInteger(amount);
  const value = decimals ? amount.toFixed(2) : String(Math.round(amount));
  return `${config.currencySymbol}${value}`;
}
