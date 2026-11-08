// Destructive fixtures: run only against a disposable PostgreSQL database.
// Reuse the legacy lifecycle suite to provide populated customer/account rows.
import './schema_pg_test.mjs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire((process.env.SUPPLIERS_PG_DEPS || '/tmp/supplier-tools') + '/package.json')
const { Client } = require('pg')
const db = new Client({ connectionString: process.env.SUPPLIERS_TEST_DATABASE_URL })
const migrate = suffix => db.query(readFileSync(new URL('../../database/migrations/023_drop_customer_supplier_rates' + suffix, import.meta.url), 'utf8'))
const id = n => `a1000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
await db.connect()
try {
  await db.query('SET search_path TO suppliers_test')
  // Legacy test restores customer rates. Supplier rates remain dropped by setup.
  await migrate('.sql')
  await migrate('.down.sql')
  await db.query("INSERT INTO core_supplier_groups(id,tenant_id,name,created_by_user_id) VALUES($1,$2,'Rate migration group',$3)", [id(20),id(1),id(3)])
  await db.query(`INSERT INTO core_suppliers(tenant_id,account_number,supplier_group_id,status,
    vat_account_id,credit_account_id,debit_account_id,tin_number,name,email,phone_no,address,
    contact_person,contact_person_phone,contact_person_email,vat_number,currency_id,
    credit_limit,irs_account_id,is_resident,tax_office,created_by_user_id)
    VALUES($1,'SUP-RATE',$2,'active',$3,$3,$3,'TIN','Supplier','','','Accra',
      'Ama','','','VAT',$4,1234.123456,$3,true,'Accra',$5)`, [id(1),id(20),id(7),id(4),id(3)])
  const snapshot = async table => (await db.query(`SELECT (to_jsonb(t)-'buying_rate'-'selling_rate') AS row FROM ${table} t WHERE is_deleted=false ORDER BY id`)).rows
  const before = {}
  for (const table of ['core_customers', 'core_suppliers']) {
    before[table] = await snapshot(table)
    await db.query(`UPDATE ${table} SET buying_rate=12.1234567890,selling_rate=13.9876543210 WHERE is_deleted=false`)
  }
  const currencies = (await db.query('SELECT * FROM core_currencies WHERE is_deleted=false ORDER BY id')).rows
  await migrate('.sql')
  for (const table of ['core_customers', 'core_suppliers']) {
    const columns = (await db.query("SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attname IN ('buying_rate','selling_rate') AND NOT attisdropped", [table])).rows
    check(columns.length === 0, `${table} no longer has directory rate columns`)
    assert.deepEqual(await snapshot(table), before[table], `${table} preserves every other field`); checks++
  }
  assert.deepEqual((await db.query('SELECT * FROM core_currencies WHERE is_deleted=false ORDER BY id')).rows, currencies); checks++
  await migrate('.down.sql')
  for (const table of ['core_customers', 'core_suppliers']) {
    const rows = (await db.query(`SELECT buying_rate::text, selling_rate::text FROM ${table} WHERE is_deleted=false`)).rows
    check(rows.length > 0 && rows.every(r => r.buying_rate === '1.0000000000' && r.selling_rate === '1.0000000000'), `${table} rollback restores defaults, not removed values`)
  }
  await migrate('.sql')
  await migrate('.sql') // Up migration is safe to retry.
  check(true, 'rate removal can be reapplied after rollback and retried')
  console.log(`${checks} directory-rate migration PostgreSQL checks passed`)
} finally { await db.end() }
