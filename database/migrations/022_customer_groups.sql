-- Apply after 021. UUID/full-audited adaptation of the legacy CustomerGroup.
BEGIN;
CREATE TABLE core_customer_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX uq_customer_group_live_name ON core_customer_groups(tenant_id,lower(btrim(name))) WHERE is_deleted=false;
-- Existing imported legacy group UUIDs may not have master records yet. Preserve
-- history while enforcing scope on new or changed references.
ALTER TABLE core_customers ADD CONSTRAINT fk_customer_group FOREIGN KEY(tenant_id,customer_group_id)
 REFERENCES core_customer_groups(tenant_id,id) NOT VALID;
CREATE FUNCTION check_customer_live_group() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.customer_group_id IS NOT NULL THEN
  PERFORM id FROM core_customer_groups WHERE tenant_id=NEW.tenant_id AND id=NEW.customer_group_id AND is_deleted=false FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a live customer group in this tenant' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_customer_group BEFORE INSERT OR UPDATE OF tenant_id,customer_group_id ON core_customers FOR EACH ROW EXECUTE FUNCTION check_customer_live_group();
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES('core_customer_groups','Customers');
COMMIT;
