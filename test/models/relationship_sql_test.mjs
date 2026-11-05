// Execute the actual helper SQL extracted from checked-in models, with real PG.
// Native compilation is tested separately; this is not a Drogon HTTP test.
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire((process.env.MODEL_TEST_DEPS||'/tmp/model-tools')+'/package.json'),{Client}=require('pg')
assert.ok(process.env.MODEL_TEST_DATABASE_URL,'Use a disposable PostgreSQL database')
const db=new Client({connectionString:process.env.MODEL_TEST_DATABASE_URL});await db.connect()
const tenant='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002'
const live='20000000-0000-4000-8000-000000000001',foreign='20000000-0000-4000-8000-000000000002',deleted='20000000-0000-4000-8000-000000000003'
let checks=0
try {
 // Temporary tables only: application tables/data are never altered.
 for(const table of ['core_suppliers','hr_employee_biodata']) {
  await db.query(`CREATE TEMP TABLE ${table}(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,is_deleted boolean NOT NULL DEFAULT false)`)
  await db.query(`INSERT INTO ${table}(id,tenant_id,is_deleted) VALUES($1,$2,false),($3,$4,false),($5,$2,true)`,[live,tenant,foreign,other,deleted])
 }
 for(const [model,method,table,field] of [
  ['GlPaymentVouchers','getSupplier','core_suppliers','supplierId_'],
  ['GlPaymentVouchers','getEmployee','hr_employee_biodata','employeeId_'],
  ['GlImprests','getEmployee','hr_employee_biodata','employeeId_'],
 ]) {
  const text=readFileSync(new URL(`../../models/${model}.cc`,import.meta.url),'utf8')
  const blocks=[...text.matchAll(new RegExp(`^(?:\\w+) ${model}::${method}\\([\\s\\S]*?^}\\n`,'gm'))]
  assert.equal(blocks.length,2)
  for(const [body] of blocks) {
   const sql=body.match(/static const std::string sql = "([^"]+)"/)[1]
   assert.equal(sql,`select * from ${table} where tenant_id = $1 and id = $2 and is_deleted = false`)
   assert.match(body,new RegExp(`<< \\*tenantId_ << \\*${field}`))
   assert.equal((await db.query(sql,[tenant,live])).rows[0].id,live);checks++
   assert.equal((await db.query(sql,[tenant,foreign])).rowCount,0);checks++
   assert.equal((await db.query(sql,[tenant,deleted])).rowCount,0);checks++
   assert.equal((await db.query(sql,[other,live])).rowCount,0);checks++
  }
 }
 console.log(`${checks} PostgreSQL generated-relationship SQL checks passed`)
}finally{await db.end()}
