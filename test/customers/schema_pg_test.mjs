// Destructive fixture setup: use ONLY a disposable PostgreSQL database.
import '../vouchers/setup_pg.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire((process.env.SUPPLIERS_PG_DEPS || '/tmp/supplier-tools') + '/package.json')
const { Client } = require('pg')
const db = new Client({ connectionString: process.env.SUPPLIERS_TEST_DATABASE_URL })
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const id = n => `a1000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const [tenant, other, actor, currency, unit, otherUnit, account, otherAccount, customer] = [1,2,3,4,5,6,7,8,9].map(id)
const migrate = suffix => db.query(readFileSync(new URL('../../database/migrations/021_customer_legacy_fields' + suffix, import.meta.url), 'utf8'))
await db.connect()
try {
  await db.query('SET search_path TO suppliers_test')
  await db.query(readFileSync(new URL('../../database/migrations/023_drop_customer_supplier_rates.down.sql', import.meta.url), 'utf8'))
  await db.query(readFileSync(new URL('../../database/migrations/022_customer_groups.down.sql', import.meta.url), 'utf8'))
  // Start from pre-021 to exercise a real existing row, not only an empty table.
  await migrate('.down.sql')
  await db.query("INSERT INTO tenants(id,tenancy_name) VALUES($1,'Customer test'),($2,'Other')", [tenant,other])
  await db.query("INSERT INTO users(id,tenant_id,first_name) VALUES($1,$2,'Admin')", [actor,tenant])
  await db.query("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Ghana cedi')", [currency])
  await db.query("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$2,'HQ','HQ',$5),($3,$4,'HQ','Other HQ',$5)", [unit,tenant,otherUnit,other,currency])
  for (const [t,u,a] of [[tenant,unit,account],[other,otherUnit,otherAccount]]) {
    const group = await db.query("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Assets',0) RETURNING id", [t,u])
    await db.query("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,currency_id,standard_account_type) VALUES($1,$2,$3,$4,'AR','Receivable',$5,0)", [a,t,u,group.rows[0].id,currency])
  }
  await db.query("INSERT INTO core_customers(id,tenant_id,account_number,name,accounting_unit_id,receivable_account_id,currency_id,created_by_user_id) VALUES($1,$2,'CUS-EXISTING','Existing customer',$3,$4,$5,$6)", [customer,tenant,unit,account,currency,actor])
  const before = (await db.query('SELECT * FROM core_customers WHERE id=$1 AND is_deleted=false', [customer])).rows[0]
  await migrate('.sql')
  const row = (await db.query('SELECT * FROM core_customers WHERE id=$1 AND is_deleted=false', [customer])).rows[0]
  for (const [key,value] of Object.entries(before)) {
    assert.deepEqual(row[key],value,`existing ${key} preserved`); checks++
  }
  check(row.currency_name === 'Ghana cedi' && row.currency_code === 'GHS', 'currency snapshots backfilled from live catalog')
  check(row.buying_rate === '1.0000000000' && row.selling_rate === '1.0000000000' && row.credit_limit === '0.000000' && row.balance === '0.000000', 'decimal defaults are exact')
  check(row.customer_group_id === null && row.status_id === null && row.credit_account_id === null, 'unknown legacy masters/mappings not fabricated')
  const fields = {
    customer_group_id:id(10),customer_group_name:'Trade customers',status:'Legacy status',status_id:id(11),
    balance:'-123.123456',vat_number:'VAT-001',vat_account_id:account,vat_account_name:'VAT GL',
    credit_account_id:account,credit_account_name:'Credit GL',tin_number:'TIN-001',email:'customer@example.test',
    phone_no:'+233201234567',address:'Accra',currency_name:'Ghana cedi',currency_code:'GHS',
    buying_rate:'12.1234567890',selling_rate:'12.9876543210',credit_limit:'12345678901234.123456',
    irs_account_id:account,irs_account_name:'IRS GL',contact_person:'Ama',contact_person_phone:'+233241234567',contact_person_email:'ama@example.test',
  }
  const entries = Object.entries(fields)
  await db.query(`UPDATE core_customers SET ${entries.map(([key],i)=>`${key}=$${i+2}`).join(',')} WHERE id=$1 AND is_deleted=false`, [customer,...entries.map(([,v])=>v)])
  const extended = (await db.query('SELECT * FROM core_customers WHERE id=$1 AND is_deleted=false', [customer])).rows[0]
  for (const [key,value] of entries) { check(extended[key] === value, `${key} round trips without loss`) }
  for (const key of ['vat_account_id','credit_account_id','irs_account_id']) {
    await assert.rejects(db.query(`UPDATE core_customers SET ${key}=$2 WHERE id=$1 AND is_deleted=false`,[customer,otherAccount]), e=>e.code==='23503'); checks++
  }
  for (const [key,value] of [['buying_rate','0'],['selling_rate','-1'],['credit_limit','-1']]) {
    await assert.rejects(db.query(`UPDATE core_customers SET ${key}=$2 WHERE id=$1 AND is_deleted=false`,[customer,value]),e=>e.code==='23514'); checks++
  }
  await assert.rejects(db.query('UPDATE core_customers SET email=$2 WHERE id=$1 AND is_deleted=false',[customer,'x'.repeat(255)]),e=>e.code==='22001'); checks++
  await migrate('.down.sql')
  const reverted = (await db.query('SELECT * FROM core_customers WHERE id=$1 AND is_deleted=false', [customer])).rows[0]
  check(!Object.hasOwn(reverted,'balance') && reverted.receivable_account_id === account && reverted.created_by_user_id === actor, 'rollback removes only extension, preserves receipt mapping and audits')
  await migrate('.sql')
  check((await db.query('SELECT balance::text b FROM core_customers WHERE id=$1 AND is_deleted=false',[customer])).rows[0].b === '0.000000','migration can be reapplied after rollback')
  console.log(`${checks} customer legacy-schema PostgreSQL checks passed`)
} finally { await db.end() }
