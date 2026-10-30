-- Apply after 015. Supplier groups and suppliers are tenant-owned; currencies remain global.
BEGIN;
CREATE TABLE core_supplier_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX uq_supplier_groups_live_name ON core_supplier_groups(tenant_id,lower(btrim(name))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_supplier_gl_account_scope ON gl_accounts(tenant_id,id);
CREATE TABLE core_suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 account_number varchar(80) NOT NULL CHECK(btrim(account_number)<>''),
 supplier_group_id uuid NOT NULL,
 status varchar(20) NOT NULL CHECK(status IN ('active','on_hold','inactive')),
 vat_account_id uuid NOT NULL,
 credit_account_id uuid NOT NULL,
 debit_account_id uuid NOT NULL,
 tin_number varchar(80) NOT NULL,
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 email varchar(254) NOT NULL,
 phone_no varchar(50) NOT NULL,
 address varchar(1000) NOT NULL,
 contact_person varchar(160) NOT NULL,
 contact_person_phone varchar(50) NOT NULL,
 contact_person_email varchar(254) NOT NULL,
 vat_number varchar(80) NOT NULL,
 currency_id uuid NOT NULL,
 buying_rate numeric(20,10) NOT NULL CHECK(buying_rate>0),
 selling_rate numeric(20,10) NOT NULL CHECK(selling_rate>0),
 credit_limit numeric(20,6) NOT NULL CHECK(credit_limit>=0),
 irs_account_id uuid NOT NULL,
 is_resident boolean NOT NULL,
 tax_office varchar(160) NOT NULL,
 balance numeric(20,6) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_group_id) REFERENCES core_supplier_groups(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id),
 FOREIGN KEY(tenant_id,vat_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,credit_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,debit_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,irs_account_id) REFERENCES gl_accounts(tenant_id,id)
);
-- Existing vouchers may contain legacy supplier IDs. Do not rewrite history:
-- enforce tenant-scoped references for new/changed links and review legacy rows separately.
ALTER TABLE gl_payment_vouchers ADD CONSTRAINT fk_payment_voucher_supplier
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id) NOT VALID;
CREATE FUNCTION check_voucher_live_supplier() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.supplier_id IS NOT NULL THEN
  PERFORM s.id FROM core_suppliers s JOIN gl_accounts a ON a.id=s.credit_account_id
    AND a.tenant_id=s.tenant_id AND a.is_deleted=false
   WHERE s.tenant_id=NEW.tenant_id AND s.id=NEW.supplier_id AND s.is_deleted=false
    AND a.accounting_unit_id=NEW.accounting_unit_id FOR SHARE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select a live supplier in this tenant' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_voucher_live_supplier BEFORE INSERT OR UPDATE OF supplier_id,tenant_id ON gl_payment_vouchers
 FOR EACH ROW EXECUTE FUNCTION check_voucher_live_supplier();
-- Account numbers remain reserved on ordinary soft deletion; confirmed initialization releases them.
CREATE UNIQUE INDEX uq_suppliers_account_number ON core_suppliers(tenant_id,lower(btrim(account_number)));
CREATE INDEX ix_suppliers_live_group ON core_suppliers(tenant_id,supplier_group_id) WHERE is_deleted=false;
CREATE INDEX ix_supplier_voucher_live ON gl_payment_vouchers(tenant_id,supplier_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_currency ON core_suppliers(currency_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_credit ON core_suppliers(tenant_id,credit_account_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_debit ON core_suppliers(tenant_id,debit_account_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_vat ON core_suppliers(tenant_id,vat_account_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_irs ON core_suppliers(tenant_id,irs_account_id) WHERE is_deleted=false;
CREATE INDEX ix_suppliers_live_name ON core_suppliers(tenant_id,lower(name),id) WHERE is_deleted=false;
-- Existing GL/catalog APIs must not orphan live supplier configuration through soft deletion or reclassification.
CREATE FUNCTION protect_supplier_account_configuration() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NEW.status<>'active' OR NEW.standard_account_type<>OLD.standard_account_type OR
     NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.account_number<>OLD.account_number OR
     NEW.currency_id IS DISTINCT FROM OLD.currency_id OR NEW.tenant_id<>OLD.tenant_id) AND EXISTS (
   SELECT 1 FROM core_suppliers WHERE tenant_id=OLD.tenant_id AND is_deleted=false AND
   OLD.id IN(vat_account_id,credit_account_id,debit_account_id,irs_account_id)) THEN
  RAISE EXCEPTION 'GL account is referenced by a live supplier' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_supplier_account_configuration BEFORE UPDATE ON gl_accounts
 FOR EACH ROW EXECUTE FUNCTION protect_supplier_account_configuration();
CREATE FUNCTION protect_supplier_currency() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active) AND EXISTS(SELECT 1 FROM core_suppliers WHERE currency_id=OLD.id AND is_deleted=false) THEN
  RAISE EXCEPTION 'Currency is referenced by a live supplier' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_supplier_currency BEFORE UPDATE ON core_currencies FOR EACH ROW EXECUTE FUNCTION protect_supplier_currency();
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES
 ('core_supplier_groups','Suppliers'),('core_suppliers','Suppliers');
COMMIT;
