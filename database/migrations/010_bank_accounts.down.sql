BEGIN;
ALTER TABLE gl_bank_accounts DROP CONSTRAINT fk_gl_bank_accounts_branch;
ALTER TABLE gl_bank_accounts DROP CONSTRAINT fk_gl_bank_accounts_bank;
DROP INDEX uq_core_bank_branches_scope;
DROP INDEX uq_gl_bank_accounts_live_number;
-- May fail safely when historical/recreated rows share an account number. Do not discard history automatically.
ALTER TABLE gl_bank_accounts ADD CONSTRAINT uq_gl_bank_accounts_tenant_unit_number UNIQUE (tenant_id,accounting_unit_id,account_number);
COMMIT;
