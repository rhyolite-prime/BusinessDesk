-- Apply after 040. Fleet & Workshop Management schema modeled on Mcguan CMMS
-- and the workshop diary ledger, integrating directly with Inventory (inv_*),
-- Supply Chain (scm_*), General Ledger (gl_*), Human Resources (hr_*), and
-- shared masters (core_*), plus typed cross-module handoffs for Accounts Payable,
-- Accounts Receivable, Point of Sale, Fixed Assets, and Project Management.
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Gapless document numbering for Fleet & Workshop operations.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_document_sequences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 document_type varchar(30) NOT NULL CHECK (document_type IN (
  'asset_no','schedule','job_card','diary_entry','fuel_log','lubricant_log',
  'tyre_event','component_event','handoff')),
 prefix varchar(20) NOT NULL DEFAULT '',
 padding smallint NOT NULL DEFAULT 5 CHECK (padding BETWEEN 0 AND 12),
 next_number bigint NOT NULL DEFAULT 1 CHECK (next_number > 0 AND next_number < 9223372036854775807),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX uq_fwm_document_sequences_scope
 ON fwm_document_sequences(tenant_id, accounting_unit_id, document_type);

-- ---------------------------------------------------------------------------
-- 2. Accounting-unit GL & workshop default settings.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_gl_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 default_warehouse_id uuid REFERENCES inv_warehouses(id),
 repairs_expense_account_id uuid REFERENCES gl_accounts(id),
 fuel_expense_account_id uuid REFERENCES gl_accounts(id),
 lubricants_expense_account_id uuid REFERENCES gl_accounts(id),
 tyres_expense_account_id uuid REFERENCES gl_accounts(id),
 outsourced_repairs_expense_account_id uuid REFERENCES gl_accounts(id),
 electrical_expense_account_id uuid REFERENCES gl_accounts(id),
 internal_labour_recovery_account_id uuid REFERENCES gl_accounts(id),
 workshop_labour_revenue_account_id uuid REFERENCES gl_accounts(id),
 workshop_parts_revenue_account_id uuid REFERENCES gl_accounts(id),
 workshop_wip_account_id uuid REFERENCES gl_accounts(id),
 fleet_clearing_ap_account_id uuid REFERENCES gl_accounts(id),
 fleet_receivable_ar_account_id uuid REFERENCES gl_accounts(id),
 default_labour_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (default_labour_rate >= 0),
 default_tax_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK (default_tax_rate >= 0 AND default_tax_rate <= 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_gl_settings_unit
 ON fwm_gl_settings(tenant_id, accounting_unit_id) WHERE is_deleted = false;

CREATE FUNCTION check_fwm_gl_settings_scope() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE acct_id uuid;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM core_accounting_units au
  WHERE au.tenant_id = NEW.tenant_id AND au.id = NEW.accounting_unit_id AND au.is_deleted = false
 ) THEN
  RAISE EXCEPTION 'Selected accounting unit does not belong to this tenant' USING ERRCODE = '23503';
 END IF;
 IF NEW.default_warehouse_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM inv_warehouses w
  WHERE w.tenant_id = NEW.tenant_id AND w.id = NEW.default_warehouse_id
    AND w.accounting_unit_id = NEW.accounting_unit_id AND w.is_deleted = false AND w.is_active = true
 ) THEN
  RAISE EXCEPTION 'Select a live active warehouse in this accounting unit' USING ERRCODE = '23503';
 END IF;
 FOREACH acct_id IN ARRAY ARRAY[
  NEW.repairs_expense_account_id, NEW.fuel_expense_account_id,
  NEW.lubricants_expense_account_id, NEW.tyres_expense_account_id,
  NEW.outsourced_repairs_expense_account_id, NEW.electrical_expense_account_id,
  NEW.internal_labour_recovery_account_id, NEW.workshop_labour_revenue_account_id,
  NEW.workshop_parts_revenue_account_id, NEW.workshop_wip_account_id,
  NEW.fleet_clearing_ap_account_id, NEW.fleet_receivable_ar_account_id
 ] LOOP
  IF acct_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM gl_accounts a
   WHERE a.tenant_id = NEW.tenant_id AND a.accounting_unit_id = NEW.accounting_unit_id
     AND a.id = acct_id AND a.is_deleted = false AND a.status = 'active'
  ) THEN
   RAISE EXCEPTION 'Selected GL accounts must be active in this accounting unit' USING ERRCODE = '23503';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER check_fwm_gl_settings_scope BEFORE INSERT OR UPDATE ON fwm_gl_settings
 FOR EACH ROW EXECUTE FUNCTION check_fwm_gl_settings_scope();

-- ---------------------------------------------------------------------------
-- 3. Asset Groups, Service Material Blueprints, Component Slots & Procedures.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_asset_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 code varchar(40) NOT NULL CHECK (btrim(code) <> ''),
 model varchar(120) NOT NULL CHECK (btrim(model) <> ''),
 model_type varchar(80) NOT NULL DEFAULT '',
 asset_class varchar(40) NOT NULL DEFAULT 'heavy_equipment'
  CHECK (asset_class IN ('heavy_equipment','light_vehicle','trailer','stationary_plant','mining_equipment','other')),
 asset_type varchar(40) NOT NULL DEFAULT 'dump_truck'
  CHECK (asset_type IN ('excavator','dump_truck','dozer','grader','wheel_loader','forklift','pickup','truck_head','trailer','crane','service_van','other')),
 default_trigger_metric varchar(20) NOT NULL DEFAULT 'hours'
  CHECK (default_trigger_metric IN ('hours','kilometers','miles','tonnes','dates')),
 service_frequency numeric(20,6) NOT NULL DEFAULT 250 CHECK (service_frequency >= 0),
 service_downtime_hours numeric(20,6) NOT NULL DEFAULT 4 CHECK (service_downtime_hours >= 0),
 major_service_frequency numeric(20,6) NOT NULL DEFAULT 1000 CHECK (major_service_frequency >= 0),
 major_service_downtime_hours numeric(20,6) NOT NULL DEFAULT 12 CHECK (major_service_downtime_hours >= 0),
 tolerance numeric(20,6) NOT NULL DEFAULT 25 CHECK (tolerance >= 0),
 routine_service_delay numeric(20,6) NOT NULL DEFAULT 0 CHECK (routine_service_delay >= 0),
 weekday_utilization numeric(20,6) NOT NULL DEFAULT 10 CHECK (weekday_utilization >= 0),
 weekday_days smallint NOT NULL DEFAULT 5 CHECK (weekday_days BETWEEN 0 AND 5),
 saturday_utilization numeric(20,6) NOT NULL DEFAULT 8 CHECK (saturday_utilization >= 0),
 sunday_utilization numeric(20,6) NOT NULL DEFAULT 0 CHECK (sunday_utilization >= 0),
 description varchar(500) NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_asset_groups_code
 ON fwm_asset_groups(tenant_id, lower(btrim(code))) WHERE is_deleted = false;
CREATE INDEX ix_fwm_asset_groups_scope
 ON fwm_asset_groups(tenant_id, asset_class, asset_type) WHERE is_deleted = false;

CREATE TABLE fwm_asset_group_materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 asset_group_id uuid NOT NULL REFERENCES fwm_asset_groups(id),
 service_tier varchar(20) NOT NULL CHECK (service_tier IN ('minor_service','major_service','routine','lubrication')),
 item_id uuid NOT NULL REFERENCES inv_items(id),
 uom_id uuid NOT NULL REFERENCES inv_units_of_measure(id),
 quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
 is_lubricant boolean NOT NULL DEFAULT false,
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_asset_group_materials_slot
 ON fwm_asset_group_materials(tenant_id, asset_group_id, service_tier, item_id) WHERE is_deleted = false;

CREATE TABLE fwm_asset_group_components (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 asset_group_id uuid NOT NULL REFERENCES fwm_asset_groups(id),
 component_type varchar(60) NOT NULL CHECK (btrim(component_type) <> ''),
 slot_label varchar(80) NOT NULL DEFAULT '',
 expected_life_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (expected_life_hours >= 0),
 is_required boolean NOT NULL DEFAULT true,
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_asset_group_components_slot
 ON fwm_asset_group_components(tenant_id, asset_group_id, lower(btrim(component_type)), lower(btrim(slot_label)))
 WHERE is_deleted = false;

CREATE TABLE fwm_procedures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 pcode varchar(40) NOT NULL CHECK (btrim(pcode) <> ''),
 description varchar(300) NOT NULL CHECK (btrim(description) <> ''),
 procedure_text text NOT NULL DEFAULT '',
 checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(checklist_items) = 'array'),
 service_category varchar(20) NOT NULL DEFAULT 'service'
  CHECK (service_category IN ('service','major_service','repairs','warranty','inspection')),
 estimated_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (estimated_hours >= 0),
 asset_group_id uuid REFERENCES fwm_asset_groups(id),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_procedures_pcode
 ON fwm_procedures(tenant_id, lower(btrim(pcode))) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 4. Fleet Asset Register (Vehicles, Equipment & Coupled Trailers) + PM Triggers.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 asset_no varchar(40) NOT NULL CHECK (btrim(asset_no) <> ''),
 registration_no varchar(40) NOT NULL DEFAULT '',
 asset_group_id uuid REFERENCES fwm_asset_groups(id),
 ownership_type varchar(20) NOT NULL DEFAULT 'company_owned'
  CHECK (ownership_type IN ('company_owned','hired_equipment','customer_vehicle')),
 is_mining_equipment boolean NOT NULL DEFAULT false,
 is_heavy_machinery boolean NOT NULL DEFAULT false,
 is_trailer_unit boolean NOT NULL DEFAULT false,
 coupled_trailer_id uuid REFERENCES fwm_vehicles(id),
 department_name varchar(120) NOT NULL DEFAULT '',
 maintenance_department_name varchar(120) NOT NULL DEFAULT '',
 cost_center_id uuid REFERENCES core_cost_centers(id),
 log_date date,
 condition varchar(20) NOT NULL DEFAULT 'good'
  CHECK (condition IN ('excellent','good','fair','poor','breakdown')),
 status varchar(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','inactive','in_workshop','decommissioned','disposed')),
 make_model varchar(120) NOT NULL DEFAULT '',
 model_no varchar(80) NOT NULL DEFAULT '',
 serial_no varchar(120) NOT NULL DEFAULT '',
 chassis_no varchar(120) NOT NULL DEFAULT '',
 engine_no varchar(120) NOT NULL DEFAULT '',
 manufacture_date date,
 purchase_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (purchase_amount >= 0),
 purchase_date date,
 currency_id uuid REFERENCES core_currencies(id),
 date_installed date,
 vendor_supplier_id uuid REFERENCES core_suppliers(id),
 vendor_name varchar(160) NOT NULL DEFAULT '',
 customer_id uuid REFERENCES core_customers(id),
 assigned_employee_id uuid REFERENCES hr_employee_biodata(id),
 fixed_asset_id uuid,
 residual_value numeric(20,6) NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
 useful_life_months integer NOT NULL DEFAULT 0 CHECK (useful_life_months BETWEEN 0 AND 1200),
 depreciation_method varchar(30) NOT NULL DEFAULT 'straight_line'
  CHECK (depreciation_method IN ('none','straight_line','declining_balance','units_of_production')),
 accumulated_depreciation numeric(20,6) NOT NULL DEFAULT 0 CHECK (accumulated_depreciation >= 0),
 weekday_utilization numeric(20,6) NOT NULL DEFAULT 10 CHECK (weekday_utilization >= 0),
 weekday_days smallint NOT NULL DEFAULT 5 CHECK (weekday_days BETWEEN 0 AND 5),
 saturday_utilization numeric(20,6) NOT NULL DEFAULT 8 CHECK (saturday_utilization >= 0),
 sunday_utilization numeric(20,6) NOT NULL DEFAULT 0 CHECK (sunday_utilization >= 0),
 track_fuel_consumption boolean NOT NULL DEFAULT true,
 ideal_consumption_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (ideal_consumption_rate >= 0),
 consumption_unit varchar(20) NOT NULL DEFAULT 'litres_per_hour'
  CHECK (consumption_unit IN ('litres_per_hour','litres_per_100km','km_per_litre')),
 tolerance_below_pct numeric(9,6) NOT NULL DEFAULT 10 CHECK (tolerance_below_pct >= 0 AND tolerance_below_pct <= 100),
 tolerance_above_pct numeric(9,6) NOT NULL DEFAULT 10 CHECK (tolerance_above_pct >= 0 AND tolerance_above_pct <= 500),
 use_fuel_log_for_pm boolean NOT NULL DEFAULT false,
 primary_meter_unit varchar(20) NOT NULL DEFAULT 'hours'
  CHECK (primary_meter_unit IN ('hours','kilometers','miles','tonnes')),
 current_meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (current_meter_reading >= 0),
 cumulative_meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (cumulative_meter_reading >= 0),
 is_meter_stalled boolean NOT NULL DEFAULT false,
 stalled_since_date date,
 last_meter_log_date date,
 notes varchar(1000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK (coupled_trailer_id IS NULL OR coupled_trailer_id <> id),
 CHECK (NOT (is_trailer_unit AND coupled_trailer_id IS NOT NULL)),
 CHECK (cumulative_meter_reading >= current_meter_reading OR current_meter_reading >= 0)
);
CREATE UNIQUE INDEX uq_fwm_vehicles_asset_no
 ON fwm_vehicles(tenant_id, lower(btrim(asset_no))) WHERE is_deleted = false;
CREATE UNIQUE INDEX uq_fwm_vehicles_registration_no
 ON fwm_vehicles(tenant_id, lower(btrim(registration_no)))
 WHERE is_deleted = false AND btrim(registration_no) <> '';
CREATE INDEX ix_fwm_vehicles_scope
 ON fwm_vehicles(tenant_id, accounting_unit_id, status, asset_no) WHERE is_deleted = false;
CREATE INDEX ix_fwm_vehicles_stalled
 ON fwm_vehicles(tenant_id, is_meter_stalled) WHERE is_deleted = false AND is_meter_stalled = true;

CREATE TABLE fwm_pm_triggers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 trigger_type varchar(20) NOT NULL CHECK (trigger_type IN ('hours','kilometers','miles','tonnes','dates')),
 service_frequency numeric(20,6) NOT NULL CHECK (service_frequency > 0),
 service_downtime_hours numeric(20,6) NOT NULL DEFAULT 4 CHECK (service_downtime_hours >= 0),
 major_service_frequency numeric(20,6) NOT NULL DEFAULT 0 CHECK (major_service_frequency >= 0),
 major_service_downtime_hours numeric(20,6) NOT NULL DEFAULT 12 CHECK (major_service_downtime_hours >= 0),
 service_tolerance numeric(20,6) NOT NULL DEFAULT 0 CHECK (service_tolerance >= 0),
 routine_service_delay numeric(20,6) NOT NULL DEFAULT 0 CHECK (routine_service_delay >= 0),
 last_service_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (last_service_reading >= 0),
 last_major_service_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (last_major_service_reading >= 0),
 last_service_date date,
 last_major_service_date date,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_pm_triggers_vehicle_type
 ON fwm_pm_triggers(tenant_id, vehicle_id, trigger_type) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 5. Workshop Employees (backed by HR hr_employee_biodata).
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_workshop_employees (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 employee_id uuid NOT NULL REFERENCES hr_employee_biodata(id),
 trade_role varchar(30) NOT NULL DEFAULT 'mechanic' CHECK (trade_role IN (
  'mechanic','electrician','welder','auto_body','tyre_technician',
  'panel_beater','machinist','supervisor','driver','apprentice')),
 skill_level varchar(30) NOT NULL DEFAULT 'journeyman'
  CHECK (skill_level IN ('apprentice','junior','journeyman','senior','master')),
 hourly_cost_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (hourly_cost_rate >= 0),
 hourly_charge_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (hourly_charge_rate >= 0),
 currency_id uuid REFERENCES core_currencies(id),
 bay_assignment varchar(60) NOT NULL DEFAULT '',
 certifications jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(certifications) = 'array'),
 is_active boolean NOT NULL DEFAULT true,
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_workshop_employees_hr
 ON fwm_workshop_employees(tenant_id, employee_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 6. Daily Logs (Meter Readings, Meter Changes, Fuel Logs, Lubricant Logs).
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_meter_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 change_date date NOT NULL,
 last_date_on_old_meter date NOT NULL,
 old_meter_reading numeric(20,6) NOT NULL CHECK (old_meter_reading >= 0),
 new_meter_reading numeric(20,6) NOT NULL CHECK (new_meter_reading >= 0),
 replacement_label varchar(60) NOT NULL DEFAULT '1st replacement',
 engine_changed boolean NOT NULL DEFAULT false,
 meter_stalled boolean NOT NULL DEFAULT false,
 cumulative_offset_delta numeric(20,6) NOT NULL DEFAULT 0,
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK (change_date >= last_date_on_old_meter)
);
CREATE INDEX ix_fwm_meter_changes_vehicle
 ON fwm_meter_changes(tenant_id, vehicle_id, change_date DESC) WHERE is_deleted = false;

CREATE TABLE fwm_meter_readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 log_date date NOT NULL,
 reading numeric(20,6) NOT NULL CHECK (reading >= 0),
 engine_run_delta numeric(20,6) NOT NULL DEFAULT 0 CHECK (engine_run_delta >= 0),
 cumulative_reading numeric(20,6) NOT NULL CHECK (cumulative_reading >= 0),
 meter_unit varchar(20) NOT NULL DEFAULT 'hours'
  CHECK (meter_unit IN ('hours','kilometers','miles','tonnes')),
 is_stalled_estimate boolean NOT NULL DEFAULT false,
 source varchar(20) NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual','fuel_log','lubricant_log','job_card','meter_change')),
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE INDEX ix_fwm_meter_readings_vehicle
 ON fwm_meter_readings(tenant_id, vehicle_id, log_date DESC, created_at DESC) WHERE is_deleted = false;

CREATE TABLE fwm_fuel_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 fuel_log_number varchar(40) NOT NULL CHECK (btrim(fuel_log_number) <> ''),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 log_date date NOT NULL,
 meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (meter_reading >= 0),
 previous_meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (previous_meter_reading >= 0),
 fuel_item_id uuid REFERENCES inv_items(id),
 uom_id uuid REFERENCES inv_units_of_measure(id),
 warehouse_id uuid REFERENCES inv_warehouses(id),
 inv_stock_document_id uuid REFERENCES inv_stock_documents(id),
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 quantity_litres numeric(20,6) NOT NULL CHECK (quantity_litres > 0),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
 total_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
 currency_id uuid REFERENCES core_currencies(id),
 actual_consumption_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (actual_consumption_rate >= 0),
 ideal_consumption_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (ideal_consumption_rate >= 0),
 variance_pct numeric(12,6) NOT NULL DEFAULT 0,
 within_tolerance boolean NOT NULL DEFAULT true,
 station_or_pump varchar(120) NOT NULL DEFAULT '',
 driver_employee_id uuid REFERENCES hr_employee_biodata(id),
 cost_center_id uuid REFERENCES core_cost_centers(id),
 supplier_id uuid REFERENCES core_suppliers(id),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
 notes varchar(500) NOT NULL DEFAULT '',
 request_key uuid,
 posted_at timestamptz,
 posted_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_fuel_logs_number
 ON fwm_fuel_logs(tenant_id, accounting_unit_id, lower(btrim(fuel_log_number)));
CREATE UNIQUE INDEX uq_fwm_fuel_logs_request
 ON fwm_fuel_logs(tenant_id, request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_fwm_fuel_logs_scope
 ON fwm_fuel_logs(tenant_id, vehicle_id, log_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_fwm_fuel_logs_tolerance
 ON fwm_fuel_logs(tenant_id, within_tolerance, log_date DESC) WHERE is_deleted = false AND within_tolerance = false;

CREATE TABLE fwm_lubricant_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 lubricant_log_number varchar(40) NOT NULL CHECK (btrim(lubricant_log_number) <> ''),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 log_date date NOT NULL,
 meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (meter_reading >= 0),
 lubricant_type varchar(30) NOT NULL DEFAULT 'engine_oil' CHECK (lubricant_type IN (
  'engine_oil','hydraulic_oil','transmission_oil','gear_oil','coolant','grease','brake_fluid','other')),
 item_id uuid REFERENCES inv_items(id),
 uom_id uuid REFERENCES inv_units_of_measure(id),
 warehouse_id uuid REFERENCES inv_warehouses(id),
 inv_stock_document_id uuid REFERENCES inv_stock_documents(id),
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
 total_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
 currency_id uuid REFERENCES core_currencies(id),
 is_oil_change boolean NOT NULL DEFAULT false,
 cost_center_id uuid REFERENCES core_cost_centers(id),
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
 notes varchar(500) NOT NULL DEFAULT '',
 request_key uuid,
 posted_at timestamptz,
 posted_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_lubricant_logs_number
 ON fwm_lubricant_logs(tenant_id, accounting_unit_id, lower(btrim(lubricant_log_number)));
CREATE UNIQUE INDEX uq_fwm_lubricant_logs_request
 ON fwm_lubricant_logs(tenant_id, request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_fwm_lubricant_logs_scope
 ON fwm_lubricant_logs(tenant_id, vehicle_id, log_date DESC) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 7. Major Components & Tyres Lifecycle Registers + Immutable Audit Trails.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_major_components (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 component_code varchar(40) NOT NULL CHECK (btrim(component_code) <> ''),
 serial_no varchar(120) NOT NULL DEFAULT '',
 component_type varchar(60) NOT NULL CHECK (btrim(component_type) <> ''),
 description varchar(300) NOT NULL DEFAULT '',
 manufacturer varchar(120) NOT NULL DEFAULT '',
 condition varchar(20) NOT NULL DEFAULT 'NEW'
  CHECK (condition IN ('NEW','REBUILT','USED','REMOVED','SCRAPPED')),
 status varchar(20) NOT NULL DEFAULT 'unassigned'
  CHECK (status IN ('unassigned','fitted','in_repair','scrapped')),
 current_vehicle_id uuid REFERENCES fwm_vehicles(id),
 mounted_date date,
 mounted_cum_odo numeric(20,6) NOT NULL DEFAULT 0 CHECK (mounted_cum_odo >= 0),
 estimated_life_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (estimated_life_hours >= 0),
 accumulated_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (accumulated_hours >= 0),
 purchase_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
 cumulative_repair_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (cumulative_repair_cost >= 0),
 inv_item_id uuid REFERENCES inv_items(id),
 inv_serial_id uuid REFERENCES inv_serial_numbers(id),
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK ((status = 'fitted') = (current_vehicle_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_fwm_major_components_code
 ON fwm_major_components(tenant_id, lower(btrim(component_code))) WHERE is_deleted = false;
CREATE INDEX ix_fwm_major_components_vehicle
 ON fwm_major_components(tenant_id, current_vehicle_id, status) WHERE is_deleted = false;

CREATE TABLE fwm_tyres (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 serial_no varchar(120) NOT NULL CHECK (btrim(serial_no) <> ''),
 brand varchar(80) NOT NULL DEFAULT '',
 size_spec varchar(60) NOT NULL DEFAULT '',
 pattern varchar(60) NOT NULL DEFAULT '',
 inv_item_id uuid REFERENCES inv_items(id),
 inv_serial_id uuid REFERENCES inv_serial_numbers(id),
 status varchar(20) NOT NULL DEFAULT 'in_stock'
  CHECK (status IN ('in_stock','fitted','retread','scrapped')),
 current_vehicle_id uuid REFERENCES fwm_vehicles(id),
 axle_position varchar(30) NOT NULL DEFAULT '',
 fitted_date date,
 fitted_meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (fitted_meter_reading >= 0),
 current_tread_depth_mm numeric(10,3) NOT NULL DEFAULT 0 CHECK (current_tread_depth_mm >= 0),
 purchase_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
 accumulated_meter_usage numeric(20,6) NOT NULL DEFAULT 0 CHECK (accumulated_meter_usage >= 0),
 supplier_id uuid REFERENCES core_suppliers(id),
 purchase_location varchar(120) NOT NULL DEFAULT '',
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK ((status = 'fitted') = (current_vehicle_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_fwm_tyres_serial
 ON fwm_tyres(tenant_id, lower(btrim(serial_no))) WHERE is_deleted = false;
CREATE INDEX ix_fwm_tyres_vehicle
 ON fwm_tyres(tenant_id, current_vehicle_id, status) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 8. Preventive Maintenance Schedules, Job Cards, Milestones & Diary Notes.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_maintenance_schedules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 schedule_number varchar(40) NOT NULL CHECK (btrim(schedule_number) <> ''),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 schedule_class varchar(20) NOT NULL DEFAULT 'heavy_machinery'
  CHECK (schedule_class IN ('heavy_machinery','light_vehicle')),
 work_category varchar(30) NOT NULL DEFAULT 'maintenance_schedule'
  CHECK (work_category IN ('maintenance_schedule','planned_repair','breakdown')),
 service_type varchar(40) NOT NULL DEFAULT 'Service'
  CHECK (service_type IN ('Service','Major Service','Planned Repair','Breakdown')),
 schedule_date date NOT NULL,
 modified_service_date date,
 estimated_downtime_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (estimated_downtime_hours >= 0),
 trigger_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (trigger_reading >= 0),
 projected_engine_run numeric(20,6) NOT NULL DEFAULT 0 CHECK (projected_engine_run >= 0),
 special_conditions varchar(200) NOT NULL DEFAULT '',
 procedure_id uuid REFERENCES fwm_procedures(id),
 start_time varchar(20) NOT NULL DEFAULT '',
 status varchar(20) NOT NULL DEFAULT 'scheduled'
  CHECK (status IN ('forecasted','scheduled','job_created','completed','deferred','cancelled')),
 job_card_id uuid,
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_schedules_number
 ON fwm_maintenance_schedules(tenant_id, accounting_unit_id, lower(btrim(schedule_number)));
CREATE INDEX ix_fwm_schedules_scope
 ON fwm_maintenance_schedules(tenant_id, schedule_class, work_category, schedule_date)
 WHERE is_deleted = false;

CREATE TABLE fwm_job_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 job_number varchar(40) NOT NULL CHECK (btrim(job_number) <> ''),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 coupled_trailer_id uuid REFERENCES fwm_vehicles(id),
 job_type varchar(30) NOT NULL DEFAULT 'corrective_repair' CHECK (job_type IN (
  'preventive_service','major_service','corrective_repair','breakdown',
  'electrical','tyre_service','component_overhaul','bodywork','major_project')),
 billing_scope varchar(20) NOT NULL DEFAULT 'internal_fleet'
  CHECK (billing_scope IN ('internal_fleet','customer_billable','warranty','hired_equipment')),
 customer_id uuid REFERENCES core_customers(id),
 cost_center_id uuid REFERENCES core_cost_centers(id),
 schedule_id uuid REFERENCES fwm_maintenance_schedules(id),
 procedure_id uuid REFERENCES fwm_procedures(id),
 warehouse_id uuid REFERENCES inv_warehouses(id),
 currency_id uuid NOT NULL REFERENCES core_currencies(id),
 exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
 opened_date date NOT NULL,
 scheduled_start_at timestamptz,
 actual_start_at timestamptz,
 target_completion_at timestamptz,
 completed_at timestamptz,
 closed_at timestamptz,
 meter_reading_in numeric(20,6) NOT NULL DEFAULT 0 CHECK (meter_reading_in >= 0),
 meter_reading_out numeric(20,6) NOT NULL DEFAULT 0 CHECK (meter_reading_out >= 0),
 downtime_hours numeric(20,6) NOT NULL DEFAULT 0 CHECK (downtime_hours >= 0),
 location_site varchar(120) NOT NULL DEFAULT 'Main Workshop',
 reported_fault varchar(1000) NOT NULL DEFAULT '',
 diagnosis varchar(1000) NOT NULL DEFAULT '',
 work_performed varchar(2000) NOT NULL DEFAULT '',
 priority varchar(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
 is_major_project boolean NOT NULL DEFAULT false,
 status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
  'draft','open','in_progress','awaiting_parts','completed','invoiced','closed','cancelled')),
 payment_status varchar(20) NOT NULL DEFAULT 'not_applicable'
  CHECK (payment_status IN ('not_applicable','unpaid','partially_paid','paid')),
 parts_cost_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (parts_cost_total >= 0),
 internal_labour_cost_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (internal_labour_cost_total >= 0),
 outsourced_cost_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (outsourced_cost_total >= 0),
 lubricants_cost_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (lubricants_cost_total >= 0),
 total_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
 billable_parts_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (billable_parts_total >= 0),
 billable_labour_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (billable_labour_total >= 0),
 billable_other_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (billable_other_total >= 0),
 tax_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
 billable_grand_total numeric(20,6) NOT NULL DEFAULT 0 CHECK (billable_grand_total >= 0),
 inv_issue_document_id uuid REFERENCES inv_stock_documents(id),
 gl_cost_journal_batch_id uuid REFERENCES gl_journal_batches(id),
 gl_revenue_journal_batch_id uuid REFERENCES gl_journal_batches(id),
 ar_invoice_id uuid,
 pos_order_id uuid,
 project_id uuid,
 request_key uuid,
 cancel_reason varchar(500) NOT NULL DEFAULT '',
 cancelled_at timestamptz,
 cancelled_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK (billing_scope <> 'customer_billable' OR customer_id IS NOT NULL)
);
CREATE UNIQUE INDEX uq_fwm_job_cards_number
 ON fwm_job_cards(tenant_id, accounting_unit_id, lower(btrim(job_number)));
CREATE UNIQUE INDEX uq_fwm_job_cards_request
 ON fwm_job_cards(tenant_id, request_key) WHERE request_key IS NOT NULL;
CREATE INDEX ix_fwm_job_cards_scope
 ON fwm_job_cards(tenant_id, accounting_unit_id, opened_date DESC, status) WHERE is_deleted = false;
CREATE INDEX ix_fwm_job_cards_vehicle
 ON fwm_job_cards(tenant_id, vehicle_id, opened_date DESC) WHERE is_deleted = false;

ALTER TABLE fwm_maintenance_schedules
 ADD CONSTRAINT fk_fwm_schedules_job_card
 FOREIGN KEY (job_card_id) REFERENCES fwm_job_cards(id);

CREATE TABLE fwm_job_card_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 job_card_id uuid NOT NULL REFERENCES fwm_job_cards(id),
 line_number integer NOT NULL CHECK (line_number > 0),
 line_type varchar(30) NOT NULL CHECK (line_type IN (
  'spare_part','tyre','lubricant','internal_labour','outsourced_repair',
  'electrical_service','consumable','other')),
 source_type varchar(30) NOT NULL DEFAULT 'manual' CHECK (source_type IN (
  'inventory_issue','direct_purchase_ap','workshop_labour','petty_cash','manual')),
 description varchar(500) NOT NULL CHECK (btrim(description) <> ''),
 position_or_side varchar(80) NOT NULL DEFAULT '',
 inv_item_id uuid REFERENCES inv_items(id),
 uom_id uuid REFERENCES inv_units_of_measure(id),
 warehouse_id uuid REFERENCES inv_warehouses(id),
 inv_stock_document_id uuid REFERENCES inv_stock_documents(id),
 supplier_id uuid REFERENCES core_suppliers(id),
 ap_invoice_id uuid,
 employee_id uuid REFERENCES hr_employee_biodata(id),
 tyre_id uuid REFERENCES fwm_tyres(id),
 major_component_id uuid REFERENCES fwm_major_components(id),
 gl_expense_account_id uuid REFERENCES gl_accounts(id),
 gl_revenue_account_id uuid REFERENCES gl_accounts(id),
 quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
 unit_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
 line_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (line_cost >= 0),
 unit_price numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
 line_billable_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (line_billable_amount >= 0),
 is_billable boolean NOT NULL DEFAULT false,
 is_paid boolean NOT NULL DEFAULT false,
 stock_issued boolean NOT NULL DEFAULT false,
 location_note varchar(120) NOT NULL DEFAULT '',
 entry_date date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_job_card_lines_number
 ON fwm_job_card_lines(job_card_id, line_number);
CREATE INDEX ix_fwm_job_card_lines_job
 ON fwm_job_card_lines(tenant_id, job_card_id) WHERE is_deleted = false;

CREATE TABLE fwm_job_card_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 job_card_id uuid NOT NULL REFERENCES fwm_job_cards(id),
 employee_id uuid NOT NULL REFERENCES hr_employee_biodata(id),
 role_on_job varchar(40) NOT NULL DEFAULT 'mechanic' CHECK (role_on_job IN (
  'lead_mechanic','mechanic','electrician','welder','tyre_technician','supervisor','helper')),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 hours_estimated numeric(12,2) NOT NULL DEFAULT 0 CHECK (hours_estimated >= 0),
 hours_worked numeric(12,2) NOT NULL DEFAULT 0 CHECK (hours_worked >= 0),
 hourly_cost_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (hourly_cost_rate >= 0),
 hourly_bill_rate numeric(20,6) NOT NULL DEFAULT 0 CHECK (hourly_bill_rate >= 0),
 work_notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_job_card_assignments_emp
 ON fwm_job_card_assignments(tenant_id, job_card_id, employee_id, role_on_job) WHERE is_deleted = false;

-- Project Management milestone tracking directly on larger workshop jobs.
CREATE TABLE fwm_job_milestones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 job_card_id uuid NOT NULL REFERENCES fwm_job_cards(id),
 milestone_code varchar(30) NOT NULL DEFAULT '',
 title varchar(180) NOT NULL CHECK (btrim(title) <> ''),
 phase varchar(60) NOT NULL DEFAULT 'execution',
 owner_employee_id uuid REFERENCES hr_employee_biodata(id),
 planned_start_date date,
 planned_end_date date,
 actual_start_date date,
 actual_end_date date,
 progress_pct smallint NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
 status varchar(20) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','in_progress','blocked','completed','cancelled')),
 depends_on_milestone_id uuid REFERENCES fwm_job_milestones(id),
 deliverables varchar(500) NOT NULL DEFAULT '',
 blocker_notes varchar(500) NOT NULL DEFAULT '',
 sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 CHECK (planned_end_date IS NULL OR planned_start_date IS NULL OR planned_end_date >= planned_start_date),
 CHECK (depends_on_milestone_id IS NULL OR depends_on_milestone_id <> id)
);
CREATE INDEX ix_fwm_job_milestones_job
 ON fwm_job_milestones(tenant_id, job_card_id, sort_order) WHERE is_deleted = false;

-- Immutable event audits for Major Components, Tyres, and Job Cards.
CREATE FUNCTION protect_fwm_audit_event() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 RAISE EXCEPTION 'Fleet workshop audit events are immutable' USING ERRCODE = '23505';
END $$;

CREATE TABLE fwm_component_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 component_id uuid NOT NULL REFERENCES fwm_major_components(id),
 vehicle_id uuid REFERENCES fwm_vehicles(id),
 event_type varchar(20) NOT NULL CHECK (event_type IN ('created','mounted','removed','repaired','scrapped')),
 event_date date NOT NULL,
 cum_odo_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (cum_odo_reading >= 0),
 condition varchar(20) NOT NULL DEFAULT 'USED',
 scrapped boolean NOT NULL DEFAULT false,
 repair_cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (repair_cost >= 0),
 job_card_id uuid REFERENCES fwm_job_cards(id),
 notes varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_fwm_component_events_version
 ON fwm_component_events(tenant_id, component_id, version);
CREATE TRIGGER protect_fwm_component_event_update BEFORE UPDATE ON fwm_component_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();
CREATE TRIGGER protect_fwm_component_event_delete BEFORE DELETE ON fwm_component_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();

CREATE TABLE fwm_tyre_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 tyre_id uuid NOT NULL REFERENCES fwm_tyres(id),
 vehicle_id uuid REFERENCES fwm_vehicles(id),
 event_type varchar(20) NOT NULL CHECK (event_type IN (
  'purchased','fitted','rotated','repaired','removed','retreaded','scrapped')),
 event_date date NOT NULL,
 axle_position varchar(30) NOT NULL DEFAULT '',
 meter_reading numeric(20,6) NOT NULL DEFAULT 0 CHECK (meter_reading >= 0),
 tread_depth_mm numeric(10,3) NOT NULL DEFAULT 0 CHECK (tread_depth_mm >= 0),
 cost numeric(20,6) NOT NULL DEFAULT 0 CHECK (cost >= 0),
 location_note varchar(120) NOT NULL DEFAULT '',
 job_card_id uuid REFERENCES fwm_job_cards(id),
 notes varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_fwm_tyre_events_version
 ON fwm_tyre_events(tenant_id, tyre_id, version);
CREATE TRIGGER protect_fwm_tyre_event_update BEFORE UPDATE ON fwm_tyre_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();
CREATE TRIGGER protect_fwm_tyre_event_delete BEFORE DELETE ON fwm_tyre_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();

CREATE TABLE fwm_job_card_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 tenant_unit_id uuid,
 job_card_id uuid NOT NULL REFERENCES fwm_job_cards(id),
 action varchar(30) NOT NULL CHECK (action IN (
  'created','updated','opened','started','awaiting_parts','parts_issued',
  'requisition_raised','gl_posted','handoff_created','completed',
  'invoiced','paid','closed','cancelled')),
 previous_status varchar(30),
 new_status varchar(30) NOT NULL,
 reason varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX uq_fwm_job_card_events_version
 ON fwm_job_card_events(tenant_id, job_card_id, version);
CREATE TRIGGER protect_fwm_job_card_event_update BEFORE UPDATE ON fwm_job_card_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();
CREATE TRIGGER protect_fwm_job_card_event_delete BEFORE DELETE ON fwm_job_card_events
 FOR EACH ROW EXECUTE FUNCTION protect_fwm_audit_event();

-- ---------------------------------------------------------------------------
-- 9. Workshop Diary Ledger (templates/diary-ledger-notes.jpeg) + Multi-Vehicle Splits.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_diary_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 entry_number varchar(40) NOT NULL CHECK (btrim(entry_number) <> ''),
 entry_date date NOT NULL,
 vehicle_id uuid REFERENCES fwm_vehicles(id),
 registration_no_snapshot varchar(60) NOT NULL DEFAULT '',
 entry_category varchar(30) NOT NULL DEFAULT 'parts' CHECK (entry_category IN (
  'parts','workmanship','electrical','tyres','oil_change','outsourced_repair','other')),
 description varchar(500) NOT NULL CHECK (btrim(description) <> ''),
 position_or_side varchar(80) NOT NULL DEFAULT '',
 location_or_vendor varchar(160) NOT NULL DEFAULT '',
 supplier_id uuid REFERENCES core_suppliers(id),
 inv_item_id uuid REFERENCES inv_items(id),
 employee_id uuid REFERENCES hr_employee_biodata(id),
 quantity numeric(20,6) NOT NULL DEFAULT 1 CHECK (quantity > 0),
 unit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
 total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
 currency_id uuid NOT NULL REFERENCES core_currencies(id),
 is_paid boolean NOT NULL DEFAULT false,
 paid_at timestamptz,
 payment_reference varchar(80) NOT NULL DEFAULT '',
 linked_job_card_id uuid REFERENCES fwm_job_cards(id),
 linked_job_line_id uuid REFERENCES fwm_job_card_lines(id),
 status varchar(20) NOT NULL DEFAULT 'logged'
  CHECK (status IN ('logged','allocated','promoted_to_job','cancelled')),
 notes varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_diary_entries_number
 ON fwm_diary_entries(tenant_id, accounting_unit_id, lower(btrim(entry_number)));
CREATE INDEX ix_fwm_diary_entries_scope
 ON fwm_diary_entries(tenant_id, accounting_unit_id, entry_date DESC, is_paid)
 WHERE is_deleted = false;

CREATE TABLE fwm_diary_entry_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 diary_entry_id uuid NOT NULL REFERENCES fwm_diary_entries(id),
 vehicle_id uuid NOT NULL REFERENCES fwm_vehicles(id),
 allocated_quantity numeric(20,6) NOT NULL DEFAULT 1 CHECK (allocated_quantity > 0),
 allocated_amount numeric(20,6) NOT NULL CHECK (allocated_amount >= 0),
 linked_job_card_id uuid REFERENCES fwm_job_cards(id),
 linked_job_line_id uuid REFERENCES fwm_job_card_lines(id),
 notes varchar(300) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_diary_alloc_vehicle
 ON fwm_diary_entry_allocations(tenant_id, diary_entry_id, vehicle_id) WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 10. Canonical 9-Module Cross-Module Links & Integration Handoff Ledger.
-- ---------------------------------------------------------------------------
CREATE TABLE fwm_cross_module_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 source_entity_type varchar(30) NOT NULL CHECK (source_entity_type IN (
  'vehicle','job_card','job_line','fuel_log','lubricant_log',
  'tyre','major_component','schedule','diary_entry')),
 source_entity_id uuid NOT NULL,
 target_module varchar(30) NOT NULL CHECK (target_module IN (
  'inventory','supply_chain','ap','ar','gl','point_of_sale',
  'fixed_assets','hr','project_management')),
 link_kind varchar(50) NOT NULL CHECK (btrim(link_kind) <> ''),
 target_entity_id uuid,
 target_reference varchar(80) NOT NULL DEFAULT '',
 handoff_status varchar(20) NOT NULL DEFAULT 'staged'
  CHECK (handoff_status IN ('staged','posted','synced','reversed','cancelled')),
 amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (amount >= 0),
 currency_id uuid REFERENCES core_currencies(id),
 journal_batch_id uuid REFERENCES gl_journal_batches(id),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
 idempotency_key varchar(120) NOT NULL DEFAULT '',
 posted_at timestamptz,
 posted_by_user_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX uq_fwm_cross_module_idempotency
 ON fwm_cross_module_links(tenant_id, target_module, idempotency_key)
 WHERE is_deleted = false AND idempotency_key <> '';
CREATE INDEX ix_fwm_cross_module_source
 ON fwm_cross_module_links(tenant_id, source_entity_type, source_entity_id)
 WHERE is_deleted = false;
CREATE INDEX ix_fwm_cross_module_target
 ON fwm_cross_module_links(tenant_id, target_module, handoff_status)
 WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- 11. Register every Fleet & Workshop tenant-scoped table in reset registry.
-- ---------------------------------------------------------------------------
INSERT INTO core_tenant_reset_registry(table_name, module, reset_group) VALUES
 ('fwm_document_sequences','Fleet & Workshop Management',''),
 ('fwm_gl_settings','Fleet & Workshop Management',''),
 ('fwm_asset_groups','Fleet & Workshop Management',''),
 ('fwm_asset_group_materials','Fleet & Workshop Management',''),
 ('fwm_asset_group_components','Fleet & Workshop Management',''),
 ('fwm_procedures','Fleet & Workshop Management',''),
 ('fwm_vehicles','Fleet & Workshop Management',''),
 ('fwm_pm_triggers','Fleet & Workshop Management',''),
 ('fwm_workshop_employees','Fleet & Workshop Management',''),
 ('fwm_meter_changes','Fleet & Workshop Management','financial'),
 ('fwm_meter_readings','Fleet & Workshop Management','financial'),
 ('fwm_fuel_logs','Fleet & Workshop Management','financial'),
 ('fwm_lubricant_logs','Fleet & Workshop Management','financial'),
 ('fwm_major_components','Fleet & Workshop Management','financial'),
 ('fwm_component_events','Fleet & Workshop Management','financial'),
 ('fwm_tyres','Fleet & Workshop Management','financial'),
 ('fwm_tyre_events','Fleet & Workshop Management','financial'),
 ('fwm_maintenance_schedules','Fleet & Workshop Management','financial'),
 ('fwm_job_cards','Fleet & Workshop Management','financial'),
 ('fwm_job_card_lines','Fleet & Workshop Management','financial'),
 ('fwm_job_card_assignments','Fleet & Workshop Management','financial'),
 ('fwm_job_milestones','Fleet & Workshop Management','financial'),
 ('fwm_job_card_events','Fleet & Workshop Management','financial'),
 ('fwm_diary_entries','Fleet & Workshop Management','financial'),
 ('fwm_diary_entry_allocations','Fleet & Workshop Management','financial'),
 ('fwm_cross_module_links','Fleet & Workshop Management','financial');

COMMIT;
