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
- `SENDGRID_RESERVATION_TEMPLATE_ID` — **Required** to send reservation confirmations. The ID of the SendGrid dynamic template (`d-…`). There is no default in code: if it is unset or blank, the confirmation is skipped and a warning is logged.

- `FRESHTRAK_CLIENT_URL` — Optional base URL of freshtrak-public-client for this environment (e.g. `https://www.freshtrak.com`). Used for the "View my reservations" link, shown to signed-in users only. Unset = no link.

Template IDs are configuration, not code. To change the email's content, edit the template in SendGrid and make the new version active — the template ID stays the same, so no config change or deploy is needed. Change `SENDGRID_RESERVATION_TEMPLATE_ID` only to point an environment at a different template altogether.

`.env` is excluded by `.dockerignore`, so deployed environments (dev, beta, prod) read these from their own service configuration, not from a local `.env`.

Reservation confirmation email

`RegistrationsService` sends the confirmation server-side after a reservation is saved — both self-registration and case-manager "register on behalf of" (which emails the registrant). It is fire-and-forget: an email failure never fails or delays the reservation.

- Sent only for `confirmed` registrations; waitlisted ones get nothing yet.
- Sent to any deliverable address. It is **not** gated on `permission_to_email`: that flag is marketing consent (SUP-637), while a confirmation is transactional, as the disclosure under the email field tells the user.
- Skipped when the user has no email (the "No Email Available" option) or still has the `@auto.local` placeholder.
- Template: `docs/email-templates/reservation-confirmation.html`, with Test Data samples alongside. Every block is guarded with `{{#if}}`, so missing fields just drop their row.

Dynamic template data. Every field except `trans_num` is optional and omitted when unknown; event lookups are best-effort and never stop the email.

| Field                                                        | Source                                                                                                                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trans_num`                                                  | Registration id. Shown only as a fallback when there is no confirmation code                                                                                                                                               |
| `confirmation_code`                                          | Uppercased. Guests: `users.identification_code`; signed-in users: `households.identification_code` (same lookup as `GET /users/me`); case-manager registrants: their own user code. Matches the client's confirmation page |
| `first_name`                                                 | `users.first_name`                                                                                                                                                                                                         |
| `event_name`, `address_line_1`, `address_line_2`, `maps_url` | Public DB `events` (`event_name`, `address1/2`, `city`/`state`/`zip`)                                                                                                                                                      |
| `event_details`                                              | `events.pub_desc_long` — rich-text HTML converted to plain text (the template escapes values)                                                                                                                              |
| `agency_name`, `agency_phone`, `agency_phone_tel`            | Public DB `locations` (`loc_name`, `phone`) via `events.loc_id`                                                                                                                                                            |
| `event_date`                                                 | Booked slot's date, else the event date — e.g. `Wed, Oct 28, 2026`                                                                                                                                                         |
| `event_time`                                                 | Booked slot's window, else the event date's hours — e.g. `5 PM – 5:29 PM`                                                                                                                                                  |
| `reservations_url`                                           | `${FRESHTRAK_CLIENT_URL}/account/reservations`, signed-in users only                                                                                                                                                       |
| `qr_cid`                                                     | `reservation-qr`, the Content-ID of the check-in QR attachment. Sent only when the QR was drawn (see below)                                                                                                                |

Dates and times use the same format as the client's confirmation page.

Check-in QR (SUP-1092)

- Every email with a `confirmation_code` carries the check-in QR as an inline PNG attachment (`disposition: inline`, Content-ID `reservation-qr`), and its data carries `qr_cid`. The template shows it with `<img src="cid:{{qr_cid}}">` inside `{{#if qr_cid}}`.
- The QR encodes the link freshtrak-public-client's confirmation page encodes: `https://secure.pantrytrak.com/mobile/qr_code_processing.php?code=<CODE>&event_date_id=<id>[&event_slot_id=<id>]`. Built by `src/common/utils/reservation-qr.ts`, whose spec uses the client's own test vectors; keep the two in step.
- Inline rather than a hosted image link: it shows where remote images are blocked and without a signal at the pantry, and Gmail keeps it, where it strips `data:` images.
- No code, no QR: the reservation-number fallback is not scannable. If drawing fails, the email goes without the QR.
- SendGrid's own preview and test sends show a broken image, because the attachment only exists when the API sends. Test the QR through a real reservation.
- Outlook may show an empty box in its place until the reader trusts the sender (Safe senders, or "Show blocked content"); clicking the box still opens the QR. The printed code below it works either way. Checked 30 Oct 2026: Gmail shows the QR directly; Outlook showed it once the sender was trusted.

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
