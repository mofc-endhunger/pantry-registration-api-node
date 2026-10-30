import QRCode from 'qrcode';

/**
 * The reservation confirmation email's check-in QR (SUP-1092).
 *
 * It encodes the same link freshtrak-public-client's ReservationQRCard
 * encodes (`qrUrl` there), so a scan at the pantry resolves the same way
 * whether the neighbor holds up the app or the email: PantryTrak's
 * `mobile/qr_code_processing.php`, and the FreshTrak Service desk, which
 * reduces the link to its code. Keep the two builders in step; the spec
 * shares the client's test vectors.
 *
 * The email carries the QR as an inline attachment the template shows with
 * `<img src="cid:{{qr_cid}}">`. Inline, it renders where remote images are
 * blocked and without a signal at the door, and Gmail does not strip it the
 * way it strips `data:` images.
 */

/** The attachment's Content-ID, and the value of the template's `qr_cid`. */
export const RESERVATION_QR_CID = 'reservation-qr';

const SCANNER_URL = 'https://secure.pantrytrak.com/mobile/qr_code_processing.php';

/** Gray-900, the client's QR_DARK: near-black modules are what scanners want. */
const QR_DARK = '#111827';

/**
 * The template draws the image at 180 px; twice that keeps it sharp on
 * high-density screens. The client's margin of 2 modules is the quiet zone.
 */
const QR_PIXELS = 360;
const QR_MARGIN = 2;

/**
 * The link the QR encodes: the confirmation code, uppercased, with the event
 * date and, when one was booked, the slot. As the client builds it, an absent
 * event date is sent empty rather than left out.
 */
export function reservationQrUrl(
  confirmationCode: string,
  eventDateId?: number | null,
  eventSlotId?: number | null,
): string {
  return (
    `${SCANNER_URL}?code=${encodeURIComponent(confirmationCode.toUpperCase())}` +
    `&event_date_id=${encodeURIComponent(eventDateId == null ? '' : String(eventDateId))}` +
    (eventSlotId ? `&event_slot_id=${encodeURIComponent(String(eventSlotId))}` : '')
  );
}

/** The QR for a link, as a PNG. */
export function reservationQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: QR_PIXELS,
    margin: QR_MARGIN,
    color: { dark: QR_DARK, light: '#ffffff' },
  });
}
