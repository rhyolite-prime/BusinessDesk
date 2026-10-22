-- Run after the existing tenants/users/roles schema is installed.
-- These names are scoped per tenant; global username/email indexes, if any,
-- must be reviewed separately by the schema owner (never dropped implicitly).
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenants_live_tenancy_name_ci
    ON tenants (lower(tenancy_name)) WHERE is_deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_live_tenant_username_ci
    ON users (tenant_id, lower(username)) WHERE is_deleted = false AND tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_live_tenant_email_ci
    ON users (tenant_id, lower(email)) WHERE is_deleted = false AND tenant_id IS NOT NULL;
COMMIT;
