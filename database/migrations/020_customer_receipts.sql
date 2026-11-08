-- Apply after 019. Minimal live customer catalog for receipt vouchers.
BEGIN;
CREATE UNIQUE INDEX uq_customer_unit_scope ON core_accounting_units(tenant_id,id);
CREATE TABLE core_customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 account_number varchar(80) NOT NULL CHECK(btrim(account_number)<>''),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 accounting_unit_id uuid NOT NULL,
 receivable_account_id uuid NOT NULL,
 currency_id uuid NOT NULL REFERENCES core_currencies(id),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,receivable_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id)
);
CREATE UNIQUE INDEX uq_customer_number ON core_customers(tenant_id,lower(btrim(account_number)));
CREATE INDEX ix_customer_live_scope ON core_customers(tenant_id,accounting_unit_id,id) WHERE is_deleted=false;
ALTER TABLE gl_payment_vouchers ADD CONSTRAINT fk_voucher_customer FOREIGN KEY(tenant_id,customer_id) REFERENCES core_customers(tenant_id,id) NOT VALID;
CREATE FUNCTION check_voucher_live_customer() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.customer_id IS NOT NULL THEN
  PERFORM c.id FROM core_customers c JOIN gl_accounts a ON a.tenant_id=c.tenant_id AND a.id=c.receivable_account_id
   WHERE c.id=NEW.customer_id AND c.tenant_id=NEW.tenant_id AND c.accounting_unit_id=NEW.accounting_unit_id
    AND c.is_deleted=false AND c.is_active=true AND a.is_deleted=false FOR SHARE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select a live customer in this posting unit' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_voucher_customer BEFORE INSERT OR UPDATE OF customer_id,tenant_id,accounting_unit_id ON gl_payment_vouchers FOR EACH ROW EXECUTE FUNCTION check_voucher_live_customer();
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES('core_customers','Customers');
COMMIT;
