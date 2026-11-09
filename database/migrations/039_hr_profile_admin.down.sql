-- Stop rather than silently lose administrative request provenance. The old
-- self-service code requires every requester's employee link on approval.
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM hr_profile_change_requests WHERE source='admin') THEN
  RAISE EXCEPTION 'Cannot roll back HR profile administration while administrative requests exist; reconcile and archive first';
 END IF;
END $$;
ALTER TABLE hr_profile_change_requests DROP COLUMN source;
COMMIT;
