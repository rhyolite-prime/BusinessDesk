-- First-install-only psql seed. Requires tenants, audited users, and roles.
-- Set host_admin_email and host_admin_password_hash before running this file.
-- Use a valid email and bcrypt hash (cost >= 12); inputs are not validated here.
-- No shared password is shipped. Reruns fail on duplicate keys; nothing is reset.
\set ON_ERROR_STOP on

BEGIN;

INSERT INTO tenants (
    require_two_factor_auth,
    has_subscribed_to_gl,
    gl_subscription_fee,
    has_subscribed_to_payroll,
    payroll_subscription_fee,
    has_subscribed_to_school_manager,
    school_manager_subscription_fee,
    has_subscribed_to_ap,
    ap_subscription_fee,
    has_subscribed_to_ar,
    ar_subscription_fee,
    has_subscribed_to_fixed_assets,
    fixed_assets_subscription_fee,
    has_subscribed_to_human_resource,
    human_resource_subscription_fee,
    has_subscribed_to_inventory,
    inventory_subscription_fee,
    has_subscribed_to_manufacturing,
    manufacturing_subscription_fee,
    has_subscribed_to_point_of_sale,
    point_of_sale_subscription_fee,
    has_subscribed_to_core_banking,
    core_banking_subscription_fee,
    has_subscribed_to_supply_chain,
    supply_chain_subscription_fee,
    has_subscribed_to_property_rentals,
    property_rentals_subscription_fee,
    has_subscribed_to_document_management,
    document_management_subscription_fee,
    is_direct_debit_enabled,
    id,
    tenancy_name,
    name,
    is_active,
    is_deleted,
    creation_time
) VALUES (
    false,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    0,
    false,
    '00000000-0000-4000-8000-000000000001',
    'host',
    'Default host tenant',
    true,
    false,
    CURRENT_TIMESTAMP
);

INSERT INTO roles (id, name, description, tenant_id, permissions, created_at)
VALUES ('00000000-0000-4000-8000-000000000003', 'Host tenant administrator', 'First-install host tenant management',
        '00000000-0000-4000-8000-000000000001',
        '["tenants.read","tenants.create","tenants.update","tenants.activate","tenants.delete","users.manage"]'::jsonb, CURRENT_TIMESTAMP);

INSERT INTO users (id, tenant_id, first_name, last_name, username, email, password_hash,
                   is_host_admin_user, is_tenant_admin_user, is_active, is_locked_out, is_deleted,
                   roles, created_at)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
        'admin', 'admin', 'admin', lower(:'host_admin_email'), :'host_admin_password_hash',
        true, false, true, false, false, '["00000000-0000-4000-8000-000000000003"]'::jsonb, CURRENT_TIMESTAMP);

-- Set the first creator after the user exists, avoiding circular foreign keys.
UPDATE tenants SET creator_user_id='00000000-0000-4000-8000-000000000002'
WHERE id='00000000-0000-4000-8000-000000000001' AND is_deleted=false AND creator_user_id IS NULL;
UPDATE users SET created_by_user_id=id
WHERE id='00000000-0000-4000-8000-000000000002' AND is_deleted=false AND created_by_user_id IS NULL;

COMMIT;
