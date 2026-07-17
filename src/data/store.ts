/**
 * In-memory store used in demo mode (no backend). Holds bookings and chat
 * messages for the current app session so the booking -> tracking -> rating
 * flow works end to end. Cleared on reload. Backed by Postgres in real mode.
 */
import type { Booking, Message } from '@/types/domain';

export const demoBookings = new Map<string, Booking>();
export const demoMessages = new Map<string, Message[]>();

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
