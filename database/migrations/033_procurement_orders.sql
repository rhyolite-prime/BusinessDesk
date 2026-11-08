-- Apply after 032. Purchase quotations (supplier RFQ responses) and purchase
-- orders with multi-currency totals, receiving counters and full maker-checker
-- lifecycle. Purchase orders are the commercial contract; stock and payables
-- effects only ever arrive through receipts (034).
--
-- Order lifecycle: draft -> submitted -> approved -> sent -> partially_received
-- -> received -> closed; rejection and cancellation are terminal side exits.
BEGIN;

-- ---------------------------------------------------------------------------
-- Purchase quotations. One per supplier per sourcing round; awarding one
-- converts it into a purchase order and closes the round.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_purchase_quotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 quotation_number varchar(40) NOT NULL CHECK(btrim(quotation_number)<>''),
 supplier_id uuid NOT NULL,
 quotation_date date NOT NULL,
 valid_until_date date,
 status varchar(20) NOT NULL DEFAULT 'draft'
  CHECK(status IN('draft','sent','awarded','rejected','expired','cancelled')),
 currency_id uuid NOT NULL,
 exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK(exchange_rate>0),
 sub_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(sub_total>=0),
 discount_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(discount_total>=0),
 tax_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(tax_total>=0),
 grand_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(grand_total>=0),
 base_grand_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(base_grand_total>=0),
 supplier_reference varchar(80) NOT NULL DEFAULT '',
 payment_terms_days integer NOT NULL DEFAULT 0 CHECK(payment_terms_days BETWEEN 0 AND 3650),
 notes varchar(1000) NOT NULL DEFAULT '',
 request_key uuid,
 sent_at timestamptz, sent_by_user_id uuid REFERENCES users(id),
 awarded_at timestamptz, awarded_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id),
 CHECK(valid_until_date IS NULL OR valid_until_date>=quotation_date)
);
CREATE UNIQUE INDEX uq_scm_quotations_number ON scm_purchase_quotations(tenant_id,accounting_unit_id,lower(btrim(quotation_number)));
CREATE UNIQUE INDEX uq_scm_quotations_request ON scm_purchase_quotations(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_scm_quotations_scope ON scm_purchase_quotations(tenant_id,accounting_unit_id,quotation_date DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_scm_quotations_supplier ON scm_purchase_quotations(tenant_id,supplier_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_quotations_status ON scm_purchase_quotations(tenant_id,status) WHERE is_deleted=false;

CREATE FUNCTION check_scm_quotation_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core_suppliers s WHERE s.tenant_id=NEW.tenant_id AND s.id=NEW.supplier_id
   AND s.is_deleted=false AND s.status='active') THEN
  RAISE EXCEPTION 'Select a live active supplier' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_quotation_scope BEFORE INSERT OR UPDATE OF supplier_id ON scm_purchase_quotations
 FOR EACH ROW EXECUTE FUNCTION check_scm_quotation_scope();

CREATE FUNCTION check_scm_quotation_transition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF (OLD.status,NEW.status) NOT IN (
   ('draft','sent'),('draft','cancelled'),
   ('sent','awarded'),('sent','rejected'),('sent','expired'),('sent','cancelled')) THEN
  RAISE EXCEPTION 'Invalid quotation status transition: % to %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF NEW.status='awarded' AND NEW.awarded_at IS NULL THEN
  RAISE EXCEPTION 'Record the award before marking a quotation awarded' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_quotation_transition BEFORE UPDATE OF status ON scm_purchase_quotations
 FOR EACH ROW EXECUTE FUNCTION check_scm_quotation_transition();

-- A quotation leaves draft once: its commercial terms are frozen from send.
CREATE FUNCTION protect_scm_quotation() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Purchase quotations are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF OLD.status<>'draft' THEN
  IF NEW.is_deleted THEN
   RAISE EXCEPTION 'Only draft quotations can be deleted' USING ERRCODE='23505';
  END IF;
  IF NEW.quotation_number<>OLD.quotation_number OR NEW.accounting_unit_id<>OLD.accounting_unit_id OR
     NEW.supplier_id<>OLD.supplier_id OR NEW.quotation_date<>OLD.quotation_date OR
     NEW.valid_until_date IS DISTINCT FROM OLD.valid_until_date OR NEW.currency_id<>OLD.currency_id OR
     NEW.exchange_rate<>OLD.exchange_rate OR NEW.sub_total<>OLD.sub_total OR NEW.discount_total<>OLD.discount_total OR
     NEW.tax_total<>OLD.tax_total OR NEW.grand_total<>OLD.grand_total OR NEW.base_grand_total<>OLD.base_grand_total THEN
   RAISE EXCEPTION 'Sent quotations are locked; issue a revision as a new quotation' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_quotation BEFORE UPDATE OR DELETE ON scm_purchase_quotations
 FOR EACH ROW EXECUTE FUNCTION protect_scm_quotation();

CREATE TABLE scm_purchase_quotation_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 quotation_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 item_id uuid NOT NULL,
 description varchar(500) NOT NULL DEFAULT '',
 uom_id uuid NOT NULL,
 quantity numeric(20,6) NOT NULL CHECK(quantity>0),
 unit_cost numeric(20,6) NOT NULL CHECK(unit_cost>=0),
 discount_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK(discount_rate>=0 AND discount_rate<=1),
 tax_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=1),
 line_total numeric(20,6) NOT NULL CHECK(line_total>=0),
 lead_time_days integer NOT NULL DEFAULT 0 CHECK(lead_time_days BETWEEN 0 AND 3650),
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(quotation_id,line_number),
 FOREIGN KEY(tenant_id,quotation_id) REFERENCES scm_purchase_quotations(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id)
);
CREATE INDEX ix_scm_quotation_lines_document ON scm_purchase_quotation_lines(tenant_id,quotation_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_quotation_lines_item ON scm_purchase_quotation_lines(tenant_id,item_id) WHERE is_deleted=false;

CREATE FUNCTION protect_scm_quotation_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT q.status INTO doc_status FROM scm_purchase_quotations q
  WHERE q.tenant_id=OLD.tenant_id AND q.id=OLD.quotation_id;
 IF TG_OP='DELETE' THEN
  IF doc_status<>'draft' THEN
   RAISE EXCEPTION 'Lines of a sent quotation are locked' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF doc_status<>'draft' THEN
  RAISE EXCEPTION 'Lines of a sent quotation are locked' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_quotation_line BEFORE UPDATE OR DELETE ON scm_purchase_quotation_lines
 FOR EACH ROW EXECUTE FUNCTION protect_scm_quotation_line();

-- ---------------------------------------------------------------------------
-- Purchase orders. The commercial commitment to a supplier; receiving counters
-- are advanced only by goods receipts (034), never edited directly.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_purchase_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 order_number varchar(40) NOT NULL CHECK(btrim(order_number)<>''),
 supplier_id uuid NOT NULL,
 quotation_id uuid,
 order_date date NOT NULL,
 expected_delivery_date date,
 status varchar(20) NOT NULL DEFAULT 'draft'
  CHECK(status IN('draft','submitted','approved','rejected','sent','partially_received','received','closed','cancelled')),
 warehouse_id uuid NOT NULL,
 currency_id uuid NOT NULL,
 exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK(exchange_rate>0),
 incoterm varchar(4) NOT NULL DEFAULT ''
  CHECK(incoterm IN('','EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DPU','DAP','DDP')),
 payment_terms_days integer NOT NULL DEFAULT 0 CHECK(payment_terms_days BETWEEN 0 AND 3650),
 sub_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(sub_total>=0),
 discount_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(discount_total>=0),
 tax_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(tax_total>=0),
 grand_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(grand_total>=0),
 base_grand_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(base_grand_total>=0),
 supplier_reference varchar(80) NOT NULL DEFAULT '',
 notes varchar(1000) NOT NULL DEFAULT '',
 request_key uuid,
 submitted_at timestamptz, submitted_by_user_id uuid REFERENCES users(id),
 approved_at timestamptz, approved_by_user_id uuid REFERENCES users(id),
 rejected_at timestamptz, rejected_by_user_id uuid REFERENCES users(id), rejection_reason varchar(500) NOT NULL DEFAULT '',
 sent_at timestamptz, sent_by_user_id uuid REFERENCES users(id),
 closed_at timestamptz, closed_by_user_id uuid REFERENCES users(id),
 cancelled_at timestamptz, cancelled_by_user_id uuid REFERENCES users(id), cancel_reason varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id),
 FOREIGN KEY(tenant_id,quotation_id) REFERENCES scm_purchase_quotations(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id),
 CHECK(expected_delivery_date IS NULL OR expected_delivery_date>=order_date)
);
CREATE UNIQUE INDEX uq_scm_purchase_orders_number ON scm_purchase_orders(tenant_id,accounting_unit_id,lower(btrim(order_number)));
CREATE UNIQUE INDEX uq_scm_purchase_orders_request ON scm_purchase_orders(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_scm_purchase_orders_scope ON scm_purchase_orders(tenant_id,accounting_unit_id,order_date DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_scm_purchase_orders_supplier ON scm_purchase_orders(tenant_id,supplier_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_purchase_orders_status ON scm_purchase_orders(tenant_id,status) WHERE is_deleted=false;
CREATE INDEX ix_scm_purchase_orders_open ON scm_purchase_orders(tenant_id,supplier_id)
 WHERE is_deleted=false AND status IN('sent','partially_received');

CREATE FUNCTION check_scm_purchase_order_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM core_suppliers s WHERE s.tenant_id=NEW.tenant_id AND s.id=NEW.supplier_id
   AND s.is_deleted=false AND s.status='active') THEN
  RAISE EXCEPTION 'Select a live active supplier' USING ERRCODE='23503';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM inv_warehouses w WHERE w.tenant_id=NEW.tenant_id AND w.id=NEW.warehouse_id
   AND w.is_deleted=false AND w.is_active AND w.accounting_unit_id=NEW.accounting_unit_id) THEN
  RAISE EXCEPTION 'Select a live warehouse in this accounting unit' USING ERRCODE='23503';
 END IF;
 IF NEW.quotation_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM scm_purchase_quotations q WHERE q.tenant_id=NEW.tenant_id AND q.id=NEW.quotation_id
    AND q.is_deleted=false AND q.supplier_id=NEW.supplier_id) THEN
  RAISE EXCEPTION 'The quotation must belong to this supplier' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_purchase_order_scope BEFORE INSERT OR UPDATE OF
 accounting_unit_id,warehouse_id,supplier_id,quotation_id ON scm_purchase_orders
 FOR EACH ROW EXECUTE FUNCTION check_scm_purchase_order_scope();

CREATE FUNCTION check_scm_purchase_order_transition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF (OLD.status,NEW.status) NOT IN (
   ('draft','submitted'),('draft','cancelled'),
   ('submitted','approved'),('submitted','rejected'),('submitted','cancelled'),
   ('approved','sent'),('approved','cancelled'),
   ('sent','partially_received'),('sent','received'),('sent','cancelled'),
   ('partially_received','received'),('partially_received','closed'),
   ('received','closed')) THEN
  RAISE EXCEPTION 'Invalid purchase order status transition: % to %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF NEW.status='submitted' AND NEW.submitted_at IS NULL THEN
  RAISE EXCEPTION 'Record the submission before marking an order submitted' USING ERRCODE='23514';
 END IF;
 IF NEW.status='approved' AND NEW.approved_at IS NULL THEN
  RAISE EXCEPTION 'Record the approval before marking an order approved' USING ERRCODE='23514';
 END IF;
 IF NEW.status='rejected' AND btrim(NEW.rejection_reason)='' THEN
  RAISE EXCEPTION 'Rejections require a reason' USING ERRCODE='23514';
 END IF;
 IF NEW.status='sent' AND NEW.sent_at IS NULL THEN
  RAISE EXCEPTION 'Record the send before marking an order sent' USING ERRCODE='23514';
 END IF;
 IF NEW.status='cancelled' AND btrim(NEW.cancel_reason)='' THEN
  RAISE EXCEPTION 'Cancellations require a reason' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_purchase_order_transition BEFORE UPDATE OF status ON scm_purchase_orders
 FOR EACH ROW EXECUTE FUNCTION check_scm_purchase_order_transition();

-- Orders freeze on submission; receiving counters and status keep moving.
CREATE FUNCTION protect_scm_purchase_order() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Purchase orders are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF OLD.status<>'draft' THEN
  IF NEW.is_deleted THEN
   RAISE EXCEPTION 'Only draft orders can be deleted' USING ERRCODE='23505';
  END IF;
  IF NEW.order_number<>OLD.order_number OR NEW.accounting_unit_id<>OLD.accounting_unit_id OR
     NEW.supplier_id<>OLD.supplier_id OR NEW.quotation_id IS DISTINCT FROM OLD.quotation_id OR
     NEW.order_date<>OLD.order_date OR NEW.expected_delivery_date IS DISTINCT FROM OLD.expected_delivery_date OR
     NEW.warehouse_id<>OLD.warehouse_id OR NEW.currency_id<>OLD.currency_id OR NEW.exchange_rate<>OLD.exchange_rate OR
     NEW.incoterm<>OLD.incoterm OR NEW.payment_terms_days<>OLD.payment_terms_days OR
     NEW.sub_total<>OLD.sub_total OR NEW.discount_total<>OLD.discount_total OR NEW.tax_total<>OLD.tax_total OR
     NEW.grand_total<>OLD.grand_total OR NEW.base_grand_total<>OLD.base_grand_total THEN
   RAISE EXCEPTION 'Submitted orders are locked; cancel and re-issue to change terms' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_purchase_order BEFORE UPDATE OR DELETE ON scm_purchase_orders
 FOR EACH ROW EXECUTE FUNCTION protect_scm_purchase_order();

CREATE TABLE scm_purchase_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 order_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 item_id uuid NOT NULL,
 description varchar(500) NOT NULL DEFAULT '',
 uom_id uuid NOT NULL,
 conversion_factor numeric(20,10) NOT NULL DEFAULT 1 CHECK(conversion_factor>0),
 quantity numeric(20,6) NOT NULL CHECK(quantity>0),
 unit_cost numeric(20,6) NOT NULL CHECK(unit_cost>=0),
 discount_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK(discount_rate>=0 AND discount_rate<=1),
 tax_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=1),
 line_total numeric(20,6) NOT NULL CHECK(line_total>=0),
 received_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(received_quantity>=0),
 rejected_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(rejected_quantity>=0),
 requisition_line_id uuid,
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN('open','partially_received','received','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(order_id,line_number),
 FOREIGN KEY(tenant_id,order_id) REFERENCES scm_purchase_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,requisition_line_id) REFERENCES scm_purchase_requisition_lines(tenant_id,id),
 CHECK(received_quantity+rejected_quantity<=quantity),
 CHECK(status='open' OR received_quantity>0 OR rejected_quantity>0 OR status='cancelled')
);
CREATE INDEX ix_scm_purchase_order_lines_document ON scm_purchase_order_lines(tenant_id,order_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_purchase_order_lines_item ON scm_purchase_order_lines(tenant_id,item_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_purchase_order_lines_open ON scm_purchase_order_lines(tenant_id,item_id)
 WHERE is_deleted=false AND status IN('open','partially_received');
CREATE INDEX ix_scm_purchase_order_lines_requisition ON scm_purchase_order_lines(tenant_id,requisition_line_id)
 WHERE is_deleted=false AND requisition_line_id IS NOT NULL;

-- Order lines must match the order's supplier-time facts: purchasable item, and
-- any requisition link must point at an approved requisition in the same unit.
CREATE FUNCTION check_scm_purchase_order_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE order_unit uuid; order_status varchar(20);
BEGIN
 SELECT o.accounting_unit_id, o.status INTO order_unit, order_status FROM scm_purchase_orders o
  WHERE o.tenant_id=NEW.tenant_id AND o.id=NEW.order_id AND o.is_deleted=false FOR SHARE OF o;
 IF order_unit IS NULL THEN RAISE EXCEPTION 'Unknown purchase order for this line' USING ERRCODE='23503'; END IF;
 IF TG_OP='INSERT' AND order_status<>'draft' THEN
  RAISE EXCEPTION 'Lines can only be added to a draft order' USING ERRCODE='23505';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM inv_items i WHERE i.tenant_id=NEW.tenant_id AND i.id=NEW.item_id AND i.is_deleted=false
   AND i.is_purchasable AND i.status='active') THEN
  RAISE EXCEPTION 'Select a live purchasable catalog item' USING ERRCODE='23503';
 END IF;
 IF NEW.requisition_line_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM scm_purchase_requisition_lines rl
    JOIN scm_purchase_requisitions r ON r.tenant_id=rl.tenant_id AND r.id=rl.requisition_id
   WHERE rl.tenant_id=NEW.tenant_id AND rl.id=NEW.requisition_line_id AND rl.is_deleted=false
    AND r.is_deleted=false AND r.accounting_unit_id=order_unit
    AND r.status IN('approved','partially_ordered','ordered')
    AND rl.status IN('open','partially_ordered') AND rl.item_id=NEW.item_id) THEN
  RAISE EXCEPTION 'Requisition line must be approved, open and for this item and unit' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_purchase_order_line BEFORE INSERT OR UPDATE OF
 order_id,item_id,requisition_line_id ON scm_purchase_order_lines
 FOR EACH ROW EXECUTE FUNCTION check_scm_purchase_order_line();

CREATE FUNCTION protect_scm_purchase_order_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT o.status INTO doc_status FROM scm_purchase_orders o
  WHERE o.tenant_id=OLD.tenant_id AND o.id=OLD.order_id;
 IF TG_OP='DELETE' THEN
  IF doc_status<>'draft' THEN
   RAISE EXCEPTION 'Lines of a submitted order are locked' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF doc_status<>'draft' AND (NEW.is_deleted OR NEW.item_id<>OLD.item_id OR NEW.uom_id<>OLD.uom_id OR
    NEW.quantity<>OLD.quantity OR NEW.unit_cost<>OLD.unit_cost OR NEW.discount_rate<>OLD.discount_rate OR
    NEW.tax_rate<>OLD.tax_rate OR NEW.line_total<>OLD.line_total OR
    NEW.requisition_line_id IS DISTINCT FROM OLD.requisition_line_id) THEN
  RAISE EXCEPTION 'Lines of a submitted order are locked' USING ERRCODE='23505';
 END IF;
 IF NEW.received_quantity<OLD.received_quantity OR NEW.rejected_quantity<OLD.rejected_quantity THEN
  RAISE EXCEPTION 'Receiving counters are set by goods receipts and never decrease here' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_purchase_order_line BEFORE UPDATE OR DELETE ON scm_purchase_order_lines
 FOR EACH ROW EXECUTE FUNCTION protect_scm_purchase_order_line();

INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('scm_purchase_quotations','Supply chain procurement','financial'),
 ('scm_purchase_quotation_lines','Supply chain procurement','financial'),
 ('scm_purchase_orders','Supply chain procurement','financial'),
 ('scm_purchase_order_lines','Supply chain procurement','financial');
COMMIT;
