/**
 * Lightweight integrations that work on every platform today:
 * - WhatsApp share deep links (the KSA-native referral channel)
 * - Add-to-calendar links (Google Calendar template URL + ICS fallback)
 * Native Apple Health / Apple Pay / Apple Sign-In are dev-build features and
 * live in the roadmap until the EAS build exists.
 */
import { Linking, Platform } from 'react-native';
import dayjs from 'dayjs';

/** Open WhatsApp with a prefilled message (wa.me works on web + phones). */
export function shareOnWhatsApp(text: string): Promise<void> {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return Linking.openURL(url).then(() => undefined);
}

interface CalendarEvent {
  title: string;
  details: string;
  location?: string;
  start: Date;
  durationMin: number;
}

/** Google Calendar "add event" template URL — no permissions needed anywhere. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const start = dayjs(e.start);
  const end = start.add(e.durationMin, 'minute');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    details: e.details,
    location: e.location ?? '',
    dates: `${start.format('YYYYMMDDTHHmmss')}/${end.format('YYYYMMDDTHHmmss')}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Open the platform-appropriate add-to-calendar flow for a session. */
export async function addSessionToCalendar(e: CalendarEvent): Promise<void> {
  // The Google Calendar template link works on web, iOS and Android browsers
  // and requires no runtime permissions — the most reliable cross-platform path.
  await Linking.openURL(googleCalendarUrl(e));
}

export function isWhatsAppLikely(): boolean {
  // wa.me routes correctly everywhere; on desktop web it opens WhatsApp Web.
  return true;
}
