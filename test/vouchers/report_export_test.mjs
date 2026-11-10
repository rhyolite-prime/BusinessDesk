import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const transpile = s => ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const data = s => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`
const require = createRequire(new URL('../../frontend/package.json',import.meta.url))
const {voucherReport,voucherAmountInWords} = await import(data(transpile(await readFile('frontend/app/features/ledger/voucher-report.ts','utf8'))))
let source=transpile(await readFile('frontend/app/features/ledger/voucher-report-exports.ts','utf8'))
source=source.replace(/import\('([^']+)'\)/g,(_,name)=>`import('${pathToFileURL(require.resolve(name))}')`)
const {createVoucherPdf,createVoucherExcel,createVoucherWord,voucherPdfDefinition}=await import(data(source))
assert.equal(voucherAmountInWords('1080.000000','GHS'),'One Thousand Eighty GHS Only')
assert.equal(voucherAmountInWords('0.995','GHS'),'One GHS Only')
assert.equal(voucherAmountInWords('10000000000000.23','GHS'),'Ten Trillion GHS and 23/100 Only')
const lines=Array.from({length:90},(_,i)=>({accountId:'a',accountNumber:'6100',accountName:'Expense',description:`Line ${i} =1+1`,invoiceNumber:`INV-${i}`,referenceNumber:'REF',organizationUnitName:'Head office',localAmount:'120.000000',foreignAmount:'0',isWithhold:i%2===0}))
const voucher={id:'abc',type:'supplier-payment',voucherNumber:'SPV/1',batchNumber:'B-1',entryDate:'2026-05-21',paymentDate:'2026-05-22',status:'Draft',payeeName:'All Shall Pass',currencyCode:'GHS',baseCurrencyCode:'GHS',netAmount:'108.000000',bankGlAccountName:'1210 — Cash',bankAccountName:'Bank · 123',mode:'Cash',description:'Voucher',chequeNumber:'123',lines,retentions:[{description:'Retention',value:'10',isPercentage:true,accountNumber:'2300',accountName:'Retention',amount:'10.800000'}],taxes:{vat:{enabled:true,rate:'15'}},taxSummary:{gross:'120.000000',base:'100.000000',nhil:'2.500000',getfund:'2.500000',vat:'15.000000',cst:'0.000000',covid:'0.000000',incomeWithholding:'5.000000',vatWithholding:'7.000000',retained:'10.800000',net:'97.200000',lines:lines.map(()=>({gross:'120.000000'}))}}
const report=voucherReport(voucher,'Example Company')
assert.equal(report.id,'voucher-SPV-1')
assert.equal(report.voucherRows[2].cells[2].text,'GHS 97.20')
assert.ok(report.voucherRows.some(row=>row.cells.some(c=>c.text==='VAT (15%)')))
assert.ok(report.voucherRows.every(row=>row.cells.reduce((n,c)=>n+(c.span||1),0)===7))
assert.equal(voucherPdfDefinition(report).content[0].table.body.length,report.voucherRows.length)
assert.throws(()=>voucherReport({...voucher,taxSummary:undefined}),/snapshot/)
const pdf=await createVoucherPdf(report), xlsx=await createVoucherExcel(report), docx=await createVoucherWord(report)
assert.equal(Buffer.from(pdf).subarray(0,4).toString(),'%PDF')
const pdfjs=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')))
const document=await pdfjs.getDocument({data:pdf.slice(),disableWorker:true}).promise
assert.ok(document.numPages>1,'long vouchers paginate')
let text='';for(let i=1;i<=document.numPages;i++)text+=(await (await document.getPage(i)).getTextContent()).items.map(x=>x.str||'').join(' ')
assert.ok(text.includes('Line 89 =1+1')&&text.includes('Retention details')&&text.includes('97.20'),'PDF includes all pages and totals')
await document.destroy()
const ExcelJS=require('exceljs'),book=new ExcelJS.Workbook();await book.xlsx.load(await xlsx.arrayBuffer());const sheet=book.getWorksheet('Voucher')
assert.equal(sheet.pageSetup.orientation,'landscape');assert.ok(sheet.rowCount>100)
let found='';sheet.eachRow(row=>row.eachCell(cell=>{if(cell.value==='Line 89 =1+1')found=cell.value}))
assert.equal(found,'Line 89 =1+1','Excel exports all rows as literal text')
const zip=await require('jszip').loadAsync(await docx.arrayBuffer()),xml=await zip.file('word/document.xml').async('string')
assert.ok(xml.includes('Line 89 =1+1')&&xml.includes('97.20')&&xml.includes('All Shall Pass'),'Word contains all rows and saved totals')
const receipt=voucherReport({...voucher,type:'customer-receipt',receiptDate:'2026-05-22'},'Example Company')
assert.equal(receipt.title,'RECEIPT VOUCHER');assert.equal(receipt.voucherRows[1].cells[0].text,'Received from')
const fx=voucherReport({...voucher,multiCurrency:true,currencyCode:'USD',baseCurrencyCode:'GHS',exchangeRate:'1.2345678901',lines:[{...lines[0],foreignAmount:'99.123456'}]},'Example Company')
assert.ok(fx.voucherRows[5].cells[6].text.includes('USD 99.123456'),'foreign source amount is shown without losing precision')
assert.ok(fx.voucherRows.some(row=>row.cells.some(c=>c.text.includes('1.2345678901'))),'full exchange rate is shown')
console.log('Voucher report formatting, pagination, and PDF/Word/Excel exports passed')
