# Human Resources

The HR workspace is inspired by BambooHR's people, time-off, hiring, onboarding and performance workflows. It is not a BambooHR integration or a feature-for-feature replacement. It reuses shared employee biodata from migration 019; Payroll, Ledger and HR see the same employee records.

## Deployment

Apply all migrations in order through 039 to the application PostgreSQL database, then rebuild and restart the C++ API and Nuxt frontend:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/036_hr_leave.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/037_hr_people_workflows.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/038_hr_profile_changes.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/039_hr_profile_admin.sql
```

Skip migrations already applied. Down migrations delete the associated business records; back up before rolling back and reverse them in order. No demo HR records are installed. Set the existing `LEDGER_API_BASE_URL` or `AUTH_API_BASE_URL` for the Nuxt server to reach the API. Browser requests use same-origin BFF routes.

## Access

All C++ endpoints require a live tenant user via `TenantJwtAuthFilter`. Tenant and actor are derived from authentication, not request bodies. Tenant administrators and roles with `hr.read`, `hr.write`, `hr.manage`, or `*` can read HR records; only administrators, `hr.write`, `hr.manage`, or `*` may make changes. Employee directory access is independently controlled by `employees.read`, `employees.write`, or `employees.manage` (see [employee biodata](employee-biodata.md)); grant both sets as appropriate. Leave reasons, candidate data and performance notes are sensitive: grant HR permissions only to authorized HR staff. Profile contact change workflows are administrative and require the specific permissions below; a user does not need a linked employee record. Manager-specific access and configurable field-level permissions are not provided.

## API

All responses use the standard `BaseApiResponse` envelope. Same-origin BFF endpoints mirror the C++ routes beneath `/api/hr/`, check the session and check origin on mutations. Pagination defaults to page 1, 20 records per page.

### Administrative employee contact changes

The `/hr/profile-changes` screen lets authorized staff select a live employee and submit contact changes. `/hr/profile-requests` is the tenant-wide administrative review queue. The former `/hr/my-profile` bookmark redirects to the administrative screen; the old `/api/v1/hr/profile/me` self-service endpoint is removed. Ordinary tenant users cannot use these administrative endpoints without a relevant grant. The shared employee directory retains its existing separate permissions and direct editing behavior.

- `GET /api/v1/hr/profile/employees/{employeeId}` returns a minimal contact projection for a live employee in the current tenant, plus `canSubmit`. It excludes birth date, identity numbers, medical and salary fields. Tenant administrators, `*`, `employees.read`, `employees.write`, `employees.manage`, `hr.profile.read`, `hr.profile.write` and `hr.profile.approve` may read this projection and the queue.
- `POST /api/v1/hr/profile/requests`: `{ "employeeId": "UUID", "employeeVersion": 1, "changes": { "personalEmail": "person@example.com" } }`. Submit requires tenant administrator, `*`, `employees.write`, `employees.manage` or `hr.profile.write`. Employee identity is selected explicitly and validated against the authenticated tenant; the submitter does not need to be linked to that employee. Allowed keys are `personalEmail`, `primaryPhoneNumber`, `secondaryPhoneNumber`, `residenceAddress` and `cityOrLocation`. Unknown fields are rejected. Empty strings clear fields. Only one pending request per employee is permitted; changes do not apply until approved.
- `GET /api/v1/hr/profile/requests?page=1`: authorized administrative readers see the tenant-wide queue. Responses include `canSubmit`, `canReview`, and each row's `canDecide` and `source`. No personal-only view is provided.
- `POST /api/v1/hr/profile/requests/{id}/{approve|reject}`: `{ "version": 1, "note": "" }`. Requires tenant administrator, `*`, `employees.write`, `employees.manage` or `hr.profile.approve`. A different authorized reviewer must decide the request. Approval updates only requested fields if the employee version still matches and the employee is live in the tenant; the employee update, decision and event commit together. On conflict, reject the stale request before submitting again. Rejection leaves biodata unchanged.

Migration 039 labels existing requests as `employee` (the former self-service origin) and new requests as `admin`. Legacy employee-origin approvals additionally require the original requester to remain linked to the employee, preserving the old safeguard. Requests and audit events are retained. The 039 down migration refuses to run while administrative requests exist; reconcile/archive them and review the old code's account-link requirements before rollback. All BFF routes enforce session and mutation origin checks. Request bodies contain contact data; grant access carefully. Event rows contain action, actor, version and timestamp, not the contact values. This fixed allowlist is not configurable field-level authorization. Single-user tenants need a second authorized reviewer for this workflow.

### Time off

- `GET /api/v1/hr/leave-requests?page=1`: list requests, total, pending and distinct employees away today (database server date), and `canWrite`.
- `POST /api/v1/hr/leave-requests`: `{ "employeeId": "UUID", "leaveType": "annual|sick|unpaid|other", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "" }`. Only live employees in the current tenant may be selected. Dates are inclusive; reason is limited to 500 bytes.
- `POST /api/v1/hr/leave-requests/{id}/{approve|reject|cancel}`: `{ "version": 1, "note": "" }`. Only pending requests can transition. A stale version or invalid transition returns 409. Decision actor and timestamp are recorded. Decisions are final; there is no reopen/edit/delete endpoint.
- `GET /api/v1/hr/leave-balances/{employeeId}?year=2028`: returns the employee's current biodata `leaveDaysEntitled`, approved annual-leave **calendar days** overlapping that calendar year and the difference. The estimate clips cross-year requests, counts overlaps independently and includes weekends and holidays. It does not model policy, accrual, carryover, proration or historical entitlement changes and is not an authoritative balance. Approval does not enforce it.

### People workflows

Use `/api/v1/hr/work-items/{kind}` where kind is `vacancy`, `candidate`, `onboarding` or `review`:

- `GET`: paginated list and `canWrite`.
- `POST`: create `{ "title": "...", "personName": "", "email": "", "employeeId": "", "dueDate": "", "notes": "" }`. Use empty strings for fields not applicable; `personName` is required for candidates, and `employeeId` is required for onboarding and reviews. Due date is optional ISO date. Title, person name and email are limited to 150 bytes, notes to 4000 bytes. An employee must be live in the tenant at creation and edit.
- `PUT /{id}`: same complete payload plus `version`. Only non-terminal records are editable. Stale versions, closed records or unavailable employees return 409.
- `POST /{id}/transition`: `{ "version": 1, "status": "..." }`. Allowed paths: vacancy `open → closed`; candidate `applied → screening → interview → offer → hired`, or reject from any non-terminal stage; onboarding `open → completed|cancelled`; review `draft → completed|cancelled`. No backwards transitions or reopening. Changes use optimistic version checks and atomically record actor, timestamp, action, status and version in `hr_people_work_events`. Those events are not yet exposed in the UI.

Candidates and job openings are separate records associated by free-text position, not a relational applicant-tracking system. Marking a candidate hired does not create an employee. Onboarding tasks and reviews are individually entered, not automatically generated from templates. A linked employee can subsequently be soft-deleted; historic records remain visible. Tenant resets include the new tables and their dependencies.

## Limitations

Time off does not calculate authoritative balances or working days, prevent overlaps, send notifications, or route approvals to managers. Recruitment does not publish jobs, accept applications, link openings to candidates, or move hired candidates into employee records. Onboarding has no templates, assignments or employee portal. Reviews are basic confidential records, without cycles, goals, ratings or employee feedback. Organization charts, document management, e-signatures, benefits, payroll processing, analytics and integrations are not implemented. The HR module remains marked preview. Dashboard values never substitute demo data for failed requests, and employee counts include all live records because employee status codes have no defined active/inactive meaning.

## Tests

`JSONCPP_SOURCE_DIR=/path/to/amalgamated-jsoncpp test/hr/run.sh` exercises validation, permissions and lifecycle with the repository's synchronous Drogon seam. `HR_PGLITE_DIR=/path/to/npm/project node test/hr/database_test.mjs` and `HR_PGLITE_DIR=/path/to/npm/project node test/hr/profile_database_test.mjs` require `@electric-sql/pglite` installed in that project and test migration up/down/up, production SQL, tenant isolation, stale updates, events and cross-year leave estimates. These tests do not replace a full Drogon/PostgreSQL deployment or end-to-end browser test.
