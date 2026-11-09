// PostgreSQL-compatible SQL/migration checks; see docs/human-resources.md.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire(`${process.env.HR_PGLITE_DIR || '/tmp/hr-pg'}/package.json`)
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = n => readFileSync(new URL(`../../database/migrations/${n}`, import.meta.url), 'utf8')
const source = readFileSync(new URL('../../domain_services/hr/HrProfileService.cc', import.meta.url), 'utf8')
function sql(prefix) {
  const match = source.match(/execSqlCoro\(("(?:[^"\\]|\\.)*")/g)?.find(s => s.startsWith(`execSqlCoro("${prefix}`))
  assert.ok(match, `statement ${prefix} not found`)
  return JSON.parse(match.slice('execSqlCoro('.length))
}
const tenant='10000000-0000-4000-8000-000000000001', other='10000000-0000-4000-8000-000000000002', maker='20000000-0000-4000-8000-000000000001', reviewer='20000000-0000-4000-8000-000000000002', employee='30000000-0000-4000-8000-000000000001', legacyEmployee='30000000-0000-4000-8000-000000000002'
try {
  await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY); CREATE TABLE users(id uuid PRIMARY KEY); CREATE TABLE core_tenant_reset_registry(table_name text PRIMARY KEY,module text NOT NULL,reset_group text); CREATE TABLE hr_employee_biodata(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),user_id uuid REFERENCES users(id),first_name text NOT NULL,other_name text NOT NULL DEFAULT '',last_name text NOT NULL,employee_identifier text NOT NULL,department_name text NOT NULL DEFAULT '',company_email text NOT NULL DEFAULT '',personal_email text NOT NULL DEFAULT '',primary_phone_number text NOT NULL DEFAULT '',secondary_phone_number text NOT NULL DEFAULT '',residence_address text NOT NULL DEFAULT '',city_or_location text NOT NULL DEFAULT '',is_deleted boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1,last_modified_at timestamptz,last_modified_by_user_id uuid,UNIQUE(tenant_id,id));`)
  await db.exec(migration('038_hr_profile_changes.sql')); await db.exec(migration('038_hr_profile_changes.down.sql')); await db.exec(migration('038_hr_profile_changes.sql'))
  await db.query('INSERT INTO tenants VALUES ($1),($2)',[tenant,other]); await db.query('INSERT INTO users VALUES ($1),($2)',[maker,reviewer])
  await db.query("INSERT INTO hr_employee_biodata(id,tenant_id,user_id,first_name,last_name,employee_identifier) VALUES($1,$2,NULL,'Test','Person','T001'),($3,$2,$4,'Legacy','Person','T002')",[employee,tenant,legacyEmployee,maker])
  const old=await db.query("INSERT INTO hr_profile_change_requests(tenant_id,employee_id,requested_by_user_id,employee_version,proposed) VALUES($1,$2,$3,1,'{\"personalEmail\":\"legacy@example.com\"}') RETURNING id",[tenant,legacyEmployee,maker]); const legacy=old.rows[0].id
  await db.exec(migration('039_hr_profile_admin.sql'))
  assert.equal((await db.query('SELECT source FROM hr_profile_change_requests WHERE id=$1',[legacy])).rows[0].source,'employee')
  await db.exec(migration('039_hr_profile_admin.down.sql')); await db.exec(migration('039_hr_profile_admin.sql'))
  assert.equal((await db.query('SELECT source FROM hr_profile_change_requests WHERE id=$1',[legacy])).rows[0].source,'employee')
  const profile=sql("SELECT jsonb_build_object('id',e.id")
  const result=await db.query(profile,[tenant,employee]); const value=JSON.parse(result.rows[0].record)
  assert.equal(value.employeeIdentifier,'T001'); assert.equal(value.version,1); assert.equal(value.healthIssues,undefined); assert.equal(value.dateOfBirth,undefined)
  assert.equal((await db.query(profile,[other,employee])).rows.length,0)
  const submit=sql('WITH employee AS (SELECT id,version FROM hr_employee_biodata')
  const proposed=JSON.stringify({personalEmail:'person@example.com',cityOrLocation:'Accra'})
  assert.equal((await db.query(submit,[other,employee,1,proposed,maker])).rows.length,0)
  assert.equal((await db.query(submit,[tenant,employee,2,proposed,maker])).rows.length,0)
  const created=await db.query(submit,[tenant,employee,1,proposed,maker]); const id=created.rows[0].id
  assert.equal((await db.query('SELECT source FROM hr_profile_change_requests WHERE id=$1',[id])).rows[0].source,'admin')
  await assert.rejects(db.exec(migration('039_hr_profile_admin.down.sql'))); await db.exec('ROLLBACK')
  await assert.rejects(db.query(submit,[tenant,employee,1,proposed,maker]))
  const list=sql("SELECT jsonb_build_object('id',r.id")
  const all=await db.query(list,[tenant,reviewer,true,0]); assert.equal(all.rows.length,2); assert.equal(JSON.parse(all.rows.find(r=>JSON.parse(r.record).id===id).record).canDecide,true)
  assert.equal((await db.query(list,[other,reviewer,true,0])).rows.length,0)
  assert.equal(JSON.parse((await db.query(list,[tenant,maker,true,0])).rows.find(r=>JSON.parse(r.record).id===id).record).canDecide,false)
  const update=sql('UPDATE hr_employee_biodata SET personal_email=')
  assert.equal((await db.query(update,[other,employee,'admin',1,proposed,reviewer,maker])).rows.length,0)
  assert.equal((await db.query(update,[tenant,employee,'admin',2,proposed,reviewer,maker])).rows.length,0)
  // Legacy self-service requests still require the employee to remain linked to the original requester.
  await db.query('UPDATE hr_employee_biodata SET user_id=NULL WHERE id=$1',[legacyEmployee])
  assert.equal((await db.query(update,[tenant,legacyEmployee,'employee',1,proposed,reviewer,maker])).rows.length,0)
  await db.query('UPDATE hr_employee_biodata SET user_id=$2 WHERE id=$1',[legacyEmployee,maker])
  assert.equal((await db.query(update,[tenant,legacyEmployee,'employee',1,proposed,reviewer,maker])).rows.length,1)
  await db.exec('BEGIN')
  assert.equal((await db.query(update,[tenant,employee,'admin',1,proposed,reviewer,maker])).rows.length,1)
  await db.query(sql('UPDATE hr_profile_change_requests SET status='),[tenant,id,'approved',reviewer,''])
  await db.query(sql('INSERT INTO hr_profile_change_events'),[tenant,id,'approved',2,reviewer]); await db.exec('COMMIT')
  const employeeRow=(await db.query('SELECT personal_email,city_or_location,primary_phone_number,version FROM hr_employee_biodata WHERE id=$1',[employee])).rows[0]
  assert.equal(employeeRow.personal_email,'person@example.com'); assert.equal(employeeRow.city_or_location,'Accra'); assert.equal(employeeRow.primary_phone_number,''); assert.equal(employeeRow.version,2)
  assert.equal((await db.query(update,[tenant,employee,'admin',1,proposed,reviewer,maker])).rows.length,0)
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM hr_profile_change_events WHERE tenant_id=$1 AND request_id=$2',[tenant,id])).rows[0].n),2)
  console.log('HR administrative profile migration, tenant scope, provenance, guarded updates and audit SQL passed')
} finally { await db.close() }
