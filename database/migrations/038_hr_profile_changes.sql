-- Scoped employee self-service requests. No legacy employee records are changed.
BEGIN;
CREATE TABLE hr_profile_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id),
 employee_id uuid NOT NULL,
 requested_by_user_id uuid NOT NULL REFERENCES users(id),
 employee_version integer NOT NULL CHECK(employee_version > 0),
 proposed jsonb NOT NULL CHECK(jsonb_typeof(proposed) = 'object' AND proposed <> '{}'::jsonb),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 decided_by_user_id uuid REFERENCES users(id),
 decision_note varchar(500) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1 CHECK(version > 0),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,employee_id) REFERENCES hr_employee_biodata(tenant_id,id),
 CHECK ((status='pending' AND decided_at IS NULL AND decided_by_user_id IS NULL) OR
        (status IN ('approved','rejected') AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_hr_profile_pending ON hr_profile_change_requests(tenant_id,employee_id) WHERE status='pending';
CREATE INDEX ix_hr_profile_scope ON hr_profile_change_requests(tenant_id,created_at DESC,id DESC);
CREATE TABLE hr_profile_change_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 request_id uuid NOT NULL,
 action varchar(16) NOT NULL CHECK(action IN ('submitted','approved','rejected')),
 version integer NOT NULL CHECK(version > 0),
 actor_user_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,request_id) REFERENCES hr_profile_change_requests(tenant_id,id),
 UNIQUE(tenant_id,request_id,version)
);
INSERT INTO core_tenant_reset_registry(table_name,module,reset_group) VALUES
 ('hr_profile_change_requests','Human Resources','hr_profile_changes'),
 ('hr_profile_change_events','Human Resources','hr_profile_changes');
COMMIT;
