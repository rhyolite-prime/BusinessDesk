-- Rollback for 030_inventory_locations.sql. Destroys location and tracking
-- masters plus the item default-warehouse link. Back up first.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('inv_serial_numbers','inv_batches','inv_item_warehouses','inv_bin_locations','inv_warehouses');
DROP TRIGGER protect_inv_batch ON inv_batches;
DROP FUNCTION protect_inv_batch();
DROP TRIGGER protect_inv_item_identity ON inv_items;
DROP FUNCTION protect_inv_item_identity();
DROP TRIGGER protect_inv_warehouse ON inv_warehouses;
DROP FUNCTION protect_inv_warehouse();
DROP INDEX ix_serial_numbers_live_warehouse;
DROP INDEX ix_serial_numbers_live_status;
DROP INDEX uq_inv_serial_numbers_live;
DROP TABLE inv_serial_numbers;
DROP INDEX ix_inv_batches_live_item;
DROP INDEX ix_inv_batches_live_expiry;
DROP INDEX uq_inv_batches_live_number;
DROP TABLE inv_batches;
DROP INDEX ix_inv_item_warehouses_live_warehouse;
DROP INDEX uq_inv_item_warehouses_live_pair;
DROP TABLE inv_item_warehouses;
DROP INDEX ix_inv_bin_locations_live_warehouse;
DROP INDEX uq_inv_bin_locations_live_code;
DROP TABLE inv_bin_locations;
DROP INDEX ix_inv_items_live_default_warehouse;
ALTER TABLE inv_items DROP CONSTRAINT fk_inv_items_default_warehouse;
ALTER TABLE inv_items DROP COLUMN default_warehouse_id;
DROP INDEX ix_inv_warehouses_live_unit;
DROP INDEX uq_inv_warehouses_live_name;
DROP INDEX uq_inv_warehouses_live_code;
DROP TABLE inv_warehouses;
DROP INDEX uq_inv_accounting_unit_scope;
COMMIT;
