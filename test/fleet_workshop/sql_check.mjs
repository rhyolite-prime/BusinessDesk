import assert from 'node:assert/strict'
import fs from 'node:fs'

const upSql = fs.readFileSync('database/migrations/041_fleet_workshop_management.sql', 'utf8')
const downSql = fs.readFileSync('database/migrations/041_fleet_workshop_management.down.sql', 'utf8')
const cmake = fs.readFileSync('CMakeLists.txt', 'utf8')
const constsH = fs.readFileSync('constants/BusinessDeskConsts.h', 'utf8')
const tenantAcctCc = fs.readFileSync('domain_services/tenants/TenantAccountService.cc', 'utf8')
const feTenantAcct = fs.readFileSync('frontend/app/features/tenant-account.ts', 'utf8')
const feCatalog = fs.readFileSync('frontend/app/features/modules/catalog.ts', 'utf8')
const feNav = fs.readFileSync('frontend/layers/shared/app/plugins/nav.registry.ts', 'utf8')
const feModules = fs.readFileSync('frontend/app/features/shared/modules.ts', 'utf8')

// 1. All 26 fwm_* tables exist, register in core_tenant_reset_registry, and reverse in .down.sql.
const createdTables = [...upSql.matchAll(/CREATE TABLE (fwm_[a-z0-9_]+)/g)].map((m) => m[1])
assert.equal(createdTables.length, 26, `Expected 26 fwm_* tables, got ${createdTables.length}`)
for (const tbl of createdTables) {
  assert.ok(upSql.includes(`('${tbl}','Fleet & Workshop Management'`), `Missing reset registry entry for ${tbl}`)
  assert.ok(downSql.includes(`DROP TABLE IF EXISTS ${tbl}`), `Missing DROP TABLE for ${tbl}`)
}

// 1b. No composite keys (no composite PK, UNIQUE table constraint, or composite FK) for Drogon C++ compatibility.
assert.equal([...upSql.matchAll(/\bPRIMARY KEY\s*\(/gi)].length, 0, 'Unexpected composite PRIMARY KEY')
assert.equal([...upSql.matchAll(/\bUNIQUE\s*\(/gi)].length, 0, 'Unexpected composite UNIQUE table constraint')
assert.equal([...upSql.matchAll(/\bFOREIGN KEY\s*\([^)]*,[^)]*\)/gi)].length, 0, 'Unexpected composite FOREIGN KEY')
for (const idx of [
  'uq_fwm_document_sequences_scope',
  'uq_fwm_job_card_lines_number',
  'uq_fwm_component_events_version',
  'uq_fwm_tyre_events_version',
  'uq_fwm_job_card_events_version',
]) {
  assert.ok(upSql.includes(`CREATE UNIQUE INDEX ${idx}`), `Missing unique index ${idx}`)
}

// 2. CMakeLists registers all Fleet & Workshop sources.
for (const src of [
  'domain_services/fleet_workshop/FleetWorkshopService.h',
  'domain_services/fleet_workshop/FleetWorkshopInternal.h',
  'domain_services/fleet_workshop/FleetWorkshopMaster.cc',
  'domain_services/fleet_workshop/FleetWorkshopOperations.cc',
  'domain_services/fleet_workshop/FleetWorkshopJobs.cc',
]) {
  assert.ok(cmake.includes(src), `CMakeLists.txt missing ${src}`)
}

// 3. System numbers enum parity stays at 16 (matching test/system_numbers/modules_test.mjs),
//    while tenant subscription & frontend catalog align on fleet_workshop_management.
const enumBody = constsH.match(/enum class Modules\s*:\s*int\s*\{([^}]+)\}/)[1]
const enumEntries = [...enumBody.matchAll(/(\w+)\s*=\s*(\d+)/g)]
assert.equal(enumEntries.length, 16)
assert.ok(feModules.includes('CustomerRelationshipManagement = 15'))
assert.ok(tenantAcctCc.includes('"fleet-workshop-management", "fleet_workshop_management"'))
assert.ok(feTenantAcct.includes("fleet_workshop_management: 'Fleet & Workshop Management'"))
assert.ok(feTenantAcct.includes("'fleet-workshop-management': 'fleet_workshop_management'"))
assert.ok(feCatalog.includes("id: 'fleet-workshop-management'"))
assert.ok(feNav.includes("to: '/modules/fleet-workshop-management'"))

// 4. Transactional SupplyChainService::createRequisition exposed cleanly.
const scmH = fs.readFileSync('domain_services/supply_chain/SupplyChainService.h', 'utf8')
assert.ok(scmH.includes('createRequisition(drogon::orm::DbClientPtr transaction'))

console.log('Fleet & Workshop SQL migration, CMake, and frontend/subscription parity checks passed')
