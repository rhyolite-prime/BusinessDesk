BEGIN;
-- NULL tenant_id identifies a host template. Tenant rows are independent snapshots.
CREATE TABLE core_system_numbers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id),
    source_template_id uuid REFERENCES core_system_numbers(id),
    module_id integer NOT NULL CHECK (module_id >= 0),
    item_name varchar(100) NOT NULL CHECK (btrim(item_name) <> ''),
    key varchar(100) NOT NULL CHECK (btrim(key) <> ''),
    prefix varchar(100) NOT NULL DEFAULT '',
    suffix varchar(100) NOT NULL DEFAULT '',
    format_pattern varchar(50) NOT NULL DEFAULT '{PREFIX}{NO}{SUFFIX}',
    padding integer NOT NULL DEFAULT 0 CHECK (padding BETWEEN 0 AND 18),
    last_no integer NOT NULL DEFAULT 0 CHECK (last_no >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    last_modified_at timestamptz,
    last_modified_by_user_id uuid REFERENCES users(id),
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid REFERENCES users(id),
    CHECK ((tenant_id IS NULL AND source_template_id IS NULL) OR (tenant_id IS NOT NULL AND source_template_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_system_numbers_host_key ON core_system_numbers(module_id, lower(key)) WHERE tenant_id IS NULL AND is_deleted=false;
CREATE UNIQUE INDEX uq_system_numbers_tenant_key ON core_system_numbers(tenant_id, module_id, lower(key)) WHERE tenant_id IS NOT NULL AND is_deleted=false;
CREATE UNIQUE INDEX uq_system_numbers_copy ON core_system_numbers(tenant_id, source_template_id) WHERE tenant_id IS NOT NULL;
COMMIT;
