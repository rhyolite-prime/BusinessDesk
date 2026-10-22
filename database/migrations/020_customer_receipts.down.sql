BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name='core_customers';
DROP TRIGGER check_voucher_customer ON gl_payment_vouchers;
DROP FUNCTION check_voucher_live_customer();
ALTER TABLE gl_payment_vouchers DROP CONSTRAINT fk_voucher_customer;
DROP TABLE core_customers;
DROP INDEX uq_customer_unit_scope;
COMMIT;
