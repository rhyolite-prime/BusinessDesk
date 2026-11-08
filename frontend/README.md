# BusinessDesk frontend — local Journal testing

## Start the app

From this directory, install dependencies and run the development server:

```sh
pnpm install --frozen-lockfile
export NUXT_AUTH_API_BASE_URL=http://localhost:5004
# Optional: set NUXT_LEDGER_API_BASE_URL to use a real ledger service.
npm run dev
```

Local development defaults to the backend origin `http://localhost:5004`.
Tenant login is forwarded server-side to
`http://localhost:5004/api/v1/auth/tenant-login`. Override
`NUXT_AUTH_API_BASE_URL` when the backend runs elsewhere (for example, another
container). Set only the origin, not the full login path. Production still
requires an explicitly configured backend origin.

Sign in with a real tenant's **accountId (tenancy name), usernameOrEmail and
password**. The login page remembers only the account ID in this browser's local
storage (`businessdesk.accountId`) and restores it on each visit. Editing it updates
the saved value; clearing the field removes it. Passwords, usernames and tokens
are not stored there. Storage restrictions do not prevent login.

A tenant with 2FA disabled goes directly to `/modules`; one requiring
2FA must enroll/verify an authenticator before a JWT session is created. No demo
password or current-code hint is accepted/shown. Missing auth upstream returns 503.

Apply backend migration `004_tenant_totp.sql` and configure backend `custom_config.TOTP_KEY`
before enabling 2FA. See [deployment, API contract and tests](../docs/tenant-two-factor-authentication.md).
JWT/challenge cookies remain HttpOnly, and browser calls use same-origin `/api`.

With the ledger upstream unset, development Journal data still uses seeded,
in-memory mocks **after real authentication**. The Journal mock accounts and
sample entries are in `server/utils/ledger-demo.ts`. Legacy mock signup and settings
authenticator setup do not provision real accounts; use the backend management APIs.

## Validate the Add line behavior

Open **General Ledger → Journal entries → New**. In development, the **Local journal test data** panel loads mock scenarios into the draft. Load a scenario, then click **Add line**:

| Scenario | Starting totals (GHS) | Expected new line |
| --- | ---: | --- |
| GHS debit ahead | Debit 1,250; credit 500 | Credit 750 |
| GHS credit ahead | Debit 500; credit 1,250 | Debit 750 |
| Balanced GHS | Debit 1,250; credit 1,250 | Debit and credit stay empty |
| USD / GHS FX | USD debit 100 × 12.5; GHS credit 400 | GHS credit 850 at rate 1 |

The test panel is only rendered by the development build; it does not create a journal until you save. Drafts and sequence changes are kept in server memory and reset when the dev server restarts.

The active Nuxt Journal editor and its Add line implementation are in `app/pages/ledger/journals/new.vue`. `cs-template/GeneralLedger/js/journal.js` is a legacy MVC reference, not the runtime script for the Nuxt app.

## Account Heads

`/ledger/account-heads` now uses real authenticated backend CRUD and a live
accounting-unit selector, without demo fallback. Configure
`NUXT_LEDGER_API_BASE_URL` (or use the existing auth origin). Every upstream
request carries the signed-in user's bearer token; JWTs stay in HttpOnly cookies.
See [Account Heads setup, contract and tests](../docs/account-heads-frontend.md).
