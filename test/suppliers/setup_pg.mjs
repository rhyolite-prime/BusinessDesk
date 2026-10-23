import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
const require=createRequire((process.env.SUPPLIERS_PG_DEPS||'/tmp/supplier-tools')+'/package.json')
const {Client}=require('pg'),db=new Client({connectionString:process.env.SUPPLIERS_TEST_DATABASE_URL})
await db.connect()
try{
 await db.query(`DROP SCHEMA IF EXISTS suppliers_test CASCADE; CREATE SCHEMA suppliers_test; SET search_path TO suppliers_test;
 CREATE TABLE tenants(id uuid PRIMARY KEY,tenancy_name text NOT NULL,is_deleted boolean NOT NULL DEFAULT false,is_active boolean NOT NULL DEFAULT true);
 CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id),first_name text,last_name text,email text,password_hash text NOT NULL DEFAULT '',is_tenant_admin_user boolean NOT NULL DEFAULT false,is_host_admin_user boolean NOT NULL DEFAULT false,is_deleted boolean NOT NULL DEFAULT false,is_active boolean NOT NULL DEFAULT true,is_locked_out boolean NOT NULL DEFAULT false);
 CREATE TABLE roles(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id));`)
 for(const name of ['001_create_ledger_schema','004_tenant_totp','005_banks_and_branches','006_system_numbers','007_cost_centers','008_company_profiles','012_journals','013_accounting_period_management','014_journal_organization_units','015_tenant_preferences','016_suppliers'])
  await db.query(readFileSync(new URL('../../database/migrations/'+name+'.sql',import.meta.url),'utf8'))
 await db.query(readFileSync(new URL('../../database/migrations/016_suppliers.down.sql',import.meta.url),'utf8'))
 await db.query(readFileSync(new URL('../../database/migrations/016_suppliers.sql',import.meta.url),'utf8'))
  for (const suffix of ['.sql', '.down.sql', '.sql']) await db.query(readFileSync(new URL('../../database/migrations/023_drop_customer_supplier_rates' + suffix, import.meta.url), 'utf8'))
 console.log('Supplier migrations applied to disposable PostgreSQL schema')
}finally{await db.end()}
