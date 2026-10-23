# Notifications (Twilio / SendGrid)

This document describes the environment variables and usage for the Notifications module (Twilio SMS and SendGrid email).

Environment variables

- `TWILIO_ACCOUNT_SID` — Twilio Account SID
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token
- `TWILIO_PHONE_NUMBER` — Default "from" phone number used when sending SMS
- `TWILIO_ENABLED` — Optional boolean-like flag (`true`/`false`) to quickly disable SMS in non-prod
- `SENDGRID_API_KEY` — SendGrid API key
- `SENDGRID_ENABLED` — Optional flag to disable email in non-prod. **Defaults to enabled**: only the exact lowercase string `false` disables it (`False`, `0` and `no` all leave it on)
- `SENDGRID_FROM_EMAIL` — Optional sender for templated email; defaults to `no-reply@freshtrak.com`. Must be a verified sender in the SendGrid account, or SendGrid rejects the send with a 403
- `SENDGRID_RESERVATION_TEMPLATE_ID` — Optional; defaults to `d-4cd439ae9d574a6ca65ec22c290cfce7`

`.env` is excluded by `.dockerignore`, so deployed environments (dev, beta, prod) read these from their own service configuration, not from a local `.env`.

Reservation confirmation email

`RegistrationsService` sends the confirmation server-side after a reservation is saved — both self-registration and case-manager "register on behalf of" (which emails the registrant). It is fire-and-forget: an email failure never fails or delays the reservation.

- Sent only for `confirmed` registrations; waitlisted ones get nothing yet.
- Sent to any deliverable address. It is **not** gated on `permission_to_email`: that flag is marketing consent (SUP-637), while a confirmation is transactional, as the disclosure under the email field tells the user.
- Skipped when the user has no email (the "No Email Available" option) or still has the `@auto.local` placeholder.
- Dynamic template data: `{ trans_num: "<registration id>" }`.

Security

- Do not commit secrets to source control. Use environment variables, AWS SSM, or another secret manager in CI and production.
- For local development, set `TWILIO_ENABLED=false` or omit Twilio credentials to avoid sending real SMS.

Endpoints

None. The module exposes no HTTP routes: `TwilioService` and `SendgridService` are injected and called server-side only.

`POST /api/twilio/sms` and `POST /api/twilio/email` were removed. They had no auth guard and accepted an arbitrary sender, recipient and body, so anyone could relay SMS and email through our Twilio and SendGrid accounts. No live client called them. A unit test (`notifications.module.spec.ts`) fails if a controller is added back to this module; if a send endpoint is ever genuinely needed, it must be authenticated and must not take a free-form sender, recipient or body.

Testing tips

- Unit tests mock the underlying SDKs. See `src/modules/notifications/__tests__` for examples.
- To exercise real sends in staging, wire your secrets and ensure usage/cost monitoring is active.

Runtime flags

- `TWILIO_ENABLED` — set to `false` to disable SMS at runtime (useful in development)
- `SENDGRID_ENABLED` — set to `false` to disable SendGrid email sending at runtime
