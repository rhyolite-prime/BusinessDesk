# GL account-setup API — sample payloads

Base URL: `http://localhost:5004/api/v1/ledger/`

> **Scope headers:** the contract in `docs/ledger-account-setup-api.md` defines
> `X-Tenant-Id` and `X-Accounting-Unit-Id` request headers. The service layer
> does not consume them yet (the service method signatures carry no request
> context), so scoping is not enforced. Send them anyway so calls keep working
> once middleware lands:
> `-H "X-Tenant-Id: 1" -H "X-Accounting-Unit-Id: 7f1c2a3e-..."`

> **Field-name note:** the payload keys below are the ones the DTO parsers in
> `dto/BaseGlDto.h` actually accept. They differ from the names used in
> `docs/ledger-account-setup-api.md` (e.g. the docs say `name`/`parentId`/
> `standardAccountType`, the code reads `accountHeadName`/`parentHeadId`/
> `accountType`). Pick one spelling on each side before shipping.

## Account heads

**Create** — `POST /account-heads` (returns `201 Created`)

```json
{
  "accountHeadName": "Current assets",
  "parentHeadId": null,
  "accountType": "Asset"
}
```

`accountType` accepts `Asset`/`Assets`, `Liability`/`Liabilities`, `Equity`,
`Revenue`, `Expense`/`Expenses` (case-insensitive) or integer codes `0`–`4`.
`parentHeadId` is an optional parent head UUID; omit or `null` for a root head.

curl:

```bash
curl -s -X POST http://localhost:5004/api/v1/ledger/account-heads \
  -H "Content-Type: application/json" \
  -d '{"accountHeadName":"Current assets","parentHeadId":null,"accountType":"Asset"}'
```

**List** — `GET /account-heads?pageNo=1&pageSize=20&query=current`
(`query` filters on name, case-insensitive; both pagination params optional)

```bash
curl -s "http://localhost:5004/api/v1/ledger/account-heads?pageNo=1&pageSize=20"
```

**Update** — `PUT /account-heads/{id}` (same body shape as create)

```bash
curl -s -X PUT http://localhost:5004/api/v1/ledger/account-heads/<head-uuid> \
  -H "Content-Type: application/json" \
  -d '{"accountHeadName":"Current assets (renamed)","accountType":"Asset"}'
```

**Delete** (soft) — `DELETE /account-heads/{id}`

```bash
curl -s -X DELETE http://localhost:5004/api/v1/ledger/account-heads/<head-uuid>
```

## Account controls (control headers)

**Create** — `POST /account-controls` (returns `201 Created`)

```json
{
  "chartOfAccountId": "41e5df34-3b77-4c50-90a3-d8c22df6d1a2",
  "parentControlId": null,
  "name": "Cash and bank",
  "minAccount": 1000,
  "maxAccount": 1099,
  "accountType": 0
}
```

`chartOfAccountId` (the owning account head) and `name` are required; send
`minAccount`/`maxAccount` explicitly (omitted endpoints default to `0`).
`parentControlId` is an optional parent control UUID in the same account head.

**List** — `GET /account-controls?pageNo=1&pageSize=20&query=cash`

**Update** — `PUT /account-controls/{id}` (same body shape as create)

**Delete** (soft) — `DELETE /account-controls/{id}`

## Detail / posting accounts

**Create** — `POST /accounts` (returns `201 Created`)

```json
{
  "accountControlId": "9b2f0c1a-...",
  "accountName": "Petty cash",
  "accountNo": 1001,
  "status": "active",
  "currencyId": null
}
```

`accountControlId`, `accountName` and `accountNo` are required. `accountNo`
must be digits-only, fit a signed 32-bit integer, and fall inside the control
header's inclusive range (the header must be a leaf). `status` accepts
`active`/`inactive` (default `active`). `currencyId` is an optional currency
UUID.

**List** — `GET /accounts?pageNo=1&pageSize=20&query=petty`

**Update** — `PUT /accounts/{id}` (same body shape as create)

**Delete** (soft) — `DELETE /accounts/{id}`

## Bank accounts

**Create** — `POST /bank-accounts` (returns `201 Created`)

```json
{
  "bankId": null,
  "bankName": "Ghana Commercial Bank",
  "bankBranchId": null,
  "bankBranchName": "Kumasi Main",
  "accountId": "c3d4e5f6-...",
  "accountName": "GHS Operating",
  "address": "12 High Street",
  "location": "Kumasi",
  "accountNo": "0123456789",
  "accountType": "current",
  "currencyId": "8b7c6d5e-...",
  "contactPerson": "A. Mensah",
  "contactNo": "+233 32 000 0000",
  "chequeBookStart": "000001",
  "chequeBookEnd": "000050",
  "dateOpened": "2024-01-08"
}
```

`bankName`, `bankBranchName`, `accountId`, `accountNo` and `currencyId` are
required. `dateOpened` is `YYYY-MM-DD` (stored as a date, time discarded).

**List** — `GET /bank-accounts?pageNo=1&pageSize=20&query=ghana`
(`query` matches bank name, branch name or account number)

**Update** — `PUT /bank-accounts/{id}` (same body shape as create)

**Delete** (soft) — `DELETE /bank-accounts/{id}`

## Response shapes

Success (create/read/update/delete all use this envelope; `201` on creates,
`200` otherwise):

```json
{
  "data": { "id": "...", "name": "Current assets" },
  "message": "ok",
  "success": true
}
```

List endpoints return `data` as an array plus pagination fields
(`totalCount`, `pageNo`, `pageSize`, `totalPages`, `lowerBound`, `upperBound`).

Error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Account head name is required.",
    "detail": ""
  },
  "message": "...",
  "success": false
}
```

Error codes map to HTTP status: `validation_error` → `400`, `not_found` →
`404`, `conflict` → `409`, `database_error`/unexpected → `500`.

## Suggested smoke-test sequence

1. `POST /account-heads` → keep the returned `id` (head A)
2. `POST /account-controls` with `chartOfAccountId` = head A → keep the `id`
   (control C)
3. `POST /accounts` with `accountControlId` = control C and `accountNo` inside
   C's range
4. `GET /account-heads?query=current`, then `PUT` + `DELETE` each resource by
   id
5. Repeat with `POST /bank-accounts`

## Not yet wired

- `GET .../{id}` single-resource reads for heads/controls/details return
  `501 Not Implemented` — `GlService` exposes no get-by-id methods yet.
- `POST /journals/validate` remains `501 Not Implemented` (journal validation
  is outside the account-setup service).
