-- Apply after 030. Inventory stock engine: document numbering sequences, stock
-- documents with lines and events, stock balances, FIFO cost layers and the
-- immutable inventory ledger (inv_stock_transactions).
--
-- Lifecycle: draft -> submitted -> approved -> posted. Posting writes ledger
-- rows, updates balances, consumes or creates cost layers and posts a balanced
-- journal batch through the GL integration contract. A posted document is
-- immutable; corrections post a linked reversal document.
BEGIN;

-- ---------------------------------------------------------------------------
-- Document numbering. One counter per tenant, accounting unit and document type
-- so numbers stay gapless per unit and are allocated under a row lock.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_document_sequences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 document_type varchar(20) NOT NULL CHECK(document_type IN('receipt','issue','transfer','adjustment','count')),
 prefix varchar(20) NOT NULL DEFAULT '', padding smallint NOT NULL DEFAULT 5 CHECK(padding BETWEEN 0 AND 12),
 next_number bigint NOT NULL DEFAULT 1 CHECK(next_number>0 AND next_number<9223372036854775807),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 UNIQUE(tenant_id,accounting_unit_id,document_type)
);

-- ---------------------------------------------------------------------------
-- Stock documents. One header/line pair serves receipts, issues, transfers,
-- adjustments and cycle counts; the type drives direction, warehouses, the
-- required counterparty and the posting accounts.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_stock_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 document_number varchar(40) NOT NULL CHECK(btrim(document_number)<>''),
 document_type varchar(20) NOT NULL CHECK(document_type IN('receipt','issue','transfer','adjustment','count')),
 movement_reason varchar(30) NOT NULL,
 document_date date NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'draft'
  CHECK(status IN('draft','submitted','approved','posted','cancelled','reversed')),
 source_warehouse_id uuid NOT NULL, destination_warehouse_id uuid,
 supplier_id uuid, customer_id uuid, cost_center_id uuid,
 reference_number varchar(80) NOT NULL DEFAULT '',
 source_document_type varchar(40) NOT NULL DEFAULT '', source_document_id uuid,
 reversal_document_id uuid,
 currency_id uuid NOT NULL,
 total_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(total_quantity>=0),
 total_value numeric(20,6) NOT NULL DEFAULT 0,
 notes varchar(1000) NOT NULL DEFAULT '',
 request_key uuid,
 is_posted boolean NOT NULL DEFAULT false, posted_at timestamptz, posted_by_user_id uuid REFERENCES users(id),
 period_id uuid REFERENCES gl_accounting_periods(id),
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 submitted_at timestamptz, submitted_by_user_id uuid REFERENCES users(id),
 approved_at timestamptz, approved_by_user_id uuid REFERENCES users(id),
 cancelled_at timestamptz, cancelled_by_user_id uuid REFERENCES users(id), cancel_reason varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,source_warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,destination_warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id),
 FOREIGN KEY(tenant_id,customer_id) REFERENCES core_customers(tenant_id,id),
 FOREIGN KEY(tenant_id,cost_center_id) REFERENCES core_cost_centers(tenant_id,id),
 FOREIGN KEY(tenant_id,reversal_document_id) REFERENCES inv_stock_documents(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id),
 CHECK((document_type='transfer')=(destination_warehouse_id IS NOT NULL)),
 CHECK(source_warehouse_id<>destination_warehouse_id),
 CHECK(is_posted=(status IN('posted','reversed'))),
 CHECK((document_type='receipt' AND movement_reason IN('purchase_receipt','opening_balance','customer_return','production_receipt','other_receipt'))
    OR (document_type='issue' AND movement_reason IN('sales_issue','production_issue','damage','expiry','sample','internal_use','other_issue'))
    OR (document_type='transfer' AND movement_reason IN('inter_warehouse','van_replenishment','other_transfer'))
    OR (document_type='adjustment' AND movement_reason IN('recount','shrinkage','write_off','other_adjustment'))
    OR (document_type='count' AND movement_reason IN('cycle_count','annual_count'))),
 CHECK(movement_reason<>'purchase_receipt' OR supplier_id IS NOT NULL),
 CHECK(movement_reason NOT IN('sales_issue','customer_return') OR customer_id IS NOT NULL),
 CHECK(reversal_document_id IS NULL OR reversal_document_id<>id)
);
CREATE UNIQUE INDEX uq_inv_stock_documents_number ON inv_stock_documents(tenant_id,accounting_unit_id,lower(btrim(document_number)));
CREATE UNIQUE INDEX uq_inv_stock_documents_request ON inv_stock_documents(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX uq_inv_stock_documents_journal ON inv_stock_documents(tenant_id,journal_batch_id) WHERE journal_batch_id IS NOT NULL;
CREATE INDEX ix_inv_stock_documents_scope ON inv_stock_documents(tenant_id,accounting_unit_id,document_date DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_inv_stock_documents_status ON inv_stock_documents(tenant_id,status) WHERE is_deleted=false;
CREATE INDEX ix_inv_stock_documents_supplier ON inv_stock_documents(tenant_id,supplier_id) WHERE is_deleted=false AND supplier_id IS NOT NULL;
CREATE INDEX ix_inv_stock_documents_source ON inv_stock_documents(tenant_id,source_document_id) WHERE is_deleted=false AND source_document_id IS NOT NULL;

-- Header scope: warehouses must be live, active and in the document's accounting
-- unit; transfers stay inside one unit. Posting additionally requires an open GL
-- period covering the document date.
CREATE FUNCTION check_inv_stock_document_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
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
CREATE TRIGGER check_inv_stock_document_scope BEFORE INSERT OR UPDATE OF
 accounting_unit_id,source_warehouse_id,destination_warehouse_id,status,document_date ON inv_stock_documents
 FOR EACH ROW EXECUTE FUNCTION check_inv_stock_document_scope();

-- Posted documents are immutable and are never hard-deleted; corrections post a
-- reversal document that links back through reversal_document_id.
CREATE FUNCTION protect_inv_stock_document() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Stock documents are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF OLD.is_posted THEN
  IF NEW.is_deleted THEN
   RAISE EXCEPTION 'Posted stock documents cannot be deleted; post a reversal' USING ERRCODE='23505';
  END IF;
  IF NEW.document_number<>OLD.document_number OR NEW.document_type<>OLD.document_type OR
     NEW.movement_reason<>OLD.movement_reason OR NEW.document_date<>OLD.document_date OR
     NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.source_warehouse_id<>OLD.source_warehouse_id OR
     NEW.destination_warehouse_id IS DISTINCT FROM OLD.destination_warehouse_id OR NEW.currency_id<>OLD.currency_id OR
     NEW.total_quantity<>OLD.total_quantity OR NEW.total_value<>OLD.total_value OR
     NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
   RAISE EXCEPTION 'Posted stock documents are immutable; post a reversal instead' USING ERRCODE='23505';
  END IF;
  IF NEW.status NOT IN('posted','reversed') THEN
   RAISE EXCEPTION 'A posted document can only be reversed' USING ERRCODE='23514';
  END IF;
 ELSIF NEW.is_posted AND NEW.status<>'posted' THEN
  RAISE EXCEPTION 'Posting state and status must agree' USING ERRCODE='23514';
 END IF;
 IF NEW.status='reversed' AND NEW.reversal_document_id IS NULL THEN
  RAISE EXCEPTION 'Record the reversing document before marking a document reversed' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_stock_document BEFORE UPDATE OR DELETE ON inv_stock_documents
 FOR EACH ROW EXECUTE FUNCTION protect_inv_stock_document();

CREATE TABLE inv_stock_document_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 item_id uuid NOT NULL, batch_id uuid,
 uom_id uuid NOT NULL,
 conversion_factor numeric(20,10) NOT NULL DEFAULT 1 CHECK(conversion_factor>0),
 quantity numeric(20,6) NOT NULL DEFAULT 0,
 quantity_base numeric(20,6) NOT NULL DEFAULT 0,
 counted_quantity numeric(20,6),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 line_value numeric(20,6) NOT NULL DEFAULT 0,
 source_bin_id uuid, destination_bin_id uuid,
 serial_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
 description varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(document_id,line_number),
 FOREIGN KEY(tenant_id,document_id) REFERENCES inv_stock_documents(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,source_bin_id) REFERENCES inv_bin_locations(tenant_id,id),
 FOREIGN KEY(tenant_id,destination_bin_id) REFERENCES inv_bin_locations(tenant_id,id),
 CHECK(jsonb_typeof(serial_numbers)='array')
);
CREATE INDEX ix_inv_stock_document_lines_document ON inv_stock_document_lines(tenant_id,document_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_stock_document_lines_item ON inv_stock_document_lines(tenant_id,item_id) WHERE is_deleted=false;

-- Line semantics follow the parent document type: counts record what was counted
-- and post the variance; every other document moves a non-zero quantity. Lines
-- lock as soon as the document leaves draft.
CREATE FUNCTION check_inv_stock_document_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_type varchar(20); doc_status varchar(20);
BEGIN
 SELECT d.document_type, d.status INTO doc_type, doc_status FROM inv_stock_documents d
  WHERE d.tenant_id=NEW.tenant_id AND d.id=NEW.document_id AND d.is_deleted=false FOR SHARE OF d;
 IF doc_type IS NULL THEN RAISE EXCEPTION 'Unknown stock document for this line' USING ERRCODE='23503'; END IF;
 IF doc_status<>'draft' THEN
  RAISE EXCEPTION 'Lines lock when a document is submitted; cancel it to rework' USING ERRCODE='23505';
 END IF;
 IF doc_type='count' THEN
  IF NEW.counted_quantity IS NULL OR NEW.counted_quantity<0 THEN
   RAISE EXCEPTION 'Count lines require a non-negative counted quantity' USING ERRCODE='23514';
  END IF;
 ELSIF NEW.quantity=0 THEN
  RAISE EXCEPTION 'Stock movement lines require a non-zero quantity' USING ERRCODE='23514';
 ELSIF NEW.counted_quantity IS NOT NULL THEN
  RAISE EXCEPTION 'Only count documents record counted quantities' USING ERRCODE='23514';
 ELSIF doc_type IN('receipt','issue','transfer') AND NEW.quantity<0 THEN
  RAISE EXCEPTION 'Receipts, issues and transfers use positive quantities' USING ERRCODE='23514';
 END IF;
 IF (NEW.quantity>=0) <> (NEW.quantity_base>=0) THEN
  RAISE EXCEPTION 'Converted quantity must keep the movement direction' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_inv_stock_document_line BEFORE INSERT OR UPDATE ON inv_stock_document_lines
 FOR EACH ROW EXECUTE FUNCTION check_inv_stock_document_line();

CREATE FUNCTION protect_inv_stock_document_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT d.status INTO doc_status FROM inv_stock_documents d
  WHERE d.tenant_id=OLD.tenant_id AND d.id=OLD.document_id;
 IF doc_status IS NOT NULL AND doc_status<>'draft' THEN
  RAISE EXCEPTION 'Lines lock when a document is submitted; cancel it to rework' USING ERRCODE='23505';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_stock_document_line BEFORE UPDATE OR DELETE ON inv_stock_document_lines
 FOR EACH ROW EXECUTE FUNCTION protect_inv_stock_document_line();

-- ---------------------------------------------------------------------------
-- Document events: approval and lifecycle history (maker-checker audit trail).
-- ---------------------------------------------------------------------------
CREATE TABLE inv_stock_document_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 document_id uuid NOT NULL,
 action varchar(20) NOT NULL
  CHECK(action IN('created','updated','submitted','approved','rejected','posted','cancelled','reversed')),
 previous_status varchar(20), new_status varchar(20) NOT NULL,
 reason varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(document_id,version),
 FOREIGN KEY(tenant_id,document_id) REFERENCES inv_stock_documents(tenant_id,id)
);
CREATE INDEX ix_inv_stock_document_events_scope ON inv_stock_document_events(tenant_id,document_id,version) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Stock balances: one row per item, warehouse and (optional) batch. Maintained
-- only by posting; never edited directly.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_stock_balances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL, warehouse_id uuid NOT NULL, batch_id uuid,
 quantity_on_hand numeric(20,6) NOT NULL DEFAULT 0,
 quantity_reserved numeric(20,6) NOT NULL DEFAULT 0 CHECK(quantity_reserved>=0),
 quantity_in_transit numeric(20,6) NOT NULL DEFAULT 0 CHECK(quantity_in_transit>=0),
 average_unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(average_unit_cost>=0),
 stock_value numeric(20,6) NOT NULL DEFAULT 0,
 last_movement_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 CONSTRAINT uq_inv_stock_balances_scope UNIQUE NULLS NOT DISTINCT (tenant_id,item_id,warehouse_id,batch_id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id)
);
CREATE INDEX ix_inv_stock_balances_item ON inv_stock_balances(tenant_id,item_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_stock_balances_warehouse ON inv_stock_balances(tenant_id,warehouse_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_stock_balances_batch ON inv_stock_balances(tenant_id,batch_id) WHERE is_deleted=false AND batch_id IS NOT NULL;

-- Negative stock is a per-warehouse policy, not a global one.
CREATE FUNCTION check_inv_stock_balance_policy() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE allowed boolean;
BEGIN
 SELECT w.allows_negative_stock INTO allowed FROM inv_warehouses w
  WHERE w.tenant_id=NEW.tenant_id AND w.id=NEW.warehouse_id AND w.is_deleted=false;
 IF allowed IS NULL THEN RAISE EXCEPTION 'Unknown warehouse for this stock balance' USING ERRCODE='23503'; END IF;
 IF NEW.quantity_on_hand<0 AND NOT allowed THEN
  RAISE EXCEPTION 'Negative stock is not allowed in this warehouse' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_inv_stock_balance_policy BEFORE INSERT OR UPDATE OF quantity_on_hand,warehouse_id ON inv_stock_balances
 FOR EACH ROW EXECUTE FUNCTION check_inv_stock_balance_policy();

-- ---------------------------------------------------------------------------
-- FIFO cost layers. One layer per receipt movement; issues consume the oldest
-- open layer first. Remaining quantity never increases.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_cost_layers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL, warehouse_id uuid NOT NULL, batch_id uuid,
 quantity_received numeric(20,6) NOT NULL CHECK(quantity_received>0),
 quantity_remaining numeric(20,6) NOT NULL CHECK(quantity_remaining>=0),
 unit_cost numeric(20,6) NOT NULL CHECK(unit_cost>=0),
 received_at timestamptz NOT NULL DEFAULT now(),
 document_id uuid, document_line_id uuid, document_number varchar(40) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 CHECK(quantity_remaining<=quantity_received),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id),
 FOREIGN KEY(tenant_id,document_id) REFERENCES inv_stock_documents(tenant_id,id)
);
CREATE INDEX ix_inv_cost_layers_open ON inv_cost_layers(tenant_id,item_id,warehouse_id,received_at,id)
 WHERE is_deleted=false AND quantity_remaining>0;
CREATE INDEX ix_inv_cost_layers_item ON inv_cost_layers(tenant_id,item_id) WHERE is_deleted=false;

CREATE FUNCTION protect_inv_cost_layer() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cost layers are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF NEW.quantity_remaining>OLD.quantity_remaining THEN
  RAISE EXCEPTION 'Cost layer quantities are consumed only; post a receipt to add stock' USING ERRCODE='23514';
 END IF;
 IF NEW.quantity_received<>OLD.quantity_received OR NEW.unit_cost<>OLD.unit_cost OR NEW.item_id<>OLD.item_id OR
    NEW.warehouse_id<>OLD.warehouse_id OR NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
  RAISE EXCEPTION 'Cost layer receipt facts are immutable' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_cost_layer BEFORE UPDATE OR DELETE ON inv_cost_layers
 FOR EACH ROW EXECUTE FUNCTION protect_inv_cost_layer();

-- ---------------------------------------------------------------------------
-- Inventory ledger: one immutable row per balance movement. Running balances let
-- the item card and valuation reports replay history without recomputation.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_stock_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 item_id uuid NOT NULL, warehouse_id uuid NOT NULL, batch_id uuid,
 document_id uuid NOT NULL, document_line_id uuid NOT NULL,
 document_number varchar(40) NOT NULL, document_type varchar(20) NOT NULL, movement_reason varchar(30) NOT NULL,
 transaction_date date NOT NULL,
 quantity numeric(20,6) NOT NULL CHECK(quantity<>0),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 stock_value numeric(20,6) NOT NULL DEFAULT 0,
 balance_quantity numeric(20,6) NOT NULL,
 balance_value numeric(20,6) NOT NULL,
 costing_method varchar(20) NOT NULL CHECK(costing_method IN('weighted_average','fifo','standard')),
 reference_number varchar(80) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,id),
 UNIQUE(document_line_id,warehouse_id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id),
 FOREIGN KEY(tenant_id,document_id) REFERENCES inv_stock_documents(tenant_id,id),
 FOREIGN KEY(tenant_id,document_line_id) REFERENCES inv_stock_document_lines(tenant_id,id)
);
CREATE INDEX ix_inv_stock_transactions_item ON inv_stock_transactions(tenant_id,item_id,transaction_date DESC,id);
CREATE INDEX ix_inv_stock_transactions_warehouse ON inv_stock_transactions(tenant_id,warehouse_id,transaction_date DESC,id);
CREATE INDEX ix_inv_stock_transactions_unit_date ON inv_stock_transactions(tenant_id,accounting_unit_id,transaction_date DESC,id);
CREATE INDEX ix_inv_stock_transactions_document ON inv_stock_transactions(tenant_id,document_id);

CREATE FUNCTION protect_inv_stock_transaction() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 RAISE EXCEPTION 'Inventory ledger rows are immutable; post a reversing document instead' USING ERRCODE='23505';
END $$;
CREATE TRIGGER protect_inv_stock_transaction_update BEFORE UPDATE ON inv_stock_transactions
 FOR EACH ROW EXECUTE FUNCTION protect_inv_stock_transaction();
CREATE TRIGGER protect_inv_stock_transaction_delete BEFORE DELETE ON inv_stock_transactions
 FOR EACH ROW EXECUTE FUNCTION protect_inv_stock_transaction();

-- ---------------------------------------------------------------------------
-- Extended protection now that stock exists. Replaces the migration 030 guards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_inv_warehouse() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active OR NEW.accounting_unit_id<>OLD.accounting_unit_id OR
     NEW.allows_negative_stock<>OLD.allows_negative_stock) THEN
  IF EXISTS(SELECT 1 FROM inv_stock_balances b WHERE b.tenant_id=OLD.tenant_id AND b.warehouse_id=OLD.id
             AND b.is_deleted=false AND (b.quantity_on_hand<>0 OR b.quantity_reserved<>0 OR b.quantity_in_transit<>0)) OR
     EXISTS(SELECT 1 FROM inv_stock_transactions t WHERE t.tenant_id=OLD.tenant_id AND t.warehouse_id=OLD.id) OR
     EXISTS(SELECT 1 FROM inv_stock_documents d WHERE d.tenant_id=OLD.tenant_id AND d.is_deleted=false AND d.is_posted
             AND OLD.id IN(d.source_warehouse_id,d.destination_warehouse_id)) THEN
   RAISE EXCEPTION 'Warehouse holds stock history and cannot be removed or rescoped' USING ERRCODE='23505';
  END IF;
  IF EXISTS(
     SELECT 1 FROM inv_bin_locations b WHERE b.tenant_id=OLD.tenant_id AND b.warehouse_id=OLD.id AND b.is_deleted=false
     UNION ALL SELECT 1 FROM inv_item_warehouses iw WHERE iw.tenant_id=OLD.tenant_id AND iw.warehouse_id=OLD.id AND iw.is_deleted=false
     UNION ALL SELECT 1 FROM inv_serial_numbers s WHERE s.tenant_id=OLD.tenant_id AND s.warehouse_id=OLD.id AND s.is_deleted=false
      AND s.status IN('in_stock','reserved','in_transit')
     UNION ALL SELECT 1 FROM inv_items i WHERE i.tenant_id=OLD.tenant_id AND i.default_warehouse_id=OLD.id AND i.is_deleted=false) THEN
   RAISE EXCEPTION 'Warehouse is referenced by live inventory configuration or stock' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION protect_inv_item_identity() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE referenced boolean; has_stock boolean;
BEGIN
 SELECT EXISTS(
   SELECT 1 FROM inv_item_uom_conversions c WHERE c.tenant_id=OLD.tenant_id AND c.item_id=OLD.id AND c.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_suppliers s WHERE s.tenant_id=OLD.tenant_id AND s.item_id=OLD.id AND s.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_warehouses iw WHERE iw.tenant_id=OLD.tenant_id AND iw.item_id=OLD.id AND iw.is_deleted=false
   UNION ALL SELECT 1 FROM inv_batches b WHERE b.tenant_id=OLD.tenant_id AND b.item_id=OLD.id AND b.is_deleted=false
   UNION ALL SELECT 1 FROM inv_serial_numbers sn WHERE sn.tenant_id=OLD.tenant_id AND sn.item_id=OLD.id AND sn.is_deleted=false)
  INTO referenced;
 SELECT EXISTS(SELECT 1 FROM inv_stock_transactions t WHERE t.tenant_id=OLD.tenant_id AND t.item_id=OLD.id)
   INTO has_stock;
 IF NEW.is_deleted AND (has_stock OR EXISTS(
    SELECT 1 FROM inv_stock_balances b WHERE b.tenant_id=OLD.tenant_id AND b.item_id=OLD.id AND b.is_deleted=false
     AND b.quantity_on_hand<>0)) THEN
  RAISE EXCEPTION 'Item has stock history; set it inactive instead of deleting it' USING ERRCODE='23505';
 END IF;
 IF (referenced OR has_stock) AND (NEW.valuation_method<>OLD.valuation_method OR NEW.tracking_method<>OLD.tracking_method OR
     NEW.base_uom_id<>OLD.base_uom_id OR NEW.item_code<>OLD.item_code) THEN
  RAISE EXCEPTION 'Costing, tracking, base unit and item code are fixed once inventory records exist' USING ERRCODE='23505';
 END IF;
 IF has_stock AND NEW.standard_cost<>OLD.standard_cost AND OLD.valuation_method='standard' THEN
  RAISE EXCEPTION 'Standard cost changes must be posted through a revaluation adjustment' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;

INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('inv_document_sequences','Inventory',''),
 ('inv_stock_balances','Inventory stock and valuation','financial'),
 ('inv_cost_layers','Inventory stock and valuation','financial'),
 ('inv_stock_documents','Inventory stock and valuation','financial'),
 ('inv_stock_document_lines','Inventory stock and valuation','financial'),
 ('inv_stock_document_events','Inventory stock and valuation','financial'),
 ('inv_stock_transactions','Inventory stock and valuation','financial');
COMMIT;
