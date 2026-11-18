import { ConflictException } from '@nestjs/common';

/** Error code for a booking the slot or date has no place left for (SUP-1169, SUP-1170). */
export const SLOT_FULL = 'SLOT_FULL';

/**
 * The 409 for a full slot or date. There is no waitlist (owner, 2026-11-18):
 * nothing is saved and nothing reaches PantryTrak. HttpExceptionFilter passes
 * `code` through, so the body is
 * `{ message, error: 'ConflictException', status: 409, code: 'SLOT_FULL' }`.
 *
 * Keep "at capacity" in the message: the website, the mobile app and the
 * legacy app all match that phrase to ask the user to pick another time.
 */
export function slotFullException(): ConflictException {
  return new ConflictException({
    message: 'This time slot is at capacity',
    code: SLOT_FULL,
  });
}
