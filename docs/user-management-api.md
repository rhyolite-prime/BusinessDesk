# Managing tenant and host users

## Routes and authentication

| Operation | Tenant users — tenant JWT | Host users — host JWT |
|---|---|---|
| List/search | `GET /api/v1/users` | `GET /api/v1/host/users` |
| Create | `POST /api/v1/users` | `POST /api/v1/host/users` |
| Update | `PUT /api/v1/users/{userId}` | `PUT /api/v1/host/users/{userId}` |
| Soft-delete | `DELETE /api/v1/users/{userId}` | `DELETE /api/v1/host/users/{userId}` |

Use `Authorization: Bearer <token>` on every request. Tenant routes register
`TenantJwtAuthFilter`; host routes register `HostJwtAuthFilter`. `OPTIONS` returns
204 for preflight requests. No GET-by-ID or role-assignment endpoint is introduced.

**Scope is fixed by authentication, never by client input.** A tenant can manage
only its own users. Host routes manage legacy NULL-tenant host users and users in
the protected default host tenant; they do not manage arbitrary tenant users.
A host token is not interchangeable with a tenant token. `tenantId`/`accountId`
query overrides and unsupported body fields (including tenant/privilege/role/audit
fields) are rejected. A valid user ID outside the current scope returns 404.

Tenant login: `POST /api/v1/auth/tenant-login`, supplying the tenancy name as
`accountId`. Host login: `POST /api/v1/auth/host-login`, omitting `accountId`.

## Permissions

| Operation | Tenant permission | Host permission |
|---|---|---|
| List | `user_management.users.view` | `users.read` |
| Create | `user_management.users.create` | `users.create` |
| Update | `user_management.users.update` | `users.edit` or `users.update` |
| Delete | `user_management.users.delete` | `users.delete` |

`user_management.manage` grants all four tenant operations. `users.manage` grants
all four operations within the token's own scope. Tenant routes also accept the
concise action aliases `users.read`, `users.create`, `users.update`, `users.delete`.
Having read permission alone never grants create/update/delete.

Newly provisioned tenant administrators receive the existing `AdminPermissions`
configuration through their tenant role. New installs grant the bootstrap host
role `users.manage` in `database/seeds/001_default_host.sql`.

**For an already-seeded installation**, apply:

```sh
psql -X -v ON_ERROR_STOP=1 -d <database> \
  -f database/migrations/003_bootstrap_host_user_management.sql
```

Then sign in again: JWT permissions are snapshots, and an old token will still
return 403. This migration only updates the protected bootstrap role while its
host tenant is live and active, preserves existing permissions, and is safe to
repeat. Do not rerun the first-install seed. Other host roles must be assigned
appropriate permissions separately.

## Create

In Postman, select POST, set Bearer authorization, and choose Body → raw → JSON.
Use `{{baseUrl}}/api/v1/users` for the current tenant, or
`{{baseUrl}}/api/v1/host/users` for host users.

```json
{
  "firstName": "Kwabena",
  "lastName": "Mensah",
  "username": "kwabena",
  "email": "kwabena@example.com",
  "password": "a-strong-initial-password",
  "phoneNumber": "+233201234567",
  "country": "GH"
}
```

Set `Content-Type: application/json`. `email` and `password` are required.
Username is optional (email can be used for login). Passwords must be 8–72 bytes;
the upper bound prevents bcrypt's silent truncation. First/last names and username
are at most 100 bytes; email, phone and country at most 255 bytes. Email and username
are normalized to lowercase. Usernames cannot contain whitespace/control
characters; NUL characters and non-string/null field values are rejected.

Create returns **201** with the existing envelope:

```json
{
  "success": true,
  "message": "User created successfully",
  "result": { "id": "<new-user-uuid>" }
}
```

Tenant users are created active/unlocked, with the authenticated tenant ID and
`is_host_admin_user=false`. Host users are created in the supported legacy
NULL-tenant host scope, with `is_host_admin_user=true`. Audit fields record the
caller. These flags identify the authentication realm; they do **not** bypass
permission checks. New users receive no roles/permissions automatically. Role and
group assignment are not part of these endpoints; use trusted role-management
tooling before expecting the new user to access protected business APIs.

## Update

PUT the appropriate route with the user UUID in the path:

```json
{
  "firstName": "Kwabena",
  "phoneNumber": "+233209876543"
}
```

Updates are partial. Omitted fields are preserved. The existing service ignores
empty first/last name, phone and country strings, so these routes do not implement
clearing those fields. Explicit empty username/email/password is rejected rather
than silently ignored. An empty object is rejected. Include `password` only when
changing it; omitted passwords are never reset. Password changes are bcrypt-hashed.
User tenant, roles, privileges, active/locked status, and audit fields are not
client-editable. Returns 200 with `success: true` and a message.

## List/search

```http
GET {{baseUrl}}/api/v1/users?pageNo=1&pageSize=20&query=kwabena
Authorization: Bearer <tenant-token>
```

For hosts, replace the path with `/api/v1/host/users` and use a host token.
Pagination defaults to page 1, size 20; page size is capped at 200. Explicit page
values must be positive integers. Search matches first name, last name, email or
username (existing case-sensitive LIKE behavior). Results are ordered by ID for
stable pagination and include:

- `id`, `firstName`, `lastName`, `username`, `email`
- `phoneNumber`, `country`, `profileImageUrl`, `isActive`, `isLockedOut`
- `createdAt`, `lastModifiedAt`, and the legacy `updatedAt` alias

The envelope's `result` contains `data`, `totalCount`, `pageNo`, `pageSize`,
`totalPages`, `lowerBound` and `upperBound`. Deleted users are excluded from both
data and count. Inactive but non-deleted users remain manageable. Password hashes,
passkeys and other authentication secrets are never returned.

## Delete

```http
DELETE {{baseUrl}}/api/v1/users/<user-uuid>
Authorization: Bearer <tenant-token>
```

Host equivalent: `DELETE /api/v1/host/users/<user-uuid>` with a host token.
Deletion is audited and soft: it sets `is_deleted=true`, disables/locks the user,
and stamps the deletion actor/time. Self-deletion is rejected. Deleted users
cannot be listed, edited, authenticated, or deleted again. Success returns 200:

```json
{
  "success": true,
  "result": { "id": "<user-uuid>", "deleted": true }
}
```

## Status codes and security boundaries

- **400:** invalid input/ID/pagination, forbidden client-editable fields, self-delete.
- **401:** missing/wrong-scope JWT (filter) or missing authenticated identity.
- **403:** insufficient permission or contradictory scope attributes.
- **404:** absent, deleted or out-of-scope user.
- **409:** duplicate email/username, including concurrent database uniqueness errors.
- **500:** database/internal failure, without SQL/bound-value details.

All normal CRUD responses use `Cache-Control: no-store`. Existing database unique
constraints still apply (including non-partial constraints that reserve deleted
identifiers). Deletion and password/permission changes affect new logins, but
already-issued JWTs remain valid until expiry: this change does not implement a
session/denylist revocation mechanism.

## Verification

`test/users/run.sh` now runs the production UserController handlers in the existing
HTTP/ORM seam, alongside real bcrypt/JWT cryptography and the users/GL regression
suite. It covers all eight operations, scope isolation, permissions, malicious
payloads, validation, safe output, hashing/auditing, soft deletion and status-code
mapping. This is not an end-to-end server/database test. Production source/route
registration is separately syntax-checked against real Drogon headers. The
bootstrap grant and first-install role permissions are covered by the
PostgreSQL/PGlite tests in `test/tenants/sql_test.mjs`.
