# Frontend authentication integration

The frontend does not authenticate users by itself. Configure `AUTH_API_BASE_URL` to connect it to an authentication service. For a prebuilt Nitro deployment, set the runtime override `NUXT_AUTH_API_BASE_URL` (and `NUXT_LEDGER_API_BASE_URL` for the ledger service). The Nuxt server acts as a same-origin BFF and expects this upstream contract:

- `POST /api/v1/auth/login` accepts `{ "accountId", "username", "password" }` and returns `{ "accessToken", "expiresInSeconds?", "user": { "accountId", "username", "displayName?" } }`.
- `GET /api/v1/auth/session` accepts a bearer access token and returns `{ "user": { "accountId", "username", "displayName?" } }`.
- `POST /api/v1/auth/logout` accepts the bearer access token and revokes it when supported.

The browser calls only `/api/auth/*`. The access token is stored in an HttpOnly, SameSite=Lax cookie and is not exposed to client JavaScript. Protected ledger BFF routes validate the session with the auth service and forward the bearer token to `LEDGER_API_BASE_URL`. The ledger service must still enforce authorization and tenant/account access for every request.

For local UI preview only, run Nuxt in development with `AUTH_DEMO_MODE=true`. Any non-empty credentials are accepted in this mode, and the UI labels the session as a demo. This mode is disabled outside `NODE_ENV=development` and must not be enabled as a substitute for production authentication. Without a configured auth service or the explicit local demo flag, sign-in returns `503` rather than accepting credentials.
