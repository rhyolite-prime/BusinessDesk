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
assert.equal(voucherAmountInWords('1080.000000','GHS'),'One Thousand Eighty Ghana Cedi Only')
assert.equal(voucherAmountInWords('0.995','GHS'),'One Ghana Cedi Only')
assert.equal(voucherAmountInWords('10000000000000.23','GHS'),'Ten Trillion Ghana Cedi and 23 Pesewas Only')
assert.equal(voucherAmountInWords('2833.33','GHS'),'Two Thousand Eight Hundred Thirty-Three Ghana Cedi and 33 Pesewas Only')
assert.equal(voucherAmountInWords('2833.00','GHS'),'Two Thousand Eight Hundred Thirty-Three Ghana Cedi Only')
assert.equal(voucherAmountInWords('0.01','GHS'),'Zero Ghana Cedi and 1 Pesewa Only')
assert.equal(voucherAmountInWords('5.01','USD'),'Five US Dollar and 1 Cent Only')
assert.equal(voucherAmountInWords('5.25','GBP'),'Five British Pound and 25 Pence Only')
assert.equal(voucherAmountInWords('5.25','XYZ'),'Five XYZ and 25/100 Only')
const lines=Array.from({length:90},(_,i)=>({accountId:'a',accountNumber:'6100',accountName:'Expense',description:`Line ${i} =1+1`,invoiceNumber:`INV-${i}`,referenceNumber:'REF',organizationUnitName:'Head office',localAmount:'120.000000',foreignAmount:'0',isWithhold:i%2===0}))
const voucher={id:'abc',type:'supplier-payment',voucherNumber:'SPV/1',batchNumber:'B-1',entryDate:'2026-05-21',paymentDate:'2026-05-22',status:'Draft',payeeName:'All Shall Pass',currencyCode:'GHS',baseCurrencyCode:'GHS',netAmount:'108.000000',bankGlAccountName:'1210 — Cash',bankAccountName:'Bank · 123',mode:'Cash',description:'Voucher',chequeNumber:'123',lines,retentions:[{description:'Retention',value:'10',isPercentage:true,accountNumber:'2300',accountName:'Retention',amount:'10.800000'}],taxes:{vat:{enabled:true,rate:'15'}},taxSummary:{gross:'120.000000',base:'100.000000',nhil:'2.500000',getfund:'2.500000',vat:'15.000000',cst:'0.000000',covid:'0.000000',incomeWithholding:'5.000000',vatWithholding:'7.000000',retained:'10.800000',net:'97.200000',lines:lines.map(()=>({gross:'120.000000'}))}}
const report=voucherReport(voucher,'Example Company')
assert.equal(report.id,'voucher-SPV-1')
assert.equal(report.subtitle,'Voucher SPV/1 · Base currency GHS')
assert.equal(voucherReport({...voucher,status:'Posted'}).subtitle,'Voucher SPV/1 · Posted · Base currency GHS')
assert.equal(report.voucherRows[2].cells[2].text,'GHS 97.20')
assert.equal(report.voucherRows[2].cells[1].text,'Ninety-Seven Ghana Cedi and 20 Pesewas Only')
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
assert.ok(!text.includes('Draft'),'PDF does not display draft status')
assert.ok(text.includes('Line 89 =1+1')&&text.includes('Retention details')&&text.includes('97.20'),'PDF includes all pages and totals')
assert.ok(text.includes('Ninety-Seven Ghana Cedi and 20 Pesewas Only'),'PDF includes currency names in amount in words')
await document.destroy()
const ExcelJS=require('exceljs'),book=new ExcelJS.Workbook();await book.xlsx.load(await xlsx.arrayBuffer());const sheet=book.getWorksheet('Voucher')
assert.ok(!String(sheet.getRow(2).getCell(1).value).includes('Draft'),'Excel does not display draft status')
assert.equal(sheet.pageSetup.orientation,'landscape');assert.ok(sheet.rowCount>100)
let found='';sheet.eachRow(row=>row.eachCell(cell=>{if(cell.value==='Line 89 =1+1')found=cell.value}))
assert.equal(found,'Line 89 =1+1','Excel exports all rows as literal text')
const zip=await require('jszip').loadAsync(await docx.arrayBuffer()),xml=await zip.file('word/document.xml').async('string')
assert.ok(!xml.includes('Draft'),'Word does not display draft status')
assert.ok(xml.includes('Line 89 =1+1')&&xml.includes('97.20')&&xml.includes('All Shall Pass'),'Word contains all rows and saved totals')
const receipt=voucherReport({...voucher,type:'customer-receipt',receiptDate:'2026-05-22'},'Example Company')
assert.equal(receipt.title,'RECEIPT VOUCHER');assert.equal(receipt.voucherRows[1].cells[0].text,'Received from')

// Customer receipt Official Receipt redesign checks
const receiptVoucher = {
  ...voucher,
  type: 'customer-receipt',
  voucherNumber: 'TTU25538RCT',
  batchNumber: 'R28924V',
  receiptDate: '2026-07-09',
  payeeName: 'YEBOAH VICTORIA AFRIYIE',
  description: 'Rental of Auditorium',
  chequeNumber: '342432',
  lines: [{ ...lines[0], invoiceNumber: 'sdfsd', referenceNumber: 'ASW342D', localAmount: '5214.320000' }],
  taxSummary: { ...voucher.taxSummary, net: '5214.320000' },
  preparer: 'Admin',
}

// 1. Without logo (null/empty)
const receiptWithoutLogo = voucherReport(receiptVoucher, { companyName: 'SISCO-DEMO-UNLICENSED', address: 'P.O. Box 256', phoneNo: '0312021227/8 Fax: 0312021227' })
assert.equal(receiptWithoutLogo.landscape, false)
assert.equal(receiptWithoutLogo.receiptData.receiptNo, 'TTU25538RCT')
assert.equal(receiptWithoutLogo.receiptData.date, '09-Jul-2026')
assert.equal(receiptWithoutLogo.receiptData.batchNo, 'R28924V')
assert.equal(receiptWithoutLogo.receiptData.rv, 'ASW342D')
assert.equal(receiptWithoutLogo.receiptData.regNo, 'sdfsd')
assert.equal(receiptWithoutLogo.receiptData.receivedFrom, 'YEBOAH VICTORIA AFRIYIE')
assert.equal(receiptWithoutLogo.receiptData.being, 'Rental of Auditorium')
assert.equal(receiptWithoutLogo.receiptData.chequeNo, '342432')
assert.ok(receiptWithoutLogo.receiptData.theSumOf.endsWith('ONLY'))
assert.equal(receiptWithoutLogo.receiptData.amountPaid, 'GHS 5,214.32')
assert.equal(receiptWithoutLogo.receiptData.admin, 'Admin')

const receiptPdfDef = voucherPdfDefinition(receiptWithoutLogo)
assert.equal(receiptPdfDef.pageOrientation, 'portrait')
assert.equal(receiptPdfDef.pageSize, 'A4')

const receiptPdfBytes = await createVoucherPdf(receiptWithoutLogo)
assert.equal(Buffer.from(receiptPdfBytes).subarray(0, 4).toString(), '%PDF')
const receiptDoc = await pdfjs.getDocument({ data: receiptPdfBytes.slice(), disableWorker: true }).promise
assert.equal(receiptDoc.numPages, 1, 'Two receipts fit on a single A4 portrait page')
let receiptText = ''
for (let i = 1; i <= receiptDoc.numPages; i++) {
  receiptText += (await (await receiptDoc.getPage(i)).getTextContent()).items.map(x => x.str || '').join(' ')
}
assert.ok(receiptText.includes('OFFICIAL RECEIPT'), 'Receipt PDF contains OFFICIAL RECEIPT')
assert.ok(receiptText.includes('Receipt From :'), 'Receipt PDF contains Receipt From :')
assert.ok(receiptText.includes('The Sum of'), 'Receipt PDF contains The Sum of')
assert.ok(receiptText.includes('being'), 'Receipt PDF contains being')
assert.ok(receiptText.includes('Cheque No'), 'Receipt PDF contains Cheque No')
assert.ok(receiptText.includes('Amount Paid'), 'Receipt PDF contains Amount Paid')
assert.ok(receiptText.includes('YEBOAH VICTORIA AFRIYIE'), 'Receipt PDF contains customer name')
assert.ok(receiptText.includes('Rental of Auditorium'), 'Receipt PDF contains purpose')
assert.ok(receiptText.includes('342432'), 'Receipt PDF contains cheque number')
assert.ok(receiptText.includes('GHS 5,214.32'), 'Receipt PDF contains amount paid')
assert.ok(receiptText.includes('Report Printed On'), 'Receipt PDF contains Report Printed On')
assert.ok(receiptText.includes('BusinessDesk · G/L'), 'Receipt PDF contains system title')
assert.ok(receiptText.includes('Page 1 of 1'), 'Receipt PDF contains Page 1 of 1')
assert.ok(receiptText.includes('Admin'), 'Receipt PDF contains Admin signature')
await receiptDoc.destroy()

// 2. With logo (base64 data URL)
const sampleLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const receiptWithLogo = voucherReport(receiptVoucher, { companyName: 'SISCO-DEMO-UNLICENSED', companyLogoUrl: sampleLogo, address: 'P.O. Box 256', phoneNo: '0312021227' })
assert.equal(receiptWithLogo.companyLogoUrl, sampleLogo)
const receiptWithLogoPdf = await createVoucherPdf(receiptWithLogo)
const receiptWithLogoDoc = await pdfjs.getDocument({ data: receiptWithLogoPdf.slice(), disableWorker: true }).promise
assert.equal(receiptWithLogoDoc.numPages, 1, 'Receipt with logo fits on 1 page')
await receiptWithLogoDoc.destroy()

const receiptXlsx = await createVoucherExcel(receiptWithoutLogo)
assert.ok(receiptXlsx.size > 0, 'Receipt Excel export succeeds')
const receiptDocx = await createVoucherWord(receiptWithoutLogo)
assert.ok(receiptDocx.size > 0, 'Receipt Word export succeeds')
const fx=voucherReport({...voucher,multiCurrency:true,currencyCode:'USD',baseCurrencyCode:'GHS',exchangeRate:'1.2345678901',lines:[{...lines[0],foreignAmount:'99.123456'}]},'Example Company')
assert.equal(fx.voucherRows[2].cells[1].text,'Ninety-Seven Ghana Cedi and 20 Pesewas Only','amount in words uses the base currency')
assert.ok(fx.voucherRows[5].cells[6].text.includes('USD 99.123456'),'foreign source amount is shown without losing precision')
assert.ok(fx.voucherRows.some(row=>row.cells.some(c=>c.text.includes('1.2345678901'))),'full exchange rate is shown')
console.log('Voucher report formatting, pagination, and PDF/Word/Excel exports passed')
