## Environment variables: freshtrak_public connection

Set these in your environment to enable the read-only public schedule connection:

- DB_PUBLIC_HOST
- DB_PUBLIC_PORT (default 3306)
- DB_PUBLIC_USERNAME
- DB_PUBLIC_PASSWORD
- DB_PUBLIC_DATABASE (e.g., freshtrak_public)

Notes

- The app keeps using the existing private DB env vars for writes.
- Public schedule reads and capacity counters (increment/decrement) use this connection.
