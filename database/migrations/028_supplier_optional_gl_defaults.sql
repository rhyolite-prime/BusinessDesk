BEGIN;
ALTER TABLE core_suppliers
 ALTER COLUMN credit_account_id DROP NOT NULL,
 ALTER COLUMN debit_account_id DROP NOT NULL,
 ALTER COLUMN vat_account_id DROP NOT NULL,
 ALTER COLUMN irs_account_id DROP NOT NULL;

-- Suppliers without defaults are tenant-wide. Any configured defaults still
-- constrain voucher scope; the actual voucher accounts are validated separately.
CREATE OR REPLACE FUNCTION check_voucher_live_supplier() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.supplier_id IS NOT NULL THEN
  PERFORM s.id FROM core_suppliers s
   WHERE s.tenant_id=NEW.tenant_id AND s.id=NEW.supplier_id AND s.is_deleted=false
    AND NOT EXISTS (
     SELECT 1 FROM (VALUES(s.credit_account_id),(s.debit_account_id),(s.vat_account_id),(s.irs_account_id)) AS defaults(id)
     WHERE defaults.id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM gl_accounts a WHERE a.id=defaults.id AND a.tenant_id=s.tenant_id
       AND a.is_deleted=false AND a.status='active' AND a.accounting_unit_id=NEW.accounting_unit_id
     )
    ) FOR SHARE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select a live supplier in this tenant and posting unit' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER check_voucher_live_supplier ON gl_payment_vouchers;
CREATE TRIGGER check_voucher_live_supplier BEFORE INSERT OR UPDATE OF supplier_id,tenant_id,accounting_unit_id ON gl_payment_vouchers
 FOR EACH ROW EXECUTE FUNCTION check_voucher_live_supplier();
COMMIT;
