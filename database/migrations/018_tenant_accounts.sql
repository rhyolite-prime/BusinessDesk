-- Account, billing and subscription history is platform data: never reset business data.
BEGIN;
ALTER TABLE tenants ADD COLUMN account_version integer NOT NULL DEFAULT 1 CHECK(account_version>0);
CREATE FUNCTION tenant_account_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.account_version:=OLD.account_version+1; RETURN NEW; END $$;
CREATE TRIGGER tenant_account_version BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION tenant_account_version();
CREATE TABLE core_tenant_billing_profiles (
 tenant_id uuid PRIMARY KEY REFERENCES tenants(id), currency_id uuid REFERENCES core_currencies(id),
 email varchar(254) NOT NULL DEFAULT '',phone varchar(50) NOT NULL DEFAULT '',
 payment_method text NOT NULL DEFAULT 'unconfigured' CHECK(payment_method IN('unconfigured','invoice','bank_transfer','mobile_money','card')),
 created_at timestamptz NOT NULL DEFAULT now(),created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,last_modified_by_user_id uuid REFERENCES users(id),is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE core_tenant_account_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 action text NOT NULL,actor_user_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),
 previous_state jsonb,state jsonb NOT NULL,is_deleted boolean NOT NULL DEFAULT false
);
CREATE TABLE core_tenant_account_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 request_key uuid NOT NULL, message varchar(1000) NOT NULL, response varchar(1000) NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved','rejected')),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,last_modified_by_user_id uuid REFERENCES users(id),is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,request_key)
);
CREATE INDEX ix_account_events_live ON core_tenant_account_events(tenant_id,created_at DESC) WHERE is_deleted=false;
CREATE INDEX ix_account_requests_live ON core_tenant_account_requests(tenant_id,created_at DESC) WHERE is_deleted=false;
COMMIT;
