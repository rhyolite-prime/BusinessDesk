BEGIN;
DROP INDEX IF EXISTS ux_users_live_tenant_email_ci;
DROP INDEX IF EXISTS ux_users_live_tenant_username_ci;
DROP INDEX IF EXISTS ux_tenants_live_tenancy_name_ci;
COMMIT;
