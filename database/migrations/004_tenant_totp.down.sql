-- Disabling enforcement while tenants require 2FA is unsafe. Coordinate rollback.
BEGIN;
DROP TABLE auth_totp_challenges;
DROP TABLE auth_totp_rate_limits;
DROP TABLE auth_totp_credentials;
COMMIT;
