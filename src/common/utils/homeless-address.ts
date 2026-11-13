/**
 * A registrant with no fixed address (SUP-1141), stored the way PantryTrak
 * records one: no street, and "Homeless" on address line 2.
 *
 * It is legacy PantryTrak's rule (pt_secure_2016 core/family_res_add1.php,
 * the "homeless" checkbox) and freshtrak-service's `HomelessAddress`, which
 * the product owner made the one rule for every screen that records a
 * neighbor with no address (9 Oct 2026). When PantryTrak turns the FreshTrak
 * user into a family it puts the event location's street and ZIP on it, with
 * "Homeless" kept on line 2 (core/admin/freshtrak_sync/nomatch_admin.php).
 *
 * Clients send `homeless: true`; the API owns how that is stored.
 */
export const HOMELESS_LINE_TWO = 'Homeless';

/** Whether an address line 2 marks the registrant as homeless. */
export function isHomelessAddress(addressLine2: string | null | undefined): boolean {
  return (
    typeof addressLine2 === 'string' &&
    addressLine2.trim().toLowerCase() === HOMELESS_LINE_TWO.toLowerCase()
  );
}

export interface StreetLines {
  address_line_1?: string | null;
  address_line_2?: string | null;
}

/**
 * Applies a client's `homeless` flag to the street lines about to be saved.
 *
 * - `true`: no street, "Homeless" on line 2. Whatever street was typed is not
 *   used, as in freshtrak-service.
 * - `false`: leaves what the client sent, but clears the Homeless marker from
 *   line 2 when the client sent no line 2 of its own, so un-ticking the box
 *   doesn't leave the registrant marked.
 * - absent: nothing changes.
 *
 * `storedLine2` is the line 2 already saved, used only for the `false` case.
 */
export function applyHomelessFlag(
  lines: StreetLines,
  homeless: boolean | undefined,
  storedLine2?: string | null,
): StreetLines {
  if (homeless === true) {
    return { ...lines, address_line_1: null, address_line_2: HOMELESS_LINE_TWO };
  }
  if (homeless === false && lines.address_line_2 === undefined && isHomelessAddress(storedLine2)) {
    return { ...lines, address_line_2: null };
  }
  return lines;
}
