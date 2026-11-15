BEGIN;

DELETE FROM core_tenant_reset_registry WHERE table_name IN (
 'fwm_cross_module_links','fwm_diary_entry_allocations','fwm_diary_entries',
 'fwm_job_card_events','fwm_job_milestones','fwm_job_card_assignments',
 'fwm_job_card_lines','fwm_maintenance_schedules','fwm_job_cards',
 'fwm_tyre_events','fwm_tyres','fwm_component_events','fwm_major_components',
 'fwm_lubricant_logs','fwm_fuel_logs','fwm_meter_readings','fwm_meter_changes',
 'fwm_workshop_employees','fwm_pm_triggers','fwm_vehicles','fwm_procedures',
 'fwm_asset_group_components','fwm_asset_group_materials','fwm_asset_groups',
 'fwm_gl_settings','fwm_document_sequences'
);

ALTER TABLE IF EXISTS fwm_maintenance_schedules DROP CONSTRAINT IF EXISTS fk_fwm_schedules_job_card;

DROP TABLE IF EXISTS fwm_cross_module_links;
DROP TABLE IF EXISTS fwm_diary_entry_allocations;
DROP TABLE IF EXISTS fwm_diary_entries;
DROP TABLE IF EXISTS fwm_job_card_events;
DROP TABLE IF EXISTS fwm_tyre_events;
DROP TABLE IF EXISTS fwm_component_events;
DROP FUNCTION IF EXISTS protect_fwm_audit_event();
DROP TABLE IF EXISTS fwm_job_milestones;
DROP TABLE IF EXISTS fwm_job_card_assignments;
DROP TABLE IF EXISTS fwm_job_card_lines;
DROP TABLE IF EXISTS fwm_job_cards;
DROP TABLE IF EXISTS fwm_maintenance_schedules;
DROP TABLE IF EXISTS fwm_tyres;
DROP TABLE IF EXISTS fwm_major_components;
DROP TABLE IF EXISTS fwm_lubricant_logs;
DROP TABLE IF EXISTS fwm_fuel_logs;
DROP TABLE IF EXISTS fwm_meter_readings;
DROP TABLE IF EXISTS fwm_meter_changes;
DROP TABLE IF EXISTS fwm_workshop_employees;
DROP TABLE IF EXISTS fwm_pm_triggers;
DROP TABLE IF EXISTS fwm_vehicles;
DROP TABLE IF EXISTS fwm_procedures;
DROP TABLE IF EXISTS fwm_asset_group_components;
DROP TABLE IF EXISTS fwm_asset_group_materials;
DROP TABLE IF EXISTS fwm_asset_groups;
DROP TABLE IF EXISTS fwm_gl_settings;
DROP FUNCTION IF EXISTS check_fwm_gl_settings_scope();
DROP TABLE IF EXISTS fwm_document_sequences;

COMMIT;
