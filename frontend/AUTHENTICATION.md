# Frontend authentication integration

The frontend does not authenticate users by itself. Configure `AUTH_API_BASE_URL` to connect it to an authentication service. For a prebuilt Nitro deployment, use the runtime override `NUXT_AUTH_API_BASE_URL`. The Nuxt server acts as a same-origin BFF and requires the upstream provider to finish two-factor verification before it issues a session:

1. `POST /api/v1/auth/login` accepts `{ "accountId", "username", "password" }`. After validating the primary credentials, it sends or starts a verification challenge and returns `{ "challengeId", "maskedDestination?", "expiresInSeconds?" }`. It must not return an access token or establish a session at this step.
2. `POST /api/v1/auth/verify-2fa` accepts `{ "challengeId", "code" }` and, only after successful verification, returns `{ "accessToken", "expiresInSeconds?", "user": { "accountId", "username", "displayName?" } }`.
3. `POST /api/v1/auth/resend-2fa` accepts `{ "challengeId" }` and may return `{ "maskedDestination?", "expiresInSeconds?" }`.
4. `POST /api/v1/auth/cancel-2fa` accepts `{ "challengeId" }` to invalidate a pending challenge when the provider supports cancellation. The frontend clears its local challenge even if this optional upstream request fails.
5. `GET /api/v1/auth/session` accepts a bearer access token and returns `{ "user": { "accountId", "username", "displayName?" } }`.
6. `POST /api/v1/auth/logout` accepts the bearer access token and revokes it when supported.

The browser calls only same-origin `/api/auth/*` routes. The challenge ID is kept in a short-lived HttpOnly, SameSite=Lax cookie; it is not exposed to browser JavaScript. After successful verification, the access token is stored in a separate HttpOnly, SameSite=Lax cookie. Protected ledger BFF routes validate the session with the auth service and forward the bearer token to `LEDGER_API_BASE_URL`. The ledger service must still enforce authorization and tenant/account access for every request. In production, set `AUTH_API_BASE_URL` (or `NUXT_AUTH_API_BASE_URL` at runtime); without a configured provider, sign-in fails closed.

## Development preview

When Nuxt runs in development with no configured auth service, mock sign-in is enabled by default; set `AUTH_DEMO_MODE=false` to disable it. Any non-empty account ID, username, and password within the documented field limits starts the mock challenge. The six-digit preview code `246810` is shown explicitly on the verification screen. The mock challenge expires after five minutes and is invalidated after five incorrect attempts. On success, the app creates a clearly labeled mock session so the module catalog and General Ledger demo views can be explored. No email/SMS is sent, no real identity is checked, and this is not production security. Server-side checks disable mock auth outside `NODE_ENV=development`, regardless of the UI flag.

The module catalog is currently static: General Ledger is linkable and the remaining catalog cards are locked for presentation. Subscription statuses are not entitlements; the Manage Subscriptions dialog explains that a subscription service is not connected yet.
