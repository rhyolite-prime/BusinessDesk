// Runs the production provisioning SQL against PostgreSQL via PGlite (WASM), not
// a SQL mock. Pass a path to @electric-sql/pglite's dist/index.js as argv[2].
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root,'domain_services/tenants/TenantSql.h'),'utf8');
const sql = Object.fromEntries([...source.matchAll(/const char \*(\w+) = R"SQL\(([\s\S]*?)\)SQL";/g)].map(m=>[m[1],m[2]]));
const db = new PGlite();
let checks=0;
function check(condition,message) { assert.ok(condition,message); checks++; }
async function fails(query,params) { let failed=false; try { await db.query(query,params); } catch { failed=true; } check(failed,'statement must fail'); }
// Model-derived schema: retain actual column types/lengths, required columns and
// keys. Explicit provisioning must work even when required columns have no defaults.
for (const name of ['Tenants','Roles','Users']) {
 const model=fs.readFileSync(path.join(root,`models/${name}.cc`),'utf8');
 const metadata=model.split(`${name}::metaData_={`)[1].split('};')[0];
 const columns=[...metadata.matchAll(/\{"([^"]+)","[^"]+","([^"]+)",(\d+),\d,(\d),(\d)\}/g)].map(m=>{
  let type=m[2]; if(type==='character varying') type+=`(${m[3]})`; if(type==='ARRAY') type='text[]';
  return `"${m[1]}" ${type}${m[4]==='1'?' PRIMARY KEY':m[5]==='1'?' NOT NULL':''}`;
 });
 await db.exec(`CREATE TABLE ${name.toLowerCase()} (${columns.join(',')});`);
}
await db.exec(`ALTER TABLE users ADD CONSTRAINT users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
 ALTER TABLE roles ADD CONSTRAINT roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
 ALTER TABLE tenants ADD CONSTRAINT tenant_creator FOREIGN KEY (creator_user_id) REFERENCES users(id);
 ALTER TABLE users ADD CONSTRAINT user_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id);`);
await db.exec(fs.readFileSync(path.join(root,'database/migrations/002_tenant_live_uniqueness.sql'),'utf8'));
const host='00000000-0000-4000-8000-000000000001', admin='00000000-0000-4000-8000-000000000002';
// Fixed test-only syntactically valid bcrypt hash. Real bcrypt roundtrip is in C++ tests.
const hash='$2a$12$'+'A'.repeat(53);
function seed(email='operator@example.com',passwordHash=hash) {
 return fs.readFileSync(path.join(root,'database/seeds/001_default_host.sql'),'utf8')
  .split('\n').filter(line=>!line.trimStart().startsWith('\\')).join('\n')
  .replaceAll(":'host_admin_email'",`'${email.replaceAll("'","''")}'`)
  .replaceAll(":'host_admin_password_hash'",`'${passwordHash.replaceAll("'","''")}'`);
}
// Failure on the last insert must roll back the tenant and role inserts too.
await db.exec(`ALTER TABLE users ADD CONSTRAINT reject_seed_test CHECK (email <> 'fail-seed@example.com')`);
let failedSeed=false;
try { await db.exec(seed('fail-seed@example.com')); }
catch { failedSeed=true; await db.exec('ROLLBACK'); }
check(failedSeed,'seed fails if the admin insert is rejected');
for (const table of ['tenants','roles','users']) {
 check((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n===0,`failed seed rolls back ${table}`);
}
await db.exec('ALTER TABLE users DROP CONSTRAINT reject_seed_test');
await db.exec(seed());
let seeded=(await db.query('SELECT * FROM users WHERE id=$1',[admin])).rows[0];
check(seeded.tenant_id===host && seeded.username==='admin' && seeded.is_host_admin_user && !seeded.is_tenant_admin_user,'seeded host identity');
check(seeded.created_by_user_id===admin,'bootstrap audit creator');
check((await db.query('SELECT creator_user_id FROM tenants WHERE id=$1',[host])).rows[0].creator_user_id===admin,'host tenant audit creator');
const bootstrapRole='00000000-0000-4000-8000-000000000003';
check((await db.query('SELECT permissions FROM roles WHERE id=$1',[bootstrapRole])).rows[0].permissions.includes('users.manage'),'first-install host role can manage host users');
// Existing installations get the grant through migration 003, without reseeding.
await db.query("UPDATE roles SET permissions=permissions - 'users.manage' WHERE id=$1",[bootstrapRole]);
const grantSql=fs.readFileSync(path.join(root,'database/migrations/003_bootstrap_host_user_management.sql'),'utf8');
await db.exec(grantSql);
let bootstrapPermissions=(await db.query('SELECT permissions FROM roles WHERE id=$1',[bootstrapRole])).rows[0].permissions;
check(bootstrapPermissions.includes('users.manage') && bootstrapPermissions.includes('tenants.create'),'existing install gains host user management without losing permissions');
await db.exec(grantSql);
bootstrapPermissions=(await db.query('SELECT permissions FROM roles WHERE id=$1',[bootstrapRole])).rows[0].permissions;
check(bootstrapPermissions.filter(p=>p==='users.manage').length===1,'host user-management migration is idempotent');

let rerunFailed=false;
try { await db.exec(seed('different@example.com','$2a$12$'+'B'.repeat(53))); }
catch { rerunFailed=true; await db.exec('ROLLBACK'); }
check(rerunFailed,'first-install seed rejects a duplicate run');
check((await db.query('SELECT email,password_hash FROM users WHERE id=$1',[admin])).rows[0].email==='operator@example.com','rerun preserves operator email');
check((await db.query('SELECT password_hash FROM users WHERE id=$1',[admin])).rows[0].password_hash===hash,'rerun preserves password');
check((await db.query('SELECT count(*)::int AS n FROM tenants')).rows[0].n===1,'rerun does not create extra host');
const params=['RhyolitePrimeLtd','RhyolitePrimeLtd','',admin,'kwabenaimhotep@gmail.com','["ledger.read"]',hash];
const result=await db.query(sql.create,params), tenant=result.rows[0].tenant_id, user=result.rows[0].admin_user_id;
check(result.rows.length===1,'create returns provisioned ids');
let t=(await db.query('SELECT * FROM tenants WHERE id=$1',[tenant])).rows[0];
let u=(await db.query('SELECT * FROM users WHERE id=$1',[user])).rows[0];
check(t.connection_string===null && t.is_active && !t.is_deleted,'null connection and live tenant');
check(t.creator_user_id===admin && t.last_modifier_user_id===admin,'tenant create audit');
check(u.tenant_id===tenant && u.first_name==='admin' && u.last_name==='admin' && u.username==='admin','first tenant admin names');
check(u.email===params[4] && u.password_hash===hash && u.is_tenant_admin_user && !u.is_host_admin_user,'tenant admin credentials and isolation');
check(u.created_by_user_id===admin && u.last_modified_by_user_id===admin,'admin create audit');
check((await db.query('SELECT permissions FROM roles WHERE tenant_id=$1',[tenant])).rows[0].permissions[0]==='ledger.read','initial tenant role permissions');
const before=(await db.query('SELECT count(*)::int AS n FROM tenants')).rows[0].n;
await fails(sql.create,['rhyoliteprimeltd',...params.slice(1)]);
check((await db.query('SELECT count(*)::int AS n FROM tenants')).rows[0].n===before,'case insensitive duplicate rolled back');
// Force admin insert failure; its tenant and role must roll back too.
await db.exec(`ALTER TABLE users ADD CONSTRAINT reject_admin_test CHECK (email <> 'fail@example.com')`);
await fails(sql.create,['FailTenant','Failure','',admin,'fail@example.com','[]',hash]);
check((await db.query("SELECT count(*)::int AS n FROM tenants WHERE tenancy_name='FailTenant'")).rows[0].n===0,'admin failure rolls back tenant');
check((await db.query('SELECT count(*)::int AS n FROM roles')).rows[0].n===2,'admin failure rolls back role');
await db.exec('ALTER TABLE users DROP CONSTRAINT reject_admin_test');
let update=await db.query(sql.update,[tenant,false,'',true,'Renamed',true,'secret-connection',admin,true,'new@example.com']);
check(update.rows[0].name==='Renamed','tenant update');
check((await db.query('SELECT email FROM users WHERE id=$1',[user])).rows[0].email==='new@example.com','admin email updated atomically');
check((await db.query('SELECT connection_string FROM tenants WHERE id=$1',[tenant])).rows[0].connection_string==='secret-connection','connection string independent of admin email');
await db.query(sql.update,[tenant,false,'',false,'',true,'',admin,false,'']);
check((await db.query('SELECT connection_string FROM tenants WHERE id=$1',[tenant])).rows[0].connection_string===null,'explicit null clears connection');
// Failed admin update must roll back tenant changes in the same statement.
await db.exec(`ALTER TABLE users ADD CONSTRAINT reject_admin_update CHECK (email <> 'blocked@example.com')`);
await fails(sql.update,[tenant,false,'',true,'ShouldRollBack',false,'',admin,true,'blocked@example.com']);
check((await db.query('SELECT name FROM tenants WHERE id=$1',[tenant])).rows[0].name==='Renamed','admin update failure rolls back tenant update');
await db.exec('ALTER TABLE users DROP CONSTRAINT reject_admin_update');
await db.query('UPDATE users SET is_deleted=true WHERE id=$1',[user]);
check((await db.query(sql.update,[tenant,false,'',true,'NoAdmin',false,'',admin,true,'x@example.com'])).rows.length===0,'deleted admin cannot be updated');
check((await db.query('SELECT name FROM tenants WHERE id=$1',[tenant])).rows[0].name==='Renamed','missing admin does not partially update tenant');
await db.query('UPDATE tenants SET is_deleted=true WHERE id=$1',[tenant]);
check((await db.query(sql.update,[tenant,false,'',true,'Deleted',false,'',admin,false,''])).rows.length===0,'deleted tenant cannot be updated');
await db.close();
console.log(`${checks} PostgreSQL/PGlite checks passed`);
