### Test Strategy for Pantry Registration API (Beta Readiness)

This plan defines unit, e2e, and regression coverage to validate event registration, dual-auth flows (JWT and guest), and two-database integration without breaking existing functionality.

### Scope

- **Modules**: `events`, `registrations`, `public-schedule`, `guest-authentications`, `users`, `households`, `auth`
- **Databases**: `freshtrak_private` (write) and `freshtrak_public` (read, counters)
- **Auth**: Cognito JWT, DB-backed Guest Tokens (`X-Guest-Token`)

### Environments

- Local: Docker compose or direct Node with env vars
- CI: Headless Jest runs for unit and e2e

### Test Data

- Seed minimal data via `npm run seed` for local/e2e if needed
- Factories/mocks for unit tests (TypeORM repositories mocked)

### Unit Tests (examples and checklist)

- **EventsService**
  - get: throws NotFound when event missing
  - create/update/remove: saves mapped fields, preserves nullables, MySQL-compatible sorting logic is applied (verify QB calls)
- **RegistrationsService**
  - registerForEvent: NotFound when event missing
  - uniqueness: rejects when existing confirmed/waitlisted/checked_in registration exists
  - capacity: confirms when under capacity; waitlists when full (slot/date/event)
  - public counters: increments on confirmed; no increment for waitlisted
  - cancellation: sets status=cancelled, decrements counters, promotes oldest waitlisted
  - check-in: forbidden for other households; error for cancelled
  - household resolution: auto-provision user/household for new Cognito user; resolves guest via token
- **PublicScheduleService**
  - getSlot/getDate: returns by id
  - increment/decrement slot/date: correctly updates `reserved` with floor at 0
  - buildEventDateStructure: returns legacy-compatible structure; `open_slots` derived from slot (capacity−reserved)
- **GuestAuthenticationsService**
  - updateGuestProfile: correct field mapping; `no_phone_number` and `no_email` flags logic
- **HouseholdsService / UsersService**
  - update paths accept `/users/me` payload shape; conditional assignments work for optional fields

### E2E Tests (high-value flows)

- Auth
  - Guest token accepted on registration routes
  - JWT accepted on registration routes
  - Management routes require roles (`staff`/`admin`)
- Events management
  - CRUD lifecycle for events and timeslots
- Registration lifecycle
  - Create registration (event only)
  - Create registration for `event_date_id` (public DB)
  - Create registration for `event_slot_id` (public DB)
  - Capacity full → waitlisted registration created
  - Cancel registration → counters decremented and next waitlisted promoted
  - Check-in registration → status changes, audit row written
- Public schedule
  - `buildEventDateStructure` produces expected nested shape and `open_slots`
- Swagger
  - Security schemes include `JWT-auth` and `Guest-Token`

### Regression Suite (past defects)

- MySQL nulls-last ordering replaced by `e.start_at IS NULL ASC, e.start_at ASC`
- `/users/me` payload shape allowed by DTO updates; conditional assigns prevent TS errors
- `RegisterDto` transforms: camelCase input, empty-string→null handling
- CORS headers include `Authorization` and `X-Guest-Token`
- Public schema: no direct `start_time`/`end_time` reads; derived or null
- Guest-first resolution: prioritize `X-Guest-Token` before Cognito UUID
- Auto-provision of user/household for new Cognito users

### Non-Functional

- Performance: registration endpoint under typical load; DB counters updated efficiently
- Security: tokens validated; expired guest tokens rejected

### Execution

- Unit: `npm test`
- Coverage: `npm run test:cov` (target ≥ 70% on touched modules)
- E2E: `npm run test:e2e`

### Exit Criteria for Beta

- Green unit and e2e runs in CI
- Regression suite all passing
- Manual UAT on critical paths (registration create/cancel/check-in) using both auth types
