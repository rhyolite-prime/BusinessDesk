-- Apply after 033. Goods receipts (GRN) that land purchase orders into stock,
-- and the logistics stack: carriers, multi-leg shipments with container/voyage
-- detail and append-only tracking events.
--
-- Posting a receipt creates a posted inventory receipt document (031) and a
-- balanced AP/GRNI journal batch in the same transaction; both links are
-- recorded here once and can never move afterwards.
BEGIN;

-- ---------------------------------------------------------------------------
-- Carriers / logistics providers.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_carriers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 code varchar(40) NOT NULL CHECK(btrim(code)<>''),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 contact_person varchar(160) NOT NULL DEFAULT '',
 phone_no varchar(50) NOT NULL DEFAULT '',
 email varchar(254) NOT NULL DEFAULT '',
 tracking_url_template varchar(500) NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX uq_scm_carriers_live_code ON scm_carriers(tenant_id,lower(btrim(code))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_scm_carriers_live_name ON scm_carriers(tenant_id,lower(btrim(name))) WHERE is_deleted=false;

CREATE FUNCTION protect_scm_carrier() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.is_deleted AND EXISTS(
   SELECT 1 FROM scm_shipments s WHERE s.tenant_id=OLD.tenant_id AND s.carrier_id=OLD.id AND s.is_deleted=false
   UNION ALL SELECT 1 FROM scm_purchase_orders o WHERE o.tenant_id=OLD.tenant_id AND o.carrier_id=OLD.id AND o.is_deleted=false) THEN
  RAISE EXCEPTION 'Carrier is referenced by live orders or shipments' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_carrier BEFORE UPDATE ON scm_carriers
 FOR EACH ROW EXECUTE FUNCTION protect_scm_carrier();

-- ---------------------------------------------------------------------------
-- Purchase receipts (goods received notes). One receipt per delivery against
-- one purchase order; posting moves stock and posts the AP/GRNI journal.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_purchase_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 receipt_number varchar(40) NOT NULL CHECK(btrim(receipt_number)<>''),
 purchase_order_id uuid NOT NULL,
 supplier_id uuid NOT NULL,
 warehouse_id uuid NOT NULL,
 receipt_date date NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK(status IN('draft','posted','reversed','cancelled')),
 delivery_note_number varchar(80) NOT NULL DEFAULT '',
 received_by_user_id uuid REFERENCES users(id),
 notes varchar(1000) NOT NULL DEFAULT '',
 request_key uuid,
 inv_stock_document_id uuid,
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 is_posted boolean NOT NULL DEFAULT false, posted_at timestamptz, posted_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_order_id) REFERENCES scm_purchase_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,inv_stock_document_id) REFERENCES inv_stock_documents(tenant_id,id),
 CHECK((status IN('posted','reversed'))=is_posted),
 CHECK(status NOT IN('posted','reversed') OR inv_stock_document_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_scm_receipts_number ON scm_purchase_receipts(tenant_id,accounting_unit_id,lower(btrim(receipt_number)));
CREATE UNIQUE INDEX uq_scm_receipts_request ON scm_purchase_receipts(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX uq_scm_receipts_inv_document ON scm_purchase_receipts(tenant_id,inv_stock_document_id)
 WHERE inv_stock_document_id IS NOT NULL;
CREATE UNIQUE INDEX uq_scm_receipts_journal ON scm_purchase_receipts(tenant_id,journal_batch_id) WHERE journal_batch_id IS NOT NULL;
CREATE INDEX ix_scm_receipts_scope ON scm_purchase_receipts(tenant_id,accounting_unit_id,receipt_date DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_scm_receipts_order ON scm_purchase_receipts(tenant_id,purchase_order_id) WHERE is_deleted=false;

-- Header scope: the order and warehouse must agree with each other and with the
-- accounting unit; the supplier fix must match the order. Orders must be in a
-- receivable state when the receipt is created.
CREATE FUNCTION check_scm_receipt_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM scm_purchase_orders o
   WHERE o.tenant_id=NEW.tenant_id AND o.id=NEW.purchase_order_id AND o.is_deleted=false
    AND o.accounting_unit_id=NEW.accounting_unit_id AND o.supplier_id=NEW.supplier_id
    AND o.warehouse_id=NEW.warehouse_id AND o.status IN('sent','partially_received')) THEN
  RAISE EXCEPTION 'Receipts must target an open order for this supplier, warehouse and unit' USING ERRCODE='23503';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM inv_warehouses w WHERE w.tenant_id=NEW.tenant_id AND w.id=NEW.warehouse_id
   AND w.is_deleted=false AND w.is_active) THEN
  RAISE EXCEPTION 'Select a live active warehouse' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_receipt_scope BEFORE INSERT OR UPDATE OF
 accounting_unit_id,purchase_order_id,supplier_id,warehouse_id ON scm_purchase_receipts
 FOR EACH ROW EXECUTE FUNCTION check_scm_receipt_scope();

CREATE FUNCTION check_scm_receipt_transition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF (OLD.status,NEW.status) NOT IN (
   ('draft','posted'),('draft','cancelled'),('posted','reversed')) THEN
  RAISE EXCEPTION 'Invalid receipt status transition: % to %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF NEW.status='posted' AND (NEW.posted_at IS NULL OR NEW.inv_stock_document_id IS NULL) THEN
  RAISE EXCEPTION 'Posting a receipt requires its stock document and posting stamp' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_receipt_transition BEFORE UPDATE OF status ON scm_purchase_receipts
 FOR EACH ROW EXECUTE FUNCTION check_scm_receipt_transition();

-- Posted receipts are immutable and never deleted; corrections reverse them.
CREATE FUNCTION protect_scm_receipt() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Purchase receipts are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF OLD.is_posted THEN
  IF NEW.is_deleted THEN
   RAISE EXCEPTION 'Posted receipts cannot be deleted; reverse them instead' USING ERRCODE='23505';
  END IF;
  IF NEW.receipt_number<>OLD.receipt_number OR NEW.purchase_order_id<>OLD.purchase_order_id OR
     NEW.supplier_id<>OLD.supplier_id OR NEW.warehouse_id<>OLD.warehouse_id OR
     NEW.receipt_date<>OLD.receipt_date OR NEW.accounting_unit_id<>OLD.accounting_unit_id OR
     NEW.inv_stock_document_id<>OLD.inv_stock_document_id OR
     NEW.journal_batch_id IS DISTINCT FROM OLD.journal_batch_id THEN
   RAISE EXCEPTION 'Posted receipts are immutable; reverse the receipt to correct it' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_receipt BEFORE UPDATE OR DELETE ON scm_purchase_receipts
 FOR EACH ROW EXECUTE FUNCTION protect_scm_receipt();

-- Receipt lines reference order lines; the order-line CHECK caps cumulative
-- receipts because posting updates the counters in the same transaction.
CREATE TABLE scm_purchase_receipt_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 receipt_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 order_line_id uuid NOT NULL,
 item_id uuid NOT NULL,
 uom_id uuid NOT NULL,
 quantity_received numeric(20,6) NOT NULL CHECK(quantity_received>0),
 quantity_accepted numeric(20,6) NOT NULL CHECK(quantity_accepted>=0),
 quantity_rejected numeric(20,6) NOT NULL DEFAULT 0 CHECK(quantity_rejected>=0),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_cost>=0),
 batch_id uuid,
 source_bin_id uuid,
 serial_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
 rejection_reason varchar(500) NOT NULL DEFAULT '',
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(receipt_id,line_number),
 UNIQUE(receipt_id,order_line_id),
 FOREIGN KEY(tenant_id,receipt_id) REFERENCES scm_purchase_receipts(tenant_id,id),
 FOREIGN KEY(tenant_id,order_line_id) REFERENCES scm_purchase_order_lines(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id),
 FOREIGN KEY(tenant_id,source_bin_id) REFERENCES inv_bin_locations(tenant_id,id),
 CHECK(quantity_accepted+quantity_rejected=quantity_received),
 CHECK(quantity_rejected=0 OR btrim(rejection_reason)<>''),
 CHECK(jsonb_typeof(serial_numbers)='array')
);
CREATE INDEX ix_scm_receipt_lines_document ON scm_purchase_receipt_lines(tenant_id,receipt_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_receipt_lines_order_line ON scm_purchase_receipt_lines(tenant_id,order_line_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_receipt_lines_item ON scm_purchase_receipt_lines(tenant_id,item_id) WHERE is_deleted=false;

-- Line scope: the order line must belong to the receipt's order and item.
CREATE FUNCTION check_scm_receipt_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE posted boolean;
BEGIN
 SELECT r.is_posted INTO posted FROM scm_purchase_receipts r
  WHERE r.tenant_id=NEW.tenant_id AND r.id=NEW.receipt_id AND r.is_deleted=false FOR SHARE OF r;
 IF posted IS NULL THEN RAISE EXCEPTION 'Unknown purchase receipt for this line' USING ERRCODE='23503'; END IF;
 IF posted THEN RAISE EXCEPTION 'Lines of a posted receipt are immutable' USING ERRCODE='23505'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scm_purchase_order_lines ol
   JOIN scm_purchase_receipts r ON r.tenant_id=NEW.tenant_id AND r.id=NEW.receipt_id
   WHERE ol.tenant_id=NEW.tenant_id AND ol.id=NEW.order_line_id AND ol.is_deleted=false
    AND ol.order_id=r.purchase_order_id AND ol.item_id=NEW.item_id
    AND ol.status IN('open','partially_received')) THEN
  RAISE EXCEPTION 'Receipt line must target an open line of this order for the same item' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_receipt_line BEFORE INSERT OR UPDATE ON scm_purchase_receipt_lines
 FOR EACH ROW EXECUTE FUNCTION check_scm_receipt_line();

CREATE FUNCTION protect_scm_receipt_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE posted boolean;
BEGIN
 SELECT r.is_posted INTO posted FROM scm_purchase_receipts r
  WHERE r.tenant_id=OLD.tenant_id AND r.id=OLD.receipt_id;
 IF posted THEN RAISE EXCEPTION 'Lines of a posted receipt are immutable' USING ERRCODE='23505'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_receipt_line BEFORE UPDATE OR DELETE ON scm_purchase_receipt_lines
 FOR EACH ROW EXECUTE FUNCTION protect_scm_receipt_line();

-- ---------------------------------------------------------------------------
-- Shipments: inbound (supplier deliveries, imports) and outbound (customer or
-- inter-warehouse dispatches) with vessel/voyage, container and customs detail.
-- ---------------------------------------------------------------------------
CREATE TABLE scm_shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 shipment_number varchar(40) NOT NULL CHECK(btrim(shipment_number)<>''),
 direction varchar(10) NOT NULL CHECK(direction IN('inbound','outbound')),
 status varchar(20) NOT NULL DEFAULT 'planned'
  CHECK(status IN('planned','booked','in_transit','at_customs','delayed','delivered','cancelled')),
 carrier_id uuid,
 purchase_order_id uuid,
 stock_document_id uuid,
 origin_warehouse_id uuid, destination_warehouse_id uuid,
 origin_address varchar(500) NOT NULL DEFAULT '', destination_address varchar(500) NOT NULL DEFAULT '',
 vessel_name varchar(160) NOT NULL DEFAULT '', voyage_number varchar(60) NOT NULL DEFAULT '',
 bill_of_lading varchar(80) NOT NULL DEFAULT '', booking_reference varchar(80) NOT NULL DEFAULT '',
 transport_mode varchar(20) NOT NULL DEFAULT 'road' CHECK(transport_mode IN('road','sea','air','rail','courier','multimodal')),
 customs_status varchar(20) NOT NULL DEFAULT 'not_required'
  CHECK(customs_status IN('not_required','pending','at_customs','cleared','held')),
 expected_departure date, actual_departure date, expected_arrival date, actual_arrival date,
 total_gross_weight numeric(20,6) NOT NULL DEFAULT 0 CHECK(total_gross_weight>=0),
 total_volume numeric(20,6) NOT NULL DEFAULT 0 CHECK(total_volume>=0),
 notes varchar(1000) NOT NULL DEFAULT '',
 request_key uuid,
 delivered_at timestamptz, delivered_by_user_id uuid REFERENCES users(id),
 cancelled_at timestamptz, cancelled_by_user_id uuid REFERENCES users(id), cancel_reason varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id),
 FOREIGN KEY(tenant_id,carrier_id) REFERENCES scm_carriers(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_order_id) REFERENCES scm_purchase_orders(tenant_id,id),
 FOREIGN KEY(tenant_id,stock_document_id) REFERENCES inv_stock_documents(tenant_id,id),
 FOREIGN KEY(tenant_id,origin_warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,destination_warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 CHECK(origin_warehouse_id<>destination_warehouse_id),
 CHECK(expected_arrival IS NULL OR expected_departure IS NULL OR expected_arrival>=expected_departure),
 CHECK(actual_arrival IS NULL OR actual_departure IS NULL OR actual_arrival>=actual_departure),
 CHECK(status='delivered' OR actual_arrival IS NULL)
);
CREATE UNIQUE INDEX uq_scm_shipments_number ON scm_shipments(tenant_id,accounting_unit_id,lower(btrim(shipment_number)));
CREATE UNIQUE INDEX uq_scm_shipments_request ON scm_shipments(tenant_id,request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_scm_shipments_scope ON scm_shipments(tenant_id,accounting_unit_id,expected_arrival DESC,id) WHERE is_deleted=false;
CREATE INDEX ix_scm_shipments_status ON scm_shipments(tenant_id,status) WHERE is_deleted=false;
CREATE INDEX ix_scm_shipments_order ON scm_shipments(tenant_id,purchase_order_id) WHERE is_deleted=false AND purchase_order_id IS NOT NULL;

CREATE FUNCTION check_scm_shipment_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE warehouses integer;
BEGIN
 SELECT count(*) INTO warehouses FROM (
  SELECT w.id FROM inv_warehouses w
   WHERE w.tenant_id=NEW.tenant_id AND w.is_deleted=false AND w.is_active
    AND w.accounting_unit_id=NEW.accounting_unit_id
    AND w.id IN(NEW.origin_warehouse_id,NEW.destination_warehouse_id) FOR SHARE OF w) locked;
 IF warehouses <> (
   (CASE WHEN NEW.origin_warehouse_id IS NULL THEN 0 ELSE 1 END)+
   (CASE WHEN NEW.destination_warehouse_id IS NULL THEN 0 ELSE 1 END)) THEN
  RAISE EXCEPTION 'Shipment warehouses must be live and in this accounting unit' USING ERRCODE='23503';
 END IF;
 IF NEW.purchase_order_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM scm_purchase_orders o WHERE o.tenant_id=NEW.tenant_id AND o.id=NEW.purchase_order_id
    AND o.is_deleted=false AND o.accounting_unit_id=NEW.accounting_unit_id) THEN
  RAISE EXCEPTION 'The purchase order must belong to this accounting unit' USING ERRCODE='23503';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_shipment_scope BEFORE INSERT OR UPDATE OF
 accounting_unit_id,origin_warehouse_id,destination_warehouse_id,purchase_order_id ON scm_shipments
 FOR EACH ROW EXECUTE FUNCTION check_scm_shipment_scope();

CREATE FUNCTION check_scm_shipment_transition() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF (OLD.status,NEW.status) NOT IN (
   ('planned','booked'),('planned','cancelled'),
   ('booked','in_transit'),('booked','delayed'),('booked','cancelled'),
   ('in_transit','at_customs'),('in_transit','delayed'),('in_transit','delivered'),
   ('at_customs','delayed'),('at_customs','delivered'),
   ('delayed','in_transit'),('delayed','at_customs'),('delayed','cancelled')) THEN
  RAISE EXCEPTION 'Invalid shipment status transition: % to %',OLD.status,NEW.status USING ERRCODE='23514';
 END IF;
 IF NEW.status='delivered' AND NEW.delivered_at IS NULL THEN
  RAISE EXCEPTION 'Record the delivery before marking a shipment delivered' USING ERRCODE='23514';
 END IF;
 IF NEW.status='cancelled' AND btrim(NEW.cancel_reason)='' THEN
  RAISE EXCEPTION 'Cancellations require a reason' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_scm_shipment_transition BEFORE UPDATE OF status ON scm_shipments
 FOR EACH ROW EXECUTE FUNCTION check_scm_shipment_transition();

-- Delivered shipments are closed history; planned and booked ones can still be
-- re-planned. Nothing is hard-deleted once it leaves planning.
CREATE FUNCTION protect_scm_shipment() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Shipments are never hard-deleted' USING ERRCODE='23505'; END IF;
 IF NEW.is_deleted AND OLD.status NOT IN('planned','booked','cancelled') THEN
  RAISE EXCEPTION 'Only planned, booked or cancelled shipments can be deleted' USING ERRCODE='23505';
 END IF;
 IF OLD.status='delivered' THEN
  IF NEW.shipment_number<>OLD.shipment_number OR NEW.direction<>OLD.direction OR
     NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.carrier_id IS DISTINCT FROM OLD.carrier_id OR
     NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id OR
     NEW.stock_document_id IS DISTINCT FROM OLD.stock_document_id OR
     NEW.actual_departure IS DISTINCT FROM OLD.actual_departure OR
     NEW.actual_arrival IS DISTINCT FROM OLD.actual_arrival THEN
   RAISE EXCEPTION 'Delivered shipments are closed history' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_shipment BEFORE UPDATE OR DELETE ON scm_shipments
 FOR EACH ROW EXECUTE FUNCTION protect_scm_shipment();

CREATE TABLE scm_shipment_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 shipment_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0),
 item_id uuid NOT NULL,
 description varchar(500) NOT NULL DEFAULT '',
 uom_id uuid NOT NULL,
 quantity numeric(20,6) NOT NULL CHECK(quantity>0),
 package_count integer NOT NULL DEFAULT 0 CHECK(package_count>=0),
 gross_weight numeric(20,6) NOT NULL DEFAULT 0 CHECK(gross_weight>=0),
 volume numeric(20,6) NOT NULL DEFAULT 0 CHECK(volume>=0),
 container_number varchar(40) NOT NULL DEFAULT '',
 seal_number varchar(40) NOT NULL DEFAULT '',
 purchase_order_line_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 UNIQUE(shipment_id,line_number),
 FOREIGN KEY(tenant_id,shipment_id) REFERENCES scm_shipments(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_order_line_id) REFERENCES scm_purchase_order_lines(tenant_id,id)
);
CREATE INDEX ix_scm_shipment_lines_document ON scm_shipment_lines(tenant_id,shipment_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_shipment_lines_item ON scm_shipment_lines(tenant_id,item_id) WHERE is_deleted=false;
CREATE INDEX ix_scm_shipment_lines_container ON scm_shipment_lines(tenant_id,lower(btrim(container_number)))
 WHERE is_deleted=false AND container_number<>'';

CREATE FUNCTION protect_scm_shipment_line() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE doc_status varchar(20);
BEGIN
 SELECT s.status INTO doc_status FROM scm_shipments s
  WHERE s.tenant_id=OLD.tenant_id AND s.id=OLD.shipment_id;
 IF TG_OP='DELETE' THEN
  IF doc_status NOT IN('planned','booked') THEN
   RAISE EXCEPTION 'Lines are locked once a shipment is in transit' USING ERRCODE='23505';
  END IF;
  RETURN OLD;
 END IF;
 IF doc_status NOT IN('planned','booked') THEN
  RAISE EXCEPTION 'Lines are locked once a shipment is in transit' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_scm_shipment_line BEFORE UPDATE OR DELETE ON scm_shipment_lines
 FOR EACH ROW EXECUTE FUNCTION protect_scm_shipment_line();

-- Append-only shipment tracking (checkpoints, customs holds, ETA changes).
CREATE TABLE scm_shipment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 shipment_id uuid NOT NULL,
 event_at timestamptz NOT NULL DEFAULT now(),
 location varchar(200) NOT NULL DEFAULT '',
 status varchar(20) NOT NULL
  CHECK(status IN('planned','booked','in_transit','at_customs','delayed','delivered','cancelled')),
 notes varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(shipment_id,version),
 FOREIGN KEY(tenant_id,shipment_id) REFERENCES scm_shipments(tenant_id,id)
);
CREATE INDEX ix_scm_shipment_events_scope ON scm_shipment_events(tenant_id,shipment_id,event_at DESC) WHERE is_deleted=false;

CREATE FUNCTION protect_scm_shipment_event() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 RAISE EXCEPTION 'Shipment tracking events are immutable' USING ERRCODE='23505';
END $$;
CREATE TRIGGER protect_scm_shipment_event_update BEFORE UPDATE ON scm_shipment_events
 FOR EACH ROW EXECUTE FUNCTION protect_scm_shipment_event();
CREATE TRIGGER protect_scm_shipment_event_delete BEFORE DELETE ON scm_shipment_events
 FOR EACH ROW EXECUTE FUNCTION protect_scm_shipment_event();

-- Purchase orders can now name the carrier that will deliver them.
ALTER TABLE scm_purchase_orders ADD COLUMN carrier_id uuid;
ALTER TABLE scm_purchase_orders ADD CONSTRAINT fk_scm_purchase_orders_carrier
 FOREIGN KEY(tenant_id,carrier_id) REFERENCES scm_carriers(tenant_id,id);
CREATE INDEX ix_scm_purchase_orders_carrier ON scm_purchase_orders(tenant_id,carrier_id)
 WHERE is_deleted=false AND carrier_id IS NOT NULL;

INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('scm_carriers','Supply chain',''),
 ('scm_purchase_receipts','Supply chain procurement','financial'),
 ('scm_purchase_receipt_lines','Supply chain procurement','financial'),
 ('scm_shipments','Supply chain logistics','financial'),
 ('scm_shipment_lines','Supply chain logistics','financial'),
 ('scm_shipment_events','Supply chain logistics','financial');
COMMIT;
