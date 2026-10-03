// Links that open outside the app (maps, calendar) and the LIFF deep links we share.

/** Deep link that opens a LIFF page inside LINE, e.g. liffUrl('/events/abc'). */
export function liffUrl(path = '/'): string {
  const base = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID ?? ''}`;
  return path === '/' ? base : `${base}${path}`;
}

/** Google Maps search for a venue name — opens the Maps app on phones. */
export function googleMapsUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

/** YYYYMMDDTHHMMSSZ in UTC, the format Google Calendar templates expect. */
function calendarStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * "Add to Google Calendar" link. Used instead of an .ics download because the LINE
 * WebView blocks file downloads. Events have no end time, so assume a 3-hour party.
 */
export function googleCalendarUrl(e: {
  name: string;
  venue: string;
  start: Date;
  details?: string;
  durationHours?: number;
}): string {
  const end = new Date(e.start.getTime() + (e.durationHours ?? 3) * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.name,
    dates: `${calendarStamp(e.start)}/${calendarStamp(end)}`,
    location: e.venue,
    details: e.details ?? '',
    ctz: 'Asia/Bangkok',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
