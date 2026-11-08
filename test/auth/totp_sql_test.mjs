// Execute the actual production SQL using PostgreSQL/WASM. Pass the PGlite module.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const source = fs.readFileSync('domain_services/auth/TotpSql.h', 'utf8')
const sql = Object.fromEntries([...source.matchAll(/const char \*(\w+) = R"SQL\(([\s\S]*?)\)SQL";/g)].map(m => [m[1], m[2]]))
await db.exec(`CREATE TABLE tenants (id uuid PRIMARY KEY, require_two_factor_auth boolean DEFAULT true, is_active boolean DEFAULT true, is_deleted boolean DEFAULT false);
CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid REFERENCES tenants(id), is_active boolean DEFAULT true, is_deleted boolean DEFAULT false, is_locked_out boolean DEFAULT false, is_host_admin_user boolean DEFAULT false, password_hash text DEFAULT 'bcrypt-test-only');`)
await db.exec(fs.readFileSync('database/migrations/004_tenant_totp.sql', 'utf8'))
const tenant = 'a0000000-0000-4000-8000-000000000001', user = 'a0000000-0000-4000-8000-000000000002'
const otherTenant = 'b0000000-0000-4000-8000-000000000001'
await db.query('INSERT INTO tenants (id) VALUES ($1),($2)', [tenant,otherTenant])
await db.query('INSERT INTO users (id,tenant_id) VALUES ($1,$2)', [user,tenant])
let next = 0
async function challenge({ enrolling = false, secret = 'encrypted-secret-a' } = {}) {
  const id = (++next).toString(16).padStart(64,'0')
  await db.query(`INSERT INTO auth_totp_challenges (token_hash,user_id,tenant_id,encrypted_secret,enrolling,password_fingerprint)
   SELECT $1,id,tenant_id,$3,$4,encode(sha256(convert_to(password_hash,'UTF8')),'hex') FROM users WHERE id=$2::uuid`,[id,user,secret,enrolling])
  return id
}
const complete = async (id,counter=100) => (await db.query(sql.complete,[id,counter])).rows
const first = await challenge({enrolling:true})
check((await db.query(sql.attempt,[first])).rows.length===1,'attempt finds active challenge')
check((await complete(first)).length===1,'first valid code atomically enrolls credential')
check((await db.query('SELECT last_counter FROM auth_totp_credentials')).rows[0].last_counter===100,'counter is persisted')
check((await complete(first,101)).length===0,'consumed challenge cannot be reused')
const replay = await challenge()
check((await complete(replay,100)).length===0,'same code counter denied across challenges')
check((await db.query('SELECT last_counter FROM auth_totp_credentials')).rows[0].last_counter===100,'replay does not mutate credential')
const valid = await challenge()
check((await complete(valid,101)).length===1,'new counter accepted with enrolled secret')
const foreignSecret = await challenge({enrolling:true,secret:'attacker-secret'})
check((await complete(foreignSecret,102)).length===0,'second pending enrollment cannot overwrite enrolled secret')
check((await db.query('SELECT encrypted_secret FROM auth_totp_credentials')).rows[0].encrypted_secret==='encrypted-secret-a','saved secret never replaced by login')
const expired = await challenge()
await db.query("UPDATE auth_totp_challenges SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE token_hash=$1",[expired])
check((await db.query(sql.attempt,[expired])).rows.length===0 && (await complete(expired,102)).length===0,'expired challenge denies attempts and completion')
const exhausted = await challenge()
for(let i=0;i<5;i++) check((await db.query(sql.attempt,[exhausted])).rows.length===1,'five attempts can be counted')
check((await db.query(sql.attempt,[exhausted])).rows.length===0,'sixth attempt does not reach verifier')
const counted = await challenge()
await db.query(sql.attempt,[counted])
check((await db.query('SELECT attempts FROM auth_totp_challenges WHERE token_hash=$1',[counted])).rows[0].attempts===1,'attempt count is atomic')
for(const [table,column] of [['users','is_active'],['users','is_deleted'],['users','is_locked_out'],['users','is_host_admin_user'],['tenants','is_active'],['tenants','is_deleted'],['tenants','require_two_factor_auth']]) {
  const id=await challenge()
  const deniedValue=column==='is_active'||column==='require_two_factor_auth'?false:true
  await db.query(`UPDATE ${table} SET ${column}=$1 WHERE id=$2`,[deniedValue,table==='users'?user:tenant])
  check((await complete(id,102)).length===0,`${table}.${column} rechecked at completion`)
  await db.query(`UPDATE ${table} SET ${column}=$1 WHERE id=$2`,[!deniedValue,table==='users'?user:tenant])
}
const moved=await challenge()
await db.query('UPDATE users SET tenant_id=$1 WHERE id=$2',[otherTenant,user])
check((await complete(moved,102)).length===0,'changed tenant membership invalidates challenge')
await db.query('UPDATE users SET tenant_id=$1 WHERE id=$2',[tenant,user])
const password=await challenge()
await db.query("UPDATE users SET password_hash='new-password-hash' WHERE id=$1",[user])
check((await complete(password,102)).length===0,'password changes invalidate pending challenges')
const c1=await challenge(), c2=await challenge()
const races=await Promise.all([complete(c1,102),complete(c2,102)])
check(races.flat().length===1,'only one challenge can claim the same counter')
for(let i=1;i<=11;i++) check((await db.query(sql.rate,[user,'verify'])).rows[0].attempts===i,'user-wide attempt budget increments')
await db.query("UPDATE auth_totp_rate_limits SET window_start=CURRENT_TIMESTAMP-INTERVAL '6 minutes'")
check((await db.query(sql.rate,[user,'verify'])).rows[0].attempts===1,'attempt budget resets after window')
await db.exec('DELETE FROM auth_totp_credentials')
const stale=await challenge()
check((await complete(stale,103)).length===0,'non-enrollment challenge cannot recreate removed credential')
await db.exec(fs.readFileSync('database/migrations/004_tenant_totp.down.sql','utf8'))
check((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n===1,'rollback preserves users')
await db.close()
console.log(`${checks} TOTP PostgreSQL checks passed`)
