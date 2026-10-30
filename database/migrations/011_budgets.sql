BEGIN;
ALTER TABLE gl_budget_details ADD COLUMN last_modified_at timestamptz,
 ADD COLUMN last_modified_by_user_id uuid REFERENCES users(id),
 ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
 ADD COLUMN deleted_at timestamptz,
 ADD COLUMN deleted_by_user_id uuid REFERENCES users(id);
ALTER TABLE gl_budget_details DROP CONSTRAINT uq_gl_budget_details_period;
CREATE UNIQUE INDEX uq_gl_budget_details_live_period ON gl_budget_details(tenant_id,accounting_unit_id,budget_id,year,month) WHERE is_deleted=false;
-- Legacy duplicates fail explicitly; no history is silently deleted or merged.
CREATE UNIQUE INDEX uq_gl_budgets_live_schedule ON gl_budgets(tenant_id,accounting_unit_id,account_id,organization_unit_id,cost_center_id,begin_date,end_date) NULLS NOT DISTINCT WHERE is_deleted=false;
ALTER TABLE gl_budgets ADD CONSTRAINT fk_gl_budgets_cost_center FOREIGN KEY(tenant_id,cost_center_id) REFERENCES core_cost_centers(tenant_id,id) NOT VALID;
COMMIT;
