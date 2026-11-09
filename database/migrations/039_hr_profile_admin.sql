-- Preserve provenance of existing self-service requests while switching all new
-- requests to the administrative workflow. Existing rows remain reviewable.
BEGIN;
ALTER TABLE hr_profile_change_requests ADD COLUMN source varchar(16) NOT NULL DEFAULT 'employee'
  CHECK (source IN ('employee','admin'));
ALTER TABLE hr_profile_change_requests ALTER COLUMN source SET DEFAULT 'admin';
COMMIT;
