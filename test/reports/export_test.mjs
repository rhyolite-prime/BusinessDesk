// Generate the actual PDF/Excel/Word artifacts for every financial report variant.
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const data=js=>`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
const require=createRequire(new URL('../../frontend/package.json',import.meta.url))
const {financialReport,reportCatalog}=await import(data(transpile(await readFile('frontend/app/features/reports/financial-reports.ts','utf8'))))
const hierarchy=data(transpile(await readFile('frontend/app/features/reports/report-hierarchy.ts','utf8')))
let exports=transpile(await readFile('frontend/app/features/reports/report-exports.ts','utf8')).replace("'./report-hierarchy'",JSON.stringify(hierarchy))
exports=exports.replace(/import\('([^']+)'\)/g,(_,name)=>`import('${pathToFileURL(require.resolve(name))}')`)
const {createReportPdf,createReportExcel,createReportWord,reportPdfDefinition}=await import(data(exports))
const accounts=[{id:'cash',number:'10001',name:'Cash',type:0,category:'current_asset'},{id:'sales',number:'40001',name:'Sales',type:3,category:'revenue'}]
const lines=accounts.map((account,i)=>({id:String(i),accountId:account.id,accountName:account.name,type:account.type,batchId:'batch',batchNumber:'JV-1',date:'2026-10-01',batchDate:'2026-10-01',description:'=NOT_A_FORMULA <literal text>',reference:'R1',source:'general_journal',costCenterId:null,costCenter:null,currency:'GHS',rate:'1',debit:i?'0':'25.123456',credit:i?'25.123456':'0',transactionDebit:i?'0':'25.123456',transactionCredit:i?'25.123456':'0',opening:false}))
const {formatReportTimestamp}=await import(data(transpile(await readFile('frontend/app/features/reports/report-timestamp.ts','utf8'))))
const printedOn=formatReportTimestamp('2026-10-28T12:00:00.123456+00:00','Africa/Accra')
const snapshot={companyName:'Example Company',unitName:'Head office',currencyCode:'GHS',decimals:4,fiscalMonth:1,generatedAt:printedOn,through:'2026-10-31',accounts,lines,budgets:[]}
const ExcelJS=require('exceljs'),JSZip=require('jszip')
await mkdir('/tmp/businessdesk-financial-exports',{recursive:true})
let checks=0
for(const [kind] of reportCatalog){
 const {report}=financialReport(snapshot,{kind,from:'2026-10-01',to:'2026-10-31'})
 assert.ok(Math.abs(report.columns.reduce((sum,c)=>sum+c.width,0)-100)<0.01);checks++
 const pdf=await createReportPdf(report)
 assert.ok(Buffer.from(pdf).includes(Buffer.from('Roboto'))&&!Buffer.from(pdf).includes(Buffer.from('Tinos')));checks++
 const xlsx=await createReportExcel(report),docx=await createReportWord(report)
 assert.equal(Buffer.from(pdf).subarray(0,4).toString(),'%PDF');checks++
 const book=new ExcelJS.Workbook();await book.xlsx.load(await xlsx.arrayBuffer());assert.equal(book.getWorksheet('Report').getCell('A2').value,report.title);checks++
 assert.equal(book.getWorksheet('Report').pageSetup.orientation,report.landscape?'landscape':'portrait');checks++
 const zip=await JSZip.loadAsync(await docx.arrayBuffer());assert.match(await zip.file('word/header1.xml').async('string'),/Example Company/);checks++
 assert.equal(reportPdfDefinition(report).footer(1,2).stack[1].columns[0].text,`Report printed on ${printedOn}`);checks++
 assert.ok(book.getWorksheet('Report').headerFooter.oddFooter.includes(`Report printed on ${printedOn}`));checks++
 assert.ok((await zip.file('word/footer1.xml').async('string')).includes(`Report printed on ${printedOn}`));checks++
 assert.equal(reportPdfDefinition(report).pageOrientation,report.landscape?'landscape':'portrait');checks++
 if(kind==='trial-balance'){
  const sheet=book.getWorksheet('Report'),last=sheet.getRow(sheet.rowCount)
  assert.equal(last.getCell(2).value,'GRAND TOTAL');assert.equal(last.getCell(3).value,'25.1235');assert.equal(last.getCell(4).value,'25.1235');assert.equal(last.getCell(3).font.bold,true)
  const definition=reportPdfDefinition(report),body=definition.content[0].table.body
  assert.equal(body.at(-1)[1].text,'GRAND TOTAL');assert.equal(body.at(-1)[2].bold,true);assert.match(body.at(-1)[1].id,/^report-account-/)
  const document=await zip.file('word/document.xml').async('string');assert.match(document,/GRAND TOTAL/);checks+=8
 }
 await writeFile(`/tmp/businessdesk-financial-exports/${kind}.pdf`,pdf)
 await writeFile(`/tmp/businessdesk-financial-exports/${kind}.xlsx`,Buffer.from(await xlsx.arrayBuffer()))
 await writeFile(`/tmp/businessdesk-financial-exports/${kind}.docx`,Buffer.from(await docx.arrayBuffer()))
}
console.log(`${checks} native financial report export checks passed (${reportCatalog.length*3} artifacts outside Git)`)
