import { mapGenderToId, mapIdToGender } from '../gender-mapping';

describe('gender mapping (SUP-1001)', () => {
  it.each([
    [1, 'male'],
    [2, 'female'],
    [3, 'other'],
    [4, 'prefer_not_to_say'],
  ])('mapIdToGender(%i) is %s', (id, gender) => {
    expect(mapIdToGender(id)).toBe(gender);
  });

  it('mapIdToGender is undefined for null, NaN and unknown ids', () => {
    expect(mapIdToGender(null)).toBeUndefined();
    expect(mapIdToGender(undefined)).toBeUndefined();
    expect(mapIdToGender(Number.NaN)).toBeUndefined();
    expect(mapIdToGender(0)).toBeUndefined();
    expect(mapIdToGender(5)).toBeUndefined();
  });

  it.each([
    ['male', 1],
    ['Female', 2],
    [' OTHER ', 3],
    ['prefer_not_to_say', 4],
  ])('mapGenderToId(%j) is %i', (gender, id) => {
    expect(mapGenderToId(gender)).toBe(id);
  });

  it('mapGenderToId is undefined for empty and unknown strings', () => {
    expect(mapGenderToId(null)).toBeUndefined();
    expect(mapGenderToId(undefined)).toBeUndefined();
    expect(mapGenderToId('')).toBeUndefined();
    expect(mapGenderToId('unknown')).toBeUndefined();
  });

  it('the two maps are inverses of each other', () => {
    for (const id of [1, 2, 3, 4]) {
      expect(mapGenderToId(mapIdToGender(id))).toBe(id);
    }
  });
});
