# API Input/Output Comparison: Legacy vs. New System

## Overview
This document compares the endpoints, input, output, and business logic between the legacy FreshTrak Registration API (Rails) and the new Pantry Registration API (NestJS). It highlights parity, enhancements, and gaps for team review.

---

## Endpoint Comparison Table

| Endpoint / Action                | Legacy System (freshtrak-registration-api)                                                                 | New System (NestJS API)                                                                                   |
|----------------------------------|-----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **/api/user** (GET)              | **Input:** Auth token<br>**Output:**<br>{ ...user fields... }                                              | **Input:** Auth token (JWT, `/users/:id` or `/users?identification_code=`)<br>**Output:** User object     |
| **/api/user** (PATCH/PUT)        | **Input:** { "user": { ...fields... } }<br>**Output:** User object or errors                              | **Input:** { ...fields... }<br>**Output:** User object or errors                                          |
| **/api/guest_authentications**   | **POST**<br>**Input:** None<br>**Output:** { "id", "user_id", "token", ... }                              | **POST**<br>**Input:** { "phone"?, "email"? }<br>**Output:** Guest auth object (token, user_id, etc.)     |
| **/auth_callbacks/facebook**     | **POST**<br>**Input:** { "userID", "graphDomain", "accessToken" }<br>**Output:** Auth object or {} (401)  | **POST**<br>**Input:** { "userID", "graphDomain", "accessToken" }<br>**Output:** Auth object (token, etc.)|
| **/api/households** (GET/POST)   | **GET:** `/households/:id`<br>**Output:** Household object<br>**POST:** { "household": { ... } }          | **GET:** `/households/:id`, `/households` (mine)<br>**POST:** `/households`<br>**Members:** `/households/:id/members` (GET/POST/PATCH/DELETE) |
| **/auth/login**                  | _(Not explicit in legacy)_                                                                                | **POST**<br>**Input:** { "email", "password" }<br>**Output:** { "access_token": "..." }                   |
| **/auth/register**               | _(Not explicit in legacy)_                                                                                | **POST**<br>**Input:** { "email", "password", "user_type" }<br>**Output:** User object                    |
| **/auth/request-password-reset** | _(Not explicit in legacy)_                                                                                | **POST**<br>**Input:** { "email" }<br>**Output:** { "message": "..." }                                    |
| **/auth/reset-password**         | _(Not explicit in legacy)_                                                                                | **POST**<br>**Input:** { "token", "newPassword" }<br>**Output:** { "message": "..." }                     |

---

## JSON Input/Output Examples

### User (GET/PATCH)
**Legacy Output:**
```json
{
  "id": 123,
  "user_type": "customer",
  "identification_code": "ABC123",
  "phone": "5551234567",
  "credential_id": 1,
  "email": "user@example.com"
  // ...other user fields
}
```
**New System Input:**
```json
{
  "user_type": "customer",
  "identification_code": "ABC123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com"
  // ...other optional fields
}
```

### Guest Authentication (POST)
**Legacy Output:**
```json
{
  "id": 456,
  "user_id": 789,
  "token": "abcdef123456",
  "expires_at": "2025-08-20T00:00:00Z",
  "created_at": "...",
  "updated_at": "...",
  "new_record": true
}
```
**New System Input:**
```json
{
  "phone": "5551234567",
  "email": "guest@example.com"
}
```

### Facebook Auth Callback (POST)
**Input (Both):**
```json
{
  "userID": "facebook_user_id",
  "graphDomain": "facebook",
  "accessToken": "fb_token"
}
```
**Output (Both):**
```json
{
  "id": 456,
  "user_id": 789,
  "token": "abcdef123456",
  "expires_at": "2025-08-20T00:00:00Z",
  "created_at": "...",
  "updated_at": "...",
  "new_record": true
}
```

### Auth (New System Only)
**Login:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Output:**
```json
{
  "access_token": "jwt.token.here"
}
```

**Register:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "user_type": "customer"
}
```

**Password Reset:**
```json
{
  "email": "user@example.com"
}
```
**Output:**
```json
{
  "message": "If the email exists, a reset link will be sent."
}
```

---

## Business Logic & Validation Notes
- **Legacy:** Token-based authentication, guest/customer user types, unique identification_code, phone format validation, no explicit password reset or registration endpoints.
- **New System:** Adds JWT login, registration, password reset, and more explicit DTO validation. All legacy flows are supported and extended.

---

## Gaps & Enhancements
- New system covers all legacy flows and adds modern authentication features.
- Households endpoints implemented; counts derived from active member DOB.
- Audit trail added for household/member changes.
