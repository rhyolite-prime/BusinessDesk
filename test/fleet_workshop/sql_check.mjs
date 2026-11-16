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

// 5. Frontend Fleet & Workshop workspace, catalog readiness, BFF routes, and pages exist.
assert.ok(feCatalog.includes("id: 'fleet-workshop-management'") && feCatalog.includes("readiness: 'live'"))
assert.ok(feCatalog.includes("if (moduleId === 'fleet-workshop-management') return '/fleet-workshop'"))
assert.ok(fs.readFileSync('frontend/app/pages/modules/[module].vue', 'utf8').includes("'/fleet-workshop'"))
assert.ok(fs.existsSync('frontend/app/layouts/admin-fleet.vue'))
assert.ok(fs.existsSync('frontend/server/utils/fleet-workshop-api.ts'))
for (const apiRoute of [
  'dashboard/summary.get.ts',
  'gl-settings.get.ts',
  'gl-settings.put.ts',
  'gl-settings/options.get.ts',
  'reports.get.ts',
  'schedules/generate.post.ts',
  '[resource]/index.get.ts',
  '[resource]/index.post.ts',
  '[resource]/next-number.get.ts',
  '[resource]/options.get.ts',
  '[resource]/[id].get.ts',
  '[resource]/[id].put.ts',
  '[resource]/[id].delete.ts',
  '[resource]/[id]/[sub].get.ts',
  '[resource]/[id]/[sub].post.ts',
  '[resource]/[id]/[sub].put.ts',
  '[resource]/[id]/[sub]/[subId].put.ts',
  '[resource]/[id]/[sub]/[subId].delete.ts',
]) {
  assert.ok(fs.existsSync(`frontend/server/api/fleet-workshop/${apiRoute}`), `Missing Nitro API route ${apiRoute}`)
}
for (const page of [
  'index.vue',
  'vehicles/index.vue',
  'asset-groups/index.vue',
  'procedures/index.vue',
  'employees/index.vue',
  'meters/index.vue',
  'fuel-lubs/index.vue',
  'components-tyres/index.vue',
  'schedules/index.vue',
  'diary/index.vue',
  'job-cards/index.vue',
  'reports/index.vue',
  'settings/index.vue',
]) {
  assert.ok(fs.existsSync(`frontend/app/pages/fleet-workshop/${page}`), `Missing Fleet & Workshop page ${page}`)
}

console.log('Fleet & Workshop SQL migration, CMake, and frontend/subscription parity checks passed')

// 6. PostgreSQL / Drogon binary wire-protocol bind-type safety across domain_services/fleet_workshop/*.
// Regression guard against SQLSTATE 22P03 ("insufficient data left in message" at PgBatchConnection.cc:625)
// when 32-bit int or bool C++ args are sent to PostgreSQL parameters inferred as int8/int2/boolean.
const fwmCppFiles = [
  'domain_services/fleet_workshop/FleetWorkshopInternal.h',
  'domain_services/fleet_workshop/FleetWorkshopMaster.cc',
  'domain_services/fleet_workshop/FleetWorkshopOperations.cc',
  'domain_services/fleet_workshop/FleetWorkshopJobs.cc',
]
let checkedExecCalls = 0
for (const file of fwmCppFiles) {
  const src = fs.readFileSync(file, 'utf8')
  let pos = 0
  while (true) {
    const idx = src.indexOf('execSqlCoro(', pos)
    if (idx === -1) break
    let depth = 0
    let i = idx + 'execSqlCoro('.length
    let inStr = false
    let esc = false
    while (i < src.length) {
      const ch = src[i]
      if (inStr) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inStr = false
      } else {
        if (ch === '"') inStr = true
        else if (ch === '(') depth++
        else if (ch === ')') {
          if (depth === 0) break
          depth--
        }
      }
      i++
    }
    const call = src.slice(idx, i + 1)
    pos = i + 1
    checkedExecCalls++
    const line = src.slice(0, idx).split('\n').length
    const sql = [...call.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join(' ')
    const argsPart = call.slice('execSqlCoro('.length, -1).replace(/"(?:[^"\\]|\\.)*"/g, '""')

    assert.equal(
      /\b(LIMIT|OFFSET)\s+\$\d+(?!::bigint)\b/.test(sql),
      false,
      `${file}:${line} has LIMIT/OFFSET placeholder without ::bigint: ${sql}`,
    )
    assert.equal(
      /\bversion=\$\d+(?!::int)\b/.test(sql),
      false,
      `${file}:${line} has version=$N without ::int: ${sql}`,
    )
    assert.equal(
      /\(\$[0-9]+=''\s+OR\s+[a-z0-9_.]+\s*(?:=|>=|<=)\s*\$\d+::(?:uuid|date)\)/.test(sql),
      false,
      `${file}:${line} has unguarded empty-string ::uuid/::date filter without NULLIF: ${sql}`,
    )
    if (/\bLIMIT\s+\$\d+::bigint\b/.test(sql)) {
      assert.equal(
        /static_cast<long long>/.test(argsPart) || /\bsize\b/.test(argsPart),
        false,
        `${file}:${line} must pass int64_t limit/offset variables, not size/long long`,
      )
      assert.ok(
        /\blimit,\s*offset\b/.test(argsPart),
        `${file}:${line} must pass limit, offset (int64_t) to LIMIT/OFFSET`,
      )
    }
    if (sql.includes('INSERT INTO fwm_document_sequences') && sql.includes('padding')) {
      assert.ok(
        sql.includes('($5::int)::smallint'),
        `${file}:${line} padding bind must explicitly cast ($5::int)::smallint`,
      )
    }
    if (
      (sql.includes('INSERT INTO fwm_job_milestones') || sql.includes('UPDATE fwm_job_milestones')) &&
      sql.includes('progress_pct')
    ) {
      assert.ok(
        /\(\$(?:11|12)::int\)::smallint/.test(sql),
        `${file}:${line} progress_pct bind must explicitly cast ::smallint`,
      )
    }
    if (/\b(?:asBool\(\)|withinTol|scrapped)\b/.test(argsPart)) {
      assert.ok(
        /\$\d+::boolean\b/.test(sql),
        `${file}:${line} bool bind must explicitly cast ::boolean`,
      )
    }
  }
}
assert.ok(checkedExecCalls >= 90, `Expected >=90 execSqlCoro calls in fleet_workshop, checked ${checkedExecCalls}`)
console.log(`PostgreSQL binary bind safety checks passed across ${checkedExecCalls} execSqlCoro calls`)
