-- Disposable-development rollback for 001_create_ledger_schema.sql.
-- Do not run against a database containing production financial data.
BEGIN;

DROP TABLE IF EXISTS gl_bank_reconciliation_lines;
DROP TABLE IF EXISTS gl_bank_reconciliations;
DROP TABLE IF EXISTS gl_import_rows;
DROP TABLE IF EXISTS gl_import_batches;
DROP TABLE IF EXISTS gl_activity_audit_events;
DROP TABLE IF EXISTS gl_approval_events;
DROP TABLE IF EXISTS gl_approval_policies;
DROP TABLE IF EXISTS gl_fx_revaluation_lines;
DROP TABLE IF EXISTS gl_fx_revaluation_runs;
DROP TABLE IF EXISTS gl_budget_composite_lines;
DROP TABLE IF EXISTS gl_budget_composites;
DROP TABLE IF EXISTS gl_petty_cash_transaction_lines;
DROP TABLE IF EXISTS gl_petty_cash_transactions;
DROP TABLE IF EXISTS gl_petty_cash_recipients;
DROP TABLE IF EXISTS gl_imprest_retirement_lines;
DROP TABLE IF EXISTS gl_imprest_write_offs;
DROP TABLE IF EXISTS gl_imprest_retirements;
DROP TABLE IF EXISTS gl_imprest_refunds;
DROP TABLE IF EXISTS gl_imprests;
DROP TABLE IF EXISTS gl_imprest_categories;
DROP TABLE IF EXISTS gl_cash_receipt_lines;
DROP TABLE IF EXISTS gl_cash_receipts;
DROP TABLE IF EXISTS gl_payment_voucher_retentions;
DROP TABLE IF EXISTS gl_payment_voucher_lines;
DROP TABLE IF EXISTS gl_payment_vouchers;
DROP TABLE IF EXISTS gl_deleted_journals;
DROP TABLE IF EXISTS gl_journal_history;
DROP TABLE IF EXISTS gl_journal_lines;
DROP TABLE IF EXISTS gl_journal_batches;
DROP TABLE IF EXISTS gl_journal_batch_sequences;
DROP TABLE IF EXISTS gl_budget_details;
DROP TABLE IF EXISTS gl_budgets;
DROP TABLE IF EXISTS gl_default_accounts;
DROP TABLE IF EXISTS gl_bank_accounts;
DROP TABLE IF EXISTS gl_account_balances;
DROP TABLE IF EXISTS gl_accounting_periods;
DROP TABLE IF EXISTS gl_accounts;
DROP TABLE IF EXISTS gl_account_controls;
DROP TABLE IF EXISTS gl_account_groups;
DROP TABLE IF EXISTS core_currency_rates;
DROP TABLE IF EXISTS core_accounting_units;
DROP TABLE IF EXISTS core_currencies;

COMMIT;
