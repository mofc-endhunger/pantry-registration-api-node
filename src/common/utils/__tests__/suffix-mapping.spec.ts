import { mapIdToSuffix, mapSuffixToId } from '../suffix-mapping';

describe('suffix mapping', () => {
  it.each([
    ['Jr', 1],
    ['jr.', 1],
    ['Sr', 2],
    ['SR.', 2],
    ['II', 3],
    ['iii', 4],
    [' IV ', 5],
    ['V', 6],
  ])('mapSuffixToId(%j) is %i', (suffix, id) => {
    expect(mapSuffixToId(suffix)).toBe(id);
  });

  it('mapSuffixToId is undefined for empty and unknown strings', () => {
    expect(mapSuffixToId(null)).toBeUndefined();
    expect(mapSuffixToId(undefined)).toBeUndefined();
    expect(mapSuffixToId('')).toBeUndefined();
    expect(mapSuffixToId('Esq')).toBeUndefined();
  });

  it.each([
    [1, 'Jr'],
    [2, 'Sr'],
    [3, 'II'],
    [4, 'III'],
    [5, 'IV'],
    [6, 'V'],
  ])('mapIdToSuffix(%i) is %s (SUP-1001)', (id, suffix) => {
    expect(mapIdToSuffix(id)).toBe(suffix);
  });

  it('mapIdToSuffix is undefined for null, NaN and unknown ids', () => {
    expect(mapIdToSuffix(null)).toBeUndefined();
    expect(mapIdToSuffix(undefined)).toBeUndefined();
    expect(mapIdToSuffix(Number.NaN)).toBeUndefined();
    expect(mapIdToSuffix(0)).toBeUndefined();
    expect(mapIdToSuffix(7)).toBeUndefined();
  });

  it('every id round-trips through both maps', () => {
    for (const id of [1, 2, 3, 4, 5, 6]) {
      expect(mapSuffixToId(mapIdToSuffix(id))).toBe(id);
    }
  });
});
