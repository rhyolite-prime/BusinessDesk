# BusinessDesk HR: BambooHR-inspired implementation plan

- **Status:** implementation in progress; roadmap is not a commitment to feature parity or a BambooHR integration
- **Baseline:** repository state through migration 039, including the HR work in the current branch
- **Audience:** product, design, engineering, QA, security and operations

## 1. Product objective and scope

Build a dependable, tenant-isolated people platform around a single employee record. HR staff should be able to administer the employee lifecycle and authorized managers should be able to act on their team's requests without receiving unrestricted HR access. This is an administrative portal, not an employee self-service portal. Workflows should be understandable, auditable and available on mobile-sized screens.

Use BambooHR for **capability and UX reference**, not as an implementation, branding or API compatibility requirement. Its published feature overview includes employee records, reporting, workflows, applicant tracking, onboarding, time off, performance and other people operations [1](https://www.bamboohr.com/pricing/). Its onboarding overview describes checklists, new-hire packets, e-signatures and candidate-to-employee data flow [3](https://www.bamboohr.com/platform/onboarding/). Later capabilities such as benefits, time and attendance, compensation and employee experience are also part of its broader platform [2](https://www.bamboohr.com/platform/). BusinessDesk should prioritize the workflows below rather than imply that all of these are already available.

**Proposed release boundaries**

- **HR core release:** employee profiles and organization, administrative contact workflows, auditable approvals, configurable time-off policies and balances, HR reporting, and secure document infrastructure.
- **Employee-lifecycle release:** recruitment linked to openings, hire-to-onboarding, onboarding/offboarding, review cycles and goals.
- **Expansion:** time and attendance, benefits, compensation, payroll handoff, integrations and employee experience, prioritized after discovery.
- **Not assumed:** US-specific compliance forms, automatic statutory policy, BambooHR API compatibility, AI decision-making or legal validity of in-house signatures. Each requires a separate product and legal decision.

## 2. Current baseline and gaps

| Area | Current repository capability | Gap to address |
| --- | --- | --- |
| Employee records | `hr_employee_biodata` and `/api/v1/shared/employees`; shared by Ledger, Payroll and HR; versioned CRUD and audit fields. | No trusted status meanings, organization/manager model, field-level access, effective-dated history, document vault or a complete organization model. The existing detail endpoint returns a sensitive full record to authorized employee readers. |
| HR workspace | Nuxt `/hr` dashboard, employee directory, time off, recruitment, onboarding and performance navigation. | Current UI is an administrative preview, not a complete administrative experience. |
| Time off | Migration 036: tenant-scoped requests, manual HR decisions and an estimate based on inclusive calendar days and the current biodata entitlement. | No policy engine, leave ledger, working calendars, authoritative balances, overlap checks, manager routing. The existing estimate must not be presented as a real balance. |
| Recruitment/onboarding/performance | Migration 037: generic `hr_people_work_items` records with optimistic updates and simple status transitions; events stored in `hr_people_work_events`. | Openings and candidates are not relationally linked; hiring does not create an employee; no task assignment/templates, review cycles, goals or scoped feedback. |
| Authorization and administrative profiles | Tenant JWT filter, live-user checks, existing employee/HR permissions and mutation origin checks. Migrations 038–039 provide authorized employee contact-change requests and review. | The workflow uses a fixed contact-field allowlist, not a configurable permissions model. Broad HR access is still unsuitable for managers, recruiters, medical data or performance reviewers. |
| Testing | HR seam tests and PGlite SQL tests; Nuxt build/typecheck have been exercised. | Add real PostgreSQL/Drogon integration, multi-user browser flows, security, load and operations tests before production launch. |

Further baseline details and current API contracts are documented in [human-resources.md](human-resources.md) and [employee-biodata.md](employee-biodata.md). Existing `/api/v1/hr/*` routes are mapped to the HR module in `TenantAccountService::moduleForPath`; preserve and test that entitlement boundary while shared employee endpoints retain their existing Ledger/Payroll use cases.

## 3. Design principles and decisions to validate

1. **One employee identity:** retain `hr_employee_biodata.id` as the canonical shared employee ID. Avoid a second HR employee table and avoid breaking financial references. Add effective-dated domain tables around it.
2. **Policy before arithmetic:** leave units, holidays, schedules, carryover, approvals and jurisdiction are tenant-configured and effective-dated. Do not infer legal entitlements from geography or hard-code a country policy without legal review.
3. **Backend is authoritative:** the UI and BFF improve usability but never grant access. Every API operation validates tenant, current actor, entitlement, scope, fields and transition. Tenant/user IDs are derived from verified identity.
4. **Historical truth:** use effective dates and append-only events/ledger entries for changes that affect historical calculations. Corrections create traceable compensating records rather than silently rewriting approved history.
5. **Incremental compatibility:** add migrations after 037; do not reinterpret the existing integer employee status or drop preview data. Version API contracts, provide compatibility adapters and remove them only after a measured transition.
6. **Privacy by default:** sensitive data is minimized in list responses, logs, analytics and notifications. HR, manager, employee, recruiter, interviewer and payroll permissions are distinct. No production data in test fixtures.

## 4. Proposed architecture

### Backend and data

- Continue Drogon controllers under `controllers/`, services under `domain_services/hr/`, migrations under `database/migrations/`, and the standard `BaseApiResponse` envelope. Keep server-side tenant derivation, no-store headers, parameterized SQL, bounded pagination, optimistic versions and explicit 4xx/409 errors.
- Model tenant-scoped departments, locations, positions, manager assignments, employment terms and compensation history as effective-dated records with composite `(tenant_id, id)` references. Enforce no cross-tenant links and no manager cycles. Define termination, rehiring and historical manager resolution explicitly.
- Replace the generic work-item register **incrementally** with domain-specific openings, applications/candidates, onboarding plans/tasks, review cycles/participants and goals. Maintain immutable IDs or a mapping table, preserve old records/events, and keep read compatibility during migration. Do not assume the existing free-text position uniquely identifies an opening.
- Introduce a common approval/task/event mechanism only for genuinely shared concerns: actor and scope, state/version, decision history, deadlines and notifications. Domain services own allowed transitions and authorization. Use transactions, row locks/optimistic versions and idempotency keys for actions that can be retried.
- Add a transactional outbox for notifications and integrations, a durable worker with retries/backoff/dead-letter handling, and event IDs for consumer deduplication. No network calls inside a DB transaction.
- Store documents in a private object store through a storage abstraction; PostgreSQL holds tenant-scoped metadata, version, checksum, access classification, retention and audit. Use short-lived, scoped downloads, malware scanning/quarantine, file-size/type limits and safe deletion; never store public URLs for sensitive documents.
- Standardize service-level and DB-level audit events for creation, edits, decisions, sensitive reads/exports and permission changes; include actor, tenant, timestamp, request/correlation ID and affected record, but not sensitive payloads. Define retention, access and tenant reset behavior before registering new tables.

### Frontend and API

- Continue Nuxt app pages/components under `frontend/app`, same-origin server routes under `frontend/server/api`, authenticated BFF adapters and `checkAuthOrigin` for mutations. Reuse the shared shell and employee data; build dedicated administrative and manager entry points with responsive layouts, accessible controls and clear loading/error/empty states.
- Introduce typed client contracts generated from a maintained OpenAPI specification. Proposed resources include `/api/v1/hr/organization/*`, `/api/v1/hr/time-off/*`, `/api/v1/hr/recruiting/*`, `/api/v1/hr/onboarding/*`, `/api/v1/hr/performance/*`, `/api/v1/hr/documents/*` and `/api/v1/hr/reports/*`. Exact paths and payloads are design outputs, not existing endpoints. BFF routes should mirror the final contracts without exposing upstream credentials.
- Define explicit read projections and action capabilities per persona; do not reuse the existing full employee-detail endpoint for a restricted manager view. Separate compensation, medical, identity-document, candidate and performance data from general profile access.
- Expose signed, versioned webhooks and scoped API credentials only after core event and authorization work. BambooHR's documentation provides a useful reference for HTTPS delivery, signatures and field-scoped webhook access [1](https://documentation.bamboohr.com/docs/webhooks); BusinessDesk's own delivery and permission semantics must be specified and tested.

## 5. Phased backlog and acceptance gates

Estimates below are **rough calendar ranges**, assuming four engineers across frontend/backend, one QA, shared UX/product and part-time security/DevOps, with stable requirements and some parallel work. They exclude procurement delays, new payroll/compliance implementation and external certification. Re-estimate after discovery; the ranges overlap only where dependencies and staffing permit. Phases are milestones, not a promise that every BambooHR feature fits in one release.

### Phase 0 — Discovery, scope and architecture (2–4 weeks)

- Inventory existing schemas, subscription gates, employee fields, tenant reset rules, roles, preview data and tenant usage; establish supported markets and customer workflows.
- Interview HR, managers, employees and payroll users; document persona permissions, fields, approvals, supported employment types, absence policies and retention requirements. Get legal/privacy review for target jurisdictions.
- Deliver prototypes, bounded domain model, API/versioning conventions, threat model, migration inventory, data-classification matrix, acceptance tests, prioritized release backlog and delivery estimates.
- **Exit:** product owner approves core scope, persona/field access matrix, policy inputs and pilot tenants; engineering signs off migration and operational approach.

### Phase 1 — Security and employee foundation (5–8 weeks)

**Started:** migrations 038–039 add an administrative employee contact-change projection, requests and reviewer decisions. Full persona/field authorization, manager scoping and organizational history remain open. See [human-resources.md](human-resources.md) for current constraints.

- Implement scoped permissions: HR administrator, manager direct/indirect reports, recruiter/interviewer and payroll integration. Include field-level read/write/approval rights, explicit denial for medical/identity/compensation, least-privilege defaults and current-role checks. Decide delegation, acting managers and access after termination.
- Add validated departments, locations, positions and effective-dated reporting lines; maintain current biodata compatibility and reconcile free-text/nullable reference metadata. Define status mapping with business owners rather than assigning meanings to existing integers.
- Build employee profile tabs, searchable directory, team/org views, change history, administrative profile change requests and manager views using appropriately restricted projections. Add audited approval decisions.
- **Exit:** unauthorized users cannot see or mutate employees' restricted fields; managers see only authorized reports; cross-tenant access fails in every endpoint/export; concurrent edits conflict safely; HR, Ledger and Payroll still reference the same employee IDs.

### Phase 2 — Time-off policies and administrative/manager workflows (6–10 weeks)

- Add policy/version, assignment, work schedule, holiday calendar, balance ledger, accrual/carryover rules and approval-chain models. Specify units, rounding, time zone, fractional days, negative balances, caps, leap years and policy changes before implementation.
- Add administrative request entry, team calendar, manager approval/delegation, HR overrides with reason, cancellation/correction, overlap validation, notifications and audit. Use a transaction with locking to avoid concurrent double approvals and double posting; define retry/idempotency and reversal behavior.
- Preserve 036 requests. For historical data, import only reviewed dates and opening balances; flag unknown schedules/policies and overlaps for reconciliation. Run calculated balances in shadow mode against customer-approved fixtures before enabling policy enforcement. Keep the old estimate explicitly labelled until migrated and reconciled.
- **Exit:** approved requests generate exactly one ledger effect; rejects/cancellations/corrections reconcile; working-day and year-boundary scenarios match approved policy examples; role/tenant isolation and concurrent approval tests pass; HR signs off pilot balances.

### Phase 3 — Recruiting and hire handoff (6–10 weeks; can start after Phase 1)

- Add job openings, candidate profiles, applications linking candidate and opening, stage history, notes, interviewers, tasks, source, consent/retention and controlled attachments. Allow approved stage changes and configurable pipeline with audit.
- Build HR pipeline and candidate detail, secure role-scoped collaboration, email templates, interview coordination and reporting. Public careers/application intake is a separate threat-modelled surface with abuse protection, consent, attachment scanning and accessibility.
- Implement an explicit hire action: deduplicate and review data; create or link exactly one shared employee in a transaction; require missing mandatory biodata instead of inventing values; audit the link and prevent duplicate hires under retries. No automatic account or privileged role creation.
- Backfill `kind='vacancy'` and `kind='candidate'` work items into new tables with source-ID maps. Unmatched positions remain unlinked for human review; migrate events and counts, preserve terminal status and don't guess an opening.
- **Exit:** a recruiter can move an application, record an offer and complete a retriable hire without duplicate employees; interviewer access is limited; legacy records reconcile and remain accessible.

### Phase 4 — Onboarding and offboarding (5–8 weeks; requires Phases 1 and 3 for hire handoff)

- Model reusable versioned checklists, employee-specific plans, task ownership, due-date rules, progress, reminders, reassignment, cancellation and completion history. Generate a plan idempotently from a reviewed template; do not overwrite an in-progress plan when a template changes.
- Build HR progress dashboard and administrative task ownership; support joiner data collection through controlled administrative forms and approval. Add an offboarding variant with coordinated access revocation and asset/clearance tasks, using existing identity controls.
- Add secure document requests and e-signature integration only after storage, vendor, consent and legal requirements are approved. Never equate a checkbox with a legally valid signature without review.
- **Exit:** a hired employee receives one plan, owners see only their tasks, reminders retry safely, tasks survive reassignment, and the employee's access ends according to an approved offboarding policy.

### Phase 5 — Performance and development (6–10 weeks; requires Phase 1)

- Add review cycles, templates/questions, employee/manager/peer participants, submissions, sharing rules, deadlines, optional ratings, goals and 1:1 notes. Freeze cycle templates and preserve submitted versions; explicitly define visibility before and after sharing and how manager changes affect access.
- Build an administrative participant workflow, private drafts, review submission, manager/HR overview and goal progress. Separate confidential feedback from general HR read access; do not use performance information for automated employment decisions.
- Migrate legacy `kind='review'` records as historical notes, not fabricated complete review cycles. Expose migration provenance and restrict access appropriately.
- **Exit:** only intended participants can read or submit feedback, cycle closure and sharing are auditable, and historical records remain intact after team/manager changes.

### Phase 6 — Reporting, operations and pilot release (4–6 weeks, partly parallel)

- Define metric semantics before building dashboards: headcount as of date, hires/terminations, leave usage, recruiting funnel and onboarding completion. Respect effective dates and status mappings; enforce row/field permissions in reports and exports, not only pages. Avoid small-group exposure for sensitive analytics.
- Add filters, saved views, CSV export with authorization, audit and safe spreadsheet escaping; schedule delivery only after notification/privacy controls exist. Add accessibility and localization/time-zone checks.
- Deliver admin configuration, monitoring, backup/restore drills, support playbooks, tenant onboarding/import validation, runbooks, rollback rehearsals and usage/error dashboards. Pilot behind tenant-level flags with training and feedback.
- **Exit:** real PostgreSQL migrations, backend and browser suites pass; security/privacy review and restore drill pass; pilot users reconcile imported data and approve report definitions; no critical defects remain.

### Phase 7 — Expansion (discovery and estimates separate)

- **Time & attendance:** schedules, timesheets, clock events, approvals, corrections, overtime rules and time-off integration; account for DST and local rules.
- **Benefits and compensation:** plan eligibility/elections, dependent data, effective-dated compensation and approval workflows; separate highly sensitive access and integrations.
- **Payroll handoff:** define a versioned, auditable contract for approved time, employee changes and payroll periods with existing Payroll; avoid implying payroll processing is complete. Reconciliation and error handling are mandatory.
- **Integrations and experience:** scoped API keys, signed webhooks, partner integrations, surveys, recognition, mobile improvements and advanced analytics. Treat AI and automated recommendations as separate governance projects, not a prerequisite for core HR.
- **Exit:** each expansion feature receives its own jurisdictional, security, integration and production-readiness approval.

## 6. Data migration and rollout

1. Inventory real tenant data first. Create a mapping report for all 036/037 records, existing audit events, employee links, ambiguous statuses and free-text position/department values. Never use seed data as a substitute for reconciliation.
2. Add new schema alongside current tables, with tenant-scoped foreign keys and reset registry entries. Backfill in bounded, resumable batches with source IDs and checksums; retain legacy records and audit history. Store unresolved mappings in a review queue.
3. Deploy compatible readers and shadow calculations behind tenant flags. Use a controlled write strategy: either freeze the affected legacy writes during each tenant cutover or implement a tested idempotent sync/outbox with a watermark and final reconciliation. Do not perform uncoordinated dual writes.
4. Compare counts, IDs, statuses, totals and sample records per tenant; obtain HR approval for policy and opening balances. Switch read/write traffic only after consistency checks and backup verification. Publish API deprecation notices before retiring old contracts.
5. Roll back by disabling the flag and routing to the previous compatible path only if no incompatible new writes have occurred; otherwise use an explicitly tested forward fix or a reconciled restore. Never blindly run destructive down migrations on production data.

## 7. Cross-cutting test and release criteria

- **Unit:** policy calculations, state machines, field-level authorization, date boundaries, decimal precision and idempotency.
- **Real PostgreSQL/Drogon integration:** up/down/up on disposable databases, constraints, transactions, isolation, concurrent approval/hire, retries, cross-tenant references, permission revocation and data migration reconciliation. Keep existing seam/PGlite tests as fast checks, not substitutes.
- **Browser/E2E:** HR, manager, recruiter and read-only administrative paths; mobile, keyboard/screen-reader basics, stale edits, failures, notification retries and tenant/account switching.
- **Security/privacy:** authorization matrix including reports/files/webhooks, IDOR, CSRF/origin, upload attacks, audit access, secret rotation, rate limiting, retention/deletion, logs and backup isolation. Independent review before launch.
- **Operations:** restore verification, migration/cutover rehearsal, alerting on failed jobs and stuck queues, support tooling without broad employee-data access, realistic load/performance tests and incident runbooks.
- **Definition of done:** documented API and migration, checked authorization for each action and projection, tests and telemetry, accessible UI states, rollback/forward-fix procedure, product acceptance and updated user/admin documentation.

## 8. Decisions required before implementation

1. Which countries, languages, employee types and legal/retention requirements are in the first release? Who signs off each policy?
2. Which personas and fields can be viewed or edited, including medical, IDs, compensation and performance? Can managers see indirect reports or delegated teams?
3. What are the actual leave policies: units, schedules, holidays, accruals, carryover, negative balances, partial days, approvals and historical opening balances?
4. Is recruiting public-facing in the first release? Which document storage, malware scanning, email and signature providers are approved?
5. Is a hire allowed to link an existing employee or must it always create a new one? What are duplicate matching and identity-provisioning rules?
6. Which payroll and external integrations are required, and is payroll in scope or only a data handoff?
7. Which tenants are piloting, what import data exists, and who owns reconciliation, training and release approval?
8. What availability, recovery objectives, data residency, reporting and audit retention targets are required?

## References

- BambooHR plans and capability overview: [1](https://www.bamboohr.com/pricing/).
- BambooHR platform scope: [2](https://www.bamboohr.com/platform/).
- BambooHR onboarding capabilities: [3](https://www.bamboohr.com/platform/onboarding/).
- BambooHR webhook documentation: [1](https://documentation.bamboohr.com/docs/webhooks).
