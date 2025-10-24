## API Reference

Auth

- Header: `Authorization: Bearer <JWT>` (Cognito)
- Roles: `staff` or `admin` required for management endpoints.

Conventions

- Timestamps: ISO8601 strings in responses.
- IDs: BIGINT in private DB; INT in public schedule when using `event_slot_id`/`event_date_id`.

### Users

POST `/api/users` (auth required)

- Body:

```json
{
  "first_name": "Leonard",
  "last_name": "Chalk",
  "phone": "555-123-4567",
  "address_line_1": "123 Main St",
  "city": "Columbus",
  "state": "OH",
  "zip_code": "43004",
  "date_of_birth": "1990-05-20",
  "permission_to_email": true,
  "children_in_household": 2,
  "adults_in_household": 1,
  "seniors_in_household": 0
}
```

- Behavior: creates a `users` row, a `households` row, and placeholder members based on counts. `identification_code` defaults to token subject if not provided.
- 201 Response: user with `household_id` and created member ids.

GET `/api/users/me` (auth required)

- Returns a normalized user+household template payload ready for PATCH, e.g.:

```json
{
  "id": 18,
  "number": 0,
  "name": "Chalk Household",
  "identification_code": "1758918920329-528",
  "members": [
    {
      "id": 31,
      "household_id": 18,
      "user_id": "1130518",
      "first_name": "Leonard",
      "last_name": "Chalk",
      "date_of_birth": "1985-08-14",
      "is_head_of_household": 1,
      "is_active": 1,
      "added_by": "1130518"
    },
    {
      "id": 32,
      "household_id": 18,
      "first_name": "lilly",
      "last_name": "chalk",
      "date_of_birth": "2015-09-26",
      "is_head_of_household": 0,
      "is_active": 1,
      "added_by": "1130518"
    }
  ],
  "counts": { "seniors": 0, "adults": 1, "children": 1, "total": 2 },
  "address_line_1": "565 first st",
  "city": "columbus",
  "state": "OH",
  "zip_code": "43068",
  "phone": "555-987-6543",
  "email": "lchalk@example.com"
}
```

PATCH `/api/users/:id` (auth required)

- Body: accepts `GET /api/users/me` output shape; updates user, household, address, and members.
- 200 Response: updated household template payload.

### Households

GET `/api/households/:id` (auth required)

- Returns household details, current address, and members.

PATCH `/api/households/:id` (auth required)

- Body: subset of the `me` template; supports address fields (`line_1`, `line_2`, `city`, `state`, `zip_code`, `zip_4`) and `members` array (upsert by `id`).
- Behavior: soft-closes previous address, inserts a new current address when provided; upserts members.
- 200 Response: updated household.

### Events

GET `/api/events`

- Query: `active=true|false`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`.
- Returns filtered events.

GET `/api/events/:id`

- Returns event.

POST `/api/events` (staff/admin)

- Body: `{ name, description?, start_at?, end_at?, capacity?, is_active? }` (ISO date strings).
- 201 Response: created event.

PATCH `/api/events/:id` (staff/admin)

- Body: partial event fields.
- 200 Response: updated event.

DELETE `/api/events/:id` (staff/admin)

- 200 Response: deleted event.

Timeslots (staff/admin)

- GET `/api/events/:id/timeslots` → list timeslots for event
- POST `/api/events/:id/timeslots` Body: `{ start_at, end_at, capacity, is_active }`
- PATCH `/api/events/timeslots/:timeslotId`
- DELETE `/api/events/timeslots/:timeslotId`

### Registrations

GET `/api/registrations/event/:eventId` (staff/admin)

- Returns registrations for an event.

POST `/api/registrations` (auth required)

- Body options:

```json
// Option A: internal timeslot (private DB)
{ "event_id": 123, "timeslot_id": 45, "attendees": [31,32] }

// Option B: public schedule slot
{ "event_id": 123, "event_slot_id": 67890, "attendees": [31,32] }

// Option C: public schedule date (no specific slot)
{ "event_id": 123, "event_date_id": 55555, "attendees": [31,32] }
```

- Behavior: resolves household from JWT → enforces one active registration per household per event → checks capacity (slot/date or event-level) → creates registration and attendees → increments public counters when using public IDs (slot rolls up to date) → returns registration.
- 201 Response:

```json
{
  "id": 9012,
  "event_id": 123,
  "household_id": 18,
  "timeslot_id": null,
  "status": "confirmed",
  "public_event_slot_id": 67890,
  "public_event_date_id": 55555,
  "created_by": 1130518,
  "created_at": "2025-10-09T12:00:00.000Z",
  "updated_at": "2025-10-09T12:00:00.000Z"
}
```

PATCH `/api/registrations/:id/cancel` (auth required)

- Behavior: marks cancelled, decrements public counters if present, attempts waitlist promotion.
- 200 Response: updated registration.

POST `/api/registrations/check-in` (auth required)

- Body:

```json
{ "registration_id": 9012, "attendee_ids": [31, 32] }
```

- Behavior: sets status to `checked_in`, writes an audit row; does not alter capacity.
- 200 Response: updated registration.

### Errors (common)

- 401 Unauthorized: missing/invalid token.
- 403 Forbidden: user/household mismatch; insufficient role for staff endpoints.
- 404 Not Found: event/timeslot/slot/date/registration not found.
- 400 Bad Request: already registered; slot/date full.

### Examples

Register on a public slot

```bash
curl -X POST http://localhost:3001/api/registrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id":123, "event_slot_id":67890, "attendees":[31,32]}'
```

Cancel

```bash
curl -X PATCH http://localhost:3001/api/registrations/9012/cancel \
  -H "Authorization: Bearer $TOKEN"
```
