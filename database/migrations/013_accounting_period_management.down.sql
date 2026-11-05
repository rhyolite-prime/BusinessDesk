-- Destructive rollback: retains period records but loses their transition audit.
BEGIN;
DROP TABLE gl_accounting_period_events;
ALTER TABLE gl_accounting_periods DROP COLUMN version;
COMMIT;
