// Real artifact generation, not mocked exporters. Outputs are outside the repository.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const require=createRequire(new URL('../../frontend/package.json',import.meta.url))
const source=await readFile(new URL('../../frontend/app/features/reports/report-exports.ts',import.meta.url),'utf8')
let js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const hierarchySource=await readFile(new URL('../../frontend/app/features/reports/report-hierarchy.ts',import.meta.url),'utf8')
const hierarchyJs=ts.transpileModule(hierarchySource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
js=js.replace("'./report-hierarchy'",`'data:text/javascript;base64,${Buffer.from(hierarchyJs).toString('base64')}'`)
js=js.replace(/import\('([^']+)'\)/g,(_,name)=>`import('${pathToFileURL(require.resolve(name))}')`)
const {createReportPdf,createReportExcel,createReportWord,reportPdfDefinition,reportPalette}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
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

assert.deepEqual(reportPalette('monochrome'),{ink:'000000',accent:'000000',muted:'555555',fill:'EEEEEE'})
assert.notEqual(reportPalette('color').accent,reportPalette('monochrome').accent)
assert.equal(reportPdfDefinition(report,'monochrome').defaultStyle.color,'#000000')
const bwPdf=await createReportPdf(report,'monochrome');await writeFile('/tmp/businessdesk-report-tests/stress-bw.pdf',bwPdf)
const bwExcel=await createReportExcel(report,'monochrome'),bwBook=new ExcelJS.Workbook();await bwBook.xlsx.load(await bwExcel.arrayBuffer());const bwSheet=bwBook.getWorksheet('Report')
assert.equal(bwSheet.getCell('A6').fill.fgColor.argb,'FFEEEEEE');assert.equal(bwSheet.getCell('A6').font.color.argb,'FF000000');assert.equal(bwSheet.pageSetup.blackAndWhite,true)
assert.equal(sheet.getCell('A6').fill.fgColor.argb,'FFDCEFE8');assert.equal(sheet.pageSetup.blackAndWhite,false)
const bwWord=await createReportWord(report,'monochrome'),bwZip=await JSZip.loadAsync(await bwWord.arrayBuffer())
assert.match(await bwZip.file('word/document.xml').async('string'),/w:fill="EEEEEE"/)
assert.doesNotMatch(await bwZip.file('word/header1.xml').async('string'),/176B53/)
console.log('10 report appearance/export checks passed')

for (const mode of ['color','monochrome']) {
 const definition=reportPdfDefinition(report,mode),divider=definition.header.stack.at(-1)
 assert.equal(divider.canvas[0].type,'line')
 assert.equal(divider.canvas[0].lineColor,`#${reportPalette(mode).accent}`)
}
assert.equal(sheet.getCell('A4').border.bottom.style,'thin')
assert.match(await zip.file('word/header1.xml').async('string'),/w:pBdr/)
console.log('6 report header separator checks passed')
const nestedReport={...report,sections:[
 {title:'Asset / Non Current Assets',path:['Asset','Non Current Assets'],rows:report.sections[0].rows.slice(0,100)},
 {title:'Asset / Current Assets / Stocks',path:['Asset','Current Assets','Stocks'],rows:report.sections[0].rows.slice(100,200)},
 {title:'Asset / Current Assets / Debtors',path:['Asset','Current Assets','Debtors'],rows:report.sections[0].rows.slice(200)},
]}
await writeFile('/tmp/businessdesk-report-tests/hierarchy.pdf',await createReportPdf(nestedReport,'monochrome'))
const nestedXlsx=await createReportExcel(nestedReport),nestedBook=new ExcelJS.Workbook();await nestedBook.xlsx.load(await nestedXlsx.arrayBuffer());const nestedSheet=nestedBook.getWorksheet('Report'),labels=[];nestedSheet.eachRow(row=>{if(row.font?.bold&&row.number>5)labels.push(row.getCell(1).value)})
assert.deepEqual(labels,['Asset','Non Current Assets','Current Assets','Stocks','Debtors'])
assert.equal(nestedSheet.getCell('A7').alignment.indent,1)
const nestedWord=await createReportWord(nestedReport),nestedZip=await JSZip.loadAsync(await nestedWord.arrayBuffer()),nestedXml=await nestedZip.file('word/document.xml').async('string')
assert.equal((nestedXml.match(/>Asset<\/w:t>/g)||[]).length,1)
assert.match(nestedXml,/w:left="480"/)
console.log('4 nested export hierarchy checks passed')
