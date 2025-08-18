# Migration Plan: freshtrak-registration-api-master to NestJS (pantry-registration-api-node)

## Overview
This document outlines the high-level plan for migrating the freshtrak-registration-api-master (Ruby on Rails) to a NestJS-based API, using pantry-registration-api-node as the implementation target and pantry-finder-api-node as the structural reference.

---

## Migration Phases & Milestones

### 1. Discovery & Analysis
- Inventory all controllers, models, services, and routes in the Rails app
- Document all API endpoints, business logic, and data models
- Identify external integrations and dependencies

### 2. Project Setup
- Align pantry-registration-api-node structure to match pantry-finder-api-node
- Set up environment configuration, TypeORM, and testing framework

### 3. Data Layer Migration
- Map Rails models to TypeORM entities
- Define relationships and write migration scripts as needed
- Validate schema and data integrity

### 4. Module-by-Module Migration
- For each feature/module:
  - Create NestJS module, controller, service, DTOs
  - Port business logic and validations
  - Implement endpoints to match original API
  - Write unit and e2e tests
  - Document with a PRD in /tasks

#### Module Migration Order (by priority):
1. User Authentication & Management
2. Household Management
3. Reservation & Event Registration
4. Communication Preferences
5. Twilio Integration
6. Supporting Data & Lookups
7. Helpers & Base Functionality

### 5. Integration & QA
- Test each module independently and as part of the whole system
- Peer review and QA for each feature
- Validate against original API behavior

### 6. Deployment & Monitoring
- Set up Docker, CI/CD, and environment configs
- Prepare for production deployment
- Set up logging and monitoring

---

## Tracking Table
| Module                        | Status      | Notes                |
|-------------------------------|-------------|----------------------|
| User Authentication & Mgmt    | Not Started |                      |
| Household Management          | Not Started |                      |
| Reservation & Event Reg.      | Not Started |                      |
| Communication Preferences     | Not Started |                      |
| Twilio Integration            | Not Started |                      |
| Supporting Data & Lookups     | Not Started |                      |
| Helpers & Base Functionality  | Not Started |                      |

---

## Next Steps
- Begin with PRD and implementation for User Authentication & Management
- Update this document as modules progress
