# Accounting period management

## Deploy

Apply the normal schema prerequisites in order, including journal migration 012,
then apply **`database/migrations/013_accounting_period_management.sql`** to the
backend's database/schema/search path, and rebuild/restart backend and frontend:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/013_accounting_period_management.sql
```

Migration 013 adds an integer period version (existing rows start at 1) and
`gl_accounting_period_events`. It does **not** close existing periods, change
period dates, rewrite postings/balances or fabricate historical events. Period
management reports `schema_not_ready` / 503 with migration instructions until
it is installed. No runtime DDL or automatic migrations are performed.

The `.down.sql` is a **destructive rollback**: it drops the transition audit and
version column but leaves period records and current statuses intact. Back up
first; stop application writes and deploy a compatible application version if
rolling back. Do not run down scripts to fix a missing upgrade.

## Operator workflow

1. Open **Ledger → Journal → Accounting Periods** (`/ledger/accounting-periods`).
2. Select an active accounting unit and code year. The year filter uses the
   period code, not the range's calendar year, and has no hidden page limit.
3. Choose a month/code (`YYYYMM`, 190001–299912), then review the inclusive start
   and end dates. Defaults cover that calendar month. Real dates from 1900–2999
   can be customized for fiscal calendars; the start must not follow the end.
4. Create the period. New periods are **closed** and cannot accept postings.
5. **Open** it with a nonblank reason (maximum 500 UTF-8 bytes).
6. Return to Journal History, choose a draft's posting action and select an
   eligible open period. The batch date and all line dates must be in range.
7. **Close** with a reason when ready. Existing postings and balances are
   unchanged; unposted drafts stay drafts and cannot post into the closed period.
   Reopening is possible with a fresh version and reason. Reopening does not
   reverse any journal or erase the previous closure information.

Codes are unique per tenant/unit (including codes reserved by soft-deleted
legacy records). Date ranges cannot overlap another live period, whether open,
closed or locked. Two adjacent periods must not share an inclusive boundary
date. The page intentionally offers no date/code editing, deletion, locking,
unlocking or automatic period generation. Locked legacy periods are read-only
here. Existing legacy overlaps are not repaired by this migration.

Status, audits, tenant identity and user identity are server-owned. Actions use
JWT-authenticated tenant scope, consistent with the journal endpoints; no new
role/permission scheme or approval workflow is introduced. Existing journal
approval policies still block direct final posting when applicable.

## HTTP contract

All backend routes require `TenantJwtAuthFilter` and the authenticated tenant's
live, active accounting unit. Frontend `/api/ledger/...` proxies validate the
session and forward its bearer token on **every** request; writes also enforce
same-origin checks. Responses are `Cache-Control: no-store`.

| Method | Backend route | Input |
| --- | --- | --- |
| GET | `/api/v1/ledger/accounting-periods` | Query `accountingUnitId`, optional integer `year` (default server current year) |
| POST | `/api/v1/ledger/accounting-periods` | `{accountingUnitId, period: 202611, beginDate: "2026-11-01", endDate: "2026-11-30"}` |
| POST | `/api/v1/ledger/accounting-periods/{id}/open` | `{accountingUnitId, version, reason}` |
| POST | `/api/v1/ledger/accounting-periods/{id}/close` | `{accountingUnitId, version, reason}` |
| GET | `/api/v1/ledger/accounting-periods/{id}/history` | Query `accountingUnitId` |

List/history return `{items: [...]}` inside the backend's `BaseApiResponse.result`;
create/open/close return the saved period. Nuxt proxies unwrap `result`. Create
returns 201; reads/status changes return 200. Invalid inputs are 400,
unauthenticated access 401, unavailable/out-of-scope records 404, overlap/code or
stale/locked conflicts 409, and migration/database/commit failures 503. Raw SQL
errors are never sent to the client. Unknown write fields (including supplied
status, tenant, actor and audit fields) and query/body unit mismatches fail.

Period responses include `id`, `accountingUnitId`, `period`, `beginDate`,
`endDate`, `status`, `version`, creation/modification audits and last-close
metadata. History is newest version first and records action, old/new status,
version, reason, actor and timestamp. Actor identity is displayed as
**full name · email**, resolved from the live user in the same tenant; missing,
deleted or out-of-scope users show “Unavailable user” rather than their UUID.
The actor UUID remains in the audit record for traceability. No-op transitions with the current version
return the existing record without incrementing the version or inventing a new
event. A stale version fails even if the requested status already matches.
Pre-migration rows have no synthetic creation event; their history begins with
the first transition performed after this upgrade.

## Posting consistency

Creation and transitions acquire the accounting-unit row `FOR UPDATE` before
checking overlaps or locking the period. Journal posting takes that same first
lock. Consequently overlapping creates serialize, and closing versus posting
has a definite order: a committed close prevents the next post, or an already
in-progress post commits before the close. A failed transaction rolls back both
period changes and its event; an unconfirmed commit never reports success.

Journal posting remains atomic across balances, posted status and history,
uses exact local amounts, validates live references and dates again inside the
transaction, and is idempotent for an already-posted journal—even if its period
has since closed. Closing never edits historical financial values.

See [journal verification](journals.md#verification) for PostgreSQL and browser
suite commands and their transport-seam/mock-upstream boundaries.
