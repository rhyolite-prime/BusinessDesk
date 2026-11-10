BEGIN;
DELETE FROM core_tenant_reset_registry WHERE table_name IN ('hr_people_work_events','hr_people_work_items');
DROP TABLE hr_people_work_events;
DROP TABLE hr_people_work_items;
COMMIT;
