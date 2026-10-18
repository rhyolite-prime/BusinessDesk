-- psql script. Requires the existing tenants, users (audited) and roles tables.
-- Supply host_admin_email and host_admin_password_hash through psql variables.
-- Never use a shared default password or commit an actual password/hash here.
\set ON_ERROR_STOP on
\if :{?host_admin_email}
\else
  \echo 'Required psql variable: host_admin_email'
  \quit 1
\endif
\if :{?host_admin_password_hash}
\else
  \echo 'Required psql variable: host_admin_password_hash (bcrypt, cost >= 12)'
  \quit 1
\endif
BEGIN;
-- Refuse invalid input before touching installation data.
SELECT 'Seed input configured' AS status FROM (
    SELECT set_config('businessdesk.seed_email', :'host_admin_email', true),
           set_config('businessdesk.seed_hash', :'host_admin_password_hash', true)
) AS seed_input;
DO $$
BEGIN
    IF current_setting('businessdesk.seed_email') !~ '^[^[:space:]@]+@[^[:space:]@]+$'
       OR length(current_setting('businessdesk.seed_email')) > 255 THEN
        RAISE EXCEPTION 'A valid host_admin_email is required';
    END IF;
    IF current_setting('businessdesk.seed_hash') !~ '^\$2[aby]\$(1[2-9]|2[0-9]|3[01])\$[./A-Za-z0-9]{53}$' THEN
        RAISE EXCEPTION 'A bcrypt hash with cost >= 12 is required';
    END IF;
END $$;
-- Serialize repeated first-install runs and fail rather than hijacking an
-- installation that already uses the reserved identities for other purposes.
SELECT pg_advisory_xact_lock(782930114);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants WHERE lower(tenancy_name)='host'
               AND id <> '00000000-0000-4000-8000-000000000001'::uuid) THEN
        RAISE EXCEPTION 'The reserved host tenancy name is already in use';
    END IF;
    IF EXISTS (SELECT 1 FROM tenants WHERE id='00000000-0000-4000-8000-000000000001'
               AND (is_deleted OR NOT is_active OR tenancy_name <> 'host')) THEN
        RAISE EXCEPTION 'Reserved host tenant has been modified or deleted; manual review required';
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE id='00000000-0000-4000-8000-000000000002'
               AND (is_deleted OR NOT is_active OR is_locked_out OR NOT is_host_admin_user
                    OR tenant_id IS DISTINCT FROM '00000000-0000-4000-8000-000000000001'::uuid)) THEN
        RAISE EXCEPTION 'Reserved host user is not a live host administrator; manual review required';
    END IF;
    IF EXISTS (SELECT 1 FROM roles WHERE id='00000000-0000-4000-8000-000000000003'
               AND tenant_id IS DISTINCT FROM '00000000-0000-4000-8000-000000000001'::uuid) THEN
        RAISE EXCEPTION 'Reserved host role belongs to another tenant';
    END IF;
END $$;
INSERT INTO tenants (require_two_factor_auth, has_subscribed_to_gl, gl_subscription_fee, has_subscribed_to_payroll, payroll_subscription_fee, has_subscribed_to_school_manager, school_manager_subscription_fee, has_subscribed_to_ap, ap_subscription_fee, has_subscribed_to_ar, ar_subscription_fee, has_subscribed_to_fixed_assets, fixed_assets_subscription_fee, has_subscribed_to_human_resource, human_resource_subscription_fee, has_subscribed_to_inventory, inventory_subscription_fee, has_subscribed_to_manufacturing, manufacturing_subscription_fee, has_subscribed_to_point_of_sale, point_of_sale_subscription_fee, has_subscribed_to_core_banking, core_banking_subscription_fee, has_subscribed_to_supply_chain, supply_chain_subscription_fee, has_subscribed_to_property_rentals, property_rentals_subscription_fee, has_subscribed_to_document_management, document_management_subscription_fee, is_direct_debit_enabled,
                     id, tenancy_name, name, is_active, is_deleted, creation_time)
VALUES (false, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false,
        '00000000-0000-4000-8000-000000000001', 'host', 'Default host tenant', true, false, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
INSERT INTO roles (id, name, description, tenant_id, permissions, created_at)
VALUES ('00000000-0000-4000-8000-000000000003', 'Host tenant administrator', 'First-install host tenant management',
        '00000000-0000-4000-8000-000000000001',
        '["tenants.read","tenants.create","tenants.update","tenants.activate","tenants.delete"]'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, tenant_id, first_name, last_name, username, email, password_hash,
                   is_host_admin_user, is_tenant_admin_user, is_active, is_locked_out, is_deleted,
                   roles, created_at)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
        'admin', 'admin', 'admin', lower(:'host_admin_email'), :'host_admin_password_hash',
        true, false, true, false, false, '["00000000-0000-4000-8000-000000000003"]'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
-- Set the first creator after the user exists, avoiding circular foreign keys.
UPDATE tenants SET creator_user_id='00000000-0000-4000-8000-000000000002'
WHERE id='00000000-0000-4000-8000-000000000001' AND is_deleted=false AND creator_user_id IS NULL;
UPDATE users SET created_by_user_id=id
WHERE id='00000000-0000-4000-8000-000000000002' AND is_deleted=false AND created_by_user_id IS NULL;
COMMIT;
