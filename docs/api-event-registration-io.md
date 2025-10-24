# Event Registration API I/O Documentation

## POST /registrations

**Description:** Register a household for an event slot.

### Request Body Example

```json
{
  "household_id": 123,
  "event_slot_id": 456,
  "members": [{ "household_member_id": 1 }, { "household_member_id": 2 }]
}
```

### Response Example

```json
{
  "id": 789,
  "household_id": 123,
  "event_slot_id": 456,
  "event_status_id": 1,
  "members": [
    { "id": 1, "household_member_id": 1 },
    { "id": 2, "household_member_id": 2 }
  ],
  "created_at": "2025-10-07T12:00:00.000Z"
}
```

---

## GET /registrations/:id

**Description:** Get details for a specific event registration.

### Response Example

```json
{
  "id": 789,
  "household_id": 123,
  "event_slot_id": 456,
  "event_status_id": 1,
  "members": [
    { "id": 1, "household_member_id": 1 },
    { "id": 2, "household_member_id": 2 }
  ],
  "created_at": "2025-10-07T12:00:00.000Z"
}
```

---

## PATCH /registrations/:id

**Description:** Update registration (e.g., change members or status).

### Request Body Example

```json
{
  "event_status_id": 2,
  "members": [{ "household_member_id": 1 }, { "household_member_id": 3 }]
}
```

### Response Example

```json
{
  "id": 789,
  "household_id": 123,
  "event_slot_id": 456,
  "event_status_id": 2,
  "members": [
    { "id": 1, "household_member_id": 1 },
    { "id": 3, "household_member_id": 3 }
  ],
  "updated_at": "2025-10-07T12:30:00.000Z"
}
```

---

## DELETE /registrations/:id

**Description:** Cancel a registration.

### Response Example

```json
{
  "success": true
}
```

---

## Error Response Example

```json
{
  "statusCode": 400,
  "message": "Validation failed: household_id is required",
  "error": "Bad Request"
}
```

---

_Fields and endpoints may be extended as the API evolves. Adjust examples to match your DTOs and business logic as needed._
