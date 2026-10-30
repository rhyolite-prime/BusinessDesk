-- Destructive rollback: export preferences, plans and audit history first.
BEGIN;
DROP FUNCTION tenant_reset_apply(uuid,uuid,uuid,text);
DROP FUNCTION tenant_reset_snapshot(uuid,text[]);
DROP TABLE core_tenant_reset_events;
DROP TABLE core_tenant_reset_plans;
DROP TABLE core_tenant_reset_auth_limits;
DROP TABLE core_tenant_preference_events;
DROP TABLE core_tenant_preferences;
DROP TABLE core_tenant_reset_registry;
COMMIT;
