BEGIN;
CREATE TABLE core_cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    parent_id uuid,
    name varchar(160) NOT NULL CHECK (btrim(name) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    last_modified_at timestamptz,
    last_modified_by_user_id uuid REFERENCES users(id),
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid REFERENCES users(id),
    UNIQUE (tenant_id, id),
    CHECK (parent_id IS NULL OR parent_id <> id),
    FOREIGN KEY (tenant_id, parent_id) REFERENCES core_cost_centers(tenant_id, id)
);
CREATE UNIQUE INDEX uq_cost_centers_live_sibling_name ON core_cost_centers(tenant_id,parent_id,lower(name)) NULLS NOT DISTINCT WHERE is_deleted=false;
CREATE INDEX ix_cost_centers_live_parent ON core_cost_centers(tenant_id,parent_id) WHERE is_deleted=false;
COMMIT;
