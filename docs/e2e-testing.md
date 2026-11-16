# E2E tests

The e2e suite (`test/**/*.e2e-spec.ts`, config `test/jest-e2e.json`) boots the full Nest
`AppModule` against a real MySQL and drives it over HTTP with supertest.

CI runs it on every push and pull request to `main` and `beta`
(`.github/workflows/e2e.yml`, a `mysql:8.0` service container on port 3306).

## Quick start

1. Start a throwaway MySQL 8 on a local port (3317 here, so it can't collide with a local 3306):

   ```bash
   docker run -d --name e2e-mysql -p 127.0.0.1:3317:3306 -e MYSQL_ROOT_PASSWORD=password mysql:8.0
   ```

   Wait until it answers (about 15–30 s on first start):

   ```bash
   docker exec e2e-mysql mysqladmin -uroot -ppassword ping
   ```

2. Run the suite. `test:e2e` builds `dist/` first, because the DB helpers load `data-source.js`,
   which reads compiled entities.

   ```bash
   DB_PORT=3317 npm run test:e2e
   ```

3. Remove the container when you're done:

   ```bash
   docker rm -f e2e-mysql
   ```

The specs share one database and truncate it after each test, so they run serially
(`maxWorkers: 1`).

## What `test/setup-e2e.ts` does

- **Databases.** Creates them if missing: `DB_DATABASE` (default `freshtrak_private_test`),
  `DB_PUBLIC_DATABASE` (default `freshtrak_public_test`) and `freshtrak_public`. The public event
  entities hardcode `@Entity(..., { database: 'freshtrak_public' })`, so that schema must exist
  on the public server whatever `DB_PUBLIC_DATABASE` is.
- **Schema.** The Nest app builds it with TypeORM `synchronize` (on whenever `NODE_ENV=test`).
  Migrations are off by default. `USE_MIGRATIONS=1` also runs `dist/migrations`, which expect
  the base tables to exist already.
- **Cleanup.** After each test it truncates every table in the private test schema.
- **Local only.** It refuses to run unless `DB_HOST` and `DB_PUBLIC_HOST` are local
  (`127.0.0.1`, `localhost`, `::1`, `host.docker.internal`, `mysql`), because both connections
  synchronize and truncate tables. `DB_PUBLIC_*` defaults to the private connection's
  host, port and credentials, so a developer `.env` pointing at RDS is never used.
- **Integrations off.** It forces `PANTRY_TRAK_ENABLED`, `SENDGRID_ENABLED` and `TWILIO_ENABLED` to
  `false` and blanks their keys. Nest's `ConfigModule` never overrides variables that are
  already set, so `.env` can't turn them back on. `NODE_ENV` is forced to `test`, which also
  puts the password-reset mailer on an in-memory transport.
- **Auth.** It uses `USE_LOCAL_JWT=1`, so JWTs are HS256 tokens signed with `JWT_SECRET`
  (default `test-secret`).

## Env overrides

Put overrides in `.env.test`, or set them in the shell. Shell values win. The variables you're
likely to change are `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` and the
matching `DB_PUBLIC_*` variables.

## Writing specs

- Specs build the app with `Test.createTestingModule({ imports: [AppModule] })`, not `main.ts`.
  There's no global `ValidationPipe` or exception filter unless the spec adds them.
- To act as a signed-in user, use `cognitoJwt()` from `test/helpers/jwt.ts`. The registrations
  service resolves the user from `sub` as a Cognito UUID. Tokens from the legacy
  `POST /auth/login` carry the numeric DB user id as `sub`, so every request with one would
  provision a new user and household (and check-in or cancel then gets a 403).
- Capacity is enforced per public slot/date or local timeslot. Event-level `capacity` alone is
  ignored, so capacity specs need a timeslot.
