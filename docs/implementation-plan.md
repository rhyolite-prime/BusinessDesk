# BusinessDesk General Ledger implementation plan and product roadmap

**Status:** In progress — plan and initial GL slice are implemented partially; this is not a production-ready ERP release.

**Scope:** First production-ready module in the BusinessDesk rewrite: General Ledger (GL), with an explicitly staged roadmap for the wider ERP.

### Implementation tracker (current repository state)

- **Implemented:** PostgreSQL 15+ initial migration and rollback script; lowercase `snake_case` tables; Nuxt 4/Tailwind shared-resource shell; GL dashboard, chart-of-accounts page, journal list and draft form; demo-backed same-origin APIs; one C++ `LedgerService` with exact decimal draft/approval validation; one `LedgerController` validation route; pure C++ validation tests.
- **Verified:** Nuxt typecheck and production build pass; C++ `LedgerService` unit test compiles under `g++ -std=c++17 -Wall -Wextra -Wpedantic -Werror` and passes; demo API routes return expected responses.
- **Not yet verified/implemented:** migration has not been applied to PostgreSQL; Drogon controller and application have not been compiled because CMake, Drogon, and PostgreSQL tooling are absent in the current environment; no ORM models, persisted account/journal endpoints, tenant/auth context, posting transactions, approvals, or GL reports exist yet. Demo writes are process-local and are not durable.
- **Next implementation increment:** set up a PostgreSQL/Drogon-capable environment, apply and test the migration, generate ORM models, then implement persisted account and journal reads/draft creation in the same `LedgerService`/`LedgerController` pair before expanding posting workflows.

**Guiding rule:** Use the legacy C# application to discover workflows and terminology, but treat it as a compatibility reference—not as the specification for accounting rules or as code to port line-for-line. Treat the procurement tender as a baseline capability checklist, not as the product boundary.

## 1. Goals and boundaries

Deliver a General Ledger module with:

- A Drogon C++ API backed by PostgreSQL and Drogon ORM.
- A Nuxt 4 + Tailwind frontend for GL workflows.
- A reusable Nuxt shared-resource layer for navigation, sidebar, themes, API utilities, and common UI. Later modules (Payroll, AR, AP, Fixed Assets, Inventory, and School Manager) should extend/reuse that layer rather than fork it.
- Versioned PostgreSQL DDL derived from the 26 C# classes in `cs-template/TopazERP.Core/Models/Ledger`.
- **Lowercase `snake_case` for every database table name** (and, for consistency, columns, indexes, constraints, and migration objects). Use unquoted identifiers; do not carry C# PascalCase names or legacy misspellings into PostgreSQL. A consistent module prefix such as `gl_` is recommended for GL-owned tables.
- **One controller and one service class per backend module across the entire ERP**—not just GL. General Ledger, AR, AP, Payroll, School Manager, and future Fixed Assets/Inventory each get their own module controller and one module service class. The controller owns HTTP routing/serialization; that module's service owns its public use cases and business invariants. Do not create controller/service pairs per entity or screen, and do not create one monolithic controller/service shared by all modules.
- Drogon ORM for normal reads and writes. Parameterized raw SQL is allowed only in reporting endpoints. SQL migration files are schema DDL and are not application query code.

The first implementation is GL-first, not ERP-limited. It should establish a stable accounting-unit, currency, dimension, audit, and posting foundation that the later modules can use. The initial GL slice may support direct cash/bank vouchers and receipts, but full Accounts Receivable (AR) and Accounts Payable (AP) invoice lifecycles remain in their own modules. They must post approved, balanced batches through a documented GL integration contract rather than duplicating AR/AP logic in the GL service. Fixed Assets and Inventory are later subledger modules, not extra tables bolted onto the first GL release.

### Product scope beyond the tender

The tender requirements should be mapped to acceptance tests, then delivered in layers:

1. **GL foundation:** independent accounting units, flexible account groups and subaccounts, account balances and drill-down, double-entry journal posting, controlled opening balances, maker-checker approvals, reversals, audit history, multi-currency handling, core financial reports, and budgets by account/cost centre.
2. **Cash and finance workflows:** cash/bank payments and receipts, recipient-level voucher lines (including multiple recipients and casual wages), cheque details per recipient, configurable taxes/withholding, spreadsheet import, summaries, and bank reconciliation.
3. **Connected subledgers:** AR, AP, Fixed Assets, and Inventory own their transactions and lifecycle; each publishes validated, idempotent posting batches into GL and participates in coordinated period close.
4. **ERP-grade expansion:** recurring journals and schedules, allocations/accruals, close checklists, intercompany accounting/consolidation, project/job dimensions and profitability, configurable approval/automation rules, report scheduling, flexible analytics, and stable APIs/webhooks/import tools.

This sequencing keeps the first General Ledger deliverable testable while leaving a path to the broader product. Features in the later tiers are not implied to be part of the first GL release.

### Tender-to-roadmap coverage

| Tender capability | Planned treatment |
|---|---|
| Unlimited account groups; multiple independent accounting units; accounts/subaccounts and current balances | GL foundation: separate tenant from accounting unit, support unbounded account hierarchy and account classes, and scope balances by unit and currency. |
| Account creation, transaction printouts, financial-position/performance dashboard | GL setup and reporting: account screens link to transaction detail; dashboard totals assets, liabilities, stated capital/equity, revenue, and expenditure. |
| Journals, payments, receipts, taxes, vouchers, cheques, multi-recipient/casual-wage/tax-authority payments, Excel recipient import | GL cash and journal workflows: configurable voucher types/tax codes, recipient-level cheque data, import preview/validation, approval, posting, reversal, and date/ID summaries. |
| AR/AP vouchers, posting, reversals, and summaries | Separate AR/AP modules; use the same GL posting contract and report dimensions. Do not implement invoice ownership in GL. |
| Trial balance, income statement/difference, financial position, cash flow, account/subaccount and cash/bank books, cost-centre reports | Reporting phase: searchable, drillable reports with controlled filters and Word/Excel/PDF export. |
| Multiple currencies and exchange gains/losses | One base currency per accounting unit; rate changes/revaluation runs trigger automatic gain/loss calculation and a controlled, approved posting to configured FX accounts, without rewriting historical transactions. |
| Audit, double entry, senior approval, posting locks, opening balances | Cross-cutting audit and maker-checker workflow; posted data is immutable except through an approved reversal/adjustment. Single-entry opening setup is a narrowly controlled exception. |
| Fixed asset register and reports | Future Fixed Assets module integrated with AP, payments, and GL; includes categories, locations, supplier links, depreciation, disposals, and register/checklist reports. |
| Inventory, batches, FIFO/weighted average, receipts/issues, reorder and reports | Future Inventory subledger with period valuation and automatic GL postings; GL consumes its balanced posting batches. |
| Budget periods, account/cost-centre pairs, composite budgets, variance actuals | GL budgeting: periodized detail, composite rollups, actual-vs-budget variance, and detailed drill-down. |

### Product patterns to add beyond the tender

Prioritize capabilities that reduce manual reconciliation and make the system easier to operate, not just more screens:

- **Cash management:** statement import (CSV/Excel initially; bank-specific formats/connectors later), duplicate detection, suggested matching, partial matching, reconciliation statements, and controlled adjustments.
- **Close management:** pre-close checklist for unposted, pending-approval, unreconciled, or unbalanced items; close/reopen permissions and a period-close audit trail. Later, coordinate close status across GL, AR, AP, Inventory, and Fixed Assets.
- **Journal productivity:** reusable templates, recurring schedules, allocations, accruals/deferrals, reversing entries, copy-from-prior-period, and batch-level status/history.
- **Dimensions and analytics:** optional project/job, department, location, fund/grant, and cost-centre dimensions; drill-through from dashboard/report totals to source documents; scheduled reports and saved filters.
- **Multi-entity growth:** intercompany due-to/due-from, elimination entries, consolidated reporting, and separate base currencies/calendars where required.
- **Workflow and operations:** configurable approval thresholds/delegation, segregation-of-duties checks, attachments, notifications, import staging with row-level errors, report exports, documented APIs/webhooks, and integration idempotency.
- **Order-to-cash / procure-to-pay:** connect quotes and sales orders to AR; connect purchase requisitions/orders and receiving to AP/Inventory; add configurable approvals, recurring bills/invoices, credit controls, and customer/vendor self-service portals in later releases.
- **Localization and compliance:** versioned tax codes/rates and account mappings, configurable fiscal calendars, localized number/date formats, and a future e-invoicing/tax-filing adapter where local regulations and customer demand require it.
- **Adjacent financial capabilities:** bank reconciliation, cash forecasting, tax-code maintenance, asset depreciation schedules, inventory valuation, employee expense management, and project profitability as their respective modules mature.

These are roadmap candidates, not vendor-specific clones. Product references informing these patterns are listed at the end of this plan.

## 2. Repository assessment

The checkout began as a Drogon starter (`main.cc`, `CMakeLists.txt`, `config.json`, `models/model.json`, and a test stub). The repository now also contains `database/migrations/`, a partial `frontend/` Nuxt 4 app, `controllers/ledger_controller.h/.cc`, `services/ledger/ledger_service.h/.cc`, and a pure GL service test. The migration and UI are initial implementations, not yet connected to PostgreSQL-backed ORM persistence; the controller currently exposes only journal validation.

The C# reference lives in `cs-template/TopazERP.*`:

- GL domain managers and application services are under `TopazERP.Core/DomainServices/Ledger` and `TopazERP.Application/Services/Ledger`.
- The MVC layer has four GL controllers and 66 views in `LedgerDataEntry`, `LedgerSetups`, `LedgerReports`, and `LedgerSharedResource`, plus the GL dashboard.
- `Views/Shared/Layout/_adminLedgerLayout.cshtml` is the legacy navigation/layout reference.
- The 26 ledger model files include audited tenant entities, transaction records, embedded detail collections, and references to shared/module data.

The initial Nuxt shell and GL validation slice are now scaffolded. The checked-in C# behavior—especially close-period, delete, and posting behavior—must still be verified before it becomes a new-system rule.

## 3. Target structure and responsibilities

Keep the Drogon API and Nuxt app as clear peers in the repository. Proposed starting layout:

```text
controllers/
  ledger_controller.h/.cc    # one LedgerController; all GL routes stay here
services/ledger/
  ledger_service.h/.cc       # one LedgerService class for all GL use cases
models/                     # Drogon ORM-generated persistence models
  model.json
  ...
test/
  ledger_service_unit_test.cc
dto/ledger/                 # request/response DTOs; not persistence entities
database/migrations/
  001_create_ledger_schema.sql  # all table identifiers lowercase snake_case
  001_create_ledger_schema.down.sql
frontend/
  nuxt.config.ts
  app/
    pages/ledger/            # GL routes, grouped by setup/data-entry/reports
    layouts/admin-ledger.vue # Nuxt equivalent of _adminLedgerLayout
    features/ledger/         # ledger-specific UI, API composables, types
  layers/shared-resource/    # reusable Nuxt layer for the GL app and future modules
    nuxt.config.ts
    app/components/
    app/composables/
    app/utils/
    app/assets/
```

Use the Drogon model generator for ORM model classes only. Keep `restful_api_controllers` disabled in `models/model.json`: generated CRUD controllers would bypass GL posting rules and conflict with the single-controller design. Add routes to `LedgerController`; route handlers should validate/parse input, enforce authorization, call `LedgerService`, and return consistent HTTP responses. `LedgerService` should use generated ORM models/`Mapper` APIs and database transactions for ordinary operations and posting workflows.

The database naming convention does not dictate the public JSON naming convention: PostgreSQL identifiers stay lowercase `snake_case`, while the current API DTOs use `camelCase` and are explicitly mapped at the boundary. The first C++ route is `POST /api/v1/ledger/journals/validate`; it accepts `batchDate`, `description`, and `lines[]` (`accountId`, `description`, `debit`, `credit`) and returns `valid`, `balanced`, six-decimal `debitTotal`/`creditTotal`, and `errors[]`. A structurally valid but unbalanced draft is allowed; approval validation rejects it. Nuxt server routes proxy to Drogon through server-only runtime configuration and keep browser requests same-origin. Persisted CRUD routes remain future work.

### Module-level separation of concerns (applies to every module)

The GL pattern is the ERP-wide backend rule: each bounded business module has exactly one module controller and exactly one module service class. Keep endpoint methods grouped in that module's controller implementation and public use cases grouped in that module's service class; do not split them into per-screen/per-entity controllers or services, and do not merge separate modules into a global controller/service.

| Business module | Single controller | Single module service |
|---|---|---|
| General Ledger | `LedgerController` | `LedgerService` |
| Accounts Receivable | `AccountsReceivableController` | `AccountsReceivableService` |
| Accounts Payable | `AccountsPayableController` | `AccountsPayableService` |
| Payroll | `PayrollController` | `PayrollService` |
| School Manager | `SchoolManagerController` | `SchoolManagerService` |
| Fixed Assets (future) | `FixedAssetsController` | `FixedAssetsService` |
| Inventory (future) | `InventoryController` | `InventoryService` |

This is separation of responsibilities, not a ban on small DTOs, validators, domain value types, ORM-generated persistence models, or shared technical utilities. Controllers should remain thin HTTP adapters. Module services own validation of business invariants, workflow transitions, authorization-aware use cases, and transaction coordination, using Drogon ORM for persistence. A module must not bypass another module's service by directly mutating that module's tables; cross-module workflows use explicit versioned contracts/posting batches. Shared infrastructure (authentication, logging, database setup, API error mapping) is not an extra business service per feature.

The Nuxt app extends the `shared-resource` Nuxt layer. Put pages under the Nuxt 4 route tree, `app/pages/ledger/**`, with feature code grouped under `app/features/ledger/**`. The legacy MVC term “Views” is retained as a workflow reference; Nuxt 4 does not use Razor's `Views` directory as its standard routing convention, so a literal `views/ledger-*` folder is not needed unless that requirement is later confirmed.

## 4. Delivery phases

### Phase 0 — Discover and agree on GL behavior

1. Inventory every ledger model, manager, application-service operation, controller action, menu item, and legacy view. Build a traceability table from old screen/action → new API use case → new Nuxt route → tests.
2. Separate facts from assumptions. Confirm what a draft, posted, reversed, deleted, and closed item means in accounting terms. Review multi-currency rounding, fiscal-period rules, approvals, and audit needs with the business owner.
3. Record the shared-data contracts and the identity/tenant model before committing foreign keys or authorization behavior.
4. Treat oddities in the C# code as questions, not requirements. For example, the existing December close path closes all months of that year; validate whether that is intended before implementing it.
5. Convert the tender checklist into acceptance criteria and mark each item as GL-first, shared foundation, separate module, or later roadmap. Keep tenant, accounting unit, operational organization unit, and cost centre as distinct concepts until the business rules confirm how they map; do not assume the legacy `OuId` represents all of them.
6. Agree the initial approval matrix, reversal policy, transaction types, voucher variants, tax configuration, Excel import format, report/export needs, and the multi-currency/FX policy. Define which roles can create, submit, approve, post, reverse, and reopen.
7. Define the initial accounting dimensions and the API contract by which future AR/AP/Fixed Assets/Inventory modules submit posting batches to GL.

**Exit criteria:** approved workflow rules and approval matrix; tender-to-feature traceability; route/page inventory; table/relationship map; tenant/accounting-unit/dimension/auth assumptions; and an agreed first-release subset.

### Phase 1 — Bootstrap the API, database tooling, and shared UI shell

1. Add the planned source/test directories and make the CMake target build from the actual tree. Set an explicit supported C++ standard and enable useful compiler warnings/formatting.
2. Configure Drogon PostgreSQL access using environment-provided secrets. Keep developer/test/production configuration separate; do not commit database passwords.
3. Add a health/readiness endpoint, structured request logging, request IDs, centralized error-to-HTTP mapping, and authentication/tenant context hooks.
4. Create the Nuxt 4 + Tailwind app and the `shared-resource` layer. Port the intent of `_adminLedgerLayout.cshtml`—header, user area, responsive sidebar, active navigation, and GL menu groups—without carrying over its MVC helpers, Vue 2/CDN scripts, or hard-coded external report URL.
5. Establish API and frontend lint, format, type-check, build, and test commands in CI.

**Current status:** The shared Nuxt layer and local Drogon config template exist. Nuxt typecheck/build and pure service tests pass. The Drogon controller/application have not been compiled, and PostgreSQL connectivity, readiness/auth filters, lint/format CI, and responsive browser tests are pending.

**Exit criteria:** clean C++ build and Nuxt build; DB connectivity/readiness verified; shared layout renders at desktop/mobile widths; API configuration contains no embedded credentials.

### Phase 2 — Define and migrate the PostgreSQL schema

1. Audit all 26 legacy model classes, including inherited `FullAuditedEntity<Guid>` fields, `TenantId`, nullable/optional semantics, `[MaxLength]` annotations, cross-module IDs, and collections marked `jsonb`. Add new domain models where the tender/product roadmap needs capabilities not represented in those classes: accounting units, account groups/classes, currencies and rate history, approval states, immutable activity audit, import batches, and bank reconciliation.
2. Write versioned `CREATE TABLE` migration(s), indexes, constraints, and seed data as the canonical schema; generate/refresh Drogon ORM persistence models from the migrated database using `models/model.json`. Do not use generated CRUD controllers.
3. Enforce the database naming rule everywhere: all PostgreSQL table names are unquoted lowercase `snake_case`; use a consistent `gl_` prefix for GL-owned tables (for example `gl_account_groups`, `gl_accounts`, `gl_journal_batches`, and `gl_journal_lines`). Columns, indexes, constraints, and migration metadata should use the same convention. C++ types can remain PascalCase.
4. Use UUID primary keys and an explicit audit-column convention. Keep `tenant_id` (customer/security boundary) separate from `accounting_unit_id` (independent books/base currency/fiscal calendar); model `organization_unit_id`, `cost_center_id`, and other analysis dimensions separately where required. Add tenant/unit-aware uniqueness and relationships, and indexes for security filters, foreign keys, batches, dates, account transactions, and report access.
5. Define decimal precision, rounding, and date/time semantics centrally. Store the transaction currency, rate, and base-currency amounts/rates used at posting time; later rate changes must not rewrite historical transactions. Rate updates or scheduled revaluation runs should automatically calculate exposure changes and prepare controlled realized/unrealized FX batches against configured accounts; approval and posting timing must follow the confirmed accounting policy. Each accounting unit has one configured base currency, while the system supports an extensible currency list.
6. Avoid treating `Guid.Empty` as a real foreign key. Decide which legacy non-nullable `Guid` properties are truly mandatory and which are optional; model optional links as SQL `NULL`, resolve references to established shared-module tables, and validate at the API boundary.
7. Normalize editable financial detail rows into child tables where they need constraints, joins, independent updates, or reporting (notably budget, payment-voucher, and petty-cash details). Retain JSONB only for genuinely snapshot/document data, such as an immutable journal-history snapshot. Document any storage divergence and its conversion path.
8. Add row-level constraints where appropriate (for example non-negative debit/credit amounts and no line with both sides populated, after confirming the accounting rule). Aggregate invariants such as a balanced batch are enforced transactionally in the service. Add append-only activity audit records for significant create/update/delete/approve/post/reverse actions; entity audit columns alone are not enough for before/after history.
9. Add migration tests against PostgreSQL: clean database → migrate up → verify all table names follow `snake_case` and verify constraints/indexes → exercise rollback/reset in a disposable test DB. Verify Drogon ORM handles the chosen schema/prefix convention without quoted-name surprises.

**Current status:** The first 42-table migration and rollback were authored for PostgreSQL 15+, but only reviewed by inspection. No PostgreSQL migration, rollback, generated ORM model, or tenant/unit integration test has run.

**Exit criteria:** every legacy model and required new domain table is mapped; all table identifiers are lowercase `snake_case`; migrations apply to an empty PostgreSQL database; ORM code compiles against the generated schema; tenant/accounting-unit isolation, currency snapshots, audit history, and relationships are tested.

### Phase 3 — Build setup/master-data APIs and pages

Implement accounting-unit and currency setup contracts first, then account groups/classes and the chart-of-accounts hierarchy/header/account/subaccount workflows, followed by account controls, bank accounts, default GL numbers, imprest categories, petty-cash recipients, accounting periods, and budgets. Support an unbounded number of groups, accounts, subaccounts, currencies, and independent accounting units; avoid limits embedded in UI arrays or fixed-depth account columns. Model group/account parent-child relationships with integrity checks against cycles. Each account belongs to an accounting unit or an explicitly shared chart, and account-number uniqueness is scoped accordingly. An accounting unit is an independent book/configuration boundary; it is not automatically the same thing as a cost centre or an organizational reporting unit.

The account enquiry should show current posted balances with currency/unit filters and drill through to transaction history. Balances should come from the approved ledger source of truth or a tested projection, not from untrusted client state. Shared-resource screens consume shared-resource APIs; only GL-owned setup data belongs in `LedgerService`.

For each vertical slice, deliver in this order: request/response DTO and validation → service method using Drogon ORM → controller route → API/integration tests → Nuxt API composable and page → browser test. Use explicit pagination/filtering and never return persistence entities directly as public API contracts. Design an import staging workflow before adding large chart/recipient uploads: validate rows, show preview/errors, detect duplicates, require confirmation, and preserve an import audit record.

**Current status:** The Nuxt dashboard, account list/create form, and journal list/draft form use demo-backed API routes. They are not yet connected to persisted ORM setup data; account-group/currency setup, real account queries, tenant scoping, and browser automation remain pending.

**Exit criteria:** users can configure multiple accounting units, account groups, accounts/subaccounts, currencies and GL setup from the UI; account balances and transaction drill-down are tenant/unit scoped; invalid references and duplicate account numbers are rejected predictably.

### Phase 4 — Implement journals, approvals, posting, and accounting periods

Implement general journal batches (including adjustments and opening balances), batch sequencing/status, multi-currency journal lines, transaction enquiry, reversal, and period close/reopen. Support configurable maker-checker separation: an authorized preparer submits; an appropriately authorized reviewer approves/rejects; posting occurs only after the required approval. Permissions may vary by accounting unit and transaction type. Provide a clear state machine (for example draft → pending approval → approved → posted, with rejected/voided/reversed outcomes) rather than a collection of loosely related booleans.

Build posting as an atomic database transaction that:

- Confirms the batch belongs to the caller's tenant and accounting unit, is in the correct state, and is in an open period.
- Confirms every account is valid/active and available to the user/unit; line amounts/rates are valid; and total debits equal total credits under the approved rounding policy.
- Requires double-entry for ordinary postings. Allow single-sided opening entries only through a restricted, audited setup workflow with a defined balancing/control treatment and one-time reconciliation.
- Assigns/locks sequence values safely under concurrency and retains the preparer, approver, poster, timestamps, and posting reference.
- Persists posted entries and updates any agreed balance projection in the same transaction.
- Is idempotent or returns a clear conflict on repeated requests. A posted transaction is immutable; an error is corrected with a linked, approved reversal/adjustment batch, never by editing or deleting the original.

Treat period close/reopen as a permissioned workflow. Before close, report unposted or pending-approval batches, unreconciled cash items, and unresolved errors; record who closed/reopened each period and why. Design the period contract so future AR/AP/Inventory/Fixed Assets modules can report blockers to a coordinated close.

Choose one source of truth for balances. Prefer posted journal lines as the accounting ledger, with `AccountBalance`/account balance columns treated as rebuildable projections rather than competing truths. Add reconciliation tests that compare the projection to journal-line aggregates by account, subaccount, accounting unit, cost centre, and currency.

**Current status:** The C++ `LedgerService` now validates dates, line structure, exact six-decimal totals, and the draft-vs-approval balance rule; `LedgerController` exposes `POST /api/v1/ledger/journals/validate`. The service test passes standalone. No account/journal ORM persistence, sequence allocation, period checks, authorization, approvals, transactional posting, or reversal endpoints have been implemented. Nuxt demo writes remain process-local.

**Exit criteria:** balanced posting is atomic; unbalanced, cross-tenant/unit, unauthorized, closed-period, and duplicate-post attempts fail safely; approval and reversal trails are complete; a rollback leaves no partial journal or balance changes; concurrent sequence allocation does not duplicate batch numbers.

### Phase 5 — Implement cash vouchers, receipts, petty cash, imprest, and budget workflows

Implement direct GL cash/bank disbursement and receipt workflows without taking ownership of AP/AR invoices:

- Payment vouchers for cash or bank accounts, with configurable payment/tax/withholding codes and account mappings. Support single and multiple recipients, casual-wage vouchers, tax-authority vouchers, and cheque number/date at the recipient/payment-line level (not only on a header).
- Receipts into cash/bank accounts, with receipt numbering, posting, linked reversal, and date/ID-range summaries.
- Submit/approve/post/reverse actions with the same controlled state machine as journals. Posting creates balanced ledger batches and can never change a posted source document in place.
- Spreadsheet recipient imports through a staging/preview/validation flow, with row-level errors, duplicate detection, confirmation, and audit history; never write an uploaded spreadsheet directly into live recipient records.
- A cash-management increment for bank reconciliation: import statements (CSV/Excel first, additional bank formats/connectors later), detect duplicates, suggest matches, support partial/manual matching, record reconciliation statements, and route adjustments through approved journal/voucher workflows.
- Petty-cash transaction and imprest disbursement/retirement/refund/write-off flows, including tax/retention treatment where applicable and reconciliable GL postings.
- Periodized budgets by account plus cost centre (and other approved dimensions), composite budget rollups, and actual-vs-budget variance data. Keep composite budgets as traceable rollups, not duplicated actual ledger entries.

Expose payment/receipt summaries with safe date, ID, recipient, account, status, unit, and currency filters. AR/AP invoice settlement belongs to the future AR/AP modules; GL should provide a versioned, idempotent posting-batch contract that those modules can use.

Keep all public GL operations in `LedgerService` and the single `LedgerController`, with private helpers/DTOs as needed—do not split them into per-feature service classes.

**Exit criteria:** payment/receipt variants and recipient-level cheque details are covered; imports are previewed and audited; each workflow has explicit state transitions and authorization; financial side effects are transactional; child details, totals, reversals, and posted ledger entries reconcile; destructive actions respect the approved retention policy.

### Phase 6 — Implement GL reports, dashboard, and exports

Deliver an explicit report catalog based on the tender and legacy screens:

- Trial Balance; Income Statement; Statement of Financial Position; Cash Flow Statement; and the requested Income Statement Difference report (define whether this means period comparison, budget comparison, or another approved calculation in Phase 0).
- General-ledger account and subaccount transactions, with detailed drill-down and cash/bank books; printable Chart of Accounts and General Ledger Accounts.
- Cost-centre transaction/detail reports, budget variance and detailed actuals; account/subaccount balance enquiries.
- Payment, receipt, journal, and voucher summaries by date range, ID range, recipient, bank/cash account, accounting unit, status, and currency. AR/AP summaries become available through those modules' reporting contracts.

The dashboard should show posted balances and configurable financial-position/performance totals (assets, liabilities, stated capital/equity, revenues, expenditure) with drill-through to supporting accounts and transactions. Reports must support base-currency and approved foreign-currency views, clear rate/as-of semantics, searchable rows, saved filters, and server-side pagination. “Flexible reporting” should start with safe selectable dimensions, columns, sort/filter metadata, and approved report templates—not arbitrary user-supplied SQL.

This is the only application area permitted to use raw SQL. Keep reporting queries parameterized, whitelist every filter/sort/column, enforce tenant/accounting-unit/account-access scope, and test totals against known journal fixtures. Use ORM for report parameter lookups and all ordinary entity reads/writes. Generate Word/Excel/PDF outputs from the same authorized report result/definition, with export size limits and background jobs for large reports where required.

Do not copy the legacy layout's hard-coded report service URL. Use the new API through Nuxt runtime configuration and a same-origin/relative API path, with a report/export adapter only if the format requires one.

**Exit criteria:** every listed first-release report has a signed-off calculation; report totals reconcile to posted journals; dimensions/currency/period filters and exports are tested; report search cannot escape authorization scope; no application raw SQL exists outside report methods.

### Phase 7 — Hardening and release readiness

Run the complete API + PostgreSQL integration suite, Nuxt unit/component suite, and end-to-end browser flows. Verify empty/loading/error states, responsive navigation, keyboard operation, accessibility basics, authorization boundaries, immutable audit data, backups/restore, production configuration, import/export safety, and operational logs. Publish an OpenAPI contract and setup/runbook, including migration and rollback steps.

**Release gate:** a clean environment can start the API and Nuxt app, migrate the database, configure multiple accounting units and a chart of accounts, submit/approve/post a balanced journal and cash voucher, issue a linked reversal, view the account transaction drill-down and dashboard, and reconcile the results to a trial balance and budget variance report.

### Phase 8 — Expand into a broader ERP (post-GL foundation)

These are explicit follow-on modules/releases, not hidden requirements for the GL MVP:

1. **AR and AP:** customer invoices/credit notes and supplier bills/debit notes; aging, settlements/receipts/payments, approvals, reminders, tax treatment, and summaries. Each module owns its documents and customer/vendor subledger, then submits balanced, idempotent posting batches to GL. Include subledger-to-GL reconciliation and coordinated period-close readiness.
2. **Sales and procurement operations:** connect customer/lead/quotation/sales-order workflows to AR; connect requisitions/purchase orders/receiving to AP and Inventory. Add approvals, recurring bills/invoices, credit controls, vendor/customer self-service, and integrations without making GL the owner of operational documents.
3. **Fixed Assets:** settings, categories, units, conditions, locations, suppliers, register, acquisition links to AP/payment/journal, depreciation books/schedules, transfers, impairment/revaluation/disposal, and register/location/category/checklist reports. Posting depreciation/disposal is an auditable subledger batch into GL.
4. **Inventory:** categories, items, units, locations/warehouses, departments, transaction periods, suppliers, batches/lots/serials, reorder levels, receipts/issues/transfers/adjustments, and inventory ledger with balances by item, location, and batch. Support FIFO and weighted-average valuation as configurable costing policies; test costs through returns, transfers, negative-stock policy, and period close before release. Include reports for receipts/issues by category, supplier, and department, reorder-level items, and valuation. Inventory valuation posts balanced batches to GL.
5. **Projects and workforce operations:** project/job budgets, costs, time/expense capture, profitability, employee reimbursements, and integration with Payroll/AP/GL where appropriate.
6. **Enterprise operations:** intercompany accounting and consolidation/eliminations; recurring transaction schedules and allocation templates; configurable workflow rules/delegation; cash forecasting; scheduled/custom reports; bank-feed adapters; attachments/document capture; and versioned APIs/webhooks with an outbox for reliable downstream delivery.
7. **Product readiness:** module-level feature flags/permissions, tenant configuration, localization/tax configuration and future e-invoicing adapters, data import templates, audit/search across modules, operational monitoring, and upgrade-safe migrations.

Every module in this roadmap—not only GL—must extend/reuse the shared Nuxt resource layer and own exactly one module controller plus one module service class. Keep module boundaries explicit, use ORM-first persistence, share audit/approval standards, and integrate financial effects through the GL posting contract. Add capabilities by customer value and validated accounting requirements, not by copying a competitor's UI or making the initial GL scope unbounded.

## 5. Ledger schema inventory to cover

The initial schema review must account for all 26 classes below. C# names are shown only for traceability; every PostgreSQL table must be an unquoted lowercase `snake_case` identifier with the agreed GL prefix. Correct legacy typos in the new domain/API/table names (for example, do not create a PascalCase `CoaHierachy` table).

- **Setup, balances, and budgets:** `AccountBalance`, `AccountingPeriod`, `BankAccount`, `Budget`, `BudgetDetail`, `CoaControl`, `CoaDetail`, `CoaHierachy`, `DefaultGlNumber`, `ImprestCategory`, `PettyCashRecipient`, `PvRetension`.
- **Journals and history:** `Journal`, `JournalDetail`, `JournalBatchSequence`, `JournalHistory`, `DeletedJournal`.
- **Payment vouchers:** `GlPaymentVoucher`, `GlVoucherDetail`.
- **Petty cash:** `PettyCashTransaction`, `PettyCashTransactionDetail`.
- **Imprest lifecycle:** `Imprest`, `ImprestRefund`, `ImprestRetirement`, `ImprestRetirementDetail`, `ImprestWriteoff`.

The models refer to shared/module entities (for example currency, bank, customer, supplier, employee, organization unit, and account). Create real foreign keys only when the target table and its lifecycle/tenant semantics are defined; otherwise document the reference contract and add the FK in the shared-data migration rather than creating misleading constraints.

## 6. API and frontend conventions

- Use a versioned module route prefix such as `/api/v1/ledger`. Group resources by domain (`accounting-units`, `account-groups`, `accounts`, `bank-accounts`, `accounting-periods`, `budgets`, `journals`, `payments`, `receipts`, `petty-cash`, `imprests`, `approvals`, `bank-reconciliations`, and `reports`). Use explicit action routes for state transitions such as `POST /journals/{id}/submit`, `/approve`, `/post`, and `/reverse`; do not expose generic writes that bypass invariants.
- Return a consistent Problem Details error shape. Distinguish validation errors, missing resources, authorization failures, and business conflicts. Include a request/correlation ID in logs and error responses.
- Validate request DTOs at the boundary and repeat critical invariants in the service. Never trust client-supplied tenant IDs; derive tenant/user context from authenticated identity. Scope authorization by role, accounting unit, and account as required, with segregation-of-duties checks for preparer/approver/poster.
- Decide how financial decimals are represented over JSON. To avoid JavaScript floating-point drift, prefer decimal strings (or a decimal-safe client representation) for amounts/rates and format them through shared utilities. Persist the transaction-time currency/rate/base-currency value so later exchange-rate updates do not change prior documents.
- Maintain standard entity audit columns plus append-only activity history for significant changes—including before/after changes to transaction headers and detail rows, deletes, approval decisions, posting, reversal, imports, and period close/reopen. Do not rely on soft-delete flags or UI-only logs as the audit record.
- Put the sidebar, module switcher, theme tokens/toggle, layout primitives, API client, error handling, date/currency formatting, and common notifications in `shared-resource`. Ledger pages should supply their menu entries/content, not fork the shared shell.
- Use Tailwind tokens/components consistently and make the ledger layout responsive, keyboard navigable, and accessible. Use same-origin relative API URLs or a configured Nuxt server proxy; browser code must not call a hard-coded `localhost` backend.
- Provide staged spreadsheet imports with preview/validation and downloadable row-level error reports. Provide exportable reports from the same authorized query definition; never let uploaded data, report filters, or sort fields become SQL fragments.

## 7. Test strategy and definition of done

1. **Unit tests:** journal balance/rounding and FX revaluation rules, account/unit/dimension access, approval/reversal transitions, tax calculations, and period validation.
2. **PostgreSQL integration tests:** migration/schema behavior, lowercase `snake_case` names, ORM CRUD, constraints, append-only audit history, transaction rollback, concurrency-sensitive numbering, and tenant/accounting-unit isolation. Run against PostgreSQL rather than relying only on an in-memory substitute.
3. **API tests:** route/status/error contracts, role and segregation-of-duties rules, pagination, idempotent posting/reversal/import, report filters/exports, and cross-module posting contract.
4. **Frontend tests:** shared layout/theme, multi-unit navigation, forms/tables, decimal/date/currency formatting, import preview/errors, approvals, and API/report error states.
5. **End-to-end tests:** configure two accounting units and a chart → submit a balanced journal/payment → approve/post it → verify account/subaccount balances and transaction drill-down → reverse it → verify audit and report changes. Also verify closed periods reject new postings and one tenant/unit cannot view another's data.
6. **Policy checks:** CI should fail if any database table name is not lowercase `snake_case`, a non-report application path uses raw SQL, generated CRUD controllers are enabled, or a GL entity is missing from the migration/model inventory.

A GL slice is done when its API, ORM persistence, UI, validation, authorization, audit behavior, tests, and documentation all agree; a page that merely mirrors a C# form without accounting invariants is not complete.

## 8. Decisions to confirm in Phase 0

1. Is the database shared by tenants with `tenant_id` on rows (suggested by the C# models), or isolated by database/schema? What are the canonical authenticated tenant/user ID types?
2. What is an independent accounting unit in this ERP? Does each unit own its chart of accounts, base currency, fiscal calendar, and approval rules, or can some setup be shared? Which legacy `OuId` values represent operational units versus accounting units/cost centres?
3. Which shared-resource tables/APIs are available in the first GL release, and which IDs can be foreign-keyed now?
4. Are posted journals immutable with reversal-only correction? Who may prepare, approve, post, reverse, reopen, or delete drafts? What is the role/threshold policy for maker-checker approvals?
5. Are account balances derived from posted journal lines, stored as a projection, or both? How will projection drift be detected/rebuilt? How should opening balances be entered and reconciled?
6. What are the currency precision, exchange-rate precision, rounding, base-currency conversion, FX revaluation cadence, and transaction-date/time-zone rules? Should revaluation be previewed/approved before posting?
7. Should mutable JSONB detail collections in the C# models become normalized child tables in the new schema? This plan recommends normalization for financial line items and JSONB only for snapshots.
8. What does “Income Statement Difference” mean in the tender—comparison to budget, prior period, another accounting unit, or another calculation? Which report rows must support free-text search versus structured filters?
9. Which payment tax/withholding schemes, voucher numbering rules, recipient import columns, cheque fields, and tax-authority workflows must be supported initially?
10. What exact GL screens/workflows are MVP versus later parity work? Should Nuxt pages follow standard `app/pages/ledger/**` routing or a custom literal `views/ledger-*` convention?
11. Which bank statement formats/connectors are in the initial reconciliation release? Which costing method and negative-stock/period rules should the future Inventory module use, and what depreciation policies should Fixed Assets support?
12. Which cross-module posting envelope, idempotency key, retry behavior, and coordinated period-close handshake will AR/AP/Fixed Assets/Inventory use?

## 9. Product reference material

These sources are design inspiration and feature-discovery inputs, not requirements to copy a vendor's workflow or interface:

- Acumatica's period-management guidance ties GL close readiness to subledger close status and unposted/pending-approval work across areas such as cash management, AP, AR, inventory, and fixed assets. This supports planning for a close checklist and future coordinated subledger close: [1](https://help.acumatica.com/(W(353))/Wiki/ShowWiki.aspx?pageid=eedf2adf-6ddc-4c33-932b-de60275c547f).
- Acumatica's bank-reconciliation guidance covers importing bank statements, matching transactions, handling duplicates, and reconciliation approvals; this informs the staged cash-management roadmap: [2](https://help.acumatica.com/(W(14))/Wiki/ShowWiki.aspx?pageid=2ae35273-c845-4edb-96ae-68ce6ff0ba54).
- Acumatica's chart-of-accounts guidance describes account classes, spreadsheet-based account setup, and restricting account access; this informs GL classification, import, and account-level authorization: [3](https://help.acumatica.com/(W(19))/Wiki/ShowWiki.aspx?wikiname=HelpRoot_Implement&PageID=67394d85-8e3e-4f9b-bcf0-8dfd02e2d15b).
- Zoho Books highlights multi-currency, inventory, project budgeting/profitability, and financial reporting as connected accounting capabilities: [4](https://zoho.com/books).
- Zoho Books' feature comparison surfaces product ideas such as approvals, custom roles/reports, budgeting, analytics, cash-flow forecasting, and warehouse management; validate these against BusinessDesk users and priorities before scheduling them: [5](https://www.zoho.com/books/pdf/zohobooks-vs-quickbooks.pdf).
