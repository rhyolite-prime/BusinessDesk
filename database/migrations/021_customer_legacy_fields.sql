-- Apply after 020. Add the remaining legacy Customer model fields without
-- changing existing receipt mappings, UUID tenant scope, or audit history.
BEGIN;
ALTER TABLE core_customers
 ADD COLUMN customer_group_id uuid,
 ADD COLUMN customer_group_name varchar(200) NOT NULL DEFAULT '',
 ADD COLUMN status varchar(80) NOT NULL DEFAULT '',
 ADD COLUMN status_id uuid,
 ADD COLUMN balance numeric(20,6) NOT NULL DEFAULT 0,
 ADD COLUMN vat_number varchar(80) NOT NULL DEFAULT '',
 ADD COLUMN vat_account_id uuid,
 ADD COLUMN vat_account_name varchar(200) NOT NULL DEFAULT '',
 ADD COLUMN credit_account_id uuid,
 ADD COLUMN credit_account_name varchar(200) NOT NULL DEFAULT '',
 ADD COLUMN tin_number varchar(80) NOT NULL DEFAULT '',
 ADD COLUMN email varchar(254) NOT NULL DEFAULT '',
 ADD COLUMN phone_no varchar(50) NOT NULL DEFAULT '',
 ADD COLUMN address varchar(1000) NOT NULL DEFAULT '',
 ADD COLUMN currency_name varchar(200) NOT NULL DEFAULT '',
 ADD COLUMN currency_code varchar(3) NOT NULL DEFAULT '',
 ADD COLUMN buying_rate numeric(20,10) NOT NULL DEFAULT 1,
 ADD COLUMN selling_rate numeric(20,10) NOT NULL DEFAULT 1,
 ADD COLUMN credit_limit numeric(20,6) NOT NULL DEFAULT 0,
 ADD COLUMN irs_account_id uuid,
 ADD COLUMN irs_account_name varchar(200) NOT NULL DEFAULT '',
 ADD COLUMN contact_person varchar(160) NOT NULL DEFAULT '',
 ADD COLUMN contact_person_phone varchar(50) NOT NULL DEFAULT '',
 ADD COLUMN contact_person_email varchar(254) NOT NULL DEFAULT '',
 ADD CONSTRAINT ck_customer_buying_rate CHECK(buying_rate>0),
 ADD CONSTRAINT ck_customer_selling_rate CHECK(selling_rate>0),
 ADD CONSTRAINT ck_customer_credit_limit CHECK(credit_limit>=0),
 ADD CONSTRAINT fk_customer_vat_gl FOREIGN KEY(tenant_id,vat_account_id) REFERENCES gl_accounts(tenant_id,id),
 ADD CONSTRAINT fk_customer_credit_gl FOREIGN KEY(tenant_id,credit_account_id) REFERENCES gl_accounts(tenant_id,id),
 ADD CONSTRAINT fk_customer_irs_gl FOREIGN KEY(tenant_id,irs_account_id) REFERENCES gl_accounts(tenant_id,id);

-- Existing UUID/group/status definitions are not available: do not fabricate
-- master rows or status meanings. Nullable IDs allow an honest later mapping.
-- Names are denormalized legacy snapshots, not authoritative catalog identities.
UPDATE core_customers c SET currency_name=q.name,currency_code=q.code
 FROM core_currencies q WHERE q.id=c.currency_id AND q.is_deleted=false AND c.is_deleted=false;
CREATE INDEX ix_customer_live_group ON core_customers(tenant_id,customer_group_id)
 WHERE is_deleted=false AND customer_group_id IS NOT NULL;
CREATE INDEX ix_customer_live_status ON core_customers(tenant_id,status_id)
 WHERE is_deleted=false AND status_id IS NOT NULL;
COMMENT ON COLUMN core_customers.credit_account_id IS
 'Legacy customer credit GL; distinct from the existing receivable_account_id receipt mapping. No receipt remapping is implied.';
COMMENT ON COLUMN core_customers.status_id IS
 'Legacy status UUID. No enum meanings or active-state mapping have been inferred; is_active remains authoritative for receipts.';
COMMENT ON COLUMN core_customers.balance IS
 'Legacy customer balance metadata. Receipt posting continues to update GL balances through JournalService; no customer subledger synchronization is implied.';
COMMIT;
