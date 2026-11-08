-- Apply after 018. Employee records are shared by HR, payroll and ledger.
BEGIN;
CREATE UNIQUE INDEX uq_employee_link_user_scope ON users(tenant_id,id);
CREATE FUNCTION employee_text_list_valid(items jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT CASE WHEN jsonb_typeof(items)<>'array' THEN false
 ELSE jsonb_array_length(items)<=50 AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(items) value
  WHERE jsonb_typeof(value)<>'string' OR length(btrim(value #>> '{}')) NOT BETWEEN 1 AND 200
 ) END;
$$;
CREATE TABLE hr_employee_biodata (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 employee_identifier varchar(20) NOT NULL CHECK(btrim(employee_identifier)<>''),
 first_name varchar(100) NOT NULL CHECK(btrim(first_name)<>''),
 other_name varchar(100) NOT NULL DEFAULT '',
 last_name varchar(100) NOT NULL CHECK(btrim(last_name)<>''),
 employee_photo varchar(350) NOT NULL DEFAULT '',
 title varchar(50) NOT NULL DEFAULT '',
 gender varchar(10) NOT NULL DEFAULT '',
 status integer NOT NULL DEFAULT 0 CHECK(status BETWEEN 0 AND 32767),
 city_or_location varchar(100) NOT NULL DEFAULT '',
 residence_address varchar(150) NOT NULL DEFAULT '',
 department_id uuid,
 department_name varchar(150) NOT NULL DEFAULT '',
 category_id uuid,
 category_name varchar(150) NOT NULL DEFAULT '',
 date_appointed date NOT NULL,
 salary_grade_id uuid,
 salary_grade_name varchar(150) NOT NULL DEFAULT '',
 salary_notch_id uuid,
 salary_notch_name varchar(150) NOT NULL DEFAULT '',
 rank_id uuid,
 rank_name varchar(150) NOT NULL DEFAULT '',
 tax_identification_no varchar(20) NOT NULL DEFAULT '',
 date_of_birth date NOT NULL,
 personal_email varchar(100) NOT NULL DEFAULT '',
 marital_status varchar(20) NOT NULL DEFAULT '',
 religion varchar(100) NOT NULL DEFAULT '',
 nationality varchar(100) NOT NULL DEFAULT '',
 hometown varchar(100) NOT NULL DEFAULT '',
 primary_phone_number varchar(20) NOT NULL DEFAULT '',
 secondary_phone_number varchar(20) NOT NULL DEFAULT '',
 company_email varchar(100) NOT NULL DEFAULT '',
 national_identification_no varchar(20) NOT NULL DEFAULT '',
 national_health_insurance_no varchar(20) NOT NULL DEFAULT '',
 driver_license_no varchar(20) NOT NULL DEFAULT '',
 driver_license_issue_date date,
 driver_license_expiry_date date,
 identity_type varchar(50) NOT NULL DEFAULT '',
 identity_no varchar(20) NOT NULL DEFAULT '',
 height numeric(6,3) NOT NULL DEFAULT 0 CHECK(height BETWEEN 0 AND 3),
 weight numeric(7,3) NOT NULL DEFAULT 0 CHECK(weight BETWEEN 0 AND 1000),
 languages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(employee_text_list_valid(languages)),
 interests jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(employee_text_list_valid(interests)),
 health_issues jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(employee_text_list_valid(health_issues)),
 leave_days_entitled integer NOT NULL DEFAULT 0 CHECK(leave_days_entitled BETWEEN 0 AND 366),
 medical_expenses_limit numeric(20,6) NOT NULL DEFAULT 0 CHECK(medical_expenses_limit>=0),
 user_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), created_by_user_id uuid REFERENCES users(id),
 last_modified_at timestamptz, last_modified_by_user_id uuid REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, deleted_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,user_id) REFERENCES users(tenant_id,id),
 CHECK(date_of_birth BETWEEN DATE '1900-01-01' AND DATE '2999-12-31'),
 CHECK(date_appointed BETWEEN date_of_birth AND DATE '2999-12-31'),
 CHECK(driver_license_issue_date IS NULL OR driver_license_issue_date BETWEEN DATE '1900-01-01' AND DATE '2999-12-31'),
 CHECK(driver_license_expiry_date IS NULL OR driver_license_expiry_date BETWEEN DATE '1900-01-01' AND DATE '2999-12-31'),
 CHECK(driver_license_issue_date IS NULL OR driver_license_expiry_date IS NULL OR driver_license_expiry_date>=driver_license_issue_date)
);
-- Identifiers stay reserved after ordinary soft deletion to preserve financial history.
CREATE UNIQUE INDEX uq_employee_identifier ON hr_employee_biodata(tenant_id,lower(btrim(employee_identifier)));
CREATE UNIQUE INDEX uq_employee_live_user ON hr_employee_biodata(tenant_id,user_id) WHERE is_deleted=false AND user_id IS NOT NULL;
CREATE INDEX ix_employee_live_name ON hr_employee_biodata(tenant_id,lower(last_name),lower(first_name),id) WHERE is_deleted=false;
-- Preserve existing legacy financial rows, but enforce scope on new/changed links.
ALTER TABLE gl_payment_vouchers ADD CONSTRAINT fk_voucher_employee FOREIGN KEY(tenant_id,employee_id) REFERENCES hr_employee_biodata(tenant_id,id) NOT VALID;
ALTER TABLE gl_imprests ADD CONSTRAINT fk_imprest_employee FOREIGN KEY(tenant_id,employee_id) REFERENCES hr_employee_biodata(tenant_id,id) NOT VALID;
CREATE FUNCTION check_live_employee_link() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
 IF NEW.employee_id IS NOT NULL THEN
  PERFORM id FROM hr_employee_biodata WHERE id=NEW.employee_id AND tenant_id=NEW.tenant_id AND is_deleted=false FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a live employee in this tenant' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_voucher_employee BEFORE INSERT OR UPDATE OF employee_id,tenant_id ON gl_payment_vouchers FOR EACH ROW EXECUTE FUNCTION check_live_employee_link();
CREATE TRIGGER check_imprest_employee BEFORE INSERT OR UPDATE OF employee_id,tenant_id ON gl_imprests FOR EACH ROW EXECUTE FUNCTION check_live_employee_link();
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES ('hr_employee_biodata','Employees');
COMMIT;
