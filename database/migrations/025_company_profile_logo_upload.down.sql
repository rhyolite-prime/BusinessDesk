-- Uploaded logos may exceed the legacy column limit. Rollback fails atomically
-- until those logos have been backed up and cleared; it never truncates data.
BEGIN;
ALTER TABLE core_company_profiles ADD CONSTRAINT ck_company_profile_logo_legacy CHECK(length(company_logo_url)<=2048 AND company_logo_url NOT LIKE 'data:%');
ALTER TABLE core_company_profiles DROP CONSTRAINT ck_company_profile_logo_size;
ALTER TABLE core_company_profiles ALTER COLUMN company_logo_url TYPE varchar(2048);
ALTER TABLE core_company_profiles DROP CONSTRAINT ck_company_profile_logo_legacy;
COMMIT;
