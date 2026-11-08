# Supply chain workspace

Procure-to-pay: purchase requisitions, purchase orders and goods receipts with
full approval workflows, UOM-converted order lines, receipt-driven expected
quantity rollup and automatic stock + GL landing on post — all unit-aware and
tenant-isolated.

## Deploy the database upgrade first

Supply chain relies on the inventory catalogs. Apply **migrations 029–035**
(see [docs/inventory.md](inventory.md)) before rebuilding. Missing table probes
return `schema_not_ready` / 503; applying the migration repairs the next
request without restarts.

## Routes and authentication

All routes require `TenantJwtAuthFilter` and the `supply_chain` module
permission. Tenant, actor and unit authority come from the session; every
mutation carries the header `version` for optimistic locking plus an
idempotent `requestKey`.

| Method | Backend route | Request / result |
| --- | --- | --- |
| GET / POST | `/api/v1/scm/requisitions` | Paged list (query `q,status,page,size,accountingUnitId`); draft create with purpose, priority and lines |
| GET / PUT / DELETE | `/api/v1/scm/requisitions/{id}` | Detail (lines + events), draft replacement, draft delete |
| POST | `/api/v1/scm/requisitions/{id}/{submit\|approve\|reject\|cancel\|close}` | `draft→submitted→approved→(partially_ordered→ordered→closed)`; reject/cancel require a reason ≤500 chars |
| GET / POST | `/api/v1/scm/orders` | Paged list; draft create against a live supplier with currency-resolved totals |
| GET / PUT / DELETE | `/api/v1/scm/orders/{id}` | Detail, draft replacement (supplier immutable), draft delete |
| POST | `/api/v1/scm/orders/{id}/{submit\|approve\|reject\|send\|cancel\|close}` | `draft→submitted→approved→sent`; sent orders accept receipts; closing is only possible once no lines remain open |
| GET / POST | `/api/v1/scm/receipts` | Paged list; draft create against an order (`status sent/partially_received`, matching unit, supplier and warehouse — enforced by `033` trigger *and* by service probing) |
| GET / PUT / DELETE | `/api/v1/scm/receipts/{id}` | Detail, draft line replacement against open order lines, draft delete |
| POST | `/api/v1/scm/receipts/{id}/{post\|reverse\|cancel}` | Post lands stock via the inventory posting engine in the same transaction; reverse mirrors it |
| GET | `/api/v1/scm/{resource}/next-number?accountingUnitId=` | Unreserved sequence preview per unit and document family |

Same-origin Nuxt routes mirror these under `/api/scm/**`
(`frontend/server/utils/scm-api.ts`).

## Contract with inventory

Receipts are **stock documents with a compliant purchase chain**: posting a
goods receipt calls `InventoryService::postStockDocument` inside one database
transaction. Accepted quantities move into the order's warehouse (accepted
only — rejected quantities stay out of stock and out of the ledger), FIFO
layers and weighted averages update, the immutable stock document is stamped
with its `GRN` linkage (`scm_purchase_receipts.inv_stock_document_id` is
unique-committed), order lines and requisition lines roll forward through the
`034` counters, and the receipt records its GL batch idempotently.

Because lines carry their own UOM plus conversion factor, an order placed in
`box12` reconciles exactly to the base stock (e.g. 2 boxes = 24 pieces) and
FIFO layers record base quantities. Ordered quantities on requisitions never
decrease; receipts that partly reject do not reopen ordered quantities — they
flag remaining open, letting the operator re-order through a new chain.

Reversal of a posted receipt mirrors the stock document (same period required
open), leaves PO receiving counters intact ("counters never decrease", enforced
at the schema layer), and flags both receipts `reversed` with a twin event.

## UI workspaces

- `/supply-chain` — tabs for requisitions, purchase orders and receipts with
  draft creation wizards, status filters, and in-context workflow actions.
  An approved requisition offers "Create PO" and a sent order offers
  "Receive" so the chain never requires copy-paste.
- `/inventory` — items/warehouses/balances CRUD plus the stock document
  console used by receipts (see [docs/inventory.md](inventory.md)).
