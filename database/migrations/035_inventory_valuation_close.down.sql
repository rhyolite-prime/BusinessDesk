-- Rollback for 035_inventory_valuation_close.sql. Destroys valuation snapshots
-- and period closes and restores the 031 stock-document scope guard. Back up
-- first and stop application writes: close history is not recoverable
-- afterwards.
BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN
 ('inv_period_closes','inv_valuation_snapshot_lines','inv_valuation_snapshots');
-- Restore the migration 031 version of the posting guard.
CREATE OR REPLACE FUNCTION check_inv_stock_document_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE warehouses integer;
BEGIN
 SELECT count(*) INTO warehouses FROM (
  SELECT w.id FROM inv_warehouses w
   WHERE w.tenant_id=NEW.tenant_id AND w.is_deleted=false AND w.is_active
    AND w.accounting_unit_id=NEW.accounting_unit_id
    AND w.id IN(NEW.source_warehouse_id,NEW.destination_warehouse_id) FOR SHARE OF w) locked;
 IF warehouses <> (CASE WHEN NEW.destination_warehouse_id IS NULL THEN 1 ELSE 2 END) THEN
  RAISE EXCEPTION 'Select live warehouses in this accounting unit' USING ERRCODE='23503';
 END IF;
 IF NEW.status='posted' AND NOT EXISTS(
   SELECT 1 FROM gl_accounting_periods p WHERE p.tenant_id=NEW.tenant_id AND p.accounting_unit_id=NEW.accounting_unit_id
    AND p.is_deleted=false AND p.status='open' AND NEW.document_date BETWEEN p.period_start_date AND p.period_end_date) THEN
  RAISE EXCEPTION 'Post stock documents only into an open accounting period' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER protect_inv_period_close ON inv_period_closes;
DROP FUNCTION protect_inv_period_close();
DROP TRIGGER check_inv_period_close_scope ON inv_period_closes;
DROP FUNCTION check_inv_period_close_scope();
DROP INDEX ix_inv_period_closes_scope;
DROP INDEX uq_inv_period_closes_live;
DROP TABLE inv_period_closes;
DROP TRIGGER protect_inv_valuation_snapshot_line_delete ON inv_valuation_snapshot_lines;
DROP TRIGGER protect_inv_valuation_snapshot_line_update ON inv_valuation_snapshot_lines;
DROP FUNCTION protect_inv_valuation_snapshot_line();
DROP INDEX ix_inv_valuation_snapshot_lines_item;
DROP INDEX ix_inv_valuation_snapshot_lines_snapshot;
DROP TABLE inv_valuation_snapshot_lines;
DROP TRIGGER protect_inv_valuation_snapshot ON inv_valuation_snapshots;
DROP FUNCTION protect_inv_valuation_snapshot();
DROP INDEX ix_inv_valuation_snapshots_scope;
DROP INDEX uq_inv_valuation_snapshots_journal;
DROP INDEX uq_inv_valuation_snapshots_live;
DROP TABLE inv_valuation_snapshots;
COMMIT;
