## Next Steps: Two-DB Event Registration Integration

Context: Read schedules from `freshtrak_public` (events/dates/hours/slots). Write registrations to `freshtrak_private` (event_registrations + event_registration_members). Update reserved counts in `freshtrak_public` after successful registration (and reverse on cancellation).

### 1) Data access and configuration

- Add a second TypeORM DataSource for `freshtrak_public` (read-only) alongside the existing private connection.
- Create read-only models/services that map to:
  - `freshtrak_public.events`
  - `freshtrak_public.event_dates`
  - `freshtrak_public.event_hours`
  - `freshtrak_public.event_slots`
- Keep current private connection/models for:
  - `freshtrak_private.event_registrations`
  - `freshtrak_private.event_registration_members`
  - `freshtrak_private.event_statuses`

### 2) API contract alignment

- Registration request must carry a target: `event_slot_id` (slot-level) or a date-only identifier when allowed.
- Map API status values to `event_statuses` (private) or expose status IDs directly.
- Surface public capacity: for a given date/slot, return `capacity` and `reserved` from public tables.

### 3) Registration write sequence (transactional)

1. Validate JWT → resolve household and selected household members.
2. Validate target capacity in `freshtrak_public`:
   - Slot-level: `event_slots.capacity > event_slots.reserved`.
   - Date-level only (if supported): `event_dates.capacity > event_dates.reserved`.
3. Insert into `freshtrak_private.event_registrations` and `event_registration_members`.
4. Update capacity in `freshtrak_public`:
   - Slot-level: increment `event_slots.reserved` and roll-up increment `event_dates.reserved`.
   - Date-level: increment `event_dates.reserved` only.
5. Commit; on failure, rollback both private inserts and public increments.

### 4) Cancellation and waitlist promotion

- On cancel:
  - Update private status to cancelled.
  - Decrement the same `reserved` counters in public (slot + date or date-only).
  - Promote the next waitlisted registration (service logic) and re-apply increments.

### 5) Uniqueness and constraints

- Enforce one active registration per household per event/date/slot (business rule):
  - Primary: enforce in service layer with targeted queries.
  - Secondary: add a DB uniqueness where feasible in private DB (e.g., household+event_slot+is_cancelled flag) if rules allow.
- Prevent duplicate attendees: unique `(event_registration_id, household_member_id)` in private DB.

### 6) Type alignment

- Public IDs are INT (e.g., `event_id`, `event_date_id`, `event_hour_id`, `event_slot_id`).
- Private IDs are BIGINT (e.g., `household_id`, `household_member_id`, status IDs).
- Ensure DTOs and services cast types correctly across boundaries.

### 7) Testing

- Unit: capacity checks, date vs. slot flows, cancel → promotion, attendee validation.
- E2E: end-to-end registration/cancel with real public data read + private write + public counters update.
- Idempotency: safe re-try of register/cancel with an idempotency key.

### 8) Telemetry and audit

- Add structured logs around register/cancel/counter updates (both DBs).
- Extend check-in audit to reference the private registration; optionally enrich with public date/slot context at read-time.

### 9) Migration and rollout

- No migrations on `freshtrak_public` (consumer only).
- Private DB: add optional indexes/constraints to support uniqueness and performance.
- Backfill script (optional) to sync reserved counts if any drift is detected.

### 10) Docs and UX

- Document the registration flow, including slot vs. date booking, failure modes, and conflict responses.
- Add Swagger examples for both flows; annotate role requirements (staff vs. participant).
