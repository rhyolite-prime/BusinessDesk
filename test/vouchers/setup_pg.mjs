import '../suppliers/setup_pg.mjs'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire((process.env.SUPPLIERS_PG_DEPS || '/tmp/supplier-tools') + '/package.json')
const { Client } = require('pg'), db = new Client({ connectionString: process.env.SUPPLIERS_TEST_DATABASE_URL })
await db.connect()
try {
  await db.query('SET search_path TO suppliers_test')
  for (const suffix of ['.sql', '.down.sql', '.sql']) await db.query(readFileSync(new URL('../../database/migrations/017_supplier_voucher_posting' + suffix, import.meta.url), 'utf8'))
  await db.query(readFileSync(new URL('../../database/migrations/019_employee_biodata.sql', import.meta.url), 'utf8'))
} finally { await db.end() }
