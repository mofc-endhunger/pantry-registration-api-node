import {
  applyHomelessFlag,
  HOMELESS_LINE_TWO,
  isHomelessAddress,
  needsEventAddress,
  pantryTrakAddress,
} from '../homeless-address';

describe('PantryTrak address of a homeless user (SUP-1141)', () => {
  const EVENT = { address1: '222 Gantz Rd', city: 'Grove City', state: 'OH', zip: '43123' };
  const HOMELESS = {
    id: 10,
    first_name: 'Ana',
    address_line_1: null,
    address_line_2: 'Homeless',
    city: 'Columbus',
    state: 'OH',
    zip_code: '43215',
  };

  it("sends the event's street, city, state and ZIP, with Homeless on line 2", () => {
    expect(pantryTrakAddress(HOMELESS, { ...EVENT, address1: ' 222 Gantz Rd ' })).toEqual({
      id: 10,
      first_name: 'Ana',
      address_line_1: '222 Gantz Rd',
      address_line_2: 'Homeless',
      city: 'Grove City',
      state: 'OH',
      zip_code: '43123',
    });
  });

  it.each([
    ['no event', null],
    ['an event with no street', { ...EVENT, address1: '  ' }],
  ])(
    "with %s, sends no street, city, state or ZIP, so PantryTrak keeps the last event's",
    (_, event) => {
      expect(pantryTrakAddress(HOMELESS, event)).toEqual({
        id: 10,
        first_name: 'Ana',
        address_line_1: null,
        address_line_2: 'Homeless',
        city: null,
        state: null,
        zip_code: null,
      });
    },
  );

  it('leaves a user with an address unchanged', () => {
    const user = { address_line_1: '123 Main St', address_line_2: 'Apt 4', zip_code: '43215' };
    expect(pantryTrakAddress(user, EVENT)).toBe(user);
  });

  it('leaves a street a homeless-marked user already has (older records)', () => {
    const user = { ...HOMELESS, address_line_1: '50 Shelter Way' };
    expect(pantryTrakAddress(user, EVENT)).toBe(user);
  });

  it('does not change the record it was given', () => {
    const user = { ...HOMELESS };
    pantryTrakAddress(user, EVENT);
    expect(user).toEqual(HOMELESS);
  });

  it.each([
    [{ address_line_2: 'Homeless' }, true],
    [{ address_line_1: '', address_line_2: 'homeless' }, true],
    [{ address_line_1: '1 Main St', address_line_2: 'Homeless' }, false],
    [{ address_line_2: null }, false],
    [null, false],
  ])('needsEventAddress(%p) is %p', (user, expected) => {
    expect(needsEventAddress(user)).toBe(expected);
  });
});

describe('homeless address (SUP-1141)', () => {
  describe('isHomelessAddress', () => {
    it.each(['Homeless', 'homeless', '  HOMELESS  '])('reads %p as the marker', (line2) => {
      expect(isHomelessAddress(line2)).toBe(true);
    });

    it.each([null, undefined, '', 'Apt 4', 'Homeless shelter'])(
      'does not read %p as it',
      (line2) => {
        expect(isHomelessAddress(line2)).toBe(false);
      },
    );
  });

  describe('applyHomelessFlag', () => {
    it('true: drops the typed street and puts the marker on line 2', () => {
      expect(
        applyHomelessFlag({ address_line_1: '123 Main St', address_line_2: 'Apt 4' }, true),
      ).toEqual({ address_line_1: null, address_line_2: HOMELESS_LINE_TWO });
    });

    it('true: marks a registrant who sent no street at all', () => {
      expect(applyHomelessFlag({}, true)).toEqual({
        address_line_1: null,
        address_line_2: HOMELESS_LINE_TWO,
      });
    });

    it('false: clears a saved marker when no line 2 is sent', () => {
      expect(applyHomelessFlag({ address_line_1: '123 Main St' }, false, 'Homeless')).toEqual({
        address_line_1: '123 Main St',
        address_line_2: null,
      });
    });

    it('false: keeps the line 2 the client sends', () => {
      expect(
        applyHomelessFlag(
          { address_line_1: '123 Main St', address_line_2: 'Apt 4' },
          false,
          'Homeless',
        ),
      ).toEqual({ address_line_1: '123 Main St', address_line_2: 'Apt 4' });
    });

    it('false: leaves a real saved line 2 alone', () => {
      expect(applyHomelessFlag({ address_line_1: '123 Main St' }, false, 'Apt 4')).toEqual({
        address_line_1: '123 Main St',
      });
    });

    it('absent: changes nothing', () => {
      const lines = { address_line_1: '123 Main St', address_line_2: undefined };
      expect(applyHomelessFlag(lines, undefined, 'Homeless')).toBe(lines);
    });
  });
});
