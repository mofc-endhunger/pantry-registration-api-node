import { applyHomelessFlag, HOMELESS_LINE_TWO, isHomelessAddress } from '../homeless-address';

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
