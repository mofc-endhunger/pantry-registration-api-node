## API Overview: Events and Registrations

### Auth

- JWT via Cognito; use Authorization: Bearer <token>.
- Roles: `staff` or `admin` required for management endpoints.
- Swagger UI: `/api/docs`.

### Events

- GET `/api/events` (public)
  - Query: `active=true|false`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`
  - Returns active or filtered events.
- GET `/api/events/:id` (public)
- POST `/api/events` (staff/admin)
  - Body: `{ name, description?, start_at?, end_at?, capacity?, is_active? }`
- PATCH `/api/events/:id` (staff/admin)
- DELETE `/api/events/:id` (staff/admin)

#### Timeslots

- GET `/api/events/:id/timeslots` (public)
- POST `/api/events/:id/timeslots` (staff/admin)
  - Body: `{ start_at, end_at, capacity, is_active }`
- PATCH `/api/events/timeslots/:timeslotId` (staff/admin)
- DELETE `/api/events/timeslots/:timeslotId` (staff/admin)

### Registrations

- GET `/api/registrations/event/:eventId` (staff/admin)
  - Lists registrations for an event.
- POST `/api/registrations` (authenticated)
  - Body: `{ event_id, timeslot_id?, attendees: number[] }`
  - Enforces one active registration per household per event.
  - Capacity: confirms if capacity available, else waitlists.
- PATCH `/api/registrations/:id/cancel` (authenticated)
  - Cancels own registration; promotes next waitlisted, if any.
- POST `/api/registrations/check-in` (authenticated)
  - Body: `{ registration_id, attendee_ids: number[] }`
  - Marks registration as `checked_in` and records an audit row.

### Data Model

- Event: `{ id, name, description?, start_at?, end_at?, capacity?, is_active }`
- EventTimeslot: `{ id, event_id, start_at, end_at, capacity?, is_active }`
- Registration: `{ id, event_id, household_id, timeslot_id?, status, created_by }`
- RegistrationAttendee: `{ id, registration_id, household_member_id }`
- CheckInAudit: `{ id, registration_id, created_by, attendees_count? }`

### Notes

- Household is resolved from JWT via Cognito sub → user → household.
- Unique active registration per household per event.
- Waitlist promotion occurs on cancellation.
