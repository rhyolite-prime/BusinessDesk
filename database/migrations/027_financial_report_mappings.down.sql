BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN ('gl_report_account_mappings','gl_report_mapping_events');
DROP INDEX ix_report_posted_lines;
DROP TABLE gl_report_mapping_events;
DROP TABLE gl_report_account_mappings;
COMMIT;
