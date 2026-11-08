-- Rollback for 031_inventory_stock_ledger.sql. Destroys the stock engine,
-- including every ledger row, balance and cost layer. Back up first and stop
-- application writes: posted stock history is not recoverable afterwards.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('inv_stock_transactions','inv_stock_document_events','inv_stock_document_lines','inv_stock_documents',
  'inv_cost_layers','inv_stock_balances','inv_document_sequences');
DROP TRIGGER protect_inv_stock_transaction_delete ON inv_stock_transactions;
DROP TRIGGER protect_inv_stock_transaction_update ON inv_stock_transactions;
DROP FUNCTION protect_inv_stock_transaction();
DROP INDEX ix_inv_stock_transactions_document;
DROP INDEX ix_inv_stock_transactions_unit_date;
DROP INDEX ix_inv_stock_transactions_warehouse;
DROP INDEX ix_inv_stock_transactions_item;
DROP TABLE inv_stock_transactions;
DROP TRIGGER protect_inv_cost_layer ON inv_cost_layers;
DROP FUNCTION protect_inv_cost_layer();
DROP INDEX ix_inv_cost_layers_item;
DROP INDEX ix_inv_cost_layers_open;
DROP TABLE inv_cost_layers;
DROP TRIGGER check_inv_stock_balance_policy ON inv_stock_balances;
DROP FUNCTION check_inv_stock_balance_policy();
DROP INDEX ix_inv_stock_balances_batch;
DROP INDEX ix_inv_stock_balances_warehouse;
DROP INDEX ix_inv_stock_balances_item;
DROP TABLE inv_stock_balances;
DROP INDEX ix_inv_stock_document_events_scope;
DROP TABLE inv_stock_document_events;
DROP TRIGGER protect_inv_stock_document_line ON inv_stock_document_lines;
DROP FUNCTION protect_inv_stock_document_line();
DROP TRIGGER check_inv_stock_document_line ON inv_stock_document_lines;
DROP FUNCTION check_inv_stock_document_line();
DROP INDEX ix_inv_stock_document_lines_item;
DROP INDEX ix_inv_stock_document_lines_document;
DROP TABLE inv_stock_document_lines;
DROP TRIGGER protect_inv_stock_document ON inv_stock_documents;
DROP FUNCTION protect_inv_stock_document();
DROP TRIGGER check_inv_stock_document_scope ON inv_stock_documents;
DROP FUNCTION check_inv_stock_document_scope();
DROP INDEX ix_inv_stock_documents_source;
DROP INDEX ix_inv_stock_documents_supplier;
DROP INDEX ix_inv_stock_documents_status;
DROP INDEX ix_inv_stock_documents_scope;
DROP INDEX uq_inv_stock_documents_journal;
DROP INDEX uq_inv_stock_documents_request;
DROP INDEX uq_inv_stock_documents_number;
DROP TABLE inv_stock_documents;
DROP TABLE inv_document_sequences;
-- Restore the migration 030 versions of the guards extended above.
CREATE OR REPLACE FUNCTION protect_inv_warehouse() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active OR NEW.accounting_unit_id<>OLD.accounting_unit_id) AND EXISTS(
   SELECT 1 FROM inv_bin_locations b WHERE b.tenant_id=OLD.tenant_id AND b.warehouse_id=OLD.id AND b.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_warehouses iw WHERE iw.tenant_id=OLD.tenant_id AND iw.warehouse_id=OLD.id AND iw.is_deleted=false
   UNION ALL SELECT 1 FROM inv_serial_numbers s WHERE s.tenant_id=OLD.tenant_id AND s.warehouse_id=OLD.id AND s.is_deleted=false
    AND s.status IN('in_stock','reserved','in_transit')
   UNION ALL SELECT 1 FROM inv_items i WHERE i.tenant_id=OLD.tenant_id AND i.default_warehouse_id=OLD.id AND i.is_deleted=false) THEN
  RAISE EXCEPTION 'Warehouse is referenced by live inventory configuration or stock' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION protect_inv_item_identity() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE referenced boolean; tracked boolean;
BEGIN
 SELECT EXISTS(
   SELECT 1 FROM inv_item_uom_conversions c WHERE c.tenant_id=OLD.tenant_id AND c.item_id=OLD.id AND c.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_suppliers s WHERE s.tenant_id=OLD.tenant_id AND s.item_id=OLD.id AND s.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_warehouses iw WHERE iw.tenant_id=OLD.tenant_id AND iw.item_id=OLD.id AND iw.is_deleted=false
   UNION ALL SELECT 1 FROM inv_batches b WHERE b.tenant_id=OLD.tenant_id AND b.item_id=OLD.id AND b.is_deleted=false
   UNION ALL SELECT 1 FROM inv_serial_numbers sn WHERE sn.tenant_id=OLD.tenant_id AND sn.item_id=OLD.id AND sn.is_deleted=false)
  INTO referenced;
 SELECT EXISTS(
   SELECT 1 FROM inv_batches b WHERE b.tenant_id=OLD.tenant_id AND b.item_id=OLD.id AND b.is_deleted=false
   UNION ALL SELECT 1 FROM inv_serial_numbers sn WHERE sn.tenant_id=OLD.tenant_id AND sn.item_id=OLD.id AND sn.is_deleted=false)
  INTO tracked;
 IF NEW.is_deleted AND tracked THEN
  RAISE EXCEPTION 'Item has batches or serial numbers; remove that stock history first' USING ERRCODE='23505';
 END IF;
 IF referenced AND (NEW.valuation_method<>OLD.valuation_method OR NEW.tracking_method<>OLD.tracking_method OR
     NEW.base_uom_id<>OLD.base_uom_id OR NEW.item_code<>OLD.item_code) THEN
  RAISE EXCEPTION 'Costing, tracking, base unit and item code are fixed once inventory records exist' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
COMMIT;
