import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=readFileSync('frontend/app/features/reports/report-timestamp.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {formatReportTimestamp:format}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const value='2026-10-30T12:34:56.123456+00:00'
assert.equal(format(value,'Africa/Accra'),'30 Oct 2026, 12:34')
assert.equal(format(value,'America/New_York'),'30 Oct 2026, 08:34')
assert.equal(format('2026-10-30T00:10:00Z','America/New_York'),'29 Oct 2026, 20:10')
assert.equal(format('2026-10-30T23:50:00Z','Asia/Tokyo'),'31 Oct 2026, 08:50')
assert.equal(format(new Date(value),'Africa/Accra'),format(value,'Africa/Accra'))
assert.equal(format(value,'Invalid/Legacy'),format(value,'UTC'))
assert.equal(format(value,''),format(value,'UTC'))
assert.equal(format(value),format(value,'UTC'))
assert.equal(format('invalid','UTC'),'Date/time unavailable')
assert.equal(format(new Date('invalid')),'Date/time unavailable')
const page=readFileSync('frontend/app/pages/ledger/reports/index.vue','utf8')
assert.match(page,/generatedAt:formatReportTimestamp\(new Date\(\),unitData.timeZone\)/)
assert.match(page,/generatedAt:formatReportTimestamp\(data.generatedAt,unitData.timeZone\)/)
console.log('12 report footer timestamp/timezone checks passed')
