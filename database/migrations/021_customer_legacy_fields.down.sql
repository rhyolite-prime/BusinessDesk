-- Destructive rollback: the added legacy field values and snapshots are lost.
-- Existing customer identity, receipt mappings and full-audit columns survive.
BEGIN;
DROP INDEX ix_customer_live_group;
DROP INDEX ix_customer_live_status;
ALTER TABLE core_customers
 DROP CONSTRAINT fk_customer_vat_gl,
 DROP CONSTRAINT fk_customer_credit_gl,
 DROP CONSTRAINT fk_customer_irs_gl,
 DROP CONSTRAINT ck_customer_buying_rate,
 DROP CONSTRAINT ck_customer_selling_rate,
 DROP CONSTRAINT ck_customer_credit_limit,
 DROP COLUMN customer_group_id,
 DROP COLUMN customer_group_name,
 DROP COLUMN status,
 DROP COLUMN status_id,
 DROP COLUMN balance,
 DROP COLUMN vat_number,
 DROP COLUMN vat_account_id,
 DROP COLUMN vat_account_name,
 DROP COLUMN credit_account_id,
 DROP COLUMN credit_account_name,
 DROP COLUMN tin_number,
 DROP COLUMN email,
 DROP COLUMN phone_no,
 DROP COLUMN address,
 DROP COLUMN currency_name,
 DROP COLUMN currency_code,
 DROP COLUMN buying_rate,
 DROP COLUMN selling_rate,
 DROP COLUMN credit_limit,
 DROP COLUMN irs_account_id,
 DROP COLUMN irs_account_name,
 DROP COLUMN contact_person,
 DROP COLUMN contact_person_phone,
 DROP COLUMN contact_person_email;
COMMIT;
