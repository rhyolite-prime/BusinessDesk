-- Apply after 034. Inventory valuation snapshots (frozen point-in-time stock
-- values used by reporting and audit) and inventory period closes. Closing an
-- inventory period blocks new stock postings into it, even while the matching
-- GL period is still open, so operations and finance can close independently.
BEGIN;

-- ---------------------------------------------------------------------------
-- Valuation snapshots: a frozen copy of stock value per item, warehouse and
-- batch at a date. Captured rows are immutable; posting one writes the
-- valuation journal batch link exactly once.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_valuation_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 as_of_date date NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'captured' CHECK(status IN('captured','posted')),
 item_count integer NOT NULL DEFAULT 0 CHECK(item_count>=0),
 total_quantity numeric(20,6) NOT NULL DEFAULT 0,
 total_value numeric(20,6) NOT NULL DEFAULT 0,
 notes varchar(1000) NOT NULL DEFAULT '',
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 posted_at timestamptz, posted_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 CHECK(status<>'posted' OR journal_batch_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_inv_valuation_snapshots_live ON inv_valuation_snapshots(tenant_id,accounting_unit_id,as_of_date)
 WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_inv_valuation_snapshots_journal ON inv_valuation_snapshots(tenant_id,journal_batch_id)
 WHERE journal_batch_id IS NOT NULL;
CREATE INDEX ix_inv_valuation_snapshots_scope ON inv_valuation_snapshots(tenant_id,accounting_unit_id,as_of_date DESC)
 WHERE is_deleted=false;

CREATE FUNCTION protect_inv_valuation_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status='posted' THEN
   RAISE EXCEPTION 'Posted valuation snapshots cannot be deleted' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF OLD.status='posted' OR NEW.status='posted' THEN
  IF NEW.item_count<>OLD.item_count OR NEW.total_quantity<>OLD.total_quantity OR
     NEW.total_value<>OLD.total_value OR NEW.as_of_date<>OLD.as_of_date OR
     NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.is_deleted<>OLD.is_deleted THEN
   RAISE EXCEPTION 'Valuation snapshot facts are fixed once posted' USING ERRCODE='23505';
  END IF;
 END IF;
 IF NEW.status='posted' AND OLD.status='posted' AND NEW.journal_batch_id<>OLD.journal_batch_id THEN
  RAISE EXCEPTION 'The valuation journal link cannot change' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_valuation_snapshot BEFORE UPDATE OR DELETE ON inv_valuation_snapshots
 FOR EACH ROW EXECUTE FUNCTION protect_inv_valuation_snapshot();

CREATE TABLE inv_valuation_snapshot_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 snapshot_id uuid NOT NULL,
 item_id uuid NOT NULL, warehouse_id uuid NOT NULL, batch_id uuid,
 quantity_on_hand numeric(20,6) NOT NULL DEFAULT 0,
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 stock_value numeric(20,6) NOT NULL DEFAULT 0,
 costing_method varchar(20) NOT NULL CHECK(costing_method IN('weighted_average','fifo','standard')),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,id),
 CONSTRAINT uq_inv_valuation_snapshot_lines_scope UNIQUE NULLS NOT DISTINCT (snapshot_id,item_id,warehouse_id,batch_id),
 FOREIGN KEY(tenant_id,snapshot_id) REFERENCES inv_valuation_snapshots(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id)
);
CREATE INDEX ix_inv_valuation_snapshot_lines_snapshot ON inv_valuation_snapshot_lines(tenant_id,snapshot_id)
 WHERE is_deleted=false;
CREATE INDEX ix_inv_valuation_snapshot_lines_item ON inv_valuation_snapshot_lines(tenant_id,item_id) WHERE is_deleted=false;

CREATE FUNCTION protect_inv_valuation_snapshot_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 RAISE EXCEPTION 'Valuation snapshot lines are immutable' USING ERRCODE='23505';
END $$;
CREATE TRIGGER protect_inv_valuation_snapshot_line_update BEFORE UPDATE ON inv_valuation_snapshot_lines
 FOR EACH ROW EXECUTE FUNCTION protect_inv_valuation_snapshot_line();
CREATE TRIGGER protect_inv_valuation_snapshot_line_delete BEFORE DELETE ON inv_valuation_snapshot_lines
 FOR EACH ROW EXECUTE FUNCTION protect_inv_valuation_snapshot_line();

-- ---------------------------------------------------------------------------
-- Inventory period closes. A close row ties one GL period to an inventory
-- close decision; while closed, stock documents that post into the period are
-- rejected by check_inv_stock_document_scope below.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_period_closes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 period_id uuid NOT NULL REFERENCES gl_accounting_periods(id),
 status varchar(10) NOT NULL DEFAULT 'open' CHECK(status IN('open','closed')),
 blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
 documents_posted integer NOT NULL DEFAULT 0 CHECK(documents_posted>=0),
 documents_pending integer NOT NULL DEFAULT 0 CHECK(documents_pending>=0),
 total_movement_value numeric(20,6) NOT NULL DEFAULT 0,
 valuation_snapshot_id uuid,
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 notes varchar(1000) NOT NULL DEFAULT '',
 closed_at timestamptz, closed_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,valuation_snapshot_id) REFERENCES inv_valuation_snapshots(tenant_id,id),
 CHECK(jsonb_typeof(blockers)='array'),
 CHECK(status='open' OR closed_at IS NOT NULL)
);
CREATE UNIQUE INDEX uq_inv_period_closes_live ON inv_period_closes(tenant_id,accounting_unit_id,period_id)
 WHERE is_deleted=false;
CREATE INDEX ix_inv_period_closes_scope ON inv_period_closes(tenant_id,accounting_unit_id,status) WHERE is_deleted=false;

-- The close is keyed to a period of the same accounting unit.
CREATE FUNCTION check_inv_period_close_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM gl_accounting_periods p
   WHERE p.tenant_id=NEW.tenant_id AND p.id=NEW.period_id AND p.accounting_unit_id=NEW.accounting_unit_id
    AND p.is_deleted=false) THEN
  RAISE EXCEPTION 'Select an accounting period of this accounting unit' USING ERRCODE='23503';
 END IF;
 IF NEW.status='closed' AND jsonb_array_length(NEW.blockers)>0 THEN
  RAISE EXCEPTION 'Resolve the listed blockers before closing the inventory period' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_inv_period_close_scope BEFORE INSERT OR UPDATE ON inv_period_closes
 FOR EACH ROW EXECUTE FUNCTION check_inv_period_close_scope();

-- A closed inventory period is final: only notes stay editable. Reopening means
-- deleting the close row, which is blocked while closed.
CREATE FUNCTION protect_inv_period_close() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status='closed' THEN
   RAISE EXCEPTION 'Closed inventory periods cannot be deleted' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF OLD.status='closed' AND (NEW.status<>'closed' OR NEW.period_id<>OLD.period_id OR
    NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.documents_posted<>OLD.documents_posted OR
    NEW.total_movement_value<>OLD.total_movement_value OR
    NEW.valuation_snapshot_id IS DISTINCT FROM OLD.valuation_snapshot_id OR
    NEW.journal_batch_id IS DISTINCT FROM OLD.journal_batch_id OR NEW.is_deleted<>OLD.is_deleted) THEN
  RAISE EXCEPTION 'Closed inventory periods are immutable' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_period_close BEFORE UPDATE OR DELETE ON inv_period_closes
 FOR EACH ROW EXECUTE FUNCTION protect_inv_period_close();

-- ---------------------------------------------------------------------------
-- Extend the 031 posting guard: posting a stock document now also requires the
-- inventory period (if a close run exists for it) to still be open.
-- ---------------------------------------------------------------------------
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
 IF NEW.status='posted' AND EXISTS(
   SELECT 1 FROM inv_period_closes c JOIN gl_accounting_periods p
    ON p.tenant_id=c.tenant_id AND p.id=c.period_id
   WHERE c.tenant_id=NEW.tenant_id AND c.accounting_unit_id=NEW.accounting_unit_id AND c.is_deleted=false
    AND c.status='closed' AND NEW.document_date BETWEEN p.period_start_date AND p.period_end_date) THEN
  RAISE EXCEPTION 'The inventory period for this document date is closed' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;

INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('inv_valuation_snapshots','Inventory stock and valuation','financial'),
 ('inv_valuation_snapshot_lines','Inventory stock and valuation','financial'),
 ('inv_period_closes','Inventory stock and valuation','financial');
COMMIT;
