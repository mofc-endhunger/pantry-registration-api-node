/**
 * A registrant with no fixed address (SUP-1141), stored the way PantryTrak
 * records one: no street, and "Homeless" on address line 2.
 *
 * It is legacy PantryTrak's rule (pt_secure_2016 core/family_res_add1.php,
 * the "homeless" checkbox) and freshtrak-service's `HomelessAddress`, which
 * the product owner made the one rule for every screen that records a
 * neighbor with no address (9 Oct 2026).
 *
 * PantryTrak, though, needs a street and ZIP to turn the FreshTrak user into a
 * family. Its own staff screen gives a homeless family the location's address
 * with "Homeless" on line 2 (`pt_fa26_apply_homeless`), so the API does the
 * same when it syncs a registration: see `pantryTrakAddress` below.
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

/** The address FreshTrak shows for an event: `events.address1`, city, state, zip. */
export interface EventAddress {
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface UserAddress {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}

/** Marked homeless and no street of its own: the event's address stands in for it. */
export function needsEventAddress(user: UserAddress | null | undefined): boolean {
  return !!user && isHomelessAddress(user.address_line_2) && !(user.address_line_1 ?? '').trim();
}

/**
 * The address a user is sent to PantryTrak with (SUP-1141).
 *
 * A homeless user with no street of their own goes with the address of the
 * event they registered for, the one the search results and event page show
 * (pantry-finder's `events.address1`, city, state, zip), and "Homeless" on
 * line 2. That is what PantryTrak's own staff screen records for a homeless
 * family, and its no-match screen builds the family from `address_line_1`
 * and `zip_code`, so nothing changes on the PantryTrak side.
 *
 * Without an event (a profile save, or an event with no street), the street,
 * city, state and ZIP go as null. PantryTrak's upsert
 * (create_freshtrak_user.php) skips null fields, so the event address an
 * earlier registration sent stays, rather than being replaced by a city or
 * ZIP the user typed before ticking the box. The event's own address line 2
 * is not used: line 2 is where PantryTrak looks for "Homeless".
 *
 * Anyone else is returned unchanged. Our own record is never changed: it
 * keeps no street and the Homeless marker.
 */
export function pantryTrakAddress<T extends UserAddress>(user: T, event?: EventAddress | null): T {
  if (!needsEventAddress(user)) return user;
  const street = event?.address1?.trim();
  if (event && street) {
    return {
      ...user,
      address_line_1: street,
      address_line_2: HOMELESS_LINE_TWO,
      city: event.city,
      state: event.state,
      zip_code: event.zip,
    };
  }
  return { ...user, address_line_1: null, city: null, state: null, zip_code: null };
}
