BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name='hr_leave_requests';
DROP TABLE hr_leave_requests;
COMMIT;
