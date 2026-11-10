// Optional PostgreSQL-compatible integration test using PGlite (no server required).
// HR_PGLITE_DIR points to a directory where @electric-sql/pglite is installed.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire(`${process.env.HR_PGLITE_DIR || '/tmp/hr-pg'}/package.json`)
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = n => readFileSync(new URL(`../../database/migrations/${n}`, import.meta.url), 'utf8')
const workflowSource = readFileSync(new URL('../../domain_services/hr/HrWorkflowService.cc', import.meta.url), 'utf8')
const leaveSource = readFileSync(new URL('../../domain_services/hr/HrService.cc', import.meta.url), 'utf8')
function statement(source, prefix) {
  const match = source.match(/execSqlCoro\(("(?:[^"\\]|\\.)*")/g)?.find(s => s.startsWith(`execSqlCoro("${prefix}`))
  assert.ok(match, `statement ${prefix} not found`)
  return JSON.parse(match.slice('execSqlCoro('.length))
}
const tenant = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002', user = '20000000-0000-4000-8000-000000000001', employee = '30000000-0000-4000-8000-000000000001'
try {
  await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY); CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE core_tenant_reset_registry(table_name text PRIMARY KEY,module text NOT NULL,reset_group text); CREATE TABLE hr_employee_biodata(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),first_name text NOT NULL,other_name text NOT NULL DEFAULT '',last_name text NOT NULL,employee_identifier text NOT NULL,leave_days_entitled integer NOT NULL DEFAULT 0,is_deleted boolean NOT NULL DEFAULT false, UNIQUE(tenant_id,id));`)
  await db.exec(migration('036_hr_leave.sql')); await db.exec(migration('037_hr_people_workflows.sql'))
  await db.exec(migration('037_hr_people_workflows.down.sql')); await db.exec(migration('037_hr_people_workflows.sql'))
  await db.query('INSERT INTO tenants VALUES ($1),($2)', [tenant, other]); await db.query('INSERT INTO users VALUES ($1)', [user]);
  await db.query("INSERT INTO hr_employee_biodata(id,tenant_id,first_name,last_name,employee_identifier,leave_days_entitled) VALUES($1,$2,'Test','Person','T001',20)", [employee,tenant])
  const create = statement(workflowSource, 'WITH employee AS (SELECT id FROM hr_employee_biodata')
  const inserted = await db.query(create, [tenant,'onboarding',employee,'Set up account','','','2028-03-01','Notes','open',user])
  assert.equal(inserted.rows.length,1)
  const id = inserted.rows[0].id
  const bad = await db.query(create, [other,'onboarding',employee,'Cross tenant','','','','','open',user]); assert.equal(bad.rows.length,0)
  const createCandidate = await db.query(create, [tenant,'candidate','','Engineer','Applicant','a@example.com','','','applied',user]); assert.equal(createCandidate.rows.length,1)
  const update = statement(workflowSource, 'WITH employee AS (SELECT id FROM hr_employee_biodata WHERE tenant_id=$1 AND id=nullif($4')
  const edited = await db.query(update,[tenant,'onboarding',id,employee,'Set up email','','','2028-03-02','Updated',user,1]); assert.equal(edited.rows.length,1)
  assert.equal((await db.query(update,[tenant,'onboarding',id,employee,'Stale','','','','',user,1])).rows.length,0)
  const transitionSql = statement(workflowSource, 'WITH saved AS (UPDATE hr_people_work_items SET status=$4') + "'open') RETURNING id,tenant_id,status,version), event AS (INSERT INTO hr_people_work_events(tenant_id,work_item_id,action,status,version,created_by_user_id) SELECT tenant_id,id,'transitioned',status,version,$5::uuid FROM saved RETURNING work_item_id) SELECT work_item_id AS id FROM event"
  assert.equal((await db.query(transitionSql,[tenant,'onboarding',id,'completed',user,2])).rows.length,1)
  assert.equal((await db.query(transitionSql,[tenant,'onboarding',id,'completed',user,2])).rows.length,0)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM hr_people_work_events WHERE tenant_id=$1 AND work_item_id=$2',[tenant,id])).rows[0].n,3)
  const list = statement(workflowSource, "SELECT jsonb_build_object('id',w.id")
  assert.equal((await db.query(list,[tenant,'onboarding',0])).rows.length,1)
  assert.equal((await db.query(list,[other,'onboarding',0])).rows.length,0)
  await db.query("INSERT INTO hr_leave_requests(tenant_id,employee_id,leave_type,start_date,end_date,status,created_by_user_id) VALUES($1,$2,'annual','2027-12-30','2028-01-03','approved',$3),($1,$2,'sick','2028-02-01','2028-02-05','approved',$3),($1,$2,'annual','2028-03-01','2028-03-10','pending',$3)",[tenant,employee,user])
  const balance = statement(leaveSource,'SELECT e.leave_days_entitled AS entitlement')
  const result = await db.query(balance,[tenant,employee,2028]); assert.equal(Number(result.rows[0].entitlement),20); assert.equal(Number(result.rows[0].used),3)
  assert.equal((await db.query(balance,[other,employee,2028])).rows.length,0)
  console.log('HR PostgreSQL-compatible migration, SQL, isolation, versioning, audit and leave-estimate tests passed')
} finally { await db.close() }
