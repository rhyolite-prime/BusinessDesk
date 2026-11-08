# Inventory workspace

Multi-warehouse stock ledger with tracked batches/serials, receipts, issues,
transfers, adjustments and stock counts, FIFO/weighted-average/standard
valuation, unlimited concurrent posting even before a closing period is
reopened, and idempotent document workflows connected to the general ledger
and supply chain modules.

## Deploy the database upgrade first

Apply **migrations 029 through 035** (not the `.down.sql` files) in order:

```sh
for f in 029_inventory_catalog 030_inventory_locations 031_inventory_stock_ledger \
         032_procurement_requisitions 033_procurement_orders \
         034_procurement_receipts_logistics 035_inventory_valuation_close; do
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/$f.sql
done
```

The backend does not run schema DDL on startup or per request. Missing
migrations return `schema_not_ready` / 503 with a pointer to the pending file;
checks are not cached. The down migrations reverse the upgrade — they are not
repair scripts and fail transactionally on live-data conflicts.

## Routes and authentication

All routes require `TenantJwtAuthFilter`, module permission
`inventory` (`read`/`write`/`manage`) and an active tenant accounting unit.
Tenant and audit actor come from the JWT; every mutation carries an
optimistic-locking `version` and an idempotency `requestKey`.

| Method | Backend route | Request / result |
| --- | --- | --- |
| GET | `/api/v1/inventory/dashboard/summary` | Live unit dashboard (items, warehouses, stock on hand/value, document throughput, low stock) |
| GET / POST | `/api/v1/inventory/items` | Paged list (query `q,page,size,accountingUnitId`); create with category/UOM/tracking/valuation/cost accounts |
| GET / PUT / DELETE | `/api/v1/inventory/items/{id}` | Detail, full replace, version-guarded soft delete |
| GET | `/api/v1/inventory/items/{id}/card` | Item detail plus balances, defaults and movement options in one request |
| GET / POST / PUT / DELETE | `/api/v1/inventory/uoms`, `…/item-categories` | Catalog units of measure and item categories |
| GET / POST / PUT / DELETE | `/api/v1/inventory/warehouses`, `…/bin-locations` | Physical/transit/quarantine/virtual warehouses and bins (unit-scoped) |
| GET | `/api/v1/inventory/balances`, `…/ledger` | On-hand scopes (item × warehouse × batch) and immutable stock transactions |
| GET / POST / DELETE | `/api/v1/inventory/batches`, `…/serials` | Traced batch and serial records |
| GET / POST | `/api/v1/inventory/snapshots`, `…/closes` | Valuation snapshots and per-unit valuation closes |
| GET / POST | `/api/v1/inventory/documents` | Paged drafts with type/status/date filters; create drafts (`receipt`, `issue`, `transfer`, `adjustment`, `count`) |
| GET | `/api/v1/inventory/documents/{id}` | Full record: header, live lines, workflow events, posted linkage |
| GET | `/api/v1/inventory/documents/next-number?documentType=receipt` | Unreserved sequence preview |
| POST | `/api/v1/inventory/documents/{id}/{submit\|approve\|reject\|post\|cancel\|reverse}` | Workflow transitions; `post` books quantities, costs, FIFO layers, ledgers and the GL batch atomically |

Same-origin Nuxt routes mirror these under `/api/inventory/**`. The BFF
(`frontend/server/utils/inventory-api.ts`) forwards the session bearer, applies
no-store and origin checks, and surfaces the service's own error messages.
There is no demo fallback and the HttpOnly token never reaches the browser.

## Document workflow invariants

`draft → submitted → approved → posted`, with `draft/submitted/approved →
cancelled`, `submitted → rejected` and `posted → reversed`. Drafts may be
replaced wholesale (`PUT`) or deleted; any later state is frozen by database
guards, not application code (`031` line/header protection triggers). Posting:

- derives segregated line-side warehouses per type (a transfer touches both
  sides; adjustments post to one adjustment warehouse; counts target the
  counting warehouse);
- validates serial counts and batch references exactly against the schema
  contract and rejects negative on-hand quantities unless the warehouse allows
  them;
- keeps per-scope balance rows locked `FOR UPDATE` while FIFO layers are
  consumed; weighted-average outbounds use the running average, standard-cost
  items split price variance from the standard valuation;
- lands one immutable `inv_stock_transactions` row per line and warehouse with
  running balances, and one `inv_cost_layers` entry per FIFO receipt;
- posts a balanced GL batch (inventory GRNI/purchase accounts from the item
  overrides or `gl_default_accounts`, standard-cost variance to the item's
  variance account) through the journal service in the same transaction;
- rolls a requisition/PO row forward when the document originated from the
  supply-chain module (`034` guards enforce currency consistency).

Reversal creates a mirror document of the same type with inverted lines, posts
it into the same open period and links both documents; original counters never
decrease, which the schema also enforces.

Lifting of the whole chain — items, stock movement, receipts/issues/transfers,
costing and GL posting — is smoke-replayed statement-for-statement in
`tooling/services_smoke.mjs` against the real migration chain.
