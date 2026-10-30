BEGIN;
ALTER TABLE gl_payment_vouchers ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN source_payload jsonb, ADD COLUMN calculation jsonb, ADD COLUMN proposed_journal jsonb,
 ADD COLUMN posting_period_id uuid REFERENCES gl_accounting_periods(id), ADD COLUMN request_hash text;
ALTER TABLE gl_payment_vouchers DROP CONSTRAINT uq_gl_payment_vouchers_idempotency;
CREATE UNIQUE INDEX uq_payment_voucher_request ON gl_payment_vouchers(tenant_id,accounting_unit_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_voucher_journal ON gl_payment_vouchers(tenant_id,accounting_unit_id,journal_batch_id) WHERE journal_batch_id IS NOT NULL AND is_deleted=false;
ALTER TABLE gl_payment_voucher_lines ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS last_modified_at timestamptz, ADD COLUMN IF NOT EXISTS last_modified_by_user_id uuid,
 ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by_user_id uuid;
CREATE TABLE gl_supplier_voucher_sequences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),next_number bigint NOT NULL CHECK(next_number>0),
 created_at timestamptz NOT NULL DEFAULT now(),created_by_user_id uuid NOT NULL REFERENCES users(id),
 UNIQUE(tenant_id,accounting_unit_id)
);
INSERT INTO core_tenant_reset_registry VALUES('gl_supplier_voucher_sequences','Ledger transactions and cash','financial');
COMMIT;
