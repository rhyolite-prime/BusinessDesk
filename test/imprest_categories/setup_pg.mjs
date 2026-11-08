// Destructive: ONLY a disposable database. Verify 024 against the actual schema.
import '../vouchers/setup_pg.mjs'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire((process.env.SUPPLIERS_PG_DEPS || '/tmp/imprest-tools') + '/package.json')
const { Client } = require('pg')
const db = new Client({ connectionString: process.env.SUPPLIERS_TEST_DATABASE_URL })
await db.connect()
try {
  await db.query('SET search_path TO suppliers_test')
  for (const suffix of ['.sql', '.down.sql', '.sql']) {
    await db.query(readFileSync(new URL('../../database/migrations/024_imprest_categories' + suffix, import.meta.url), 'utf8'))
  }
  console.log('Imprest category migration up/down/up passed against actual ledger schema')
} finally { await db.end() }
