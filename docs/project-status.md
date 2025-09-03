# Project Status: pantry-registration-api-node

## Current State
- On branch: `create-user`
- User creation, JWT authentication, and debug logging are implemented.
- Guest authentication issues a JWT; system expects JWT for protected endpoints.
- `.env` is configured for JWT secret and expiration.

## Known Issues
1. **401 Unauthorized on Protected Endpoints**
   - Valid JWTs still result in 401 errors.
   - Logging in `JwtStrategy.validate` and controller does not show up, indicating the request may not reach the guard or controller.
   - Possible causes: environment variable mismatch, route misconfiguration, or server not using the expected `.env`.
2. **No Server Log Output for Some Requests**
   - 401s do not produce log output from the controller or strategy.
3. **Guest Authentication Response Format**
   - Endpoint returns both a legacy token and a JWT, which may confuse clients.
4. **Potential Route/Prefix Confusion**
   - If a global prefix is set (e.g., `/api`), requests must match the prefixed route.
5. **Build/Runtime Environment Consistency**
   - Server may not pick up latest code or environment variables after branch switches or builds.

## Remaining Features / To-Do
1. Fix JWT authentication flow for protected endpoints.
2. Standardize guest authentication response to return only the JWT as `token`.
3. Complete and test all user creation, update, and retrieval endpoints.
4. Add robust logging for authentication/authorization failures.
5. Write and run end-to-end and integration tests.
6. Document all endpoints and authentication flows.
7. Code cleanup and refactor for clarity.
8. Prepare for deployment with production-ready settings.
