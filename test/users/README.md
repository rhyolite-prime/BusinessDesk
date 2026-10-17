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
from group role objects, scoped users, pagination, deactivation, global group
restrictions, parent cycles, soft deletion, and passkey fail-closed behavior.
