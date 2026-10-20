#pragma once

namespace business_desk::domain_services::tenant_sql {
// PostgreSQL data-modifying CTEs are single atomic statements: an admin/role
// failure rolls back the tenant insert, and success is returned only after commit.
inline constexpr const char *create = R"SQL(
WITH new_tenant AS (
    INSERT INTO tenants (require_two_factor_auth, has_subscribed_to_gl, gl_subscription_fee, has_subscribed_to_payroll, payroll_subscription_fee, has_subscribed_to_school_manager, school_manager_subscription_fee, has_subscribed_to_ap, ap_subscription_fee, has_subscribed_to_ar, ar_subscription_fee, has_subscribed_to_fixed_assets, fixed_assets_subscription_fee, has_subscribed_to_human_resource, human_resource_subscription_fee, has_subscribed_to_inventory, inventory_subscription_fee, has_subscribed_to_manufacturing, manufacturing_subscription_fee, has_subscribed_to_point_of_sale, point_of_sale_subscription_fee, has_subscribed_to_core_banking, core_banking_subscription_fee, has_subscribed_to_supply_chain, supply_chain_subscription_fee, has_subscribed_to_property_rentals, property_rentals_subscription_fee, has_subscribed_to_document_management, document_management_subscription_fee, is_direct_debit_enabled,
                         id, tenancy_name, name, connection_string, is_active, is_deleted,
                         creation_time, creator_user_id, last_modification_time, last_modifier_user_id)
    VALUES (false, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false, 0, false,
            gen_random_uuid(), $1, $2, NULLIF($3, ''), true, false,
            CURRENT_TIMESTAMP, $4::uuid, CURRENT_TIMESTAMP, $4::uuid)
    RETURNING id, tenancy_name, name
), admin_role AS (
    INSERT INTO roles (id, name, description, tenant_id, permissions, created_at)
    SELECT gen_random_uuid(), 'Tenant administrator', 'Initial tenant administrator', id, $6::jsonb, CURRENT_TIMESTAMP
    FROM new_tenant RETURNING id, tenant_id
), admin_user AS (
    INSERT INTO users (id, tenant_id, first_name, last_name, username, email, password_hash,
                       is_host_admin_user, is_tenant_admin_user, is_active, is_locked_out,
                       is_deleted, roles, created_at, created_by_user_id, last_modified_at, last_modified_by_user_id)
    SELECT gen_random_uuid(), t.id, 'admin', 'admin', 'admin', $5, $7,
           false, true, true, false, false, jsonb_build_array(r.id::text),
           CURRENT_TIMESTAMP, $4::uuid, CURRENT_TIMESTAMP, $4::uuid
    FROM new_tenant t JOIN admin_role r ON r.tenant_id = t.id
    RETURNING id, tenant_id
), copied_system_numbers AS (
    INSERT INTO core_system_numbers (tenant_id, source_template_id, module_id, item_name, key,
        prefix, suffix, format_pattern, padding, last_no, created_by_user_id)
    SELECT t.id, n.id, n.module_id, n.item_name, n.key, n.prefix, n.suffix,
        n.format_pattern, n.padding, n.last_no, $4::uuid
    FROM new_tenant t CROSS JOIN core_system_numbers n
    WHERE n.tenant_id IS NULL AND n.is_deleted = false
    RETURNING id
)
SELECT t.id::text AS tenant_id, t.tenancy_name, t.name, u.id::text AS admin_user_id
FROM new_tenant t JOIN admin_user u ON u.tenant_id = t.id
)SQL";

// A tenant's initial admin is the oldest live admin account, never a deleted one.
// Supplying an admin email when no live admin remains changes nothing.
inline constexpr const char *update = R"SQL(
WITH updated_tenant AS (
    UPDATE tenants SET
        tenancy_name = CASE WHEN $2::boolean THEN $3 ELSE tenancy_name END,
        name = CASE WHEN $4::boolean THEN $5 ELSE name END,
        connection_string = CASE WHEN $6::boolean THEN NULLIF($7, '') ELSE connection_string END,
        last_modification_time = CURRENT_TIMESTAMP, last_modifier_user_id = $8::uuid
    WHERE id = $1::uuid AND is_deleted = false
      AND (NOT $9::boolean OR EXISTS (
          SELECT 1 FROM users WHERE tenant_id = $1::uuid AND is_deleted = false AND is_tenant_admin_user = true))
    RETURNING id, tenancy_name, name, is_active
), updated_admin AS (
    UPDATE users SET email = $10, last_modified_at = CURRENT_TIMESTAMP, last_modified_by_user_id = $8::uuid
    WHERE $9::boolean AND is_deleted = false AND id = (
        SELECT id FROM users WHERE tenant_id = $1::uuid AND is_deleted = false AND is_tenant_admin_user = true
        ORDER BY created_at, id LIMIT 1)
      AND tenant_id IN (SELECT id FROM updated_tenant)
    RETURNING id
)
SELECT id::text, tenancy_name, name, is_active FROM updated_tenant
)SQL";
}
