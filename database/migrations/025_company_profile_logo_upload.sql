-- Logos are bounded PNG/JPEG data URLs stored with the tenant profile. No
-- filesystem/object-store dependency is introduced. Existing URLs are retained.
BEGIN;
ALTER TABLE core_company_profiles ALTER COLUMN company_logo_url TYPE text;
ALTER TABLE core_company_profiles ADD CONSTRAINT ck_company_profile_logo_size CHECK(octet_length(company_logo_url)<=349551);
COMMIT;
