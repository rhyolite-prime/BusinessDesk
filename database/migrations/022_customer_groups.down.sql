-- Removes customer-group masters; customer snapshot names and UUID columns remain.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name='core_customer_groups';
DROP TRIGGER check_customer_group ON core_customers;
DROP FUNCTION check_customer_live_group();
ALTER TABLE core_customers DROP CONSTRAINT fk_customer_group;
DROP TABLE core_customer_groups;
COMMIT;
