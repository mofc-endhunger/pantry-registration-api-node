import { UnprocessableEntityException } from '@nestjs/common';

/**
 * The minimum PantryTrak needs to turn a FreshTrak registrant into a family
 * and open the visit (SUP-1141). Anything less syncs as a `freshtrak_users`
 * row the pantry cannot match or convert:
 *  - first and last name, 1+ characters each (pt_secure_2016
 *    html/includes/functions_fam.php:1603-1637; a NULL first name also hides
 *    the user from the matching queue, core/admin/freshtrak_sync/lib/matching.php:857)
 *  - a street line of 5+ characters (functions_fam.php:422-437)
 *  - a 5-digit ZIP, ZIP+4 accepted with or without the hyphen
 */

export const INCOMPLETE_REGISTRANT = 'INCOMPLETE_REGISTRANT';

export const MIN_ADDRESS_LENGTH = 5;

const ZIP_PATTERN = /^\d{5}(?:-?\d{4})?$/;

export type RegistrantField = 'first_name' | 'last_name' | 'address_line_1' | 'zip_code';

export interface RegistrantIdentity {
  first_name?: string | null;
  last_name?: string | null;
  address_line_1?: string | null;
  zip_code?: string | null;
}

/**
 * Name pairs the API itself writes when it has no real name: the household
 * head created without one (households.service createHousehold) and the
 * guest-first auto-created household (registrations.service, auth.service
 * upgradeGuest). They are not a person's name and count as missing.
 */
const PLACEHOLDER_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['Primary', 'Member'],
  ['Guest', 'User'],
];

const trimmed = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

export function isPlaceholderName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): boolean {
  const first = trimmed(firstName);
  const last = trimmed(lastName);
  return PLACEHOLDER_NAMES.some(([f, l]) => first === f && last === l);
}

/** True when both names are present and are not an API placeholder pair. */
export function hasRealName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): boolean {
  return (
    trimmed(firstName).length > 0 &&
    trimmed(lastName).length > 0 &&
    !isPlaceholderName(firstName, lastName)
  );
}

/** The fields PantryTrak needs that this registrant lacks, in a stable order. */
export function missingRegistrantFields(registrant: RegistrantIdentity): RegistrantField[] {
  const missing: RegistrantField[] = [];
  const placeholder = isPlaceholderName(registrant.first_name, registrant.last_name);
  if (placeholder || !trimmed(registrant.first_name)) missing.push('first_name');
  if (placeholder || !trimmed(registrant.last_name)) missing.push('last_name');
  if (trimmed(registrant.address_line_1).length < MIN_ADDRESS_LENGTH) {
    missing.push('address_line_1');
  }
  if (!ZIP_PATTERN.test(trimmed(registrant.zip_code))) missing.push('zip_code');
  return missing;
}

/**
 * Whether POST /registrations enforces the check. Off unless
 * REQUIRE_COMPLETE_REGISTRANT=true, so the API can deploy before the clients
 * handle the 422. Read per call so it can be flipped without a code change.
 * Temporary: retire once the rollout is confirmed.
 */
export function isRegistrantCheckEnabled(): boolean {
  return (process.env.REQUIRE_COMPLETE_REGISTRANT || 'false').toLowerCase() === 'true';
}

/**
 * The 422 for an incomplete registrant. HttpExceptionFilter passes `code` and
 * `missing` through, so the body is
 * `{ message, error: 'UnprocessableEntityException', status: 422, code, missing }`.
 * The message avoids the words the web client matches for "already registered".
 */
export function incompleteRegistrantException(
  missing: RegistrantField[],
): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: 'Registrant profile is incomplete',
    code: INCOMPLETE_REGISTRANT,
    missing,
  });
}
