# User service regression harness

This harness uses in-memory Drogon HTTP/ORM seams and **real** JsonCpp, bcrypt,
jwt-cpp and OpenSSL cryptography. The model seam is generated from the checked-in
model declarations. It is not a PostgreSQL integration test, and its eager tasks
do not simulate asynchronous scheduling. The production sources are also checked
separately against real Drogon headers.

Initialize repository submodules first (`git submodule update --init --recursive`).
Provide a JsonCpp source checkout (run its `python3 amalgamate.py` to produce
`dist/`) and a configured/built OpenSSL source checkout (`./Configure no-shared
no-tests && make build_libs`). Then run:

```sh
JSONCPP_SOURCE_DIR=/path/to/jsoncpp OPENSSL_SOURCE_DIR=/path/to/openssl \
  bash test/users/run.sh
```

Covers host/tenant credentials, real signatures, token-filter interoperability,
cross-scope rejection, malformed/expired tokens, configured lifetimes, permissions
from group role objects, scoped users, pagination, audited user soft deletion, global group
restrictions, parent cycles, soft deletion, and passkey fail-closed behavior.

The suite also runs GL soft-delete regressions: hidden/deleted records,
create/update duplicate checks, accounting-unit live/deleted dependencies, and
non-soft-deletable balance protection. The user cases cover audited create/update/delete, active deleted users,
inactive live users, and
deleted group manipulation, parent references, and duplicate checks.

The in-memory seam intentionally does not emulate database uniqueness constraints.
A passing deleted-identifier reuse test verifies only the application's live-row
query; a real non-partial unique index may still reject the insert or update.

UserController regressions exercise the production handlers with the HTTP/ORM
seam: all eight tenant/host CRUD routes, scope and permission guards, mass-
assignment rejection, input/pagination validation, password handling, safe output,
audit forwarding, 404/409/500 mappings, deleted rows, and concurrent uniqueness
failures. Route declarations are separately checked against real Drogon headers.
