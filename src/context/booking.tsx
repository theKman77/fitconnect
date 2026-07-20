import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from 'react';
import { config } from '@/lib/config';
import type { SessionFormat, SessionType, Trainer } from '@/types/domain';

export interface BookingDraft {
  trainer?: Trainer;
  /** The trainer's offerings, loaded when the flow starts (works in live + demo). */
  plans: SessionType[];
  sessionType?: SessionType;
  format: SessionFormat;
  isSplit: boolean;
  friendEmail: string;
  equipmentByTrainer: boolean;
  equipmentItems: string[];
  addressLine: string;
  city: string;
  scheduledAt?: Date;
  isPeak: boolean;
}

export interface PriceBreakdown {
  base: number;
  equipmentFee: number;
  peakSurge: number;
  serviceFee: number;
  total: number;
  amountDue: number; // client's share (half when split)
}

interface BookingValue {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  start: (trainer: Trainer, plans: SessionType[], sessionType?: SessionType, prefill?: Partial<BookingDraft>) => void;
  reset: () => void;
  price: PriceBreakdown;
}

const initial: BookingDraft = {
  plans: [],
  format: 'in_person',
  isSplit: false,
  friendEmail: '',
  equipmentByTrainer: false,
  equipmentItems: [],
  addressLine: 'Al Olaya St 128, Apt 4B',
  city: 'Riyadh 12213',
  isPeak: false,
};

const BookingContext = createContext<BookingValue | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(initial);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const start = useCallback((trainer: Trainer, plans: SessionType[], sessionType?: SessionType, prefill: Partial<BookingDraft> = {}) => {
    setDraft({ ...initial, ...prefill, trainer, plans, sessionType });
  }, []);

  const reset = useCallback(() => setDraft(initial), []);

  const price = useMemo<PriceBreakdown>(() => {
    const base = draft.sessionType?.price ?? draft.trainer?.base_price ?? 0;
    const equipmentFee = draft.equipmentByTrainer ? config.equipmentDeliveryFee : 0;
    const peakSurge = draft.isPeak ? Math.round(base * config.peakSurgeRate) : 0;
    const subtotal = base + equipmentFee + peakSurge;
    const serviceFee = Math.round(subtotal * config.serviceFeeRate);
    const total = subtotal + serviceFee;
    const amountDue = draft.isSplit ? Math.round((total / 2) * 100) / 100 : total;
    return { base, equipmentFee, peakSurge, serviceFee, total, amountDue };
  }, [draft]);

  const value = useMemo(
    () => ({ draft, update, start, reset, price }),
    [draft, update, start, reset, price],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
