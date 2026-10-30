import { reservationQrPng, reservationQrUrl } from '../reservation-qr';

/**
 * The email's QR must encode exactly what freshtrak-public-client's
 * ReservationQRCard encodes, so these are the client's own `qrUrl` vectors
 * (ReservationQRCard.test.tsx) for the case the email draws: a code is known.
 */
describe('reservationQrUrl — the PantryTrak scanner contract', () => {
  const BASE = 'https://secure.pantrytrak.com/mobile/qr_code_processing.php';

  it('encodes the code, uppercased, with the event date and slot', () => {
    expect(reservationQrUrl('abc123', 9999, 51)).toBe(
      `${BASE}?code=ABC123&event_date_id=9999&event_slot_id=51`,
    );
  });

  it('leaves the slot out when none was booked', () => {
    expect(reservationQrUrl('abc123', 9999, null)).toBe(`${BASE}?code=ABC123&event_date_id=9999`);
  });

  it('matches the client for a mock code', () => {
    expect(reservationQrUrl('mockcode1', 100, 42)).toBe(
      `${BASE}?code=MOCKCODE1&event_date_id=100&event_slot_id=42`,
    );
  });

  it('sends an absent event date empty, as the client does', () => {
    expect(reservationQrUrl('abc123', null, null)).toBe(`${BASE}?code=ABC123&event_date_id=`);
    expect(reservationQrUrl('abc123')).toBe(`${BASE}?code=ABC123&event_date_id=`);
  });
});

describe('reservationQrPng', () => {
  it('draws a 360 px square PNG', async () => {
    const png = await reservationQrPng(`https://example.test/?code=ABC123&event_date_id=1`);

    // PNG signature, then the IHDR chunk's width and height (big-endian).
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.readUInt32BE(16)).toBe(360);
    expect(png.readUInt32BE(20)).toBe(360);
  });
});
