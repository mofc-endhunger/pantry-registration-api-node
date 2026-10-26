/**
 * Formatting for the reservation confirmation email's dynamic template data.
 *
 * Dates and times mirror freshtrak-public-client's confirmation page, so the
 * email and the screen the user just saw read the same:
 *   date  "Wed, Oct 28, 2026"   (formatEventDate: weekday/month short, en-US)
 *   time  "5 PM – 5:29 PM"      (minutes dropped on the hour)
 */

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `YYYY-MM-DD` → "Wed, Oct 28, 2026". A calendar date, so no timezone shift. */
export function formatEventDate(iso: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso?.trim() ?? '');
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return DATE_FORMAT.format(date);
}

/** MySQL `HH:MM[:SS]` → "5 PM" / "5:29 PM". */
export function formatTime(mysqlTime: string | null | undefined): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(mysqlTime?.trim() ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23 || Number(minutes) > 59) return null;
  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === '00' ? `${hour12} ${period}` : `${hour12}:${minutes} ${period}`;
}

/** "5 PM – 5:29 PM"; a lone start or end is shown on its own. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const parts = [formatTime(start), formatTime(end)].filter((p): p is string => !!p);
  return parts.length ? parts.join(' – ') : null;
}

/**
 * A display form and a `tel:` form for a US phone number. Anything that is not
 * a 10-digit (or 1 + 10-digit) number is shown as entered, with no `tel:` link.
 */
export function formatPhone(raw: string | null | undefined): {
  display: string | null;
  tel: string | null;
} {
  const text = raw?.trim();
  if (!text) return { display: null, tel: null };
  const digits = text.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10) return { display: text, tel: null };
  return {
    display: `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
    tel: `+1${national}`,
  };
}

/** Street line, city/state/zip line, and a Google Maps search link for both. */
export function formatAddress(parts: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): { line1: string | null; line2: string | null; mapsUrl: string | null } {
  const clean = (v?: string | null) => v?.trim() || '';
  const line1 = [clean(parts.address1), clean(parts.address2)].filter(Boolean).join(', ');
  const cityState = [clean(parts.city), clean(parts.state)].filter(Boolean).join(', ');
  const line2 = [cityState, clean(parts.zip)].filter(Boolean).join(' ');
  const full = [line1, line2].filter(Boolean).join(', ');
  return {
    line1: line1 || null,
    line2: line2 || null,
    mapsUrl: line1
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`
      : null,
  };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * The pantry's instructions (`events.pub_desc_long`) are rich-text HTML; the
 * client sanitizes and renders them as HTML. The email template escapes every
 * value, so convert to plain text here: block boundaries become line breaks
 * (the template keeps them via `white-space: pre-line`), list items get a
 * bullet, every other tag is dropped, and entities are decoded.
 */
export function richTextToPlain(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    // Not </li>: the next <li> (or the closing </ul>) already starts a new line.
    .replace(/<\/(p|div|ul|ol|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

/** Drop null/undefined/blank values so the template's `{{#if}}` guards hide them. */
export function compactTemplateData(
  data: Record<string, string | null | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}
