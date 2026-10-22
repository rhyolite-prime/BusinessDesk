-- Export subscription audit/history and requests before this destructive downgrade.
BEGIN;
DROP TABLE core_tenant_account_requests;
DROP TABLE core_tenant_account_events;
DROP TABLE core_tenant_billing_profiles;
DROP TRIGGER tenant_account_version ON tenants;
DROP FUNCTION tenant_account_version();
ALTER TABLE tenants DROP COLUMN account_version;
COMMIT;
