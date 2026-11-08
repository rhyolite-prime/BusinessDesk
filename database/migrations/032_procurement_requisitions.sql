-- Apply after 031. Supply chain foundation: purchase requisitions with
-- maker-checker lifecycle, the supply-chain document numbering registry and the
-- polymorphic procurement event audit shared by requisitions, quotations,
-- purchase orders, receipts and shipments.
--
-- Lifecycle: draft -> submitted -> approved -> partially_ordered -> ordered ->
-- closed; rejection and cancellation are terminal side exits. An approved
-- requisition is locked: purchase orders consume its lines through
-- ordered_quantity, never by editing it.
BEGIN;

-- ---------------------------------------------------------------------------
-- Document numbering for the supply-chain module. One counter per tenant,
-- accounting unit and document type; numbers are allocated under a row lock.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_document_sequences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 document_type varchar(20) NOT NULL
  CHECK(document_type IN('requisition','quotation','purchase_order','receipt','shipment')),
 prefix varchar(20) NOT NULL DEFAULT '', padding smallint NOT NULL DEFAULT 5 CHECK(padding BETWEEN 0 AND 12),
 next_number bigint NOT NULL DEFAULT 1 CHECK(next_number>0 AND next_number<9223372036854775807),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 UNIQUE(tenant_id,accounting_unit_id,document_type)
);

-- ---------------------------------------------------------------------------
-- Polymorphic lifecycle audit for every procurement entity. Append-only; one
-- row per entity version so the trail cannot fork.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_procurement_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 entity_type varchar(20) NOT NULL
  CHECK(entity_type IN('requisition','quotation','purchase_order','receipt','shipment')),
 entity_id uuid NOT NULL,
 action varchar(20) NOT NULL
  CHECK(action IN('created','updated','submitted','approved','rejected','sent','received','posted','closed','cancelled','reversed')),
 previous_status varchar(30), new_status varchar(30) NOT NULL,
 reason varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,entity_type,entity_id,version)
);
CREATE INDEX ix_scm_procurement_events_scope ON scm_procurement_events(tenant_id,entity_type,entity_id,version) WHERE is_deleted=false;

CREATE FUNCTION protect_scm_procurement_event() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 RAISE EXCEPTION 'Procurement events are immutable audit records' USING ERRCODE='23505';
END $$;
CREATE TRIGGER protect_scm_procurement_event_update BEFORE UPDATE ON scm_procurement_events
 FOR EACH ROW EXECUTE FUNCTION protect_scm_procurement_event();
CREATE TRIGGER protect_scm_procurement_event_delete BEFORE DELETE ON scm_procurement_events
 FOR EACH ROW EXECUTE FUNCTION protect_scm_procurement_event();

-- ---------------------------------------------------------------------------
-- Purchase requisitions: internal demand captured before any supplier is
-- engaged. approved lines feed purchase orders; the approval attaches the
-- requisition to an accounting unit for downstream posting scoping.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_purchase_requisitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 requisition_number varchar(40) NOT NULL CHECK(btrim(requisition_number)<>''),
 request_date date NOT NULL,
 required_by_date date,
 priority varchar(10) NOT NULL DEFAULT 'normal' CHECK(priority IN('low','normal','high','urgent')),
 status varchar(20) NOT NULL DEFAULT 'draft'
  CHECK(status IN('draft','submitted','approved','rejected','partially_ordered','ordered','closed','cancelled')),
 cost_center_id uuid,
 warehouse_id uuid,
 requested_by_user_id uuid NOT NULL REFERENCES users(id),
 purpose varchar(1000) NOT NULL DEFAULT '',
 estimated_total numeric(20,6) NOT NULL DEFAULT 0 CHECK(estimated_total>=0),
 request_key uuid,
 submitted_at timestamptz, submitted_by_user_id uuid REFERENCES users(id),
 approved_at timestamptz, approved_by_user_id uuid REFERENCES users(id),
 rejected_at timestamptz, rejected_by_user_id uuid REFERENCES users(id), rejection_reason varchar(500) NOT NULL DEFAULT '',
 closed_at timestamptz, closed_by_user_id uuid REFERENCES users(id),
 cancelled_at timestamptz, cancelled_by_user_id uuid REFERENCES users(id), cancel_reason varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,cost_center_id) REFERENCES core_cost_centers(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 CHECK(required_by_date IS NULL OR required_by_date>=request_date)
);
CREATE UNIQUE INDEX uq_scm_requisitions_number ON scm_purchase_requisitions(tenant_id,accounting_unit_id,lower(btrim(requisition_number)));
CREATE UNIQUE INDEX uq_scm_requisitions_request ON scm_purchase_requisitions(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_scm_requisitions_scope ON scm_purchase_requisitions(tenant_id,accounting_unit_id,request_date DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_scm_requisitions_status ON scm_purchase_requisitions(tenant_id,status) WHERE is_deleted=false;

CREATE FUNCTION check_scm_requisition_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.warehouse_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM inv_warehouses w WHERE w.tenant_id=NEW.tenant_id AND w.id=NEW.warehouse_id AND w.is_deleted=false
    AND w.is_active AND w.accounting_unit_id=NEW.accounting_unit_id) THEN
  RAISE EXCEPTION 'Select a live warehouse in this accounting unit' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_requisition_scope BEFORE INSERT OR UPDATE OF accounting_unit_id,warehouse_id ON scm_purchase_requisitions
 FOR EACH ROW EXECUTE FUNCTION check_scm_requisition_scope();

-- Status transitions follow the lifecycle exactly; anything else is rejected so
-- the audit trail stays meaningful. Terminal states never reopen.
CREATE FUNCTION check_scm_requisition_transition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF (OLD.status,NEW.status) NOT IN (
   ('draft','submitted'),('draft','cancelled'),
   ('submitted','approved'),('submitted','rejected'),('submitted','cancelled'),
   ('approved','partially_ordered'),('approved','ordered'),('approved','cancelled'),('approved','closed'),
   ('partially_ordered','ordered'),('partially_ordered','cancelled'),('partially_ordered','closed'),
   ('ordered','closed')) THEN
  RAISE EXCEPTION 'Invalid requisition status transition: % to %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF NEW.status='submitted' AND NEW.submitted_at IS NULL THEN
  RAISE EXCEPTION 'Record the submission before marking a requisition submitted' USING ERRCODE='23514';
 END IF;
 IF NEW.status='approved' AND NEW.approved_at IS NULL THEN
  RAISE EXCEPTION 'Record the approval before marking a requisition approved' USING ERRCODE='23514';
 END IF;
 IF NEW.status='rejected' AND btrim(NEW.rejection_reason)='' THEN
  RAISE EXCEPTION 'Rejections require a reason' USING ERRCODE='23514';
 END IF;
 IF NEW.status='cancelled' AND btrim(NEW.cancel_reason)='' THEN
  RAISE EXCEPTION 'Cancellations require a reason' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_requisition_transition BEFORE UPDATE OF status ON scm_purchase_requisitions
 FOR EACH ROW EXECUTE FUNCTION check_scm_requisition_transition();

-- Approved and later requisitions are locked; corrections happen on new
-- documents. Drafts are freely editable; nothing is hard-deleted.
CREATE FUNCTION protect_scm_requisition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Purchase requisitions are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF OLD.status NOT IN('draft') THEN
  IF NEW.is_deleted THEN
   RAISE EXCEPTION 'Only draft requisitions can be deleted' USING ERRCODE='23505';
  END IF;
  IF NEW.requisition_number<>OLD.requisition_number OR NEW.accounting_unit_id<>OLD.accounting_unit_id OR
     NEW.request_date<>OLD.request_date OR NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id OR
     NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id OR NEW.requested_by_user_id<>OLD.requested_by_user_id OR
     NEW.priority<>OLD.priority OR NEW.purpose<>OLD.purpose OR NEW.estimated_total<>OLD.estimated_total THEN
   RAISE EXCEPTION 'Submitted requisitions are locked; cancel and raise a new one to change scope' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_requisition BEFORE UPDATE OR DELETE ON scm_purchase_requisitions
 FOR EACH ROW EXECUTE FUNCTION protect_scm_requisition();

CREATE TABLE scm_purchase_requisition_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 requisition_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 item_id uuid NOT NULL,
 description varchar(500) NOT NULL DEFAULT '',
 uom_id uuid NOT NULL,
 quantity numeric(20,6) NOT NULL CHECK(quantity>0),
 ordered_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(ordered_quantity>=0),
 estimated_unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(estimated_unit_cost>=0),
 estimated_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK(estimated_amount>=0),
 suggested_supplier_id uuid,
 needed_by_date date,
 status varchar(20) NOT NULL DEFAULT 'open' CHECK(status IN('open','partially_ordered','ordered','cancelled')),
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(requisition_id,line_number),
 FOREIGN KEY(tenant_id,requisition_id) REFERENCES scm_purchase_requisitions(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,suggested_supplier_id) REFERENCES core_suppliers(tenant_id,id),
 CHECK(ordered_quantity<=quantity),
 CHECK(status='open' OR ordered_quantity>0 OR status='cancelled')
);
CREATE INDEX ix_scm_requisition_lines_document ON scm_purchase_requisition_lines(tenant_id,requisition_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_requisition_lines_item ON scm_purchase_requisition_lines(tenant_id,item_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_requisition_lines_open ON scm_purchase_requisition_lines(tenant_id,item_id)
 WHERE is_deleted=false AND status IN('open','partially_ordered');

-- Lines are editable only while the parent requisition is a draft and purchasable
-- items stay consistent with the catalog.
CREATE FUNCTION check_scm_requisition_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT r.status INTO doc_status FROM scm_purchase_requisitions r
  WHERE r.tenant_id=NEW.tenant_id AND r.id=NEW.requisition_id AND r.is_deleted=false FOR SHARE OF r;
 IF doc_status IS NULL THEN RAISE EXCEPTION 'Unknown purchase requisition for this line' USING ERRCODE='23503'; END IF;
 IF TG_OP='INSERT' AND doc_status<>'draft' THEN
  RAISE EXCEPTION 'Lines can only be added to a draft requisition' USING ERRCODE='23505';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM inv_items i WHERE i.tenant_id=NEW.tenant_id AND i.id=NEW.item_id AND i.is_deleted=false
   AND i.is_purchasable AND i.status='active') THEN
  RAISE EXCEPTION 'Select a live purchasable catalog item' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_requisition_line BEFORE INSERT OR UPDATE OF requisition_id,item_id ON scm_purchase_requisition_lines
 FOR EACH ROW EXECUTE FUNCTION check_scm_requisition_line();

CREATE FUNCTION protect_scm_requisition_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT r.status INTO doc_status FROM scm_purchase_requisitions r
  WHERE r.tenant_id=OLD.tenant_id AND r.id=OLD.requisition_id;
 IF TG_OP='DELETE' THEN
  IF doc_status<>'draft' THEN
   RAISE EXCEPTION 'Lines of a submitted requisition are locked' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF doc_status<>'draft' AND (NEW.is_deleted OR NEW.item_id<>OLD.item_id OR
    NEW.uom_id<>OLD.uom_id OR NEW.quantity<>OLD.quantity OR NEW.estimated_unit_cost<>OLD.estimated_unit_cost OR
    NEW.estimated_amount<>OLD.estimated_amount OR NEW.suggested_supplier_id IS DISTINCT FROM OLD.suggested_supplier_id OR
    NEW.needed_by_date IS DISTINCT FROM OLD.needed_by_date) THEN
  RAISE EXCEPTION 'Lines of a submitted requisition are locked' USING ERRCODE='23505';
 END IF;
 IF NEW.ordered_quantity<OLD.ordered_quantity THEN
  RAISE EXCEPTION 'Ordered quantity is set by purchase orders and never decreases here' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_requisition_line BEFORE UPDATE OR DELETE ON scm_purchase_requisition_lines
 FOR EACH ROW EXECUTE FUNCTION protect_scm_requisition_line();

INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('scm_document_sequences','Supply chain',''),
 ('scm_procurement_events','Supply chain procurement','financial'),
 ('scm_purchase_requisitions','Supply chain procurement','financial'),
 ('scm_purchase_requisition_lines','Supply chain procurement','financial');
COMMIT;
