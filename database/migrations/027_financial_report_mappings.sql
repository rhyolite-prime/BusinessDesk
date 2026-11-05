BEGIN;
CREATE TABLE gl_report_account_mappings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 account_id uuid NOT NULL REFERENCES gl_accounts(id),
 category varchar(40) NOT NULL CHECK(category IN ('current_asset','noncurrent_asset','current_liability','noncurrent_liability','equity','revenue','other_income','cost_of_sales','operating_expense','depreciation','finance_cost','income_tax')),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,accounting_unit_id,account_id)
);
CREATE TABLE gl_report_mapping_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid NOT NULL REFERENCES users(id),
 changes jsonb NOT NULL
);
INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('gl_report_account_mappings','Ledger setup',''),
 ('gl_report_mapping_events','Ledger setup','');
CREATE INDEX ix_report_posted_lines ON gl_journal_lines(tenant_id,accounting_unit_id,transaction_date) WHERE is_deleted=false;
COMMIT;
