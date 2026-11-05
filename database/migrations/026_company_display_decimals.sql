BEGIN;
ALTER TABLE core_company_profiles ADD COLUMN display_decimals integer NOT NULL DEFAULT 2 CHECK (display_decimals BETWEEN 0 AND 6);
COMMENT ON COLUMN core_company_profiles.display_decimals IS 'Tenant-wide monetary display precision only and never changes transaction storage or rounding.';
COMMIT;
