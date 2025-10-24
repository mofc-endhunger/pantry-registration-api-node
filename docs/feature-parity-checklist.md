# Endpoint and Feature Checklist: freshtrak-registration-api-master vs pantry-registration-api-node

This checklist is designed to help verify that all features and endpoints from the Ruby API (`freshtrak-registration-api-master`) are present in the Node/NestJS API (`pantry-registration-api-node`).

## 1. Endpoints

- [ ] Household registration (POST)
- [ ] Household update (PATCH)
- [ ] User registration (POST)
- [ ] User update (PATCH)
- [ ] Event registration (POST)
- [ ] Public event date query (GET)
- [ ] Authentication endpoints (JWT, guest tokens)
- [ ] Any other endpoints found in Ruby API

## 2. Business Logic

- [ ] Address history: insert new, soft-delete old addresses
- [ ] Timestamps: created_at, updated_at, deleted_on (automatic)
- [ ] Only latest (non-deleted) address returned by default
- [ ] Validation and error handling matches Ruby API
- [ ] Registration flows match Ruby logic

## 3. Authentication & Authorization

- [ ] Cognito JWT support
- [ ] Guest token support
- [ ] Proper guards for endpoints

## 4. Data Model & DTOs

- [ ] Entities/DTOs match Ruby models (fields, types)
- [ ] All required fields present
- [ ] No missing or extra fields unless intentional

## 5. Other Features

- [ ] No background jobs or external integrations in Ruby API
- [ ] No model callbacks or hooks missed
- [ ] No Ruby-specific features unaccounted for

## 6. New Functionality (Node API)

- [ ] Improved address history logic
- [ ] Dual token authentication
- [ ] Any other enhancements documented

---

**Instructions:**

- Review each item and check off as you verify parity or improvement.
- Use this document to guide QA, code review, and team discussions.
- Update as new features are added or discovered.
