# Company profile

## Deployment and scope

Apply `database/migrations/008_company_profiles.sql` after migrations 001–007,
then rebuild/restart the C++ backend and Nuxt frontend. Deploy this migration
before the updated backend: currency deletion/deactivation guards now check live
company profiles too. The down migration destroys all profile data and encrypted
SMTP credentials; roll back the application changes before dropping the table.

`core_company_profiles` is tenant-owned, with UUID IDs and UUID tenant IDs matching
this repository (rather than the C# integer tenant type). `UNIQUE(tenant_id)`
enforces **at most one profile per tenant**, even if an external administrator
soft-deletes a row. A tenant starts without a profile until its first POST.
Creation and update serialize on the live tenant row. No delete operation is
provided: both the backend and BFF explicitly reject DELETE with 403 for an
authenticated tenant. Full audit columns are retained for model consistency.

All reads and writes explicitly restrict `tenant_id` from the verified identity
and `is_deleted=false`. Tenant and host cookies/JWTs are not interchangeable;
clients cannot supply IDs, tenant/scope, audit fields or soft-delete flags.
Authorization follows the existing tenant setup pattern (`TenantJwtAuthFilter`),
not a new company-profile-specific role policy. Audit actor fields are derived
from JWT identity, never browser input.

## API

| Method | Backend | Behavior |
| --- | --- | --- |
| GET | `/api/v1/shared/company-profile` | View the caller's live singleton |
| POST | `/api/v1/shared/company-profile` | Create it (201); existing profile=409 |
| PUT | `/api/v1/shared/company-profile` | Merge supplied editable fields (200) |
| DELETE | `/api/v1/shared/company-profile` | Forbidden (403) |

GET/PUT before creation return 404. No profile ID or tenant ID is accepted in the
URL; scope always comes from the tenant JWT. Standard backend envelope:
`{success,result,error}`. Validation=400, missing/wrong-scope authentication=401,
forbidden deletion=403, missing live profile=404, singleton conflict=409,
DB/commit/encryption-configuration errors=503. No successful operation is reported
before transaction commit.

Minimal creation:

```json
{
  "companyName": "Example Company",
  "countryName": "Ghana",
  "cityName": "Accra",
  "firstMonthOfFiscalYear": 1,
  "paySocialSecurityFund": true,
  "socialSecurityFundEmployeeRate": 5.5,
  "socialSecurityFundEmployerRate": 13
}
```

All editable C# model fields are persisted in typed columns. API fields use
camelCase. Defaults for new profiles: empty strings, false booleans, zero rates,
null optional UUIDs, January (1) as fiscal start and port 0 (not configured).
PUT preserves unspecified fields, including the saved password. Supplied nulls
are accepted only for optional UUIDs, not strings/numbers/booleans.

### Company and accounting fields

- Required `companyName`: trimmed, 1–200 bytes.
- `countryName` (100), `cityName` (160), `phoneNo` (50), `address` (1000),
  `companyTin` (100), `vatNo` (100), `email` (254).
- `country`: optional UUID. No country registry exists in the current repository,
  so it is format-validated and stored separately from `countryName`, not checked
  against a fabricated lookup table.
- `firstMonthOfFiscalYear`: integer 1–12.
- `defaultCurrencyId`: optional UUID referencing an active, nondeleted global
  currency. The C# typo `DefaultCurrenyId` is exposed canonically as
  `defaultCurrencyId`; legacy input `defaultCurrenyId` is accepted, but supplying
  both names is rejected. Responses always use the canonical spelling.
- `companyLogoUrl`: max 2048 bytes; HTTP(S) or app-relative path, without control
  characters/backslashes. This feature does not upload or fetch/render remote
  logos server-side.

Currency validation locks the selected currency in the write transaction. The
existing currency service now treats any live profile default as a reference,
blocking currency deletion, deactivation and code/precision changes; currency
name changes remain allowed. Null/blank/Guid.Empty UUID inputs normalize to null.

### Statutory and fund settings

- `employerSocialSecurityNo` (100), `paySocialSecurityFund`,
  `socialSecurityFundEmployeeRate`, `socialSecurityFundEmployerRate`.
- `payProvidentFund`, `providentFundEmployeeRate`, `providentFundEmployerRate`,
  `providentFundTreatAsSocialSecurityFund`, `providentFundTaxEmployerPortion`.
- `paySecondProvidentOrOthers`, `secondProvidentEmployeeRate`,
  `secondProvidentEmployerRate`, `treatSecondProvidentAsSsf`,
  `secondProvidentTaxEmployerPortion`.
- `overtimePercentageOnBasicSalary`, `overtimePercentageOnDailyWage`.

All six rates are numeric percentages, 0–100 inclusive, up to six decimal places,
stored as `numeric(9,6)`. Numeric strings, negative/nonfinite values, oversized
rates, extra precision and nonboolean flags are rejected. Disabled funds retain
their configured rates; values are not silently zeroed. Overtime flags are stored
as supplied; this CRU feature does not infer payroll-calculation policy from them.

### Email and business rules

- `mailHostName` (255), `isSslEnabled`, `portNumber` (integer 0–65535),
  `primaryEmailAddress` (254), write-only `emailPassword` (max 1024 bytes).
- Nonempty SMTP host requires port 1–65535 and a valid primary email address.
  Host names cannot contain URI path/user-info separators or whitespace.
- Nonempty `email` and `primaryEmailAddress` require a basic email-address shape.
- `isTaxLeviesInclusive`, `approveInvoiceBeforePayment`, `enforceOu`.

These fields persist configuration only: they do not send SMTP mail, test an
SMTP connection, execute payroll, implement tax/invoice enforcement or rewrite
existing accounting-unit fiscal calendars.

## SMTP password protection

The model's EmailPassword is **never returned**. Responses include only
`hasEmailPassword` (boolean). Frontend view/edit forms never redisplay a saved
password; an empty replacement input means keep it.

- Omitted or empty `emailPassword`: retain the existing encrypted value.
- Nonempty `emailPassword`: encrypt and replace it.
- `clearEmailPassword:true`: explicitly remove it.
- Replace and clear in one request, nonstring password and nonboolean clear flag
  are rejected. The clear flag is write-only; both password fields are excluded
  from the normal persisted/public field list.

Passwords are stored only as versioned AES-256-GCM ciphertext, with a fresh
random 12-byte nonce and authentication tag. Associated data binds the ciphertext
to the tenant and company-profile SMTP purpose. Decryption rejects tampering and
cross-tenant use. The internal helper is for a future server-side mail sender;
there is no decrypt/export API. Public SQL projections never select ciphertext,
and the Nuxt response adapter uses a positive allowlist of safe fields.

Before writing a nonempty password, configure **a distinct random 32-byte key**
as 64 hexadecimal characters in the backend's Drogon CustomConfig:

```json
{
  "custom_config": {
    "COMPANY_PROFILE_SMTP_KEY": "<64 hex characters supplied by your secret manager>"
  }
}
```

Generate the key securely, e.g. `openssl rand -hex 32`. Do not commit the actual
key or reuse the TOTP key. There is no embedded/default key and no environment
fallback. Missing/invalid key fails closed before persisting a password; profiles
without a password and unrelated updates retaining an existing ciphertext do not
require encryption/decryption. Back up the key securely; replacing it without
re-encrypting existing values will make those passwords unreadable. Automatic
key rotation/re-encryption tooling is outside this change. Deploy behind HTTPS.

## Frontend and proxy

**Shared config → Company profile** opens
`/ledger/shared-config/company-profile`. The app-design-system form groups:
company details, social security, primary/second provident funds, overtime,
email settings and business rules. It includes active-currency lookup, fiscal
month selection, rate limits, separate view/edit states, first-time creation,
cancel/reset, refresh/discard confirmation, error/loading states and explicit
password replacement/removal controls. There is no delete button. Country UUID
entry is optional and clearly labelled rather than inventing a country registry.

Nuxt mirrors the singleton at `/api/shared/company-profile`, forwards the tenant
bearer on every upstream request, unwraps successful bodies as 200 and sanitizes
errors. Browser requests use relative URLs and the existing ledger/auth upstream
configuration. HttpOnly tokens remain server-side, responses are `no-store`,
mutations enforce existing origin checks and automatic retries are disabled.

## Verification

- Frontend typecheck/build and actual Drogon 1.9.5 header syntax checks.
- `test/company_profile/run_pg.sh`: production service SQL against real
  PostgreSQL via the synchronous coroutine/libpq transport seam, with real OpenSSL
  AES-GCM. Covers singleton enforcement, tenant isolation, authenticated auditing,
  every field's type/length bounds, rates, fiscal/month/email/currency rules,
  password encryption/preservation/replacement/removal, wrong-tenant/tampered
  ciphertext, fail-closed key configuration, rollback and no deletion.
- Focused ASan/UBSan coverage; currency regression tests now cover profile default
  references blocking unsafe currency mutations.
- `node test/ledger/company_profile_http_test.mjs`: built Nuxt/strict mock upstream,
  all CRU paths, tenant scope, token forwarding, singleton/validation/error status,
  origin/no-delete protection, SSR and deliberate upstream secret-field injection
  to verify the proxy allowlist. Optional external `BANK_BROWSER_DEPS` setup also
  checks grouped-form creation, view/edit/cancel, updates, secret preservation and
  explicit password removal in Chromium.
- Existing tenant, user, currency, bank, System numbers, Cost center and ledger
  regression suites.

Use a **disposable database** for the PostgreSQL service test; it creates/drops
`company_profile_test` including any preexisting contents:

```sh
COMPANY_PROFILE_TEST_DATABASE_URL='host=127.0.0.1 port=5432 user=test dbname=disposable' \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp OPENSSL_SOURCE_DIR=/path/to/built/openssl \
LIBPQ_LIB_DIR=/path/to/libpq bash test/company_profile/run_pg.sh
```

Optionally set `COMPANY_PROFILE_TEST_SANITIZERS` to
`-fsanitize=address,undefined -fno-omit-frame-pointer -g`. The transport seam is not
a running Drogon HTTP/JWT/PostgreSQL deployment; live deployment and concurrent
financial-posting verification remain separate checks.
