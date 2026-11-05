# Tenant login and authenticator enrollment

## Deployment (required)

1. Apply `database/migrations/004_tenant_totp.sql` once, after the existing schema
   migrations. It adds dedicated credentials, expiring challenges and per-user rate
   limits; generated Users/Tenants models need no regeneration.
2. Generate a **separate** 32-byte encryption key using `openssl rand -hex 32`.
   Configure its 64 hex characters as `custom_config.TOTP_KEY` in the **C++ server's
   loaded Drogon configuration** (a sibling of `JwtBearer` inside `custom_config`).
   `encryptionKey()` reads `drogon::app().getCustomConfig()["TOTP_KEY"]`; there is no
   environment-variable fallback. Never commit the key or reuse the JWT signing key. Store
   it in a secret manager, back it up securely, and use the same key on every
   backend replica. Missing/incorrect keys fail closed for MFA tenants. Replacing
   it without re-encrypting credentials makes existing authenticators unusable;
   automatic key rotation is not implemented. Keep the existing key unchanged if
   moving it from the previous environment-based setup. Restart the backend after
   changing configuration. `main.cc` currently prefers `config.json` over
   `config.local.json`, so update the file actually loaded by the running server;
   a local file does not override an existing `config.json`. The committed
   `TOTP_KEY` placeholder stays empty; inject the real key through secure deployment
   configuration, not frontend/public runtime configuration.
3. Configure the Nuxt server's `NUXT_AUTH_API_BASE_URL` with the backend **origin**
   (not an `/api` path). `AUTH_API_BASE_URL` is also supported when starting Nuxt
   dev/build. For example, on a developer machine with the backend on port 5004,
   set `NUXT_AUTH_API_BASE_URL=http://127.0.0.1:5004`. That address is used only by
   the Nuxt server, never by browser code. Set `NUXT_LEDGER_API_BASE_URL` separately
   for real ledger calls. Never expose these URLs or JWTs in public runtime config.
4. Use HTTPS in production. JWT/challenge cookies are Secure, HttpOnly,
   SameSite=Strict and path `/`; the non-sensitive `tl_authed` hint is not treated
   as authorization. Browser requests use same-origin `/api/auth/*`. Cross-origin
   auth mutations are rejected. Ensure a reverse proxy forwards the correct
   request host/protocol so same-origin checks match the public origin.
5. Enable `tenants.require_two_factor_auth` for the relevant live tenant using
   authorized administration. There is no client-side switch that can bypass it.
   Existing password-only JWTs are denied immediately on their next protected
   tenant request, so affected users must sign in again.

The new login deliberately has **no demo-password/session fallback**. Missing or
failed upstream configuration returns 503, never a successful mock login. Legacy
mock signup/password-reset routes now explicitly return 501 instead of pretending
to change real accounts. `/signup` directs users to their platform administrator.
The legacy settings authenticator flow does not enroll/reset real authenticators. The old
`GET /api/auth/setup-2fa?username=...` now returns 410: a username must never expose
an existing authenticator secret. Enrollment is offered only after real tenant
password authentication. Provision real users/tenants using the existing
permission-protected management APIs.

## Browser flow

`/login` collects **accountId, usernameOrEmail, password**, initially empty. The
password is sent unchanged, then cleared from page state. `accountId` is the
current tenant's `tenancy_name`, not its UUID.

- **2FA disabled:** backend returns a JWT; Nitro stores it in an HttpOnly cookie
  and the browser opens **`/modules`**.
- **2FA enabled, first enrollment:** password success returns a five-minute opaque
  challenge **without a JWT**. Nitro keeps the challenge in an HttpOnly cookie;
  the browser receives a real PNG QR code and manual base32 key. Scan it in Google
  Authenticator, Microsoft Authenticator, Authy or a compatible TOTP app, then
  enter the generated six-digit code. Only a correct code persists the credential
  and results in a JWT, after which the browser opens `/modules`.
- **Already enrolled:** show the code form, **never** the saved QR or secret. Use
  the existing authenticator entry. The QR is not regenerated or polled, and no
  current-code demo hints are returned. Challenges are single-use and expire;
  back/retry starts a new password login. Challenge/secret state is cleared after
  completion, expiry or leaving the page.

QR encoding happens locally on Nitro using `qrcode`; no secret is sent to a QR
image service. The URI is standard
`otpauth://totp/<issuer>:<account>?secret=...&issuer=BusinessDesk&algorithm=SHA1&digits=6&period=30`.
It includes a tenant/user-specific label, a four-module white quiet zone, black
modules and medium error correction. Browser route guards call `/api/auth/me`,
which validates the JWT and current account/tenant policy against the backend;
a forged browser hint cookie cannot open the module manager.

## Backend contract

All bodies use the existing `{success, result, error}` envelope and `no-store`.

### POST `/api/v1/auth/tenant-login`

```json
{"accountId":"acme","usernameOrEmail":"admin@example.com","password":"<password>"}
```

For a tenant without 2FA, `result` includes the normal `token`, `expiresIn`, public
identity/permissions and `requiresTwoFactorAuth: false`.

For a tenant requiring 2FA, `result` includes:

```json
{
  "requiresTwoFactorAuth": true,
  "challengeId": "<opaque 64-character token>",
  "expiresIn": 300,
  "enrollmentRequired": true,
  "secret": "<base32 key shown only on new enrollment>",
  "issuer": "BusinessDesk",
  "accountLabel": "acme/admin"
}
```

`secret`, `issuer` and `accountLabel` are absent when already enrolled. No access
JWT is issued in either challenge case. Client-provided policy/privilege fields
are not used. Passwords, JWTs, secrets, codes and challenge IDs must be redacted
from infrastructure request/response logs.

### POST `/api/v1/auth/tenant-verify-totp`

```json
{"challengeId":"<password-authenticated challenge>","code":"123456"}
```

On success, returns the normal JWT response with `requiresTwoFactorAuth: true`.
The signed JWT has boolean `mfa: true`. Tenant filters consult current tenant
policy and require this signed evidence when 2FA is enabled. Password-only tokens
have `mfa: false`; legacy absent claims are treated as false. Host login is
unchanged; this policy is tenant-specific.

Verification uses RFC 6238 SHA-1, six digits, 30-second steps and ±1 step clock
skew. Synchronize backend clocks. Each challenge permits five verification
attempts; each user separately has ten challenge creations and ten code attempts
per five-minute fixed window, shared across backend replicas in PostgreSQL. These
budgets are independent of new challenge creation. Use edge/IP limits for login
password guessing and request-flood protection as well.

Only SHA-256 challenge hashes are persisted. Secrets are AES-256-GCM encrypted
with random nonces; authenticated data binds ciphertext to tenant and user. A
password fingerprint invalidates pending challenges after password changes.
Completing a challenge atomically consumes it and inserts/advances the saved TOTP
counter. A previously accepted counter is rejected even with another challenge;
a competing enrollment cannot overwrite an existing secret. Consumption can
succeed while the credential update is rejected (e.g. replay), but **only** a
returned credential row authorizes JWT issuance. User active/unlocked/non-deleted,
exact tenant membership, non-host realm and live/active tenant policy are checked
again at completion, with `is_deleted = false` throughout user/tenant lookups.

Invalid/expired/exhausted codes/challenges return 401. Malformed bodies return
400; infrastructure/key failures return generic 503 without database details or
partial tokens. `OPTIONS` returns 204 without authenticating. If JWT issuance
fails after the challenge was consumed, restart password login; it must not be
replayed automatically.

### GET `/api/v1/auth/me`

Protected by `TenantJwtAuthFilter`; returns current tenant/account/user identity
and permissions, without JWTs or secrets. Used server-to-server by Nitro, including
its ledger session adapter. Browser auth responses never contain access JWTs or
challenge IDs; they remain in HttpOnly cookies, not local/session storage.

## Operations and limitations

- Schedule deletion of expired `auth_totp_challenges` (e.g. daily) and old
  `auth_totp_rate_limits` windows using your maintenance job. The predicates
  enforce expiry even before cleanup. These security tables deliberately have
  no soft-delete/display API; Users/Tenants retain their audited soft-delete rules.
- No anonymous secret lookup, public reset endpoint, recovery codes, SMS fallback
  or authenticator replacement UI is provided. Lost-device recovery requires a
  trusted operator to verify identity, audit the recovery, invalidate **all**
  pending challenges for the user and remove that user's credential in one
  transaction. Next password login offers enrollment again. Do not simply expose
  the saved secret or disable tenant policy as recovery.
- Existing JWTs still expire normally; password changes/sign-out or authenticator
  reset do not revoke already-issued MFA JWTs. A session/version check or denylist
  is separate work. Reactivating a suspended account can restore an unexpired
  token. Requests already authorized in flight are not cancelled retroactively.
- Changing tenant policy/credential data during a request is subject to ordinary
  in-flight authorization timing; no distributed cancellation is attempted.

## Verification

- `test/users/run.sh`: real bcrypt/OpenSSL/JWT with injected HTTP/ORM; includes
  RFC TOTP vectors, GCM tamper/AAD checks, both login branches, enrollment,
  key/database failure, expiry/attempt limits, replay, lockout/password changes,
  and JWT-filter MFA policy enforcement.
- `node test/auth/totp_sql_test.mjs <pglite-module-path>`: executes migration and
  actual production statements in PostgreSQL/WASM, covering atomic consumption,
  persisted counters, rate budgets, state rechecks and rollback. PGlite serializes
  statements; this is not a multi-connection PostgreSQL load/concurrency test.
- Build the frontend first, then run
  `node --experimental-strip-types test/auth/frontend_auth_test.mjs <test-deps-dir>`.
  The directory must have `pngjs` and `jsqr` installed. This starts the built Nitro
  server against a test upstream and exercises HTTP routes, protected module SSR,
  cookies, failures, and decoding the generated PNG QR back to its TOTP URI.
- `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`.

These cover frontend HTTP behavior, C++ service/crypto logic and real SQL
separately, not a fully linked live Drogon/PostgreSQL/browser deployment. Test
that deployment, including a phone scan and multi-replica race behavior, before
production rollout.
