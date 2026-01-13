## Purpose

This document standardizes terminology and explains end‑to‑end workflows for:

- System registration (account creation/upgrade)
- Guest sign‑in (temporary session)
- Event registration (reservation)
- Household creation, counting, and expansion

It aims to eliminate confusion around the term “registration,” which can mean different things in different contexts.

## Standard terminology

### System registration (Account creation/upgrade)

- Creating a permanent user account (Cognito‑backed) or upgrading a guest to a registered account.
- One‑time per person.
- Endpoints:
  - POST `/auth/register` — create account
  - POST `/auth/upgrade-guest` — upgrade an existing guest to registered (keeps `users.id`)

### Guest sign‑in (Guest authentication/session)

- Creating or updating a temporary guest session via a guest token for users without an account.
- Not an account registration; think “temporary sign‑in.”
- Endpoints:
  - POST `/guest-authentications` — create guest + return token
  - PATCH `/guest-authentications` — update guest profile (requires `X-Guest-Token`)

### Event registration (Reservation)

- Reserving a spot at a specific event/date/slot for a household.
- Repeats for every event the household attends.
- Endpoint:
  - POST `/registrations` — create reservation (JWT for registered users or `X-Guest-Token` for guests)

## High‑level model

- A household is owned by a single “head of household” (HOH) user; all household operations authorize against that HOH’s `users.id`.
- Active household members determine computed counts:
  - Seniors (age ≥ 60), Children (age < 18), Adults = Total − Seniors − Children.
- Counts are recomputed on every fetch/update from active members only via DOB thresholds; category flags are not persisted.

## Household model (applies to both guests and registered users)

- Each household is owned by a head‑of‑household (HOH). We authorize household operations against that HOH’s `users.id`.
- Household members have:
  - `is_head_of_household` (boolean), `is_active` (boolean), `date_of_birth` (YYYY‑MM‑DD), optional `gender_id`.
- Counts are computed from active members only:
  - Seniors: age ≥ 60
  - Children: age < 18
  - Adults: total − seniors − children
- We compute counts on read/update; we don’t persist category flags.

## Household creation

- If a user (guest or registered) has no household, one is auto‑created at first use (e.g., during event registration).
- For guests, when we auto‑create a household we set the HOH member from the guest profile; if `gender` is provided, we set `gender_id` (1=male, 2=female) best‑effort.

## Household expansion (placeholder members)

Expansion happens during POST `/registrations` and ensures the household member list matches provided counts.

1. We accept counts in multiple formats:

- Nested “me format” (preferred): `counts.seniors|adults|children`
- Also accepted nested variants: `counts.synth_*`, `counts.*_count`
- Flat variants: `seniors|adults|children`, `*_count`, `*_in_household`

Important: Counts are NON‑inclusive of the head‑of‑household (HOH). The HOH is always included automatically based on their age category (senior/adult/child). Provide counts for additional members beyond the HOH.

2. If counts are missing in the registration payload, we attempt a snapshot fallback:

- Use `users.seniors_in_household|adults_in_household|children_in_household` if their sum > 0.

3. Expansion algorithm (runs for both guests and registered users):

- Apply any explicit household updates first (e.g., if a `members` array was PATCHed elsewhere).
- Remove excess placeholder members (newest first) to reduce to the desired counts (HOH never removed).
- Add missing placeholders:
  - Names: “Senior N”, “Adult N”, “Child N”
  - Representative DOBs: ~70 / 30 / 10 years ago
  - `gender_id`: inherited from HOH; if HOH lacks `gender_id`, best‑effort map from user `gender` (male→1, female→2)
- Sync computed counts back to `users.seniors_in_household|adults_in_household|children_in_household`.

## Updating households and members outside registration

- PATCH to the household (internal service) supports:
  - Address history: new addresses create a new active row and soft‑delete the previous one.
  - Members array upsert:
    - Members omitted from the payload (non‑HOH) are deactivated.
    - Provided members are updated (or created) with given fields.
- PATCH `/users/:id` (UI profile updates) adjusts user basics and can pass address fields that map into household addresses; it will not expand members unless counts are explicitly provided and routed to the reconcile logic.

## What each flow does (and doesn’t do)

### System registration (account)

- Does: create or upgrade a user; may auto‑create a minimal household when needed.
- Does not: reserve any event slot.

### Guest sign‑in (session)

- Does: issue/refresh `X-Guest-Token` to allow interactions without an account.
- Does not: create a registered account or reserve an event slot.

### Event registration (reservation)

- Does: create a reservation for the household at an event and expand the household to match provided counts (or snapshot fallback).
- Does not: create or upgrade accounts.

## Endpoint quick reference

### System registration

- POST `/auth/register`
- POST `/auth/upgrade-guest`

### Guest sign‑in

- POST `/guest-authentications`
- PATCH `/guest-authentications` (requires `X-Guest-Token`)

### Event registration

- POST `/registrations` (JWT for registered users or `X-Guest-Token` for guests)
  - Required body:
    - `event_id`
    - One of: `timeslot_id` OR (`event_slot_id` + `event_date_id`)
  - Optional body (counts; any of these formats):
    - Nested: `counts.seniors|adults|children` (also `counts.synth_*`, `counts.*_count`)
    - Flat: `seniors|adults|children` (also `*_count`, `*_in_household`)
  - Optional: `attendees: number[]` (household_member_id list)

## Best practices

- Prefer sending counts in the registration payload; rely on snapshot fallback only when necessary.
- Do not send `*_in_household: 0` in a profile update immediately before event registration unless you intend to reset counts (it will suppress expansion).
- For guests, always include `X-Guest-Token` so expansion applies to the correct household.
- The head‑of‑household remains active; we never auto‑deactivate HOH.

## Summary of endpoints to remember

- Guest lifecycle
  - Create guest: POST `/guest-authentications` → returns token
  - Update guest: PATCH `/guest-authentications` with `X-Guest-Token`
  - Register (expand): POST `/registrations` with `X-Guest-Token` and counts (or rely on snapshot fallback)
- Registered lifecycle
  - Register (expand): POST `/registrations` with JWT and counts (or rely on snapshot fallback)

## Examples

### Guest: create session, then register for event (with nested counts)

```json
POST /guest-authentications
{ "first_name": "Alex", "gender": "male" }

// Response contains: { "token": "..." } → send as X-Guest-Token

POST /registrations
Headers: { "X-Guest-Token": "..." }
{
  "event_id": 208,
  "event_slot_id": 1991681,
  "event_date_id": 390778,
  "counts": { "adults": 2, "seniors": 1, "children": 3 }
}
```

### Registered: register for event (flat counts)

```json
POST /registrations
Authorization: Bearer <JWT>
{
  "event_id": 208,
  "timeslot_id": 1952731,
  "seniors": 1,
  "adults": 2,
  "children": 3
}
```

## “Do / Don’t say” to reduce ambiguity

- Do say:
  - “System registration” or “Account registration” (for accounts)
  - “Guest sign‑in” or “Guest session” (for tokens)
  - “Event registration” or “Reservation” (for events)
- Don’t say:
  - “Guest registration” (ambiguous; sounds like account creation)
  - “Registration” without qualifier (always specify system vs event)
