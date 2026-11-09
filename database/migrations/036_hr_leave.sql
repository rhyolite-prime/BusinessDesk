-- HR leave requests build on the shared employee directory (migration 019).
BEGIN;
CREATE TABLE hr_leave_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 employee_id uuid NOT NULL,
 leave_type varchar(40) NOT NULL CHECK (leave_type IN ('annual','sick','unpaid','other')),
 start_date date NOT NULL,
 end_date date NOT NULL CHECK (end_date >= start_date),
 reason varchar(500) NOT NULL DEFAULT '',
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
 decision_note varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 decided_at timestamptz,
 decided_by_user_id uuid REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 FOREIGN KEY (tenant_id, employee_id) REFERENCES hr_employee_biodata(tenant_id,id),
 CHECK (start_date BETWEEN DATE '1900-01-01' AND DATE '2999-12-31'),
 CHECK (end_date BETWEEN DATE '1900-01-01' AND DATE '2999-12-31')
);
CREATE INDEX ix_hr_leave_scope ON hr_leave_requests(tenant_id, created_at DESC, id);
INSERT INTO core_tenant_reset_registry(table_name,module) VALUES ('hr_leave_requests','Human Resources');
COMMIT;
