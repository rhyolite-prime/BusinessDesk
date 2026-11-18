# BusinessDesk frontend — local Journal testing

## Start the app

From this directory, install dependencies and run the development server:

```sh
pnpm install --frozen-lockfile
export NUXT_AUTH_API_BASE_URL=http://localhost:5004
# Optional: set NUXT_LEDGER_API_BASE_URL if the ledger API uses a different origin.
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

The Journal editor/register and ledger dashboard use authenticated live APIs,
with the ledger origin falling back to the auth origin. They do not load the
legacy account fixtures retained in `server/utils/ledger-demo.ts`. Legacy mock
signup and settings authenticator setup do not provision real accounts; use the
backend management APIs.

## Validate the Add line behavior

Use a disposable test tenant/database. Open **General Ledger → Journal entries →
New**, enter one of these sets of draft amounts manually, then click **Add line**:

| Scenario | Starting totals (GHS) | Expected new line |
| --- | ---: | --- |
| GHS debit ahead | Debit 1,250; credit 500 | Credit 750 |
| GHS credit ahead | Debit 500; credit 1,250 | Debit 750 |
| Balanced GHS | Debit 1,250; credit 1,250 | Debit and credit stay empty |
| USD / GHS FX | USD debit 100 × 12.5; GHS credit 400 | GHS credit 850 at rate 1 |

Unsaved form edits do not create a journal. Saving persists the draft to the
configured backend; it is not an in-memory mock that resets with the dev server.

The active Nuxt Journal editor and its Add line implementation are in `app/pages/ledger/journals/new.vue`. `cs-template/GeneralLedger/js/journal.js` is a legacy MVC reference, not the runtime script for the Nuxt app.

## Live ledger dashboard and voucher bank GLs

`/ledger` now uses the real tenant ledger API, including in development and when
public demo mode is enabled. It never falls back to seeded balances or invented
trend percentages. Date ranges/presets, accounting unit, hierarchical cost center,
transaction source/currency and activity-status filters are supported. Financial
indicators are posted-only; end-date balances retain opening history, while
income/expenses use the selected period. Connection errors and genuinely empty
records have distinct states. Deploy the new C++ dashboard endpoints alongside
Nuxt; see [calculation policy, API and tests](../docs/ledger-dashboard.md).

All supplier, employee and customer receipt voucher header bank GL selectors
show only active eligible GLs with active linked Bank Accounts in the selected
accounting unit. Other allocation/withholding/retention GL choices are unchanged.

## Account Heads

`/ledger/account-heads` now uses real authenticated backend CRUD and a live
accounting-unit selector, without demo fallback. Configure
`NUXT_LEDGER_API_BASE_URL` (or use the existing auth origin). Every upstream
request carries the signed-in user's bearer token; JWTs stay in HttpOnly cookies.
See [Account Heads setup, contract and tests](../docs/account-heads-frontend.md).
