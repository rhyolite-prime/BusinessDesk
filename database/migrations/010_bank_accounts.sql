-- Existing legacy data is not rewritten. Repair any live case-folded duplicates before applying.
BEGIN;
ALTER TABLE gl_bank_accounts DROP CONSTRAINT uq_gl_bank_accounts_tenant_unit_number;
CREATE UNIQUE INDEX uq_gl_bank_accounts_live_number ON gl_bank_accounts(tenant_id,accounting_unit_id,lower(btrim(account_number))) WHERE is_deleted=false;
CREATE UNIQUE INDEX uq_core_bank_branches_scope ON core_bank_branches(tenant_id,bank_id,id);
ALTER TABLE gl_bank_accounts ADD CONSTRAINT fk_gl_bank_accounts_bank FOREIGN KEY (tenant_id,bank_id) REFERENCES core_banks(tenant_id,id) NOT VALID;
ALTER TABLE gl_bank_accounts ADD CONSTRAINT fk_gl_bank_accounts_branch FOREIGN KEY (tenant_id,bank_id,bank_branch_id) REFERENCES core_bank_branches(tenant_id,bank_id,id) NOT VALID;
COMMIT;
