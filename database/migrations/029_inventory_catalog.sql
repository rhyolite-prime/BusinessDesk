-- Apply after 028. Inventory catalog: item categories, units of measure, items,
-- per-item unit conversions and the item/supplier procurement catalog.
-- Catalog tables are tenant-owned; currencies stay in the shared host catalog.
-- Quantities and amounts use the repository policy (20,6); rates use (20,10).
BEGIN;

-- ---------------------------------------------------------------------------
-- Item categories: optional hierarchy, live codes/names unique per tenant.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_item_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 code varchar(40) NOT NULL CHECK(btrim(code)<>''),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 parent_id uuid,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,parent_id) REFERENCES inv_item_categories(tenant_id,id),
 CHECK(parent_id IS NULL OR parent_id<>id)
);
CREATE UNIQUE INDEX uq_inv_item_categories_live_code ON inv_item_categories(tenant_id,lower(btrim(code))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_inv_item_categories_live_name ON inv_item_categories(tenant_id,lower(btrim(name))) WHERE is_deleted=false;
CREATE INDEX ix_inv_item_categories_live_parent ON inv_item_categories(tenant_id,parent_id) WHERE is_deleted=false;

-- A category must never become its own ancestor; the walk is depth-bounded so a
-- corrupt hierarchy cannot hang a request.
CREATE FUNCTION check_inv_item_category_cycle() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE cursor uuid := NEW.parent_id; depth integer := 0;
BEGIN
 WHILE cursor IS NOT NULL AND depth < 32 LOOP
  IF cursor = NEW.id THEN RAISE EXCEPTION 'A category cannot be its own ancestor' USING ERRCODE='23514'; END IF;
  SELECT parent_id INTO cursor FROM inv_item_categories WHERE tenant_id=NEW.tenant_id AND id=cursor AND is_deleted=false;
  depth := depth + 1;
 END LOOP;
 IF cursor IS NOT NULL THEN RAISE EXCEPTION 'Category hierarchy is deeper than 32 levels' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_inv_item_category_cycle BEFORE INSERT OR UPDATE OF parent_id ON inv_item_categories
 FOR EACH ROW EXECUTE FUNCTION check_inv_item_category_cycle();

-- ---------------------------------------------------------------------------
-- Units of measure: tenant catalog with a declared quantity type and the
-- decimal places used to present and validate item quantities.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_units_of_measure (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 code varchar(20) NOT NULL CHECK(btrim(code)<>''),
 name varchar(80) NOT NULL CHECK(btrim(name)<>''),
 uom_type varchar(20) NOT NULL CHECK(uom_type IN('quantity','weight','volume','length','area','time')),
 decimal_places smallint NOT NULL DEFAULT 2 CHECK(decimal_places BETWEEN 0 AND 6),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX uq_inv_units_live_code ON inv_units_of_measure(tenant_id,lower(btrim(code))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_inv_units_live_name ON inv_units_of_measure(tenant_id,lower(btrim(name))) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Items (stock master). Tracking, valuation and reorder policy live on the item;
-- per-warehouse planning overrides live in inv_item_warehouses (migration 030).
-- Valuation method is immutable once the item has stock history: enforced by
-- protect_inv_item_valuation below and re-checked by the service.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_code varchar(40) NOT NULL CHECK(btrim(item_code)<>''),
 name varchar(200) NOT NULL CHECK(btrim(name)<>''),
 description varchar(1000) NOT NULL DEFAULT '',
 item_category_id uuid,
 item_type varchar(20) NOT NULL DEFAULT 'stock' CHECK(item_type IN('stock','non_stock','service','kit')),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN('active','inactive','discontinued')),
 base_uom_id uuid NOT NULL,
 purchase_uom_id uuid, sales_uom_id uuid,
 tracking_method varchar(20) NOT NULL DEFAULT 'none' CHECK(tracking_method IN('none','batch','serial')),
 valuation_method varchar(20) NOT NULL DEFAULT 'weighted_average' CHECK(valuation_method IN('weighted_average','fifo','standard')),
 currency_id uuid NOT NULL,
 standard_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(standard_cost>=0),
 average_unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(average_unit_cost>=0),
 last_unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(last_unit_cost>=0),
 purchase_unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK(purchase_unit_cost>=0),
 sale_unit_price numeric(20,6) NOT NULL DEFAULT 0 CHECK(sale_unit_price>=0),
 is_purchasable boolean NOT NULL DEFAULT true, is_sellable boolean NOT NULL DEFAULT true,
 is_taxable boolean NOT NULL DEFAULT true,
 barcode varchar(80) NOT NULL DEFAULT '',
 reorder_point numeric(20,6) NOT NULL DEFAULT 0 CHECK(reorder_point>=0),
 min_stock_level numeric(20,6) NOT NULL DEFAULT 0 CHECK(min_stock_level>=0),
 max_stock_level numeric(20,6) NOT NULL DEFAULT 0 CHECK(max_stock_level>=0),
 reorder_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(reorder_quantity>=0),
 safety_stock numeric(20,6) NOT NULL DEFAULT 0 CHECK(safety_stock>=0),
 lead_time_days integer NOT NULL DEFAULT 0 CHECK(lead_time_days BETWEEN 0 AND 3650),
 shelf_life_days integer NOT NULL DEFAULT 0 CHECK(shelf_life_days BETWEEN 0 AND 36500),
 gross_weight numeric(20,6) NOT NULL DEFAULT 0 CHECK(gross_weight>=0),
 net_weight numeric(20,6) NOT NULL DEFAULT 0 CHECK(net_weight>=0),
 volume numeric(20,6) NOT NULL DEFAULT 0 CHECK(volume>=0),
 -- Optional item-level posting accounts. Like suppliers, an item without
 -- configured accounts falls back to the accounting unit's default GL numbers.
 inventory_account_id uuid, cogs_account_id uuid, revenue_account_id uuid,
 purchase_account_id uuid, variance_account_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_category_id) REFERENCES inv_item_categories(tenant_id,id),
 FOREIGN KEY(tenant_id,base_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,sales_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id),
 FOREIGN KEY(tenant_id,inventory_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,cogs_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,revenue_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_account_id) REFERENCES gl_accounts(tenant_id,id),
 FOREIGN KEY(tenant_id,variance_account_id) REFERENCES gl_accounts(tenant_id,id),
 CHECK(max_stock_level=0 OR max_stock_level>=min_stock_level),
 CHECK(reorder_point=0 OR reorder_point>=safety_stock)
);
-- Item codes are permanent identities: they stay reserved after soft deletion so
-- history never re-points at a different item. Barcodes must stay unique live.
CREATE UNIQUE INDEX uq_inv_items_code ON inv_items(tenant_id,lower(btrim(item_code)));
CREATE UNIQUE INDEX uq_inv_items_live_barcode ON inv_items(tenant_id,lower(btrim(barcode))) WHERE is_deleted=false AND btrim(barcode)<>'';
CREATE INDEX ix_inv_items_live_name ON inv_items(tenant_id,lower(name),id) WHERE is_deleted=false;
CREATE INDEX ix_inv_items_live_category ON inv_items(tenant_id,item_category_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_items_live_currency ON inv_items(currency_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_items_live_status ON inv_items(tenant_id,status) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Item unit-of-measure conversions: 1 from_uom = factor to_uom. The base unit is
-- the storage unit; conversions let purchasing and sales use pack sizes.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_item_uom_conversions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL,
 from_uom_id uuid NOT NULL, to_uom_id uuid NOT NULL,
 factor numeric(20,10) NOT NULL CHECK(factor>0),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,from_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(tenant_id,to_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 CHECK(from_uom_id<>to_uom_id)
);
CREATE UNIQUE INDEX uq_inv_item_uom_live_pair ON inv_item_uom_conversions(tenant_id,item_id,from_uom_id) WHERE is_deleted=false;
CREATE INDEX ix_inv_item_uom_live_item ON inv_item_uom_conversions(tenant_id,item_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Item/supplier catalog: agreed prices, lead times and order rules used by
-- requisitions, quotations and purchase orders. Exactly one preferred supplier
-- per item.
-- ---------------------------------------------------------------------------
CREATE TABLE inv_item_suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 item_id uuid NOT NULL, supplier_id uuid NOT NULL,
 supplier_item_code varchar(80) NOT NULL DEFAULT '',
 supplier_item_name varchar(200) NOT NULL DEFAULT '',
 purchase_uom_id uuid,
 unit_price numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_price>=0),
 currency_id uuid NOT NULL,
 lead_time_days integer NOT NULL DEFAULT 0 CHECK(lead_time_days BETWEEN 0 AND 3650),
 min_order_quantity numeric(20,6) NOT NULL DEFAULT 0 CHECK(min_order_quantity>=0),
 order_multiple numeric(20,6) NOT NULL DEFAULT 0 CHECK(order_multiple>=0),
 is_preferred boolean NOT NULL DEFAULT false,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,item_id) REFERENCES inv_items(tenant_id,id),
 FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id),
 FOREIGN KEY(tenant_id,purchase_uom_id) REFERENCES inv_units_of_measure(tenant_id,id),
 FOREIGN KEY(currency_id) REFERENCES core_currencies(id)
);
CREATE UNIQUE INDEX uq_inv_item_suppliers_live_pair ON inv_item_suppliers(tenant_id,item_id,supplier_id) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_inv_item_suppliers_preferred ON inv_item_suppliers(tenant_id,item_id)
 WHERE is_deleted=false AND is_active AND is_preferred;
CREATE INDEX ix_inv_item_suppliers_live_supplier ON inv_item_suppliers(tenant_id,supplier_id) WHERE is_deleted=false;

-- ---------------------------------------------------------------------------
-- Referential protection: catalog configuration used by live items must not be
-- removed or deactivated through ordinary edits. Deletion stays a soft delete;
-- these guards mirror the supplier/catalog protections in migration 016.
-- ---------------------------------------------------------------------------
CREATE FUNCTION protect_inv_item_category() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active) AND EXISTS(
   SELECT 1 FROM inv_item_categories c WHERE c.tenant_id=OLD.tenant_id AND c.parent_id=OLD.id AND c.is_deleted=false
   UNION ALL SELECT 1 FROM inv_items i WHERE i.tenant_id=OLD.tenant_id AND i.item_category_id=OLD.id AND i.is_deleted=false) THEN
  RAISE EXCEPTION 'Item category is referenced by live categories or items' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_item_category BEFORE UPDATE ON inv_item_categories
 FOR EACH ROW EXECUTE FUNCTION protect_inv_item_category();

CREATE FUNCTION protect_inv_unit_of_measure() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active) AND EXISTS(
   SELECT 1 FROM inv_items i WHERE i.tenant_id=OLD.tenant_id AND i.is_deleted=false
    AND OLD.id IN(i.base_uom_id,i.purchase_uom_id,i.sales_uom_id)
   UNION ALL SELECT 1 FROM inv_item_uom_conversions c WHERE c.tenant_id=OLD.tenant_id AND c.is_deleted=false
    AND OLD.id IN(c.from_uom_id,c.to_uom_id)
   UNION ALL SELECT 1 FROM inv_item_suppliers s WHERE s.tenant_id=OLD.tenant_id AND s.is_deleted=false
    AND s.purchase_uom_id=OLD.id) THEN
  RAISE EXCEPTION 'Unit of measure is referenced by live inventory configuration' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_unit_of_measure BEFORE UPDATE ON inv_units_of_measure
 FOR EACH ROW EXECUTE FUNCTION protect_inv_unit_of_measure();

CREATE FUNCTION protect_inv_item_gl_configuration() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NEW.status<>'active' OR NEW.standard_account_type<>OLD.standard_account_type OR
     NEW.accounting_unit_id<>OLD.accounting_unit_id OR NEW.account_number<>OLD.account_number OR
     NEW.tenant_id<>OLD.tenant_id) AND EXISTS(
   SELECT 1 FROM inv_items i WHERE i.tenant_id=OLD.tenant_id AND i.is_deleted=false AND
    OLD.id IN(i.inventory_account_id,i.cogs_account_id,i.revenue_account_id,i.purchase_account_id,i.variance_account_id)) THEN
  RAISE EXCEPTION 'GL account is referenced by a live inventory item' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_item_gl_configuration BEFORE UPDATE ON gl_accounts
 FOR EACH ROW EXECUTE FUNCTION protect_inv_item_gl_configuration();

CREATE FUNCTION protect_inv_item_currency() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NOT NEW.is_active) AND EXISTS(
   SELECT 1 FROM inv_items i WHERE i.currency_id=OLD.id AND i.is_deleted=false
   UNION ALL SELECT 1 FROM inv_item_suppliers s WHERE s.currency_id=OLD.id AND s.is_deleted=false) THEN
  RAISE EXCEPTION 'Currency is referenced by live inventory configuration' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_item_currency BEFORE UPDATE ON core_currencies
 FOR EACH ROW EXECUTE FUNCTION protect_inv_item_currency();

CREATE FUNCTION protect_inv_item_supplier_master() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF (NEW.is_deleted OR NEW.status<>'active') AND EXISTS(
   SELECT 1 FROM inv_item_suppliers s WHERE s.tenant_id=OLD.tenant_id AND s.supplier_id=OLD.id AND s.is_deleted=false AND s.is_active) THEN
  RAISE EXCEPTION 'Supplier is referenced by a live item supplier catalog entry' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_inv_item_supplier_master BEFORE UPDATE ON core_suppliers
 FOR EACH ROW EXECUTE FUNCTION protect_inv_item_supplier_master();

-- Reviewed tables must be registered so tenant initialization (migration 015)
-- can enumerate and reset them deliberately.
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES
 ('inv_item_categories','Inventory'),('inv_units_of_measure','Inventory'),
 ('inv_items','Inventory'),('inv_item_uom_conversions','Inventory'),
 ('inv_item_suppliers','Inventory');
COMMIT;
