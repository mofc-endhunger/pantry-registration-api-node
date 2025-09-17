# 401 Unauthorized Debug Checklist

## 1. Environment & Secret Consistency
- [ ] Open your `.env` file in the project root.
- [ ] Ensure you have:
  ```
  JWT_SECRET=change_this_secret
  JWT_EXPIRES_IN=1h
  ```
- [ ] Save the file and restart your server.

## 2. JWT Verification
- [ ] Generate a new JWT using your API (guest or login endpoint).
- [ ] Go to [jwt.io](https://jwt.io/), paste your JWT and the secret (`change_this_secret`).
- [ ] Confirm you see “Signature Verified”.

## 3. Authorization Header
- [ ] In Swagger or Postman, use:
  ```
  Authorization: Bearer <your-jwt>
  ```
- [ ] No extra spaces, no quotes, no `token` prefix.

## 4. Route Prefix
- [ ] If you use `app.setGlobalPrefix('api')` in `main.ts`, make sure your endpoint is `/api/user`, not `/user`.

## 5. Logging Output
- [ ] Make a request to the protected endpoint.
- [ ] Check your server logs for:
  - `JwtStrategy.validate called with payload: ...`
  - `req.user in controller: ...`
- [ ] If you see neither, the request is not reaching the guard/controller.

## 6. Minimal Public Endpoint Test
- [ ] Add this to any controller:
  ```typescript
  @Get('test-public')
  getPublic() {
    return { status: 'ok' };
  }
  ```
- [ ] Call `/api/test-public` (or `/test-public` if no prefix) to confirm the server is running and reachable.

## 7. Try a JWT from /auth/login or /auth/register
- [ ] If available, use a JWT from these endpoints to rule out guest JWT issues.

## 8. Check for Proxies or Middleware
- [ ] If running behind a proxy or with custom middleware, ensure headers are not being stripped or altered.

## 9. Share Logs
- [ ] If you still get a 401, copy and share the exact server log output after making a request.

---

Follow these steps in order and note where things break or what you observe. This will help pinpoint the root cause quickly!
