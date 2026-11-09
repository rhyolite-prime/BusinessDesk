-- Rollback for 029_inventory_catalog.sql. Destroys the inventory catalog and
-- every protection trigger it added to shared tables. Back up first: this drops
-- item, category, unit-of-measure and item/supplier data.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('inv_item_suppliers','inv_item_uom_conversions','inv_items','inv_units_of_measure','inv_item_categories');
DROP TRIGGER protect_inv_item_supplier_master ON core_suppliers;
DROP FUNCTION protect_inv_item_supplier_master();
DROP TRIGGER protect_inv_item_currency ON core_currencies;
DROP FUNCTION protect_inv_item_currency();
DROP TRIGGER protect_inv_item_gl_configuration ON gl_accounts;
DROP FUNCTION protect_inv_item_gl_configuration();
DROP TRIGGER protect_inv_unit_of_measure ON inv_units_of_measure;
DROP FUNCTION protect_inv_unit_of_measure();
DROP TRIGGER protect_inv_item_category ON inv_item_categories;
DROP FUNCTION protect_inv_item_category();
DROP INDEX ix_inv_item_suppliers_live_supplier;
DROP INDEX uq_inv_item_suppliers_preferred;
DROP INDEX uq_inv_item_suppliers_live_pair;
DROP TABLE inv_item_suppliers;
DROP INDEX ix_inv_item_uom_live_item;
DROP INDEX uq_inv_item_uom_live_pair;
DROP TABLE inv_item_uom_conversions;
DROP INDEX ix_inv_items_live_status;
DROP INDEX ix_inv_items_live_currency;
DROP INDEX ix_inv_items_live_category;
DROP INDEX ix_inv_items_live_name;
DROP INDEX uq_inv_items_live_barcode;
DROP INDEX uq_inv_items_code;
DROP TABLE inv_items;
DROP INDEX uq_inv_units_live_name;
DROP INDEX uq_inv_units_live_code;
DROP TABLE inv_units_of_measure;
DROP TRIGGER check_inv_item_category_cycle ON inv_item_categories;
DROP FUNCTION check_inv_item_category_cycle();
DROP INDEX ix_inv_item_categories_live_parent;
DROP INDEX uq_inv_item_categories_live_name;
DROP INDEX uq_inv_item_categories_live_code;
DROP TABLE inv_item_categories;
COMMIT;
