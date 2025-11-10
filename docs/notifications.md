# Notifications (Twilio / SendGrid)

This document describes the environment variables and usage for the Notifications module (Twilio SMS and SendGrid email).

Environment variables

- `TWILIO_ACCOUNT_SID` — Twilio Account SID
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token
- `TWILIO_PHONE_NUMBER` — Default "from" phone number used when sending SMS
- `TWILIO_ENABLED` — Optional boolean-like flag (`true`/`false`) to quickly disable SMS in non-prod
- `SENDGRID_API_KEY` — SendGrid API key
- `SENDGRID_ENABLED` — Optional boolean-like flag (`true`/`false`) to quickly disable email in non-prod

Security

- Do not commit secrets to source control. Use environment variables, AWS SSM, or another secret manager in CI and production.
- For local development, set `TWILIO_ENABLED=false` or omit Twilio credentials to avoid sending real SMS.

Endpoints

- `POST /twilio/sms` — send SMS. Body:

  {
  "from_phone_number": "+1555...", // optional; defaults to TWILIO_PHONE_NUMBER
  "to_phone_number": "+1...",
  "message": "Text body"
  }

- `POST /twilio/email` — send email. Body:

  {
  "from": "from@example.com",
  "to": "to@example.com",
  "subject": "Subject",
  "content": "<p>HTML</p>"
  }

Testing tips

- Unit tests mock the underlying SDKs. See `src/modules/notifications/__tests__` for examples.
- To exercise real sends in staging, wire your secrets and ensure usage/cost monitoring is active.

Runtime flags

- `TWILIO_ENABLED` — set to `false` to disable SMS at runtime (useful in development)
- `SENDGRID_ENABLED` — set to `false` to disable SendGrid email sending at runtime
