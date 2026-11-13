import {
  hasRealName,
  incompleteRegistrantException,
  isPlaceholderName,
  isRegistrantCheckEnabled,
  missingRegistrantFields,
} from '../registrant-completeness';

describe('registrant-completeness (SUP-1141)', () => {
  const COMPLETE = {
    first_name: 'Ana',
    last_name: 'Lopez',
    address_line_1: '123 Main St',
    zip_code: '43215',
  };

  describe('missingRegistrantFields', () => {
    it('finds nothing missing on a complete registrant', () => {
      expect(missingRegistrantFields(COMPLETE)).toEqual([]);
    });

    it('lists every field of an empty registrant, in a stable order', () => {
      expect(missingRegistrantFields({})).toEqual([
        'first_name',
        'last_name',
        'address_line_1',
        'zip_code',
      ]);
    });

    it.each([
      ['null', null],
      ['empty', ''],
      ['whitespace only', '   '],
    ])('treats a %s name as missing', (_label, value) => {
      expect(missingRegistrantFields({ ...COMPLETE, first_name: value })).toEqual(['first_name']);
      expect(missingRegistrantFields({ ...COMPLETE, last_name: value })).toEqual(['last_name']);
    });

    it('accepts a one-character name', () => {
      expect(missingRegistrantFields({ ...COMPLETE, first_name: 'A', last_name: 'B' })).toEqual([]);
    });

    it.each([
      ['Primary', 'Member'],
      ['Guest', 'User'],
      [' Guest ', 'User '],
    ])('treats the API placeholder pair "%s %s" as both names missing', (first, last) => {
      expect(missingRegistrantFields({ ...COMPLETE, first_name: first, last_name: last })).toEqual([
        'first_name',
        'last_name',
      ]);
    });

    it('accepts a real person who shares one half of a placeholder', () => {
      expect(
        missingRegistrantFields({ ...COMPLETE, first_name: 'Guest', last_name: 'Lopez' }),
      ).toEqual([]);
    });

    it.each([
      ['1 Rd', true],
      ['  1 Rd  ', true],
      ['1 A St', false],
      ['12345', false],
    ])('street "%s" missing: %s (5+ characters after trimming)', (street, missing) => {
      expect(missingRegistrantFields({ ...COMPLETE, address_line_1: street })).toEqual(
        missing ? ['address_line_1'] : [],
      );
    });

    it.each([
      ['43215', false],
      ['43215-1234', false],
      ['432151234', false],
      [' 43215 ', false],
      ['4321', true],
      ['432156', true],
      ['43215-12', true],
      ['ABCDE', true],
      ['', true],
    ])('ZIP "%s" missing: %s', (zip, missing) => {
      expect(missingRegistrantFields({ ...COMPLETE, zip_code: zip })).toEqual(
        missing ? ['zip_code'] : [],
      );
    });
  });

  describe('names', () => {
    it('recognises only the exact placeholder pairs', () => {
      expect(isPlaceholderName('Primary', 'Member')).toBe(true);
      expect(isPlaceholderName('Guest', 'User')).toBe(true);
      expect(isPlaceholderName('Guest', 'Member')).toBe(false);
      expect(isPlaceholderName('primary', 'member')).toBe(false);
    });

    it('hasRealName needs both names and no placeholder', () => {
      expect(hasRealName('Ana', 'Lopez')).toBe(true);
      expect(hasRealName('Ana', null)).toBe(false);
      expect(hasRealName(' ', 'Lopez')).toBe(false);
      expect(hasRealName('Primary', 'Member')).toBe(false);
    });
  });

  describe('isRegistrantCheckEnabled', () => {
    let previous: string | undefined;
    beforeEach(() => {
      previous = process.env.REQUIRE_COMPLETE_REGISTRANT;
    });
    afterEach(() => {
      if (previous === undefined) delete process.env.REQUIRE_COMPLETE_REGISTRANT;
      else process.env.REQUIRE_COMPLETE_REGISTRANT = previous;
    });

    it.each([
      [undefined, false],
      ['false', false],
      ['1', false],
      ['true', true],
      ['TRUE', true],
    ])('REQUIRE_COMPLETE_REGISTRANT=%s -> %s', (value, expected) => {
      if (value === undefined) delete process.env.REQUIRE_COMPLETE_REGISTRANT;
      else process.env.REQUIRE_COMPLETE_REGISTRANT = value;
      expect(isRegistrantCheckEnabled()).toBe(expected);
    });
  });

  describe('incompleteRegistrantException', () => {
    it('is a 422 carrying the code and the missing fields', () => {
      const err = incompleteRegistrantException(['last_name']);
      expect(err.getStatus()).toBe(422);
      expect(err.name).toBe('UnprocessableEntityException');
      expect(err.getResponse()).toEqual({
        message: 'Registrant profile is incomplete',
        code: 'INCOMPLETE_REGISTRANT',
        missing: ['last_name'],
      });
    });

    it("has no words the web client's already-registered check matches", () => {
      const text = JSON.stringify(incompleteRegistrantException(['first_name']).getResponse());
      for (const keyword of ['already registered', 'already exist', 'user already', 'duplicate']) {
        expect(text.toLowerCase()).not.toContain(keyword);
      }
    });
  });
});
