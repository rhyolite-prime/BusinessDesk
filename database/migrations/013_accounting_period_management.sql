BEGIN;
ALTER TABLE gl_accounting_periods ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version > 0);
CREATE TABLE gl_accounting_period_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 accounting_unit_id uuid NOT NULL REFERENCES core_accounting_units(id),
 period_id uuid NOT NULL REFERENCES gl_accounting_periods(id),
 action varchar(20) NOT NULL CHECK(action IN ('created','opened','closed')),
 previous_status varchar(20),
 new_status varchar(20) NOT NULL CHECK(new_status IN ('open','closed')),
 version integer NOT NULL CHECK(version > 0),
 reason varchar(500) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 created_by_user_id uuid NOT NULL REFERENCES users(id),
 is_deleted boolean NOT NULL DEFAULT false,
 UNIQUE(period_id,version)
);
CREATE INDEX ix_accounting_period_events_scope ON gl_accounting_period_events(tenant_id,accounting_unit_id,period_id,version) WHERE is_deleted=false;
COMMIT;
