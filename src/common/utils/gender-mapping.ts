/**
 * The `users` table stores gender as a string; `household_members` stores a
 * `gender_id`. These two maps are the single place the two representations
 * meet, so a head of household edited through either table ends up the same
 * in both (SUP-1001).
 *
 * The strings are the ones the guest registration path already writes to
 * `users.gender` (`PATCH /guest-authentications`), so a guest who later
 * creates an account keeps a consistent value.
 */
const GENDER_BY_ID: Record<number, string> = {
  1: 'male',
  2: 'female',
  3: 'other',
  4: 'prefer_not_to_say',
};

const ID_BY_GENDER: Record<string, number> = Object.fromEntries(
  Object.entries(GENDER_BY_ID).map(([id, gender]) => [gender, Number(id)]),
);

/**
 * Maps a `household_members.gender_id` to the string stored in `users.gender`.
 * Returns undefined when the id is null or not one of the known four.
 */
export function mapIdToGender(genderId: number | null | undefined): string | undefined {
  if (genderId == null || Number.isNaN(genderId)) return undefined;
  return GENDER_BY_ID[genderId];
}

/**
 * Maps a `users.gender` string (any case, surrounding whitespace ignored) to
 * the `household_members.gender_id`. Returns undefined when the input is
 * empty or unrecognized.
 */
export function mapGenderToId(gender: string | null | undefined): number | undefined {
  if (!gender) return undefined;
  return ID_BY_GENDER[gender.trim().toLowerCase()];
}
