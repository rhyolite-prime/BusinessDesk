BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN ('hr_profile_change_events','hr_profile_change_requests');
DROP TABLE hr_profile_change_events;
DROP TABLE hr_profile_change_requests;
COMMIT;
