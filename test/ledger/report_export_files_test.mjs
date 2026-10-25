// Real artifact generation, not mocked exporters. Outputs are outside the repository.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const require=createRequire(new URL('../../frontend/package.json',import.meta.url))
const source=await readFile(new URL('../../frontend/app/features/reports/report-exports.ts',import.meta.url),'utf8')
let js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
js=js.replace(/import\('([^']+)'\)/g,(_,name)=>`import('${pathToFileURL(require.resolve(name))}')`)
const {createReportPdf,createReportExcel,createReportWord}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const report={id:'stress',title:'CHART OF ACCOUNTS',companyName:'Example Company',subtitle:'Head office · All statuses',generatedAt:'25 Oct 2026, 12:00',columns:[{key:'number',title:'Account No.',width:19},{key:'name',title:'Account Name',width:59},{key:'currency',title:'Currency',width:22}],sections:[{title:'Assets / Current Assets / Cash',rows:Array.from({length:500},(_,i)=>[String(10000+i),`Account ${i} — ${'A long account description '.repeat(i%5===0?7:1)}`,'Ghana Cedi'])}]}
report.sections[0].rows[0]=['00100','=HYPERLINK("https://example.invalid","Not a formula") <script> & Café','Ghana Cedi']
await mkdir('/tmp/businessdesk-report-tests',{recursive:true})
const pdf=await createReportPdf(report);assert.equal(Buffer.from(pdf).subarray(0,4).toString(),'%PDF');await writeFile('/tmp/businessdesk-report-tests/stress.pdf',pdf)
const excel=await createReportExcel(report);const word=await createReportWord(report)
await writeFile('/tmp/businessdesk-report-tests/stress.xlsx',Buffer.from(await excel.arrayBuffer()));await writeFile('/tmp/businessdesk-report-tests/stress.docx',Buffer.from(await word.arrayBuffer()))
const ExcelJS=require('exceljs'),book=new ExcelJS.Workbook();await book.xlsx.load(await excel.arrayBuffer());const sheet=book.getWorksheet('Report')
assert.equal(sheet.getCell('A7').value,'00100');assert.equal(sheet.getCell('B7').type,ExcelJS.ValueType.String);assert.equal(sheet.rowCount,506);assert.equal(sheet.pageSetup.printTitlesRow,'1:5');assert.match(sheet.headerFooter.oddFooter,/Page &P of &N/)
const JSZip=require('jszip'),zip=await JSZip.loadAsync(await word.arrayBuffer())
assert.match(await zip.file('word/header1.xml').async('string'),/Example Company/);assert.match(await zip.file('word/footer1.xml').async('string'),/NUMPAGES/);assert.match(await zip.file('word/document.xml').async('string'),/tblHeader/);assert.match(await zip.file('word/document.xml').async('string'),/&lt;script&gt;/)
console.log('10 native export structure/security checks passed (500 wrapped records)')
