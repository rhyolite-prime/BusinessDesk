-- Restores schema only; removed rate values cannot be recovered. Defaults keep
-- existing directory rows valid for older application versions.
BEGIN;
ALTER TABLE IF EXISTS core_customers
 ADD COLUMN buying_rate numeric(20,10) NOT NULL DEFAULT 1,
 ADD COLUMN selling_rate numeric(20,10) NOT NULL DEFAULT 1,
 ADD CONSTRAINT ck_customer_buying_rate CHECK (buying_rate > 0),
 ADD CONSTRAINT ck_customer_selling_rate CHECK (selling_rate > 0);
ALTER TABLE IF EXISTS core_suppliers
 ADD COLUMN buying_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (buying_rate > 0),
 ADD COLUMN selling_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (selling_rate > 0);
COMMIT;
