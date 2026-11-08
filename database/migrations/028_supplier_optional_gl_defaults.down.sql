-- Refill missing supplier defaults before rollback. SET NOT NULL intentionally
-- fails without changing data if any row (including archived rows) has no default.
BEGIN;
ALTER TABLE core_suppliers
 ALTER COLUMN credit_account_id SET NOT NULL,
 ALTER COLUMN debit_account_id SET NOT NULL,
 ALTER COLUMN vat_account_id SET NOT NULL,
 ALTER COLUMN irs_account_id SET NOT NULL;
DROP TRIGGER check_voucher_live_supplier ON gl_payment_vouchers;
CREATE OR REPLACE FUNCTION check_voucher_live_supplier() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
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
COMMIT;
