## Messaging Platforms Evaluation (Future-State)

### Audience

Engineering, Product, and Operations stakeholders planning customer communications across SMS, push notifications, WhatsApp, and email, with a future Android/iOS app.

### Executive Summary

- For SMS at scale and AWS-native analytics: prefer AWS Pinpoint (or SNS for basic SMS); keep Twilio if you need richer two-way messaging and WhatsApp out of the box.
- For mobile app push: use FCM (Android) and APNs (iOS). Optionally front them with AWS SNS Mobile Push for a single API at the cost of some features.
- For WhatsApp: start with Twilio WhatsApp to move quickly; consider Meta WhatsApp Cloud API if volume justifies the ops work. AWS supports WhatsApp via Pinpoint custom channel/partners (not native).
- For email: keep SendGrid for now; Pinpoint Email is viable if consolidating in AWS.

### Goals

- Reliable transactional messaging with channel fallback (push → SMS → email).
- Lower TCO and better observability over time.
- Future mobile app with real-time push notifications.
- Regulatory compliance (A2P 10DLC, opt-in/out) and secure handling of PII.

## Channel Options

### SMS

- AWS SNS (basic)
  - Pros: simple, low cost in many regions, AWS-native.
  - Cons: limited analytics, templates, two-way support; basic tooling.
- AWS Pinpoint (advanced)
  - Pros: campaigns/segments, templates, journeys, analytics, two-way SMS; event stream to Kinesis/Firehose for observability.
  - Cons: more setup and operational overhead than SNS; learning curve.
- Twilio
  - Pros: fastest path, excellent developer tooling, webhooks, two-way SMS, A2P/short code onboarding support.
  - Cons: generally higher per-message cost; analytics are good but less AWS-native.

Recommended: Pilot Pinpoint behind a feature flag while keeping Twilio as fallback during migration.

### Push Notifications (Mobile App)

- FCM (Android) and APNs (iOS) directly
  - Pros: richest features, fine control, free to send; best future-proofing.
  - Cons: two platform integrations to maintain.
- AWS SNS Mobile Push (abstraction)
  - Pros: single API for multiple push providers; reduces platform-specific code in backend.
  - Cons: fewer advanced features compared to direct FCM/APNs integration.

Recommended: For MVP, integrate FCM/APNs directly for best capabilities. Wrap in a provider interface so SNS can be added later if needed.

### WhatsApp

- Twilio WhatsApp
  - Pros: fast onboarding, unified API with SMS/voice, good templating and compliance flows.
  - Cons: higher cost vs direct Meta Cloud at scale; vendor lock-in for flows/logs.
- Meta WhatsApp Cloud API
  - Pros: direct vendor solution; potentially lower cost at volume.
  - Cons: more DIY: session/fallbacks/webhooks/templating management is on you.
- AWS (Pinpoint custom channel/partners)
  - Pros: consolidate analytics in Pinpoint.
  - Cons: not native; more integration work, fewer turnkey tools.

Recommended: Start with Twilio for speed; evaluate direct Meta Cloud when WhatsApp volume grows.

### Email

- Keep SendGrid (current)
  - Pros: reliable, familiar, good analytics; templates and webhooks available.
- AWS Pinpoint Email
  - Pros: AWS-native, consolidates messaging analytics.
  - Cons: migration effort; parity depends on requirements.

## Architecture Recommendation

### Notification Orchestrator (NestJS)

- Provider interfaces and adapters:
  - SmsProvider: TwilioAdapter, PinpointAdapter
  - PushProvider: FcmAdapter, ApnsAdapter (or SnsAdapter)
  - WhatsappProvider: TwilioWhatsappAdapter (optional MetaCloudAdapter later)
  - EmailProvider: SendGridAdapter (PinpointEmailAdapter optional)
- Capabilities:
  - Message templates (versioned) with locale support.
  - User preferences (channel opt-ins, quiet hours).
  - Channel fallback policy (push → SMS → email).
  - Delivery tracking: ingest webhooks/events into a delivery_events table or analytics stream.
  - Reliability: idempotency keys, exponential backoff, dead-letter queue; outbox table or queue (SQS) for async sends.

### Security & Compliance

- A2P 10DLC registration (US long codes), consider toll-free or short codes for high throughput.
- Opt-in/out management; standard keywords (STOP/HELP).
- Signed webhooks (Twilio signature verification), JWTs/keys stored in Secrets Manager/SSM.
- PII minimization and encrypted logs; retention policies.
- APNs token-based auth (key-based), rotate creds on cadence.

## Phased Plan

### Phase 1 (1–2 weeks): Foundations

- Implement Notification Orchestrator with interfaces.
- Adapters: Twilio SMS + SendGrid Email; FCM/APNs push (no SNS).
- Webhook endpoints: Twilio status callbacks, push receipts where applicable.
- Minimal delivery logging (success/failure).

### Phase 2 (2–3 weeks): AWS Pilot + Preferences

- Add Pinpoint SMS adapter behind feature flag; route % of SMS to Pinpoint in beta.
- Implement template storage, locales, and user preference center (API + table).
- Add channel fallback policy and idempotency keys.
- Event stream export (Pinpoint/Kinesis) or logs to CloudWatch for dashboards.

### Phase 3 (2–4 weeks): WhatsApp + Observability

- Add Twilio WhatsApp adapter; register first templates (notifications/utility).
- Extend delivery analytics (dashboards, SLOs).
- Evaluate direct Meta WhatsApp Cloud API if scale warrants it.

## Decision Guide (Quick)

- AWS-first, analytics-heavy, lower TCO: adopt Pinpoint (SMS/Email), FCM/APNs for push (SNS optional), Twilio or Meta for WhatsApp.
- Fastest path, richer comms toolbox: keep Twilio for SMS/WhatsApp; still use FCM/APNs for push.

## Configuration (illustrative)

- SMS
  - Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  - Pinpoint: PINPOINT_PROJECT_ID, AWS creds/region, two-way number setup if needed
- Push
  - FCM: service account JSON; APNs: key ID, team ID, auth key (p8)
  - Optional SNS platform applications if using SNS abstraction
- WhatsApp
  - Twilio WhatsApp: WhatsApp sender, approved templates
  - Meta Cloud: app credentials, template approvals, webhook endpoints
- Email
  - SendGrid API Key; or Pinpoint Email domain setup and DKIM/SPF

## Testing & Rollout

- Staging: dedicate numbers/senders; route a small percentage to new providers (Pinpoint pilot).
- Contract tests for adapters; canary sends; monitor delivery/latency/failure codes.
- Clear rollback (feature flags per channel/provider).

## Risks & Mitigations

- Regulatory (A2P): complete required registrations early; use toll-free/short codes if needed.
- Provider outages: multi-provider strategy with policy-based routing.
- Cost surprises: enforce budgets/alerts, rate limits, and per-channel caps.

## Next Steps

- Approve Phase 1 scope; I’ll scaffold the orchestrator and adapters.
- Identify trial sender IDs (SMS/WhatsApp) and push credentials for staging.
- Define initial notification templates and preference store schema.
