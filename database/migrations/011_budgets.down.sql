BEGIN;
ALTER TABLE gl_budgets DROP CONSTRAINT fk_gl_budgets_cost_center;
DROP INDEX uq_gl_budgets_live_schedule;
DROP INDEX uq_gl_budget_details_live_period;
-- Fails safely if historical detail periods were removed and later recreated.
ALTER TABLE gl_budget_details ADD CONSTRAINT uq_gl_budget_details_period UNIQUE(tenant_id,accounting_unit_id,budget_id,year,month);
ALTER TABLE gl_budget_details DROP COLUMN last_modified_at,DROP COLUMN last_modified_by_user_id,DROP COLUMN is_deleted,DROP COLUMN deleted_at,DROP COLUMN deleted_by_user_id;
COMMIT;
