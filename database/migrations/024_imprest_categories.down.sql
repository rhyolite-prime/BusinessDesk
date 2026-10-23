-- Old uniqueness also covers archived rows and may require operator cleanup if
-- a deleted category's exact name has since been reused. Failure is atomic.
BEGIN;
DROP TRIGGER check_live_imprest_category ON gl_imprests;
DROP TRIGGER check_live_imprest_category ON gl_default_accounts;
DROP FUNCTION check_live_imprest_category();
DROP INDEX uq_imprest_category_live_name;
ALTER TABLE gl_imprest_categories ADD CONSTRAINT uq_gl_imprest_categories_tenant_unit_name UNIQUE(tenant_id,accounting_unit_id,name);
ALTER TABLE gl_imprest_categories DROP COLUMN version;
COMMIT;
