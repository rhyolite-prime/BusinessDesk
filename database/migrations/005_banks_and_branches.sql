-- Tenant-owned bank headers and normalized branch children (not a JSONB array).
BEGIN;
CREATE TABLE core_banks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name varchar(160) NOT NULL CHECK (btrim(name) <> ''),
    bank_code varchar(40) NOT NULL CHECK (btrim(bank_code) <> ''),
    contact_person varchar(160) NOT NULL DEFAULT '',
    contact_no varchar(50) NOT NULL DEFAULT '',
    email varchar(254) NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    last_modified_at timestamptz,
    last_modified_by_user_id uuid REFERENCES users(id),
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid REFERENCES users(id),
    UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX uq_core_banks_live_code ON core_banks (tenant_id, upper(bank_code)) WHERE is_deleted = false;
CREATE TABLE core_bank_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    bank_id uuid NOT NULL,
    name varchar(160) NOT NULL CHECK (btrim(name) <> ''),
    contact_person varchar(160) NOT NULL DEFAULT '',
    contact_no varchar(50) NOT NULL DEFAULT '',
    email varchar(254) NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL REFERENCES users(id),
    last_modified_at timestamptz,
    last_modified_by_user_id uuid REFERENCES users(id),
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid REFERENCES users(id),
    FOREIGN KEY (tenant_id, bank_id) REFERENCES core_banks(tenant_id, id)
);
CREATE INDEX ix_core_bank_branches_live_parent ON core_bank_branches(tenant_id, bank_id) WHERE is_deleted = false;
COMMIT;
