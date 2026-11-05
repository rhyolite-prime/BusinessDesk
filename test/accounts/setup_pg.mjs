import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
const require=createRequire((process.env.ACCOUNT_TEST_DEPS||'/tmp/account-tools')+'/package.json'),{Client}=require('pg')
const db=new Client({connectionString:process.env.ACCOUNT_TEST_DATABASE_URL});await db.connect()
try {
 await db.query(`DROP SCHEMA IF EXISTS accounts_test CASCADE; CREATE SCHEMA accounts_test; SET search_path TO accounts_test;
 CREATE TABLE tenants(id uuid PRIMARY KEY,tenancy_name varchar(64) NOT NULL,name varchar(128) NOT NULL,country varchar(20),is_active boolean NOT NULL DEFAULT true,is_deleted boolean NOT NULL DEFAULT false,require_two_factor_auth boolean NOT NULL DEFAULT false,creation_time timestamp NOT NULL DEFAULT now(),last_modification_time timestamp,last_modifier_user_id uuid,connection_string text,account_secret text,account_id text);
 CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid REFERENCES tenants(id),is_tenant_admin_user boolean NOT NULL DEFAULT false,is_host_admin_user boolean NOT NULL DEFAULT false,is_deleted boolean NOT NULL DEFAULT false,is_active boolean NOT NULL DEFAULT true,is_locked_out boolean NOT NULL DEFAULT false);
 CREATE TABLE core_currencies(id uuid PRIMARY KEY,code varchar(3) NOT NULL,is_active boolean NOT NULL DEFAULT true,is_deleted boolean NOT NULL DEFAULT false);`)
 const modules=['gl','payroll','school_manager','ap','ar','fixed_assets','human_resource','inventory','manufacturing','point_of_sale','core_banking','supply_chain','property_rentals','document_management']
 for(const m of modules) await db.query(`ALTER TABLE tenants ADD COLUMN has_subscribed_to_${m} boolean NOT NULL DEFAULT false, ADD COLUMN ${m}_subscription_start_date timestamp, ADD COLUMN ${m}_subscription_end_date timestamp, ADD COLUMN ${m}_subscription_fee numeric NOT NULL DEFAULT 0, ADD COLUMN ${m}_billing_cycle varchar(50), ADD COLUMN ${m}_next_renewal_date timestamp`)
 for(const suffix of ['.sql','.down.sql','.sql'])await db.query(readFileSync(new URL('../../database/migrations/018_tenant_accounts'+suffix,import.meta.url),'utf8'))
 console.log('Account migrations apply/down/reapply passed')
}finally{await db.end()}
