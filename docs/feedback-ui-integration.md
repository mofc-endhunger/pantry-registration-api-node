### Feedback API – UI Integration Guide

Audience: Frontend implementers building the Reservations Feedback UI.

### New: Language support and Client-Side Survey Bundle

This section documents the latest additions for multi-language content and a client-driven survey experience.

#### Language support

- **User language**
  - `users` now has a `language_id` column (nullable). The UI can set/read it:
    - Create/Update: `language_id` accepted in both `POST /users` and `PATCH /users/:id`.
    - Read: `GET /users/me` now returns `language_id` in the payload.
- **Survey language selection**
  - Both `GET /surveys/active` and `GET /surveys/client-bundle` accept an optional `language_id` query param to request a specific language.
  - If omitted, the server uses the survey’s default language.
  - The response `survey` object includes `language_id` to confirm which language was served.
- **Auto-assignment language**
  - When a user registers for an event, the system auto-assigns a survey family in the background.
  - The survey chosen prefers the creator user’s `language_id` (falls back to `1` = English).

#### Endpoints for client-driven UX

- **GET `/surveys/active?registration_id=...&language_id=...`**
  - Purpose: determine availability and provide a server-friendly structure.
  - Returns:
    - `has_active`: boolean
    - `survey`:
      - `id`: survey_id
      - `title`: string
      - `language_id`: number
      - `questions`: flat array for back-compat
      - `sections`: grouped by `section_id` for paging
      - `previous_responses`: prefills if user has in-progress answers
    - `trigger`: stub for compatibility
    - `progress`:
      - `family_id`: survey_families id (when in progress)
      - `status`: `in_progress` | `completed` | `scheduled`
      - `next_section_id`: first section with required unanswered question
  - Notes:
    - Questions include: `id` (survey_question_id), `type`, `prompt`, `order`, `section_id`, `required`, `options` (and alias `answers`).
    - Options include: `id` (answer_id), `value` (answer_value), `label` (answer_text), `order`.

- **GET `/surveys/client-bundle?registration_id=...&language_id=...`**
  - Purpose: all-in-one package for client navigation/rendering.
  - Response superset:
    - All fields from `/surveys/active`, plus an `engine` object:
      ```json
      {
        "engine": {
          "survey_id": 7,
          "language_id": 1,
          "sections": [
            /* same as survey.sections */
          ],
          "questions": [
            /* same as survey.questions */
          ],
          "questionsById": {
            "16": {
              "id": 16,
              "type": "multiple_choice",
              "required": true,
              "section_id": 1,
              "prompt": "..."
            }
          },
          "optionsByQuestionId": { "16": [{ "id": 1001, "value": "Y", "label": "Yes" }] },
          "rules": {
            "skipLogic": [
              { "source_question_id": 16, "answer_id": 1001, "destination_question_id": 22 }
            ],
            "requiredByQuestionId": { "16": true, "17": true }
          }
        }
      }
      ```
  - Skip logic source: `survey_skip_logic` (only `status_id=1` rules, filtered to this survey’s question ids).

#### Submission (staged completion)

- **POST `/surveys/submit`**
  - Supports staged saves:
    - `is_final=false`: saves responses and marks status `in_progress`.
    - `is_final=true` (default): finalizes and marks `completed`.
  - Optional `section_id` can be included by the client for analytics/telemetry.
  - Responses support multiple input types:
    - For multiple-choice: send `answer_id` (validated against the mapped `question_id`), optional `answer_value`, and `answer_text` if applicable.
    - For free text / numeric / scale: send `answer_value` (string).
  - Window enforcement:
    - If a survey family was pre-assigned with `presented_at`, the survey is available from `presented_at` until `presented_at + 7 days`.

#### Shapes and examples

- Example: request client bundle (English)

  ```http
  GET /api/surveys/client-bundle?registration_id=39932&language_id=1
  Authorization: Bearer <JWT>
  ```

- Example: submit staged section
  ```json
  {
    "survey_id": 7,
    "trigger_id": 10,
    "registration_id": 39932,
    "section_id": 2,
    "is_final": false,
    "responses": [
      { "question_id": 16, "answer_id": 1001 }, // multiple-choice
      { "question_id": 23, "answer_value": "3" } // numeric/scale/free-text
    ]
  }
  ```

#### UI checklist

- Use `GET /surveys/client-bundle` for client-driven flows.
- Respect `progress.next_section_id` to resume; prefill from `previous_responses`.
- Honor `required` flags per section; compute “next” using `rules.skipLogic` if the user selects a matching `answer_id`.
- Include `language_id` when you want a specific translation; else omit to use the survey default.
- For server-driven (legacy) flows, `GET /surveys/active` remains supported.

#### Auth

- Send one of:
  - `Authorization: Bearer <JWT>`
  - `X-Guest-Token: <token>`

#### Feature flag

- Default: enabled. Endpoints read/write real data unless explicitly disabled.
- To disable, set `FEATURE_FEEDBACK=false`:
  - GET returns a small scaffolded questionnaire with `has_submitted=false` (no DB access).
  - POST returns `501` with a “Feedback feature is disabled” message.

#### Endpoints

- GET `/reservations/:id/feedback`
  - Purpose: Check if the user has already submitted feedback and fetch the questionnaire to render.
  - Path params: `id` = reservation id (our `registration.id`).
  - Headers: Auth as above (JWT or `X-Guest-Token`).
  - Response:
    ```json
    {
      "id": 987654321, // submission id if exists, else null
      "registration_id": 123,
      "has_submitted": true, // or false if not submitted yet
      "submitted_at": "2026-02-12T15:04:05.000Z",
      "rating": 4, // 1–5 if derivable from answers; else null
      "comments": null, // reserved; may be null
      "questionnaire": {
        "id": 55,
        "version": 1,
        "title": "Post-Event Feedback",
        "questions": [
          {
            "id": 101, // survey_question_id (use this in POST)
            "order": 1,
            "type": "scale_1_5",
            "prompt": "How satisfied were you with check-in?",
            "required": true,
            "options": [{ "id": 1, "value": "1", "label": "Very dissatisfied", "order": 1 }]
          }
        ]
      },
      "responses": [{ "question_id": 101, "scale_value": 4 }]
    }
    ```
  - Notes:
    - `questionnaire.questions[*].id` is the per-survey question id (aka `survey_question_id`). Use this in `POST.responses[*].question_id`.
    - If `has_submitted` is true, `responses` contains the user’s previous answers (only numeric `scale_value` are echoed).

- POST `/reservations/:id/feedback`
  - Purpose: Persist a single feedback submission per reservation.
  - Path params: `id` = reservation id (our `registration.id`).
  - Headers: Auth as above (JWT or `X-Guest-Token`).
  - Body:
    ```json
    {
      "rating": 4, // overall star rating (1–5)
      "comments": "Very smooth check-in.", // optional
      "responses": [
        { "question_id": 101, "scale_value": 4 },
        { "question_id": 102, "scale_value": 5 },
        { "question_id": 103, "scale_value": 4 }
      ]
    }
    ```
  - Response:
    ```json
    {
      "id": 987654321, // created submission id
      "registration_id": 123,
      "submitted_at": "2026-02-12T15:04:05.000Z",
      "rating": 4,
      "comments": "Very smooth check-in."
    }
    ```

#### UI flow

1. Call GET `/reservations/:id/feedback` with auth headers.
2. If `has_submitted` is false:
   - Render each `questionnaire.questions[*]` as a 1–5 star control (use `options` for labels if present).
   - Include an optional free-text comments input.
3. On submit, POST to `/reservations/:id/feedback` with `rating`, `comments`, and `responses` using `question_id` from the GET and `scale_value` 1–5.
4. Handle response and errors (see below).

#### States and rules

- Ownership: The reservation must belong to the authenticated user’s household.
- Timing: Feedback is available on/after the event date and for 14 days after; otherwise:
  - Before event day: `403` “Feedback not yet available”.
  - After 14 days: `403` “Feedback window has closed”.
- Idempotency: If already submitted, POST returns `409`.

#### Errors

- `401`/`403`: Authentication/authorization/ownership failures.
- `403`: Not yet available or window closed.
- `409`: Already submitted for this reservation.
- `422`: Validation error (e.g., missing required responses).
- `501`: Feature disabled (when `FEATURE_FEEDBACK=false`).

#### Example (fetch)

```ts
async function loadFeedback(registrationId: number, token: string) {
  const res = await fetch(`/api/reservations/${registrationId}/feedback`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return res.json();
}

async function submitFeedback(registrationId: number, token: string, payload: any) {
  const res = await fetch(`/api/reservations/${registrationId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`POST failed: ${res.status}`);
  return res.json();
}
```
