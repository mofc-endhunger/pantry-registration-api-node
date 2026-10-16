const SUFFIX_MAP: Record<string, number> = {
  jr: 1,
  'jr.': 1,
  sr: 2,
  'sr.': 2,
  ii: 3,
  iii: 4,
  iv: 5,
  v: 6,
};

/**
 * The canonical spelling written back to `users.suffix` for each
 * `household_members.suffix_id` — the form the clients' suffix pickers use.
 */
const SUFFIX_BY_ID: Record<number, string> = {
  1: 'Jr',
  2: 'Sr',
  3: 'II',
  4: 'III',
  5: 'IV',
  6: 'V',
};

/**
 * Maps a suffix string (e.g. "Jr", "Sr.", "III") to the corresponding
 * suffix_id used in the household_members table.
 * Returns undefined when the input is empty or unrecognized.
 */
export function mapSuffixToId(suffix: string | null | undefined): number | undefined {
  if (!suffix) return undefined;
  return SUFFIX_MAP[suffix.trim().toLowerCase()];
}

/**
 * The inverse of {@link mapSuffixToId}: a `household_members.suffix_id` to the
 * string stored in `users.suffix` (SUP-1001).
 * Returns undefined when the id is null or unrecognized.
 */
export function mapIdToSuffix(suffixId: number | null | undefined): string | undefined {
  if (suffixId == null || Number.isNaN(suffixId)) return undefined;
  return SUFFIX_BY_ID[suffixId];
}
