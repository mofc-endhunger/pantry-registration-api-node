# Cognito Migration Plan

This document outlines the step-by-step migration plan to replace the guest function with AWS Cognito integration and keep the local user database in sync with the Cognito user pool.

---

## 1. AWS Cognito Setup
- Create a Cognito User Pool in AWS Console.
- Configure required attributes (email, etc.).
- Set up an App Client (no secret for web/mobile).
- Note the Pool ID and App Client ID.

## 2. Update Environment & Dependencies
- Add Cognito config to `.env`:
  ```
  COGNITO_USER_POOL_ID=your_pool_id
  COGNITO_CLIENT_ID=your_client_id
  COGNITO_REGION=your_region
  ```
- Install AWS SDK:
  ```
  npm install @aws-sdk/client-cognito-identity-provider
  ```

## 3. Replace Guest Registration Logic
- Remove or refactor the guest registration endpoint.
- Add endpoints for Cognito sign-up and sign-in:
  - Use Cognito’s `SignUpCommand` and `InitiateAuthCommand` for registration and login.
- On successful Cognito registration, create a local user record with Cognito `sub` as the primary key.

## 4. JWT Validation & Auth Guard
- Replace local JWT validation with Cognito JWT validation:
  - Use Cognito’s JWKS endpoint to validate tokens.
  - Update your `JwtStrategy` to accept and validate Cognito tokens.
- In your guard, after validating the token, look up the user in your local DB using the Cognito `sub`.

## 5. Sync Local User Database
- On login or registration, check if the Cognito user exists in your local DB:
  - If not, create a new local user record.
  - If yes, update local user info as needed.
- Optionally, use Cognito triggers (Lambda) for real-time sync on user creation/update.

## 6. Update User Management Flows
- For password resets, email verification, etc., use Cognito APIs.
- For local user data (profile, preferences), keep using your DB, mapped by Cognito `sub`.

## 7. Testing & Rollout
- Test registration, login, and protected endpoints with Cognito tokens.
- Verify local DB sync and JWT validation.
- Migrate existing guest users if needed (optional).

## 8. Documentation & Training
- Document new flows for your team.
- Update API docs to reflect Cognito-based authentication.

---

**Summary:**
- Cognito handles authentication and user pool.
- Local DB stores user data, mapped by Cognito `sub`.
- JWT validation uses Cognito’s public keys.
- Sync logic ensures local DB matches Cognito users.
