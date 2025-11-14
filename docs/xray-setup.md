### Xray Integration Setup

1. Jira/Xray configuration

- Install Xray on the Jira project.
- Enable issue types: Test, Test Set, Test Plan, Test Execution, Precondition.
- Decide which Epics/Stories are “requirements” for coverage.

2. Import manual tests

- Lift scenarios from docs/test-plan.md into Xray Tests.
- Group by module using Test Sets (auth, households, registrations).
- Create Preconditions for environment/DB seed steps and link to Tests.

3. CI results publishing

- We generate JUnit via `jest-junit` using `npm run test:ci`.
- The workflow `.github/workflows/test-and-publish-xray.yml` authenticates and uploads `reports/junit.xml` to Xray Cloud.
- Required GitHub Secrets:
  - `XRAY_CLIENT_ID`
  - `XRAY_CLIENT_SECRET`
  - `XRAY_PROJECT_KEY` (e.g., PRJ)
  - `XRAY_CLOUD_BASE_URL` (optional; defaults to `https://xray.cloud.getxray.app`)

4. Plans and executions

- Create Test Plans for milestones (e.g., “Beta Cut 1”).
- The workflow creates Test Executions from JUnit. Associate them with a plan in Xray UI (or use the advanced import API if needed).

5. Dashboards

- Enable requirement coverage, plan execution progress, and failures by component.

6. UAT / Exploratory

- Use Xray Exploratory Testing to record UAT sessions and link evidence/defects.
