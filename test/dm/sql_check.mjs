import assert from 'node:assert/strict'
import fs from 'node:fs'

const upSql = fs.readFileSync('database/migrations/042_document_management.sql', 'utf8')
const downSql = fs.readFileSync('database/migrations/042_document_management.down.sql', 'utf8')
const cmake = fs.readFileSync('CMakeLists.txt', 'utf8')
const constsH = fs.readFileSync('constants/BusinessDeskConsts.h', 'utf8')
const feCatalog = fs.readFileSync('frontend/app/features/modules/catalog.ts', 'utf8')
const feNav = fs.readFileSync('frontend/layers/shared/app/plugins/nav.registry.ts', 'utf8')

// 1. All 12 dm_* tables exist, register in core_tenant_reset_registry, and reverse in .down.sql.
const createdTables = [...upSql.matchAll(/CREATE TABLE (dm_[a-z0-9_]+)/g)].map((m) => m[1])
assert.equal(createdTables.length, 12, `Expected 12 dm_* tables, got ${createdTables.length}`)
for (const tbl of createdTables) {
  assert.ok(upSql.includes(`('${tbl}', 'Document Management'`), `Missing reset registry entry for ${tbl}`)
  assert.ok(downSql.includes(`DROP TABLE IF EXISTS ${tbl}`), `Missing DROP TABLE for ${tbl}`)
}

// 1b. No composite keys (no composite PK, UNIQUE table constraint, or composite FK) for Drogon C++ compatibility.
assert.equal([...upSql.matchAll(/\bPRIMARY KEY\s*\(/gi)].length, 0, 'Unexpected composite PRIMARY KEY')
assert.equal([...upSql.matchAll(/\bUNIQUE\s*\(/gi)].length, 0, 'Unexpected composite UNIQUE table constraint')
assert.equal([...upSql.matchAll(/\bFOREIGN KEY\s*\([^)]*,[^)]*\)/gi)].length, 0, 'Unexpected composite FOREIGN KEY')
for (const idx of [
  'uq_dm_document_sequences_scope',
  'uq_dm_folders_name_parent',
  'uq_dm_retention_policies_name',
  'uq_dm_templates_code',
  'uq_dm_documents_number',
  'uq_dm_document_versions_label',
  'uq_dm_document_relations_pair',
  'uq_dm_bookmarks_user_doc',
  'uq_dm_saved_searches_user_name',
]) {
  assert.ok(upSql.includes(`CREATE UNIQUE INDEX ${idx}`), `Missing unique index ${idx}`)
}

// 2. CMakeLists registers all Document Management sources.
for (const src of [
  'domain_services/dm/DmService.h',
  'domain_services/dm/DmInternal.h',
  'domain_services/dm/DmFolders.cc',
  'domain_services/dm/DmDocuments.cc',
  'domain_services/dm/DmWorkflows.cc',
  'domain_services/dm/DmService.cc',
]) {
  assert.ok(cmake.includes(src), `CMakeLists.txt missing ${src}`)
}

// 3. Consts enum parity
assert.ok(constsH.includes('DocumentManagement    = 13'))
assert.ok(feCatalog.includes("id: 'document-management'"))
assert.ok(feCatalog.includes("readiness: 'live'"))
assert.ok(feCatalog.includes("if (moduleId === 'document-management') return '/documents'"))
assert.ok(feNav.includes("to: '/documents'"))

// 4. Frontend workspace, BFF routes, and pages exist.
assert.ok(fs.readFileSync('frontend/app/pages/modules/[module].vue', 'utf8').includes("'/documents'"))
assert.ok(fs.existsSync('frontend/app/layouts/admin-dm.vue'))
assert.ok(fs.existsSync('frontend/server/utils/dm-api.ts'))
for (const apiRoute of [
  'summary.get.ts',
  'next-number.get.ts',
  'audit.get.ts',
  'trash/index.get.ts',
  'trash/[id]/restore.post.ts',
  'trash/[id]/purge.delete.ts',
  '[resource]/index.get.ts',
  '[resource]/index.post.ts',
  '[resource]/[id].get.ts',
  '[resource]/[id].put.ts',
  '[resource]/[id].delete.ts',
  '[resource]/[id]/[action].post.ts',
  '[resource]/[id]/[sub].get.ts',
  '[resource]/[id]/[sub].post.ts',
  '[resource]/[id]/[sub]/[subId].delete.ts',
  '[resource]/[id]/[sub]/[subId]/[action].post.ts',
]) {
  assert.ok(fs.existsSync(`frontend/server/api/documents/${apiRoute}`), `Missing Nitro API route ${apiRoute}`)
}

// 4b. Guard against Nitro radix3 static-prefix shadowing of dynamic [resource] routes.
const dmApiSrc = fs.readFileSync('frontend/server/utils/dm-api.ts', 'utf8')
const resourceSetBody = dmApiSrc.match(/dmResources\s*=\s*new Set\(\[([\s\S]*?)\]\)/)[1]
const dmResList = [...resourceSetBody.matchAll(/'([^']+)'/g)].map((m) => m[1])
for (const resName of dmResList) {
  assert.equal(
    fs.existsSync(`frontend/server/api/documents/${resName}`),
    false,
    `Static directory frontend/server/api/documents/${resName} shadows [resource] in Nitro radix3 router`,
  )
}

// 4c. Verify pages exist
for (const page of [
  'index.vue',
  'explorer.vue',
  'search.vue',
  'approvals.vue',
  'templates.vue',
  'retention.vue',
  'trash.vue',
  'audit.vue',
]) {
  assert.ok(fs.existsSync(`frontend/app/pages/documents/${page}`), `Missing Document Management page ${page}`)
}

console.log('Document Management SQL migration, CMake, and frontend catalog checks passed')

// 5. PostgreSQL / Drogon binary wire-protocol bind-type safety across domain_services/dm/*.
const dmCppFiles = [
  'domain_services/dm/DmInternal.h',
  'domain_services/dm/DmFolders.cc',
  'domain_services/dm/DmDocuments.cc',
  'domain_services/dm/DmWorkflows.cc',
  'domain_services/dm/DmService.cc',
  'controllers/DmController.cc',
]
let checkedExecCalls = 0
for (const file of dmCppFiles) {
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

    assert.equal(
      /\b(LIMIT|OFFSET)\s+\$\d+(?!::bigint)\b/.test(sql),
      false,
      `${file}:${line} has LIMIT/OFFSET placeholder without ::bigint: ${sql}`,
    )
    assert.equal(
      /\(\$[0-9]+=''\s+OR\s+[a-z0-9_.]+\s*(?:=|>=|<=)\s*\$\d+::(?:uuid|date)\)/.test(sql),
      false,
      `${file}:${line} has unguarded empty-string ::uuid/::date filter without NULLIF: ${sql}`,
    )
  }
}
assert.ok(checkedExecCalls >= 40, `Expected >=40 execSqlCoro calls in dm, checked ${checkedExecCalls}`)
console.log(`PostgreSQL binary bind safety checks passed across ${checkedExecCalls} execSqlCoro calls in Document Management`)
