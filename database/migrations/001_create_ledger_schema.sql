-- BusinessDesk initial GL schema.
-- PostgreSQL 15+ (gen_random_uuid and NULLS NOT DISTINCT are used); apply with psql -v ON_ERROR_STOP=1.
-- All table, column, constraint, and index identifiers use lowercase snake_case.
-- Amount precision is a starting policy (amounts: 20,6; exchange rates: 20,10)
-- and must be confirmed with accounting before production data is loaded.

BEGIN;

CREATE TABLE core_currencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(3) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    decimal_places smallint NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid
);

CREATE TABLE core_accounting_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    code varchar(40) NOT NULL,
    name varchar(160) NOT NULL,
    base_currency_id uuid NOT NULL REFERENCES core_currencies(id),
    time_zone varchar(80) NOT NULL DEFAULT 'UTC',
    fiscal_year_start_month smallint NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT uq_core_accounting_units_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE core_currency_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    rate_type varchar(30) NOT NULL DEFAULT 'spot',
    effective_date date NOT NULL,
    rate numeric(20,10) NOT NULL CHECK (rate > 0),
    source varchar(80),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_core_currency_rates_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_core_currency_rates_unit_currency_type_date
        UNIQUE (tenant_id, accounting_unit_id, currency_id, rate_type, effective_date)
);

CREATE TABLE gl_account_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    parent_group_id uuid,
    name varchar(160) NOT NULL,
    standard_account_type smallint NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_account_groups_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_account_groups_parent FOREIGN KEY (parent_group_id)
        REFERENCES gl_account_groups (id),
    CONSTRAINT uq_gl_account_groups_parent_name UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, parent_group_id, name)
);

CREATE TABLE gl_account_controls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    account_group_id uuid NOT NULL,
    parent_account_header_id uuid,
    account_header_name varchar(160) NOT NULL,
    min_account integer NOT NULL,
    max_account integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT ck_gl_account_controls_range CHECK (min_account <= max_account),
    CONSTRAINT fk_gl_account_controls_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_account_controls_group FOREIGN KEY (account_group_id)
        REFERENCES gl_account_groups (id),
    CONSTRAINT fk_gl_account_controls_parent FOREIGN KEY (parent_account_header_id)
        REFERENCES gl_account_controls (id)
);

CREATE TABLE gl_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    account_header_id uuid,
    account_group_id uuid NOT NULL,
    account_number varchar(80) NOT NULL,
    account_name varchar(200) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    currency_id uuid REFERENCES core_currencies(id),
    standard_account_type smallint NOT NULL,
    allow_manual_posting boolean NOT NULL DEFAULT true,
    is_control_account boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_accounts_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_accounts_header FOREIGN KEY (account_header_id)
        REFERENCES gl_account_controls (id),
    CONSTRAINT fk_gl_accounts_group FOREIGN KEY (account_group_id)
        REFERENCES gl_account_groups (id),
    CONSTRAINT uq_gl_accounts_tenant_unit_number UNIQUE (tenant_id, accounting_unit_id, account_number)
);

CREATE TABLE gl_accounting_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    period integer NOT NULL CHECK (period BETWEEN 190001 AND 299912),
    period_start_date date NOT NULL,
    period_end_date date NOT NULL,
    last_closed_at timestamptz,
    status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
    closed_by_user_id uuid,
    close_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT ck_gl_accounting_periods_date_order CHECK (period_start_date <= period_end_date),
    CONSTRAINT fk_gl_accounting_periods_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_accounting_periods_tenant_unit_period UNIQUE (tenant_id, accounting_unit_id, period)
);

CREATE TABLE gl_account_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    account_id uuid NOT NULL,
    organization_unit_id uuid,
    cost_center_id uuid,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    debit_balance numeric(20,6) NOT NULL DEFAULT 0,
    credit_balance numeric(20,6) NOT NULL DEFAULT 0,
    foreign_debit_balance numeric(20,6) NOT NULL DEFAULT 0,
    foreign_credit_balance numeric(20,6) NOT NULL DEFAULT 0,
    buy_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (buy_rate > 0),
    sell_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (sell_rate > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_gl_account_balances_account FOREIGN KEY (account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT uq_gl_account_balances_dimensions UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, account_id, organization_unit_id, cost_center_id, currency_id)
);

CREATE TABLE gl_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    bank_id uuid,
    bank_name varchar(160),
    bank_branch_id uuid,
    bank_branch_name varchar(160),
    account_id uuid NOT NULL,
    account_name varchar(200),
    address text,
    location varchar(160),
    account_number varchar(100) NOT NULL,
    account_type varchar(50),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    contact_person varchar(160),
    contact_number varchar(80),
    cheque_book_start varchar(80),
    cheque_book_end varchar(80),
    date_opened date,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_bank_accounts_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_bank_accounts_gl_account FOREIGN KEY (account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT uq_gl_bank_accounts_tenant_unit_number UNIQUE (tenant_id, accounting_unit_id, account_number)
);

CREATE TABLE gl_default_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    accounts_payables_bank_account_id uuid,
    payroll_bank_account_id uuid,
    sales_bank_account_id uuid,
    accounts_receivable_bank_account_id uuid,
    accounts_receivable_account_id uuid,
    accounts_payable_account_id uuid,
    withholding_tax_account_id uuid,
    imprest_category_id uuid,
    credit_purchases_account_id uuid,
    advance_from_customer_account_id uuid,
    covid_tax_received_account_id uuid,
    communications_service_tax_received_account_id uuid,
    inventory_account_id uuid,
    sales_revenue_account_id uuid,
    stock_purchases_account_id uuid,
    current_earnings_account_id uuid,
    retained_earnings_account_id uuid,
    vat_received_account_id uuid,
    vat_rate numeric(9,6) NOT NULL DEFAULT 0 CHECK (vat_rate BETWEEN 0 AND 1),
    imprest_gl_account_id uuid,
    petty_cash_gl_account_id uuid,
    purchases_bank_account_id uuid,
    advance_to_supplier_account_id uuid,
    covid_tax_paid_account_id uuid,
    communications_service_tax_paid_account_id uuid,
    goods_in_transit_account_id uuid,
    unrealized_fx_loss_account_id uuid,
    unrealized_fx_gain_account_id uuid,
    realized_fx_loss_account_id uuid,
    realized_fx_gain_account_id uuid,
    vat_paid_account_id uuid,
    getfl_received_account_id uuid,
    getfl_paid_account_id uuid,
    nhil_received_account_id uuid,
    nhil_paid_account_id uuid,
    social_security_employer_expense_account_id uuid,
    social_security_employee_expense_account_id uuid,
    social_security_employer_liability_account_id uuid,
    social_security_employee_liability_account_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_default_accounts_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_default_accounts_unit UNIQUE (tenant_id, accounting_unit_id)
);

CREATE TABLE gl_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    account_id uuid NOT NULL,
    organization_unit_id uuid,
    cost_center_id uuid,
    account_name varchar(200),
    organization_unit_name varchar(160),
    begin_date date NOT NULL,
    end_date date NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT ck_gl_budgets_date_order CHECK (begin_date <= end_date),
    CONSTRAINT fk_gl_budgets_account FOREIGN KEY (account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_budgets_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_budget_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    budget_id uuid NOT NULL,
    month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
    year smallint NOT NULL CHECK (year BETWEEN 1900 AND 2999),
    budget_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
    revised_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (revised_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_gl_budget_details_budget FOREIGN KEY (budget_id)
        REFERENCES gl_budgets (id) ON DELETE CASCADE,
    CONSTRAINT uq_gl_budget_details_period UNIQUE (tenant_id, accounting_unit_id, budget_id, year, month)
);

CREATE TABLE gl_journal_batch_sequences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    prefix varchar(10) NOT NULL DEFAULT '',
    suffix varchar(10) NOT NULL DEFAULT '',
    current_batch_number integer NOT NULL DEFAULT 0,
    next_batch_number integer NOT NULL DEFAULT 1,
    sequence_increment integer NOT NULL DEFAULT 1 CHECK (sequence_increment > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_journal_batch_sequences_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_journal_batch_sequences_unit UNIQUE (tenant_id, accounting_unit_id)
);

CREATE TABLE gl_journal_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    batch_number varchar(40) NOT NULL,
    transaction_source varchar(40) NOT NULL DEFAULT 'general_journal',
    batch_date date NOT NULL,
    batch_description varchar(200) NOT NULL,
    total_credit numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_credit >= 0),
    total_debit numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_debit >= 0),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'rejected', 'voided', 'reversed')),
    is_temporary boolean NOT NULL DEFAULT false,
    is_opening_balance boolean NOT NULL DEFAULT false,
    period_id uuid,
    reversal_of_batch_id uuid,
    idempotency_key varchar(120),
    submitted_at timestamptz,
    submitted_by_user_id uuid,
    approved_at timestamptz,
    approved_by_user_id uuid,
    posted_at timestamptz,
    posted_by_user_id uuid,
    reversed_at timestamptz,
    reversed_by_user_id uuid,
    reversal_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_journal_batches_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_journal_batches_period FOREIGN KEY (period_id)
        REFERENCES gl_accounting_periods (id),
    CONSTRAINT fk_gl_journal_batches_reversal FOREIGN KEY (reversal_of_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_journal_batches_number UNIQUE (tenant_id, accounting_unit_id, batch_number),
    CONSTRAINT uq_gl_journal_batches_idempotency UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, idempotency_key)
);

CREATE TABLE gl_journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    journal_batch_id uuid NOT NULL,
    account_id uuid NOT NULL,
    account_name varchar(200),
    organization_unit_id uuid,
    organization_unit_name varchar(160),
    cost_center_id uuid,
    reference_number varchar(40),
    cheque_number varchar(40),
    description varchar(300),
    debit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    base_debit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (base_debit_amount >= 0),
    base_credit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (base_credit_amount >= 0),
    transaction_date date NOT NULL,
    transaction_source varchar(40) NOT NULL DEFAULT 'general_journal',
    is_multi_currency boolean NOT NULL DEFAULT false,
    is_reconciled boolean NOT NULL DEFAULT false,
    is_opening_balance boolean NOT NULL DEFAULT false,
    is_consolidated boolean NOT NULL DEFAULT false,
    date_consolidated date,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    currency_name varchar(100),
    currency_code varchar(3),
    buy_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (buy_rate > 0),
    sell_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (sell_rate > 0),
    batch_date date NOT NULL,
    closed_date date,
    petty_cash_recipient_id uuid,
    petty_cash_recipient_name varchar(160),
    standard_account_type smallint NOT NULL,
    batch_number varchar(40) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT ck_gl_journal_lines_one_side CHECK (NOT (debit_amount > 0 AND credit_amount > 0)),
    CONSTRAINT fk_gl_journal_lines_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_journal_lines_account FOREIGN KEY (account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_journal_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    journal_batch_id uuid NOT NULL,
    batch_number varchar(40) NOT NULL,
    batch_date date NOT NULL,
    total_credit numeric(20,6) NOT NULL,
    total_debit numeric(20,6) NOT NULL,
    journal_details jsonb NOT NULL DEFAULT '[]'::jsonb,
    captured_at timestamptz NOT NULL DEFAULT now(),
    captured_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_journal_history_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id)
);

CREATE TABLE gl_deleted_journals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    batch_number varchar(40) NOT NULL,
    batch_description varchar(200) NOT NULL,
    account_id uuid NOT NULL,
    account_name varchar(200) NOT NULL,
    batch_date date NOT NULL,
    debit_amount numeric(20,6) NOT NULL DEFAULT 0,
    credit_amount numeric(20,6) NOT NULL DEFAULT 0,
    deleted_by varchar(160),
    deleted_by_user_id uuid,
    deletion_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_actor_user_id uuid
);

CREATE TABLE gl_payment_vouchers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    batch_number varchar(40) NOT NULL,
    batch_description varchar(200),
    payment_date date,
    bank_account_id uuid,
    bank_account_name varchar(200),
    bank_id uuid,
    bank_name varchar(160),
    cheque_number varchar(40),
    voucher_entry_date date NOT NULL,
    mode_of_payment varchar(40) NOT NULL,
    voucher_type varchar(40) NOT NULL DEFAULT 'regular',
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    currency_name varchar(100),
    currency_code varchar(3),
    buy_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (buy_rate > 0),
    base_amount numeric(20,6) NOT NULL DEFAULT 0,
    has_communication_service_tax boolean NOT NULL DEFAULT false,
    communication_service_tax_rate numeric(9,6) NOT NULL DEFAULT 0,
    has_covid_tax boolean NOT NULL DEFAULT false,
    covid_tax_rate numeric(9,6) NOT NULL DEFAULT 0,
    has_withholding boolean NOT NULL DEFAULT false,
    has_getfund_levy boolean NOT NULL DEFAULT false,
    getfund_levy_rate numeric(9,6) NOT NULL DEFAULT 0,
    has_national_health_insurance_levy boolean NOT NULL DEFAULT false,
    national_health_insurance_levy_rate numeric(9,6) NOT NULL DEFAULT 0,
    has_vat boolean NOT NULL DEFAULT false,
    vat_rate numeric(9,6) NOT NULL DEFAULT 0,
    total_vat_amount numeric(20,6) NOT NULL DEFAULT 0,
    has_vat_withhold boolean NOT NULL DEFAULT false,
    withholding_vat_percentage numeric(9,6) NOT NULL DEFAULT 0,
    gross_amount numeric(20,6) NOT NULL DEFAULT 0,
    total_withheld numeric(20,6) NOT NULL DEFAULT 0,
    total_retained numeric(20,6) NOT NULL DEFAULT 0,
    net_amount numeric(20,6) NOT NULL DEFAULT 0,
    total_vat_withheld numeric(20,6) NOT NULL DEFAULT 0,
    tax_type varchar(40),
    vat_withholding_account_id uuid,
    vat_withholding_account_name varchar(200),
    withholding_account_id uuid,
    withholding_account_name varchar(200),
    vat_withhold_amount numeric(20,6) NOT NULL DEFAULT 0,
    withholding_rate numeric(9,6) NOT NULL DEFAULT 0,
    customer_id uuid,
    customer_name varchar(200),
    supplier_id uuid,
    supplier_name varchar(200),
    employee_id uuid,
    employee_name varchar(200),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'rejected', 'voided', 'reversed')),
    is_payment boolean NOT NULL DEFAULT true,
    is_multi_currency boolean NOT NULL DEFAULT false,
    is_posted boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    idempotency_key varchar(120),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_payment_vouchers_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_payment_vouchers_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES gl_bank_accounts (id),
    CONSTRAINT fk_gl_payment_vouchers_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_payment_vouchers_idempotency UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, idempotency_key)
);

CREATE TABLE gl_payment_voucher_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    payment_voucher_id uuid NOT NULL,
    debit_account_id uuid NOT NULL,
    debit_account_name varchar(200),
    withhold boolean NOT NULL DEFAULT false,
    organization_unit_id uuid,
    organization_unit_name varchar(160),
    recipient_type varchar(30),
    recipient_id uuid,
    recipient_name varchar(200),
    amount numeric(20,6) NOT NULL CHECK (amount >= 0),
    foreign_debit_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (foreign_debit_amount >= 0),
    reference_number varchar(80),
    cheque_number varchar(40),
    cheque_date date,
    description varchar(300),
    invoice_number varchar(80),
    has_imprest boolean NOT NULL DEFAULT false,
    line_type varchar(40) NOT NULL DEFAULT 'regular',
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_gl_payment_voucher_lines_voucher FOREIGN KEY (payment_voucher_id)
        REFERENCES gl_payment_vouchers (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_payment_voucher_lines_account FOREIGN KEY (debit_account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_payment_voucher_retentions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    payment_voucher_id uuid NOT NULL,
    description varchar(200),
    credit_account_id uuid NOT NULL,
    credit_account_name varchar(200),
    is_percentage boolean NOT NULL DEFAULT false,
    amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_payment_voucher_retentions_voucher FOREIGN KEY (payment_voucher_id)
        REFERENCES gl_payment_vouchers (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_payment_voucher_retentions_account FOREIGN KEY (credit_account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_cash_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    receipt_number varchar(40) NOT NULL,
    receipt_date date NOT NULL,
    cash_bank_account_id uuid NOT NULL,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
    received_from varchar(200) NOT NULL,
    payment_method varchar(40) NOT NULL,
    reference_number varchar(80),
    description varchar(300),
    total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'rejected', 'voided', 'reversed')),
    journal_batch_id uuid,
    idempotency_key varchar(120),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_cash_receipts_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_cash_receipts_bank_account FOREIGN KEY (cash_bank_account_id)
        REFERENCES gl_bank_accounts (id),
    CONSTRAINT fk_gl_cash_receipts_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_cash_receipts_number UNIQUE (tenant_id, accounting_unit_id, receipt_number),
    CONSTRAINT uq_gl_cash_receipts_idempotency UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, idempotency_key)
);

CREATE TABLE gl_cash_receipt_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    cash_receipt_id uuid NOT NULL,
    offset_account_id uuid NOT NULL,
    organization_unit_id uuid,
    cost_center_id uuid,
    line_description varchar(300),
    amount numeric(20,6) NOT NULL CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_gl_cash_receipt_lines_receipt FOREIGN KEY (cash_receipt_id)
        REFERENCES gl_cash_receipts (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_cash_receipt_lines_account FOREIGN KEY (offset_account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_imprest_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    name varchar(160) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprest_categories_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_imprest_categories_tenant_unit_name UNIQUE (tenant_id, accounting_unit_id, name)
);

CREATE TABLE gl_imprests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employee_identifier varchar(80),
    employee_name varchar(200),
    imprest_category_id uuid NOT NULL,
    imprest_category_name varchar(160),
    amount numeric(20,6) NOT NULL CHECK (amount > 0),
    balance numeric(20,6) NOT NULL CHECK (balance >= 0),
    disbursement_date date NOT NULL,
    expected_retirement_date date NOT NULL,
    credit_account_id uuid NOT NULL,
    credit_account_name varchar(200),
    payment_method varchar(40),
    cheque_number varchar(40),
    imprest_number varchar(40) NOT NULL,
    debit_account_id uuid NOT NULL,
    debit_account_name varchar(200),
    reference_number varchar(80),
    description varchar(300),
    organization_unit_id uuid,
    organization_unit_name varchar(160),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    currency_name varchar(100),
    currency_code varchar(3),
    buy_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (buy_rate > 0),
    sell_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (sell_rate > 0),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'retired', 'refunded', 'written_off', 'reversed')),
    posted_to_gl boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprests_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_imprests_category FOREIGN KEY (imprest_category_id)
        REFERENCES gl_imprest_categories (id),
    CONSTRAINT fk_gl_imprests_debit_account FOREIGN KEY (debit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprests_credit_account FOREIGN KEY (credit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprests_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_imprests_number UNIQUE (tenant_id, accounting_unit_id, imprest_number)
);

CREATE TABLE gl_imprest_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    imprest_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    refund_date date NOT NULL,
    amount numeric(20,6) NOT NULL CHECK (amount > 0),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
    authorized_by_user_id uuid,
    refund_type varchar(40),
    receipt_date date,
    receipt_number varchar(80),
    refund_received_by varchar(160),
    debit_account_id uuid NOT NULL,
    credit_account_id uuid NOT NULL,
    notes text,
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'reversed')),
    posted_to_gl boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprest_refunds_imprest FOREIGN KEY (imprest_id)
        REFERENCES gl_imprests (id),
    CONSTRAINT fk_gl_imprest_refunds_debit_account FOREIGN KEY (debit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprest_refunds_credit_account FOREIGN KEY (credit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprest_refunds_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT fk_gl_imprest_refunds_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_imprest_retirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    imprest_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    retirement_date date NOT NULL,
    amount_retired numeric(20,6) NOT NULL CHECK (amount_retired > 0),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
    retired_by varchar(160),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'reversed')),
    posted_to_gl boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprest_retirements_imprest FOREIGN KEY (imprest_id)
        REFERENCES gl_imprests (id),
    CONSTRAINT fk_gl_imprest_retirements_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT fk_gl_imprest_retirements_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_imprest_retirement_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    imprest_retirement_id uuid NOT NULL,
    receipt_date date,
    receipt_number varchar(80),
    description varchar(300),
    amount numeric(20,6) NOT NULL CHECK (amount >= 0),
    debit_account_id uuid NOT NULL,
    credit_account_id uuid NOT NULL,
    organization_unit_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprest_retirement_lines_retirement FOREIGN KEY (imprest_retirement_id)
        REFERENCES gl_imprest_retirements (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_imprest_retirement_lines_debit_account FOREIGN KEY (debit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprest_retirement_lines_credit_account FOREIGN KEY (credit_account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_imprest_write_offs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    imprest_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    write_off_date date NOT NULL,
    amount numeric(20,6) NOT NULL CHECK (amount > 0),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    exchange_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
    authorized_by_user_id uuid,
    written_off_by varchar(160),
    debit_account_id uuid NOT NULL,
    credit_account_id uuid NOT NULL,
    notes text,
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'reversed')),
    posted_to_gl boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_imprest_write_offs_imprest FOREIGN KEY (imprest_id)
        REFERENCES gl_imprests (id),
    CONSTRAINT fk_gl_imprest_write_offs_debit_account FOREIGN KEY (debit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprest_write_offs_credit_account FOREIGN KEY (credit_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_imprest_write_offs_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT fk_gl_imprest_write_offs_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_petty_cash_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    recipient varchar(200) NOT NULL,
    phone_number varchar(80),
    email varchar(254),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_petty_cash_recipients_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_petty_cash_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    batch_date date NOT NULL,
    batch_number varchar(40) NOT NULL,
    source_document_number varchar(80),
    petty_cash_account_id uuid NOT NULL,
    petty_cash_account_name varchar(200),
    batch_originator varchar(160),
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    currency_name varchar(100),
    currency_code varchar(3),
    currency_rate numeric(20,10) NOT NULL DEFAULT 1 CHECK (currency_rate > 0),
    total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'reversed')),
    is_posted boolean NOT NULL DEFAULT false,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT fk_gl_petty_cash_transactions_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_petty_cash_transactions_account FOREIGN KEY (petty_cash_account_id)
        REFERENCES gl_accounts (id),
    CONSTRAINT fk_gl_petty_cash_transactions_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_petty_cash_transactions_batch UNIQUE (tenant_id, accounting_unit_id, batch_number)
);

CREATE TABLE gl_petty_cash_transaction_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    petty_cash_transaction_id uuid NOT NULL,
    transaction_date date NOT NULL,
    reference_number varchar(80),
    expense_account_id uuid NOT NULL,
    expense_account_name varchar(200),
    description varchar(300),
    amount numeric(20,6) NOT NULL CHECK (amount >= 0),
    organization_unit_id uuid,
    organization_unit_name varchar(160),
    recipient_id uuid,
    recipient_name varchar(200),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_gl_petty_cash_transaction_lines_transaction FOREIGN KEY (petty_cash_transaction_id)
        REFERENCES gl_petty_cash_transactions (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_petty_cash_transaction_lines_account FOREIGN KEY (expense_account_id)
        REFERENCES gl_accounts (id)
);

CREATE TABLE gl_approval_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    transaction_type varchar(40) NOT NULL,
    minimum_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (minimum_amount >= 0),
    required_approvals smallint NOT NULL DEFAULT 1 CHECK (required_approvals BETWEEN 1 AND 5),
    preparer_may_approve boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    CONSTRAINT fk_gl_approval_policies_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_approval_policies_type UNIQUE (tenant_id, accounting_unit_id, transaction_type, minimum_amount)
);

CREATE TABLE gl_approval_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    entity_type varchar(40) NOT NULL,
    entity_id uuid NOT NULL,
    action varchar(30) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'posted', 'reversed', 'voided')),
    from_status varchar(24),
    to_status varchar(24) NOT NULL,
    actor_user_id uuid NOT NULL,
    reason text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    request_id varchar(100),
    CONSTRAINT fk_gl_approval_events_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_activity_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid,
    entity_type varchar(80) NOT NULL,
    entity_id uuid NOT NULL,
    action varchar(30) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'submitted', 'approved', 'rejected', 'posted', 'reversed', 'imported', 'closed', 'reopened')),
    actor_user_id uuid NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    request_id varchar(100),
    before_data jsonb,
    after_data jsonb,
    CONSTRAINT fk_gl_activity_audit_events_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    import_type varchar(40) NOT NULL,
    source_file_name varchar(255) NOT NULL,
    status varchar(24) NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'validating', 'preview', 'confirmed', 'completed', 'failed', 'cancelled')),
    total_rows integer NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    valid_rows integer NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    error_rows integer NOT NULL DEFAULT 0 CHECK (error_rows >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL,
    completed_at timestamptz,
    CONSTRAINT fk_gl_import_batches_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id)
);

CREATE TABLE gl_import_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    import_batch_id uuid NOT NULL,
    row_number integer NOT NULL CHECK (row_number > 0),
    row_data jsonb NOT NULL,
    validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'error', 'imported', 'skipped')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_gl_import_rows_batch FOREIGN KEY (import_batch_id)
        REFERENCES gl_import_batches (id) ON DELETE CASCADE,
    CONSTRAINT uq_gl_import_rows_batch_row UNIQUE (tenant_id, accounting_unit_id, import_batch_id, row_number)
);

CREATE TABLE gl_bank_reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    statement_number varchar(80) NOT NULL,
    statement_start_date date NOT NULL,
    statement_end_date date NOT NULL,
    statement_opening_balance numeric(20,6) NOT NULL,
    statement_closing_balance numeric(20,6) NOT NULL,
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'reconciled', 'voided')),
    reconciled_at timestamptz,
    reconciled_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL,
    CONSTRAINT ck_gl_bank_reconciliations_date_order CHECK (statement_start_date <= statement_end_date),
    CONSTRAINT fk_gl_bank_reconciliations_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_bank_reconciliations_bank FOREIGN KEY (bank_account_id)
        REFERENCES gl_bank_accounts (id),
    CONSTRAINT uq_gl_bank_reconciliations_statement UNIQUE (tenant_id, accounting_unit_id, bank_account_id, statement_number)
);

CREATE TABLE gl_bank_reconciliation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    reconciliation_id uuid NOT NULL,
    external_transaction_id varchar(120),
    transaction_date date NOT NULL,
    description varchar(300),
    amount numeric(20,6) NOT NULL,
    matched_journal_line_id uuid,
    match_status varchar(20) NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'suggested', 'matched', 'ignored')),
    imported_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_gl_bank_reconciliation_lines_statement FOREIGN KEY (reconciliation_id)
        REFERENCES gl_bank_reconciliations (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_bank_reconciliation_lines_journal_line FOREIGN KEY (matched_journal_line_id)
        REFERENCES gl_journal_lines (id),
    CONSTRAINT uq_gl_bank_reconciliation_external_id UNIQUE NULLS NOT DISTINCT
        (tenant_id, accounting_unit_id, reconciliation_id, external_transaction_id)
);

CREATE TABLE gl_budget_composites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    code varchar(40) NOT NULL,
    name varchar(160) NOT NULL,
    begin_date date NOT NULL,
    end_date date NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    last_modified_at timestamptz,
    last_modified_by_user_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by_user_id uuid,
    CONSTRAINT ck_gl_budget_composites_dates CHECK (begin_date <= end_date),
    CONSTRAINT fk_gl_budget_composites_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT uq_gl_budget_composites_code UNIQUE (tenant_id, accounting_unit_id, code)
);

CREATE TABLE gl_budget_composite_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    composite_id uuid NOT NULL,
    budget_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid,
    CONSTRAINT fk_gl_budget_composite_lines_composite FOREIGN KEY (composite_id)
        REFERENCES gl_budget_composites (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_budget_composite_lines_budget FOREIGN KEY (budget_id)
        REFERENCES gl_budgets (id),
    CONSTRAINT uq_gl_budget_composite_lines_budget UNIQUE (tenant_id, accounting_unit_id, composite_id, budget_id)
);

CREATE TABLE gl_fx_revaluation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    revaluation_date date NOT NULL,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    rate_type varchar(30) NOT NULL DEFAULT 'closing',
    exchange_rate numeric(20,10) NOT NULL CHECK (exchange_rate > 0),
    status varchar(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted', 'voided')),
    total_gain numeric(20,6) NOT NULL DEFAULT 0,
    total_loss numeric(20,6) NOT NULL DEFAULT 0,
    journal_batch_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by_user_id uuid NOT NULL,
    approved_at timestamptz,
    approved_by_user_id uuid,
    posted_at timestamptz,
    posted_by_user_id uuid,
    CONSTRAINT fk_gl_fx_revaluation_runs_unit FOREIGN KEY (accounting_unit_id)
        REFERENCES core_accounting_units (id),
    CONSTRAINT fk_gl_fx_revaluation_runs_batch FOREIGN KEY (journal_batch_id)
        REFERENCES gl_journal_batches (id),
    CONSTRAINT uq_gl_fx_revaluation_runs_date_currency UNIQUE (tenant_id, accounting_unit_id, revaluation_date, currency_id, rate_type)
);

CREATE TABLE gl_fx_revaluation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    accounting_unit_id uuid NOT NULL,
    revaluation_run_id uuid NOT NULL,
    account_id uuid NOT NULL,
    currency_id uuid NOT NULL REFERENCES core_currencies(id),
    foreign_balance numeric(20,6) NOT NULL,
    prior_rate numeric(20,10) NOT NULL CHECK (prior_rate > 0),
    revaluation_rate numeric(20,10) NOT NULL CHECK (revaluation_rate > 0),
    prior_base_balance numeric(20,6) NOT NULL,
    revalued_base_balance numeric(20,6) NOT NULL,
    gain_loss_amount numeric(20,6) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_gl_fx_revaluation_lines_run FOREIGN KEY (revaluation_run_id)
        REFERENCES gl_fx_revaluation_runs (id) ON DELETE CASCADE,
    CONSTRAINT fk_gl_fx_revaluation_lines_account FOREIGN KEY (account_id)
        REFERENCES gl_accounts (id)
);

CREATE INDEX ix_core_currency_rates_lookup
    ON core_currency_rates (tenant_id, accounting_unit_id, currency_id, rate_type, effective_date DESC);
CREATE INDEX ix_gl_account_groups_parent
    ON gl_account_groups (tenant_id, accounting_unit_id, parent_group_id) WHERE is_deleted = false;
CREATE INDEX ix_gl_accounts_group
    ON gl_accounts (tenant_id, accounting_unit_id, account_group_id) WHERE is_deleted = false;
CREATE INDEX ix_gl_journal_batches_status_date
    ON gl_journal_batches (tenant_id, accounting_unit_id, status, batch_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_gl_journal_lines_account_date
    ON gl_journal_lines (tenant_id, accounting_unit_id, account_id, transaction_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_gl_journal_lines_batch
    ON gl_journal_lines (tenant_id, accounting_unit_id, journal_batch_id);
CREATE INDEX ix_gl_payment_vouchers_status_date
    ON gl_payment_vouchers (tenant_id, accounting_unit_id, status, payment_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_gl_cash_receipts_status_date
    ON gl_cash_receipts (tenant_id, accounting_unit_id, status, receipt_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_gl_activity_audit_entity
    ON gl_activity_audit_events (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX ix_gl_approval_events_entity
    ON gl_approval_events (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX ix_gl_budget_details_budget_period
    ON gl_budget_details (tenant_id, accounting_unit_id, budget_id, year, month);
CREATE INDEX ix_gl_bank_reconciliation_lines_match_status
    ON gl_bank_reconciliation_lines (tenant_id, reconciliation_id, match_status);

COMMIT;
