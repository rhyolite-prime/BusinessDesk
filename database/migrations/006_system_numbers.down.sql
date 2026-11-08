-- Deploy the old TenantSql.h before removing this table: tenant creation depends on it.
BEGIN;
DROP TABLE core_system_numbers;
COMMIT;
