-- Destructive: directory-level rates are unused. Voucher and currency-catalog
-- exchange rates are intentionally unaffected. Back up these columns if needed.
BEGIN;
ALTER TABLE IF EXISTS core_customers
 DROP COLUMN IF EXISTS buying_rate,
 DROP COLUMN IF EXISTS selling_rate;
ALTER TABLE IF EXISTS core_suppliers
 DROP COLUMN IF EXISTS buying_rate,
 DROP COLUMN IF EXISTS selling_rate;
COMMIT;
