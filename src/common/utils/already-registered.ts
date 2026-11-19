import { BadRequestException } from '@nestjs/common';
import type { Registration } from '../../entities/registration.entity';

/** Error code for a household that already holds a place on this date (SUP-1171). */
export const ALREADY_REGISTERED = 'ALREADY_REGISTERED';

/** The booking the household already has, as the 400 carries it. */
export type ExistingBooking = Pick<
  Registration,
  'id' | 'event_id' | 'public_event_date_id' | 'public_event_slot_id' | 'status'
>;

/**
 * The 400 for a household that already holds a place. HttpExceptionFilter
 * passes the extra fields through, so the body is
 * `{ message, error: 'BadRequestException', status: 400, code, registration }`.
 *
 * `registration` is the booking that already exists, so a client retrying
 * after a timeout can show that booking's confirmation instead of an error.
 * Its fields go out exactly as a 201 sends them (MySQL BIGINT ids arrive as
 * strings), so a client can read both responses the same way.
 *
 * Keep the message and the 400: the website, the mobile app and the legacy app
 * all match "already registered" to show their already-booked screen.
 */
export function alreadyRegisteredException(existing: ExistingBooking): BadRequestException {
  return new BadRequestException({
    message: 'Already registered',
    code: ALREADY_REGISTERED,
    registration: {
      id: existing.id,
      event_id: existing.event_id,
      public_event_date_id: existing.public_event_date_id ?? null,
      public_event_slot_id: existing.public_event_slot_id ?? null,
      status: existing.status,
    },
  });
}
