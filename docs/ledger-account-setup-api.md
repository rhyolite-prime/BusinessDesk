# General Ledger account setup API

> **Current routes:** Account Controls now use the tenant-JWT authenticated CRUD
> contract in [account-controls.md](account-controls.md). Account Heads use
> [account-heads-frontend.md](account-heads-frontend.md). The legacy scope headers,
> payloads, and response shapes below do not apply to these migrated routes.

This document describes the account-setup routes currently implemented by the single Drogon `LedgerController` and the coroutine-based use cases in `LedgerService`.

> **Authentication warning:** these routes currently obtain scope from caller-supplied `X-Tenant-Id` and `X-Accounting-Unit-Id` headers. That is a temporary development contract, not authorization. Do not expose these endpoints in a production environment until middleware authenticates the caller, authorizes access to the accounting unit, and constructs scope from verified claims. Never treat these headers alone as proof of tenant identity.

## Scope headers

Every account-setup request requires:

| Header | Format | Meaning |
|---|---|---|
| `X-Tenant-Id` | Positive 32-bit integer | Tenant scope |
| `X-Accounting-Unit-Id` | UUID | Accounting unit (the unit must belong to the tenant and be active) |

All list, get, update, and delete ORM queries are constrained by both IDs and exclude soft-deleted rows. Creates and changes run inside a Drogon coroutine ORM transaction. The service locks the accounting-unit row with `Mapper::forUpdate()` while validating and writing, serializing setup writes within that unit; it waits for the transaction commit before returning a successful response. Failures roll back the open transaction. The service uses Drogon ORM for ordinary persistence; it does not issue application raw SQL.

## Routes

| Method | Path | Operation |
|---|---|---|
| `GET` | `/api/v1/ledger/account-heads` | List account heads in the scoped accounting unit |
| `POST` | `/api/v1/ledger/account-heads` | Create an account head |
| `GET` | `/api/v1/ledger/account-heads/{id}` | Get an account head |
| `PUT` | `/api/v1/ledger/account-heads/{id}` | Replace an account head's editable fields |
| `DELETE` | `/api/v1/ledger/account-heads/{id}` | Soft-delete an account head, if it has no dependents |
| `GET` | `/api/v1/ledger/account-controls` | List control headers; optionally filter by `accountGroupId` |
| `POST` | `/api/v1/ledger/account-controls` | Create a control header |
| `GET` | `/api/v1/ledger/account-controls/{id}` | Get a control header |
| `PUT` | `/api/v1/ledger/account-controls/{id}` | Replace a control header's editable fields |
| `DELETE` | `/api/v1/ledger/account-controls/{id}` | Soft-delete a control header, if it has no dependents |
| `GET` | `/api/v1/ledger/accounts` | List detail/posting accounts; supports filters below |
| `POST` | `/api/v1/ledger/accounts` | Create a detail/posting account |
| `GET` | `/api/v1/ledger/accounts/{id}` | Get a detail/posting account |
| `PUT` | `/api/v1/ledger/accounts/{id}` | Replace a detail account's editable fields |
| `DELETE` | `/api/v1/ledger/accounts/{id}` | Soft-delete a detail/posting account |

Create returns `201 Created`; reads and updates return `200 OK`; successful delete returns `200 OK` with `{"data":{"id":"…","deleted":true}}`. Other successful responses use `{"data": ...}`. List endpoints return `data` as an array and currently do not paginate.

### List filters

- `GET /api/v1/ledger/account-controls?accountGroupId={uuid}` (optional)
- `GET /api/v1/ledger/accounts?accountGroupId={uuid}&accountHeaderId={uuid}&status=active` (each optional; `status` is `active` or `inactive`)

### Request payloads

Optional fields may be omitted or set to JSON `null` where applicable. Boolean flags default to the values shown below. `PUT` accepts the same full editable object as `POST`; it is not a partial-update/PATCH operation.

**Account head** (`POST`/`PUT /account-heads`):

```json
{
  "name": "Current assets",
  "parentId": null,
  "standardAccountType": "Asset",
  "sortOrder": 10,
  "isActive": true
}
```

`standardAccountType` is required; accepted values are `Asset`/`Assets`, `Liability`/`Liabilities`, `Equity`, `Revenue`, and `Expense`/`Expenses` (case-insensitive), or integer codes `0` through `4` in that order. `parentId` is an optional parent account-head UUID; null or omitted means a root head. `sortOrder` defaults to `0`; `isActive` defaults to `true`.

**Control header** (`POST`/`PUT /account-controls`):

```json
{
  "accountGroupId": "41e5df34-3b77-4c50-90a3-d8c22df6d1a2",
  "parentAccountHeaderId": null,
  "accountHeaderName": "Cash and bank",
  "minAccount": 1000,
  "maxAccount": 1099,
  "isActive": true
}
```

`accountGroupId` and `accountHeaderName` are required. The parent is optional/null for a root control header. The range must be non-negative and `minAccount <= maxAccount`. The JSON parser defaults omitted range endpoints to `0`; clients should send both explicitly. `isActive` defaults to `true`.

**Detail/posting account** (`POST`/`PUT /accounts`):

```json
{
  "accountHeaderId": "4f33008b-7b54-4df3-9ce2-7a3e39f67a13",
  "accountGroupId": "41e5df34-3b77-4c50-90a3-d8c22df6d1a2",
  "accountNumber": "1001",
  "accountName": "Petty cash",
  "status": "active",
  "currencyId": null,
  "allowManualPosting": true,
  "isControlAccount": false
}
```

`accountHeaderId`, `accountNumber`, and `accountName` are required. `accountGroupId` is optional; if provided, it must match the group derived from the selected control header. The number must contain digits only, fit in a signed 32-bit integer, be within the selected header's inclusive range, and belong to a leaf control header. Account numbers are unique for the accounting unit (including numbers on soft-deleted records). `status` defaults to `active` and accepts `active` or `inactive`; `currencyId` is optional but, when provided, must identify an active currency. `allowManualPosting` defaults to `true`; `isControlAccount` defaults to `false`.

### Domain rules

- Account heads form a parent/child hierarchy scoped to one accounting unit. A parent must be active and have the same standard account type as its child. Self-parenting, cycles, and hierarchy depth beyond 64 are rejected. A head's name is unique among heads with the same parent (case-insensitive).
- A standard account type cannot be changed while the head has dependent groups, control headers, or detail accounts. A head with active descendants/controls/accounts cannot be deactivated. A head with any non-deleted children, controls, or accounts cannot be deleted.
- Control headers belong to an account head and may be nested only under a parent in the same account head. Each child range must fit inside the parent range. Active sibling headers cannot share a name or overlapping number ranges. Updates cannot move a header to another account head while it has dependents, shrink its range around a child/account, or deactivate it while active children/accounts remain. Deletion is blocked while child controls or detail accounts remain.
- Detail accounts inherit their persisted account head and standard type from the selected control header; clients cannot use the optional group field to override this. An account head/control must be active and the control must be a leaf.
- Deletes set audit/soft-delete fields. They do not physically remove rows.

## Responses and errors

A successful create/read/update response is shaped as follows:

```json
{"data":{"id":"…","name":"Current assets"}}
```

List responses use `{"data":[...]}`. A domain or database error is returned as JSON:

```json
{"error":{"code":"validation_error","message":"The request body is invalid.","details":["..."]}}
```

Common status mappings are `400` for validation, `404` for a missing scoped resource/accounting unit, `409` for business or database constraint conflicts, `503` when the database client is unavailable, and `500` for unexpected errors. Internal SQL error text is not returned to the client.

## Current verification boundary

Framework-independent input-rule tests run under C++17 without Drogon. The full C++20 Drogon application has not yet been compiled in this environment, and no account-setup route has yet been exercised against PostgreSQL. Treat all ORM/runtime behavior as pending until those checks are run. Journal validation has a separate route at `POST /api/v1/ledger/journals/validate`; journal persistence and posting are not part of this account-setup API.
