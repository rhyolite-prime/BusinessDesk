-- Apply after 029. Inventory locations and tracking masters: warehouses, bin
-- locations, per-item/per-warehouse planning defaults, batches (lots) and serial
-- numbers. Warehouses own the accounting unit used for valuation and posting.
BEGIN;

-- Composite, tenant-scoped references into the accounting-unit catalog.
CREATE UNIQUE INDEX uq_inv_accounting_unit_scope ON core_accounting_units(tenant_id,id);

-- ---------------------------------------------------------------------------
-- Warehouses (stock locations). A warehouse belongs to one active accounting
-- unit so every movement has an unambiguous valuation and posting scope.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_warehouses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL,
 code varchar(40) NOT NULL CHECK(btrim(code)<>''),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 warehouse_type varchar(20) NOT NULL DEFAULT 'warehouse'
  CHECK(warehouse_type IN('warehouse','store','van','consignment','bonded','virtual')),
 address varchar(1000) NOT NULL DEFAULT '',
 contact_person varchar(160) NOT NULL DEFAULT '',
 phone_no varchar(50) NOT NULL DEFAULT '',
 email varchar(254) NOT NULL DEFAULT '',
 -- Negative stock is an operational policy decision per location; it is off by
 -- default and every override is written to the stock ledger with its reason.
 allows_negative_stock boolean NOT NULL DEFAULT false,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,accounting_unit_id) REFERENCES core_accounting_units(tenant_id,id)
);
CREATE UNIQUE INDEX uq_inv_warehouses_live_code ON inv_warehouses(tenant_id,lower(btrim(code))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_inv_warehouses_live_name ON inv_warehouses(tenant_id,lower(btrim(name))) WHERE is_deleted=false;
CREATE INDEX ix_inv_warehouses_live_unit ON inv_warehouses(tenant_id,accounting_unit_id) WHERE is_deleted=false;

-- Items keep one optional default receipt/issue warehouse.
ALTER TABLE inv_items ADD COLUMN default_warehouse_id uuid;
ALTER TABLE inv_items ADD CONSTRAINT fk_inv_items_default_warehouse
 FOREIGN KEY(tenant_id,default_warehouse_id) REFERENCES inv_warehouses(tenant_id,id);
CREATE INDEX ix_inv_items_live_default_warehouse ON inv_items(tenant_id,default_warehouse_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Bin locations inside a warehouse. Optional granularity: documents may post at
-- warehouse level only.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_bin_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 warehouse_id uuid NOT NULL,
 code varchar(40) NOT NULL CHECK(btrim(code)<>''),
 zone varchar(40) NOT NULL DEFAULT '',
 description varchar(500) NOT NULL DEFAULT '',
 capacity numeric(20,6) NOT NULL DEFAULT 0 CHECK(capacity>=0),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id)
);
CREATE UNIQUE INDEX uq_inv_bin_locations_live_code ON inv_bin_locations(tenant_id,warehouse_id,lower(btrim(code))) WHERE is_deleted=false;
CREATE INDEX ix_inv_bin_locations_live_warehouse ON inv_bin_locations(tenant_id,warehouse_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Per-item, per-warehouse planning. Overrides the item defaults for reorder
-- point, minimum/maximum levels, safety stock and replenishment quantity.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_item_warehouses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL, warehouse_id uuid NOT NULL,
 default_bin_id uuid,
 reorder_point numeric(20,6) NOT NULL DEFAULT 0 CHECK(reorder_point>=0),
 min_stock_level numeric(20,6) NOT NULL DEFAULT 0 CHECK(min_stock_level>=0),
 max_stock_level numeric(20,6) NOT NULL DEFAULT 0 CHECK(max_stock_level>=0),
 reorder_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(reorder_quantity>=0),
 safety_stock numeric(20,6) NOT NULL DEFAULT 0 CHECK(safety_stock>=0),
 lead_time_days integer NOT NULL DEFAULT 0 CHECK(lead_time_days BETWEEN 0 AND 3650),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id),
 FOREIGN KEY(tenant_id,default_bin_id) REFERENCES inv_bin_locations(tenant_id,id),
 CHECK(max_stock_level=0 OR max_stock_level>=min_stock_level)
);
CREATE UNIQUE INDEX uq_inv_item_warehouses_live_pair ON inv_item_warehouses(tenant_id,item_id,warehouse_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_item_warehouses_live_warehouse ON inv_item_warehouses(tenant_id,warehouse_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Batches (lots) for batch-tracked items: quality status, production and expiry
-- dates. Balances and ledger rows reference the batch, never a free-text lot.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL,
 batch_number varchar(80) NOT NULL CHECK(btrim(batch_number)<>''),
 supplier_batch_number varchar(80) NOT NULL DEFAULT '',
 production_date date, expiry_date date,
 quality_status varchar(20) NOT NULL DEFAULT 'accepted'
  CHECK(quality_status IN('pending','accepted','rejected','quarantine')),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 CHECK(expiry_date IS NULL OR production_date IS NULL OR production_date<=expiry_date)
);
CREATE UNIQUE INDEX uq_inv_batches_live_number ON inv_batches(tenant_id,item_id,lower(btrim(batch_number))) WHERE is_deleted=false;
CREATE INDEX ix_inv_batches_live_expiry ON inv_batches(tenant_id,expiry_date) WHERE is_deleted=false AND is_active;
CREATE INDEX ix_inv_batches_live_item ON inv_batches(tenant_id,item_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Serial numbers for serial-tracked items. One row per physical unit; the status
-- and current warehouse follow the movement that last touched the serial.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_serial_numbers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL,
 serial_number varchar(120) NOT NULL CHECK(btrim(serial_number)<>''),
 batch_id uuid, warehouse_id uuid,
 status varchar(20) NOT NULL DEFAULT 'in_stock'
  CHECK(status IN('in_stock','reserved','in_transit','issued','returned','defective','retired')),
 received_at timestamptz, issued_at timestamptz,
 warranty_expiry_date date,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,batch_id) REFERENCES inv_batches(tenant_id,id),
 FOREIGN KEY(tenant_id,warehouse_id) REFERENCES inv_warehouses(tenant_id,id)
);
CREATE UNIQUE INDEX uq_inv_serial_numbers_live ON inv_serial_numbers(tenant_id,item_id,lower(btrim(serial_number))) WHERE is_deleted=false;
CREATE INDEX ix_serial_numbers_live_status ON inv_serial_numbers(tenant_id,status) WHERE is_deleted=false;
CREATE INDEX ix_serial_numbers_live_warehouse ON inv_serial_numbers(tenant_id,warehouse_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Protection: a live warehouse cannot be dropped or deactivated while catalog
-- configuration still points at it. Migration 031 replaces this function to add
-- stock balances, documents and ledger references.
-- ---------------------------------------------------------------------------
CREATE FUNCTION protect_inv_warehouse() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
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
CREATE TRIGGER protect_inv_warehouse BEFORE UPDATE ON inv_warehouses
 FOR EACH ROW EXECUTE FUNCTION protect_inv_warehouse();

-- Item identity is stable once catalog configuration references it: the costing
-- and tracking policies cannot be swapped underneath existing records, and an
-- item in use is never hard-deleted or silently soft-deleted.
CREATE FUNCTION protect_inv_item_identity() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
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
 -- Physical stock identities (batches and serials) are never orphaned by an item
 -- deletion; migration 031 extends this guard to balances and posted documents.
 IF NEW.is_deleted AND tracked THEN
  RAISE EXCEPTION 'Item has batches or serial numbers; remove that stock history first' USING ERRCODE='23505';
 END IF;
 IF referenced AND (NEW.valuation_method<>OLD.valuation_method OR NEW.tracking_method<>OLD.tracking_method OR
     NEW.base_uom_id<>OLD.base_uom_id OR NEW.item_code<>OLD.item_code) THEN
  RAISE EXCEPTION 'Costing, tracking, base unit and item code are fixed once inventory records exist' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_item_identity BEFORE UPDATE ON inv_items
 FOR EACH ROW EXECUTE FUNCTION protect_inv_item_identity();

CREATE FUNCTION protect_inv_batch() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NEW.item_id<>OLD.item_id OR NEW.batch_number<>OLD.batch_number) AND EXISTS(
   SELECT 1 FROM inv_serial_numbers s WHERE s.tenant_id=OLD.tenant_id AND s.batch_id=OLD.id AND s.is_deleted=false) THEN
  RAISE EXCEPTION 'Batch is referenced by live serial numbers' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_batch BEFORE UPDATE ON inv_batches
 FOR EACH ROW EXECUTE FUNCTION protect_inv_batch();

INSERT INTO core_tenant_reset_registry(table_name,module) VALUES
 ('inv_warehouses','Inventory'),('inv_bin_locations','Inventory'),
 ('inv_item_warehouses','Inventory'),('inv_batches','Inventory'),
 ('inv_serial_numbers','Inventory');
COMMIT;
