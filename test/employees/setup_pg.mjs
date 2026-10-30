import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire((process.env.EMPLOYEE_TEST_DEPS||'/tmp/employee-tools')+'/package.json'),{Client}=require('pg')
const db=new Client({connectionString:process.env.EMPLOYEE_TEST_DATABASE_URL});await db.connect()
try {
 await db.query(`DROP SCHEMA IF EXISTS employees_test CASCADE;CREATE SCHEMA employees_test;SET search_path TO employees_test;
 CREATE TABLE tenants(id uuid PRIMARY KEY,tenancy_name text NOT NULL,name text NOT NULL,require_two_factor_auth boolean NOT NULL DEFAULT false,is_deleted boolean NOT NULL DEFAULT false,is_active boolean NOT NULL DEFAULT true);
 CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id),is_tenant_admin_user boolean NOT NULL DEFAULT false,is_host_admin_user boolean NOT NULL DEFAULT false,is_deleted boolean NOT NULL DEFAULT false,is_active boolean NOT NULL DEFAULT true,is_locked_out boolean NOT NULL DEFAULT false);
 CREATE TABLE gl_payment_vouchers(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id),employee_id uuid,is_deleted boolean NOT NULL DEFAULT false);
 CREATE TABLE gl_imprests(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id),employee_id uuid,is_deleted boolean NOT NULL DEFAULT false);
 CREATE TABLE core_tenant_reset_registry(table_name text PRIMARY KEY,module text NOT NULL);`)
 for(const suffix of ['.sql','.down.sql','.sql'])await db.query(readFileSync(new URL('../../database/migrations/019_employee_biodata'+suffix,import.meta.url),'utf8'))
 const seed=readFileSync(new URL('../../database/seeds/002_employee_biodata_demo.sql',import.meta.url),'utf8')
 await assert.rejects(db.query(seed));await db.query('ROLLBACK')
 await db.query(`INSERT INTO tenants(id,tenancy_name,name) VALUES('c6988bed-87d6-4058-ab95-5a833c27d513','acme','Acme'),('10000000-0000-4000-8000-000000000002','other','Other');
 INSERT INTO users(id,tenant_id,is_tenant_admin_user) VALUES('20000000-0000-4000-8000-000000000001','c6988bed-87d6-4058-ab95-5a833c27d513',true),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',true),('20000000-0000-4000-8000-000000000003','c6988bed-87d6-4058-ab95-5a833c27d513',false);`)
 await db.query(seed);await db.query(seed)
 assert.equal((await db.query('SELECT count(*)::int n FROM hr_employee_biodata')).rows[0].n,5)
 assert.equal((await db.query("SELECT count(*)::int n FROM hr_employee_biodata WHERE tenant_id='c6988bed-87d6-4058-ab95-5a833c27d513'")).rows[0].n,5)
 console.log('Migration up/down/up, missing-tenant seed guard and idempotent five-record seed passed')
}finally{await db.end()}
