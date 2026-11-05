import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=readFileSync('frontend/app/features/reports/report-timestamp.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {formatReportTimestamp:format,formatReportDate,formatReportRate}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const value='2026-10-30T12:34:56.123456+00:00'
assert.equal(format(value,'Africa/Accra'),'30-Oct-2026, 12:34')
assert.equal(format(value,'America/New_York'),'30-Oct-2026, 08:34')
assert.equal(format('2026-10-30T00:10:00Z','America/New_York'),'29-Oct-2026, 20:10')
assert.equal(format('2026-10-30T23:50:00Z','Asia/Tokyo'),'31-Oct-2026, 08:50')
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

assert.equal(formatReportDate('2026-01-03'),'03-Jan-2026')
assert.equal(formatReportDate('2024-02-29'),'29-Feb-2024')
assert.equal(formatReportRate('1'),'1.00')
assert.equal(formatReportRate('1.2345678910'),'1.23')
assert.equal(formatReportRate('1.0050000000'),'1.01')
assert.equal(formatReportRate('0.9999999999'),'1.00')
assert.equal(formatReportRate('99999999999999.995'),'100000000000000.00')
assert.throws(()=>formatReportRate('NaN'),/Invalid exchange rate/)
console.log('8 exact report date/rate display checks passed')
