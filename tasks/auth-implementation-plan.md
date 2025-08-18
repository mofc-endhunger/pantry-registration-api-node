# Full Implementation Plan: Legacy-Compatible Authentication & User Management

## 1. User Registration
- Accept all required fields from the legacy schema.
- Hash passwords using bcrypt (store in `password_digest`).
- Check for duplicate users by email and identification_code.
- Create related records (e.g., user details) as needed.

## 2. User Login
- Allow login by email or identification_code.
- Verify password using bcrypt.
- Return user info and/or authentication token.

## 3. Password Reset
- Implement endpoints to initiate password reset (send email or token, if legacy supports).
- Implement endpoint to complete password reset (verify token, update password with bcrypt).

## 4. Session/Token Management
- Issue JWT or session tokens on successful login.
- Validate tokens for protected endpoints.
- Support logout/invalidate session if required.

## 5. Guest Authentication
- Endpoint to create a guest user (with user_type: guest).
- Return guest authentication token or session.

## 6. OAuth/External Authentication
- Implement Facebook (and any other provider) login via callback endpoints.
- Find or create user/identity records as in legacy.
- Issue authentication token/session.

## 7. User Profile Update
- Allow update of all editable fields (matching legacy).
- Validate and persist changes.

## 8. Account Lookup
- Endpoints to fetch user by id, identification_code, or email.
- Return user details as in legacy.

## 9. Error Handling & Validation
- Match legacy error messages and status codes.
- Validate all input fields as per legacy rules.

## 10. Roles & Permissions
- Support all legacy user roles and permissions.
- Enforce access control on protected endpoints.

## 11. Supporting Features
- Add created_at, updated_at timestamps everywhere.
- Add Swagger decorators for API documentation.
- Write unit and integration tests for all endpoints and services.
