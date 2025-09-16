# Households Feature

## Overview
Households model a family/household unit managed by a single authenticated “primary” user (Cognito account). Dependents are represented as household members without logins. Household counts (children/adults/seniors) are derived from member dates of birth.

## Data Model

### Tables / Entities
- `households`
  - `id` (PK)
  - `primary_user_id` (FK → `users.id`) — primary account that can read/write
  - `address_line_1, address_line_2, city, state, zip_code`
  - `preferred_language`, `notes`
  - `created_at`, `updated_at`

- `household_members`
  - `id` (PK)
  - `household_id` (FK → `households.id`)
  - `is_primary` (boolean) — true only for the member representing the primary
  - Person fields: `first_name, middle_name, last_name, suffix, gender`
  - Contact (optional): `phone, email`
  - Address (optional): `address_line_1, address_line_2, city, state, zip_code`
  - Demographic: `date_of_birth` (date), `is_active` (boolean)
  - `created_at`, `updated_at`

- `household_member_audits` (append-only)
  - `id` (PK)
  - `household_id` (FK)
  - `member_id` (FK, nullable)
  - `change_type` (string): created | updated | deactivated | reactivated | removed | primary_changed | address_updated
  - `changed_by_user_id` (FK → `users.id`, nullable)
  - `changes` (JSON): `{ before, after }`
  - `created_at`

Notes:
- Dependents do not have Cognito accounts. Only the primary authenticates.
- One household per user. The primary can manage only their own household.

## Authorization
- Write operations (create/update household and members): allowed only for `primary_user_id` of that household.
- Read operations: allowed for the household’s primary (future: can extend to all members if needed).
- Authentication uses existing JWT/Cognito setup and `JwtAuthGuard`.

## Endpoints
Base path: no `/api` prefix currently.

### Create household
POST `/households`

Body:
```json
{
  "address_line_1": "123 Main St",
  "city": "Columbus",
  "state": "OH",
  "zip_code": "43004",
  "preferred_language": "en",
  "notes": "",
  "primary_first_name": "Jane",
  "primary_last_name": "Doe",
  "primary_phone": "5551112222",
  "primary_email": "jane@example.com",
  "primary_date_of_birth": "1990-01-01"
}
```
Response 201:
```json
{
  "id": 1,
  "primary_user_id": 123,
  "address_line_1": "123 Main St",
  "preferred_language": "en",
  "members": [ { "id": 1, "is_primary": true, "first_name": "Jane", "is_active": true } ],
  "counts": { "children": 0, "adults": 1, "seniors": 0, "total": 1 },
  "created_at": "...", "updated_at": "..."
}
```

### Get my household
GET `/households`

Response 200: same shape as GET by id.

### Get household by id
GET `/households/:id`

Response 200:
```json
{
  "id": 1,
  "members": [ ],
  "counts": { "children": 1, "adults": 1, "seniors": 0, "total": 2 }
}
```

### Update household
PATCH `/households/:id`

Body (any subset):
```json
{ "address_line_1": "456 Oak Ave", "preferred_language": "es" }
```
Response 200: updated household object.

### List members
GET `/households/:id/members`

Response 200:
```json
[ { "id": 1, "is_primary": true, "first_name": "Jane" }, { "id": 2, "first_name": "Kid" } ]
```

### Add member
POST `/households/:id/members`

Body:
```json
{ "first_name": "Kid", "last_name": "Doe", "date_of_birth": "2015-01-01" }
```
Response 201:
```json
{ "id": 2, "first_name": "Kid", "date_of_birth": "2015-01-01", "is_active": true }
```

### Update member
PATCH `/households/:id/members/:memberId`

Body (any subset):
```json
{ "first_name": "Kiddo", "is_active": true }
```
Response 200: updated member.

### Deactivate member
DELETE `/households/:id/members/:memberId`

Soft-delete via `is_active = false`.
Response 200:
```json
{ "id": 2, "is_active": false }
```

## Derived Counts
Counts are computed from active members’ `date_of_birth` using current date:
- children: age < 18
- seniors: age ≥ 60
- adults: total_active − children − seniors

Returned as `counts` alongside the household.

## Audit Logging
On every create/update/deactivate and household updates, an audit record is written:
- `change_type`: created | updated | deactivated | reactivated | removed | primary_changed | address_updated
- `changed_by_user_id`: the authenticated primary user id
- `changes`: JSON diff `{ before, after }`

## Migration Notes
- New tables: `households`, `household_members`, `household_member_audits` (see `tasks/households-migrations.sql`).
- Backfill: for each existing user, create a household (user becomes primary) and a corresponding primary member row.
- Deprecate user-level count fields (`seniors_in_household`, `adults_in_household`, `children_in_household`) and replace with derived counts. Keep compatibility in responses during transition if needed.

## Cognito Alignment
- Only the primary user authenticates via Cognito.
- Dependents do not require Cognito identities or local `identities` records.

## Testing
- E2E coverage: see `test/households.e2e-spec.ts`.
- Tests run with in-memory SQLite and JSON-transport mailer.

## Future Enhancements
- Primary transfer endpoint (change household owner to another adult member)
- Optional program affiliation fields (e.g., SNAP, WIC) on members
- Member read access (non-primary) if use case emerges