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
  voucherNumber: 'VOUCHER-1',
  receiptNo: 'TTU25538RCT',
  receiptNumber: 'TTU25538RCT',
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
assert.equal(receiptWithoutLogo.receiptData.receiptNo, 'TTU25538RCT', 'The receipt number is distinct from the batch/voucher number')
assert.equal(voucherReport({ ...receiptVoucher, receiptNo: undefined, receiptNumber: 'ALTERNATE-RECEIPT' }).receiptData.receiptNo, 'ALTERNATE-RECEIPT')
assert.equal(voucherReport({ ...receiptVoucher, receiptNo: undefined, receiptNumber: undefined }).receiptData.receiptNo, 'VOUCHER-1', 'Older receipts fall back to the voucher number')
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

const occurrences = (text, value) => text.split(value).length - 1
const compact = text => text.replace(/\s+/g, '')
async function pdfPages(bytes) {
  const pdfDoc = await pdfjs.getDocument({ data: bytes.slice(), disableWorker: true }).promise
  const pages = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const items = (await page.getTextContent()).items.filter(item => typeof item.str === 'string')
    const viewport = page.getViewport({ scale: 1 })
    pages.push({ items, width: viewport.width, height: viewport.height, text: items.map(item => item.str).join(' '), compact: compact(items.map(item => item.str).join('')) })
  }
  await pdfDoc.destroy()
  return pages
}
function assertTextInsidePaper(page, description) {
  for (const item of page.items.filter(item => item.str.trim())) {
    assert.ok(item.transform[4] >= 30 && item.transform[4] + item.width <= page.width - 30
      && item.transform[5] >= 8 && item.transform[5] + item.height <= page.height - 8,
      `${description}: text stays inside the printable page: ${item.str}`)
  }
}

const receiptPdfBytes = await createVoucherPdf(receiptWithoutLogo)
assert.equal(Buffer.from(receiptPdfBytes).subarray(0, 4).toString(), '%PDF')
const receiptPages = await pdfPages(receiptPdfBytes)
assert.equal(receiptPages.length, 1, 'Two receipts fit on a single A4 portrait page')
const { text: receiptText, items: receiptItems } = receiptPages[0]
for (const value of [
  'OFFICIAL RECEIPT', 'RECEIPT NO.', 'RECEIPT DATE', 'BATCH NO.', 'R.V. / REFERENCE', 'REG. NO.',
  'RECEIVED FROM', 'THE SUM OF', 'PAYMENT FOR', 'CHEQUE NO. / PAYMENT', 'AMOUNT PAID', 'PREPARED BY',
  'SISCO-DEMO-UNLICENSED', 'P.O. Box 256', '0312021227/8 Fax: 0312021227',
  'TTU25538RCT', '09-Jul-2026', 'R28924V', 'ASW342D', 'sdfsd', 'YEBOAH VICTORIA AFRIYIE',
  'Five Thousand Two Hundred Fourteen Ghana Cedi and 32 Pesewas ONLY', 'Rental of Auditorium',
  '342432', 'GHS 5,214.32', 'Report Printed On', 'BusinessDesk · G/L', 'Admin',
]) assert.equal(occurrences(receiptText, value), 2, `${value} appears on both receipt copies`)
assert.ok(receiptText.includes('COPY 01') && receiptText.includes('COPY 02'), 'Both receipt copies are identified')
assert.ok(receiptText.includes('Page 1 of 1'), 'The PDF shows its actual page count')
assertTextInsidePaper(receiptPages[0], 'ordinary receipt')
// The title belongs to the company header rather than a separate boxed row.
const companyPositions = receiptItems.filter(item => item.str === 'SISCO-DEMO-UNLICENSED')
const titlePositions = receiptItems.filter(item => item.str === 'OFFICIAL RECEIPT')
assert.equal(titlePositions.length, 2)
for (let i = 0; i < 2; i++) {
  assert.ok(titlePositions[i].transform[4] > companyPositions[i].transform[4], 'Title is to the right of the company header')
  assert.ok(Math.abs(titlePositions[i].transform[5] - companyPositions[i].transform[5]) < 8, 'Title aligns with the company header')
}
assert.deepEqual(receiptPdfDef.content[1].canvas[0].dash, { length: 3, space: 4 }, 'The two copies retain a cutting line')

// 2. With logo (base64 data URL)
const sampleLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const receiptWithLogo = voucherReport(receiptVoucher, { companyName: 'SISCO-DEMO-UNLICENSED', companyLogoUrl: sampleLogo, address: 'P.O. Box 256', phoneNo: '0312021227' })
assert.equal(receiptWithLogo.companyLogoUrl, sampleLogo)
const logoPdfDef = voucherPdfDefinition(receiptWithLogo)
for (const block of [logoPdfDef.content[0], logoPdfDef.content[2]]) assert.equal(block.stack[0].columns[0].columns[0].image, sampleLogo, 'Both company headers contain the supplied logo')
const logoPages = await pdfPages(await createVoucherPdf(receiptWithLogo))
assert.equal(logoPages.length, 1, 'Receipt with logo fits on one page')
assert.equal(occurrences(logoPages[0].text, 'OFFICIAL RECEIPT'), 2)
assertTextInsidePaper(logoPages[0], 'receipt with logo')

// Missing optional company contact and registration data are omitted, not made up.
const noContact = voucherReport({ ...receiptVoucher, lines: [{ ...receiptVoucher.lines[0], invoiceNumber: '', referenceNumber: '' }] }, 'Example Company')
const noContactPages = await pdfPages(await createVoucherPdf(noContact))
assert.equal(noContactPages.length, 1)
assert.ok(!noContactPages[0].text.includes('P.O. Box 256') && !noContactPages[0].text.includes('0312021227') && !noContactPages[0].text.includes('REG. NO.'))

// Long identifiers and monetary values must wrap inside the paper, and the
// second complete copy should start on a fresh page when it no longer fits.
const longReceipt = {
  ...receiptWithLogo,
  companyName: `${'W'.repeat(40)} SERVICES`,
  receiptData: {
    ...receiptWithLogo.receiptData,
    receiptNo: 'R'.repeat(40), batchNo: 'B'.repeat(40), rv: 'V'.repeat(40), regNo: 'Z'.repeat(80),
    receivedFrom: `${'W'.repeat(40)} Customer`,
    theSumOf: 'Nine Quadrillion Nine Hundred Ninety-Nine Trillion Nine Hundred Ninety-Nine Billion Nine Hundred Ninety-Nine Million Nine Hundred Ninety-Nine Thousand Nine Hundred Ninety-Nine Ghana Cedi and 99 Pesewas ONLY',
    being: 'P'.repeat(200), chequeNo: 'C'.repeat(80), amountPaid: 'GHS 9,999,999,999,999,999.99', admin: 'A'.repeat(60),
  },
}
const longPages = await pdfPages(await createVoucherPdf(longReceipt))
assert.equal(longPages.length, 2, 'Long receipt copies paginate separately when they cannot both fit')
for (let i = 0; i < longPages.length; i++) {
  const page = longPages[i]
  for (const value of [longReceipt.companyName, ...Object.values(longReceipt.receiptData)]) {
    // Currency is part of the amount, but is not a separate printed field.
    if (value !== longReceipt.receiptData.currency) assert.ok(page.compact.includes(compact(value)), `Page ${i + 1} retains ${value}`)
  }
  assert.ok(page.text.includes('OFFICIAL RECEIPT') && page.text.includes(`COPY 0${i + 1}`) && page.text.includes(`Page ${i + 1} of 2`), 'Each long copy stays together with accurate pagination')
  assertTextInsidePaper(page, `long receipt page ${i + 1}`)
}

// Non-breaking spaces do not provide real wrap opportunities to pdfmake.
const nonBreaking = `${'W'.repeat(11)}\u00a0`.repeat(10)
const nonBreakingReceipt = { ...receiptWithLogo, receiptData: {
  ...receiptWithLogo.receiptData,
  receivedFrom: `${nonBreaking}ENDCUSTOMER`, being: `${nonBreaking}ENDPURPOSE`, chequeNo: `${nonBreaking}ENDCHEQUE`,
} }
const nonBreakingPages = await pdfPages(await createVoucherPdf(nonBreakingReceipt))
const nonBreakingText = nonBreakingPages.map(page => page.compact).join('')
for (const value of ['ENDCUSTOMER', 'ENDPURPOSE', 'ENDCHEQUE']) assert.equal(occurrences(nonBreakingText, value), 2, `${value} survives on both copies`)
for (const page of nonBreakingPages) assertTextInsidePaper(page, 'non-breaking-space receipt')

// Even content taller than a page must continue without clipping, lost copies,
// inaccurate page numbers, or a blank page containing only the cutting line.
const veryLongReceipt = { ...longReceipt, receiptData: {
  ...longReceipt.receiptData,
  receivedFrom: `${'Customer '.repeat(140)}ENDCUSTOMER`,
  theSumOf: `${'Words '.repeat(250)}ENDWORDS`,
  being: `${'P'.repeat(500)}ENDPURPOSE`,
} }
const veryLongPages = await pdfPages(await createVoucherPdf(veryLongReceipt))
assert.ok(veryLongPages.length > 2, 'Oversized receipt content flows across pages')
const allLongText = veryLongPages.map(page => page.text).join(' ')
for (const value of ['OFFICIAL RECEIPT', 'ENDCUSTOMER', 'ENDWORDS', 'ENDPURPOSE', 'AMOUNT PAID']) assert.equal(occurrences(allLongText, value), 2, `${value} survives on both long copies`)
for (let i = 0; i < veryLongPages.length; i++) {
  assert.ok(veryLongPages[i].text.includes(`Page ${i + 1} of ${veryLongPages.length}`), 'Every page has its real page number')
  assert.ok(veryLongPages[i].text.replace(/Page \d+ of \d+/, '').trim().length > 30, 'No blank separator-only page')
  assertTextInsidePaper(veryLongPages[i], `oversized receipt page ${i + 1}`)
}

const receiptXlsx = await createVoucherExcel(receiptWithoutLogo)
assert.ok(receiptXlsx.size > 0, 'Receipt Excel export succeeds')
const receiptDocx = await createVoucherWord(receiptWithoutLogo)
assert.ok(receiptDocx.size > 0, 'Receipt Word export succeeds')
const fx=voucherReport({...voucher,multiCurrency:true,currencyCode:'USD',baseCurrencyCode:'GHS',exchangeRate:'1.2345678901',lines:[{...lines[0],foreignAmount:'99.123456'}]},'Example Company')
assert.equal(fx.voucherRows[2].cells[1].text,'Ninety-Seven Ghana Cedi and 20 Pesewas Only','amount in words uses the base currency')
assert.ok(fx.voucherRows[5].cells[6].text.includes('USD 99.123456'),'foreign source amount is shown without losing precision')
assert.ok(fx.voucherRows.some(row=>row.cells.some(c=>c.text.includes('1.2345678901'))),'full exchange rate is shown')
console.log('Voucher report formatting, pagination, and PDF/Word/Excel exports passed')
