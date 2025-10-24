## Event Registration - Current State

- Auth
  - Cognito JWT via JWKS (RS256). Uses COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID.
- Users
  - POST /api/users: identification_code optional; defaults to token sub; creates a household and placeholder members (seniors/adults/children counts).
  - GET /api/users/me: returns household “template” payload.
  - PATCH /api/users/:id: accepts the “me” payload; updates user fields, household, address, and members.
- Households
  - Entities aligned to schema; address PATCH soft-closes previous addresses and inserts a new current address.
  - GET /api/households/:id; PATCH /api/households/:id accepts address and members (also used by users PATCH).
- Events and Registrations (scaffold)
  - Entities: Event, EventTimeslot, Registration, RegistrationAttendee.
  - GET /events: list active events.
  - GET /registrations/event/:eventId: list registrations for an event.
  - POST /registrations (JWT): registers household; resolves household from JWT → user → household; enforces uniqueness; capacity with waitlist fallback.
  - PATCH /registrations/:id/cancel (JWT): cancels a household registration.

## Remaining Work

- Events Management
  - DTOs + CRUD for Event and EventTimeslot; filtering (date range, active, capacity).
  - Swagger documentation for event endpoints.
- Registrations
  - Promote waitlist entries on cancellation.
  - (If required) Per-timeslot uniqueness in addition to event-level.
  - Staff/admin views and role guards for management endpoints.
  - Swagger documentation and request/response examples.
- Data Layer
  - TypeORM migrations for new tables and indexes.
  - Seed scripts for development/demo data.
- Testing
  - Unit/e2e tests: capacity limits, waitlist flow, cancellation promotion, JWT scoping.

## Nice to Have

- Notification hooks (email) on confirmation/cancellation.
- Denormalized counters on Event/Timeslot for fast reads (maintained on writes).

## Notes

- Existing users/households API contracts remain unchanged.
- Swagger UI path: /api/docs (authorization persisted).
