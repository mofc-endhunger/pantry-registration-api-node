import {
  compactTemplateData,
  formatAddress,
  formatEventDate,
  formatPhone,
  formatTime,
  formatTimeRange,
  richTextToPlain,
} from '../reservation-email';

describe('reservation-email formatting', () => {
  describe('formatEventDate', () => {
    it('matches the client confirmation page format', () => {
      expect(formatEventDate('2026-10-28')).toBe('Wed, Oct 28, 2026');
    });

    it('does not shift the calendar date with the server timezone', () => {
      // A Date built in local time can land on the previous day west of UTC.
      expect(formatEventDate('2026-01-01')).toBe('Thu, Jan 1, 2026');
    });

    it.each([null, undefined, '', '2026-13-01', '2026-02-30', '10/28/2026'])(
      'returns null for %p',
      (input) => {
        expect(formatEventDate(input)).toBeNull();
      },
    );
  });

  describe('formatTime / formatTimeRange', () => {
    it.each([
      ['17:00:00', '5 PM'],
      ['17:29:00', '5:29 PM'],
      ['00:00:00', '12 AM'],
      ['12:05:00', '12:05 PM'],
      ['09:30', '9:30 AM'],
    ])('formats %s as %s', (input, expected) => {
      expect(formatTime(input)).toBe(expected);
    });

    it.each([null, '', '25:00:00', 'noon'])('returns null for %p', (input) => {
      expect(formatTime(input)).toBeNull();
    });

    it('joins a range the way the app does', () => {
      expect(formatTimeRange('17:00:00', '17:29:00')).toBe('5 PM – 5:29 PM');
    });

    it('shows a lone start time, and nothing when both are missing', () => {
      expect(formatTimeRange('10:00:00', null)).toBe('10 AM');
      expect(formatTimeRange(null, null)).toBeNull();
    });
  });

  describe('formatPhone', () => {
    it.each(['6145550142', '614-555-0142', '(614) 555-0142', '1 614 555 0142'])(
      'normalizes %s',
      (input) => {
        expect(formatPhone(input)).toEqual({ display: '(614) 555-0142', tel: '+16145550142' });
      },
    );

    it('shows a non-US-shaped number as entered, without a tel link', () => {
      expect(formatPhone('ext. 4412')).toEqual({ display: 'ext. 4412', tel: null });
    });

    it('returns nulls for a blank number', () => {
      expect(formatPhone('  ')).toEqual({ display: null, tel: null });
    });
  });

  describe('formatAddress', () => {
    it('builds two lines and an encoded maps link', () => {
      const result = formatAddress({
        address1: '1234 Broad St',
        address2: 'Suite B',
        city: 'Columbus',
        state: 'OH',
        zip: '43215',
      });
      expect(result.line1).toBe('1234 Broad St, Suite B');
      expect(result.line2).toBe('Columbus, OH 43215');
      expect(result.mapsUrl).toBe(
        'https://www.google.com/maps/search/?api=1&query=1234%20Broad%20St%2C%20Suite%20B%2C%20Columbus%2C%20OH%2043215',
      );
    });

    it('has no maps link without a street address', () => {
      expect(formatAddress({ city: 'Columbus', state: 'OH' })).toEqual({
        line1: null,
        line2: 'Columbus, OH',
        mapsUrl: null,
      });
    });
  });

  describe('richTextToPlain', () => {
    it('keeps paragraph and line breaks, bullets list items, and drops tags', () => {
      const html =
        '<p>Enter through the <strong>side door</strong>.</p><p>Bring:<br>bags</p><ul><li>ID</li><li>Proof of address</li></ul>';
      expect(richTextToPlain(html)).toBe(
        'Enter through the side door.\nBring:\nbags\n\n• ID\n• Proof of address',
      );
    });

    it('decodes entities', () => {
      expect(richTextToPlain('Fruit &amp; veg&nbsp;&#8211; &quot;fresh&quot; &#x2764;')).toBe(
        'Fruit & veg – "fresh" ❤',
      );
    });

    it('drops script and style content entirely', () => {
      expect(richTextToPlain('<p>Hi</p><script>alert(1)</script><style>p{}</style>')).toBe('Hi');
    });

    it('returns null for empty or tag-only input', () => {
      expect(richTextToPlain(null)).toBeNull();
      expect(richTextToPlain('<p> </p>')).toBeNull();
    });
  });

  it('compactTemplateData drops null, undefined and blank values', () => {
    expect(compactTemplateData({ a: 'x', b: null, c: undefined, d: '  ', e: ' y ' })).toEqual({
      a: 'x',
      e: 'y',
    });
  });
});
