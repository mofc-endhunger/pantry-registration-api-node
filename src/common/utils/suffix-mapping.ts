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
 * Maps a suffix string (e.g. "Jr", "Sr.", "III") to the corresponding
 * suffix_id used in the household_members table.
 * Returns undefined when the input is empty or unrecognized.
 */
export function mapSuffixToId(suffix: string | null | undefined): number | undefined {
  if (!suffix) return undefined;
  return SUFFIX_MAP[suffix.trim().toLowerCase()];
}
