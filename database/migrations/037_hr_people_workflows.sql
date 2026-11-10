-- A small, tenant-scoped HR workflow register. Employees remain shared records.
BEGIN;
CREATE TABLE hr_people_work_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 kind varchar(20) NOT NULL CHECK (kind IN ('vacancy','candidate','onboarding','review')),
 employee_id uuid,
 title varchar(150) NOT NULL CHECK (btrim(title) <> ''),
 person_name varchar(150) NOT NULL DEFAULT '',
 email varchar(150) NOT NULL DEFAULT '',
 due_date date CHECK (due_date IS NULL OR due_date BETWEEN DATE '1900-01-01' AND DATE '2999-12-31'),
 notes varchar(4000) NOT NULL DEFAULT '',
 status varchar(20) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 last_modified_at timestamptz,
 last_modified_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 UNIQUE (tenant_id,id),
 FOREIGN KEY (tenant_id,employee_id) REFERENCES hr_employee_biodata(tenant_id,id),
 CHECK ((kind IN ('onboarding','review') AND employee_id IS NOT NULL) OR (kind IN ('vacancy','candidate') AND employee_id IS NULL)),
 CHECK ((kind='vacancy' AND status IN ('open','closed')) OR
        (kind='candidate' AND status IN ('applied','screening','interview','offer','hired','rejected')) OR
        (kind='onboarding' AND status IN ('open','completed','cancelled')) OR
        (kind='review' AND status IN ('draft','completed','cancelled'))),
 CHECK (kind='candidate' OR (person_name='' AND email='')),
 CHECK (kind<>'candidate' OR btrim(person_name)<>'')
);
CREATE INDEX ix_hr_people_work_items_scope ON hr_people_work_items(tenant_id,kind,created_at DESC,id DESC);
CREATE TABLE hr_people_work_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 work_item_id uuid NOT NULL,
 action varchar(20) NOT NULL CHECK (action IN ('created','updated','transitioned')),
 status varchar(20) NOT NULL,
 version integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 FOREIGN KEY (tenant_id,work_item_id) REFERENCES hr_people_work_items(tenant_id,id),
 UNIQUE (tenant_id,work_item_id,version)
);
INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('hr_people_work_items','Human Resources','hr_people_workflows'),
 ('hr_people_work_events','Human Resources','hr_people_workflows');
COMMIT;
