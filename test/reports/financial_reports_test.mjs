import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=fs.readFileSync('frontend/app/features/reports/financial-reports.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {financialReport,reportCatalog,micros}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const accounts=[['cash',0,'current_asset'],['payable',1,'current_liability'],['equity',2,'equity'],['sales',3,'revenue'],['cogs',4,'cost_of_sales'],['opex',4,'operating_expense'],['da',4,'depreciation'],['interest',4,'finance_cost'],['tax',4,'income_tax'],['other',3,'other_income']].map(([id,type,category],i)=>({id,number:String(100+i),name:id,type,category}))
let index=0
const lines=[]
function pair(date,debit,credit,amount,opening=false,costCenterId='center-a'){
 const batchId=String(++index)
 for(const [accountId,dr,cr] of [[debit,amount,'0'],[credit,'0',amount]])lines.push({id:String(++index),batchId,batchNumber:'JV-'+batchId,date,batchDate:date,accountId,accountName:accountId,type:accounts.find(a=>a.id===accountId).type,description:'Test posting',reference:'ref',source:'general_journal',costCenterId,costCenter:costCenterId?'Operations':null,currency:'GHS',rate:'1',debit:dr,credit:cr,transactionDebit:dr,transactionCredit:cr,opening})
}
pair('2025-12-31','cash','equity','100',true)
pair('2026-01-03','cash','sales','200')
pair('2026-01-04','cogs','cash','50')
pair('2026-01-05','opex','cash','20')
pair('2026-01-06','da','cash','10')
pair('2026-01-07','interest','cash','5')
pair('2026-01-08','tax','cash','15')
pair('2026-01-09','cash','other','2')
pair('2025-01-03','cash','sales','40',false,'center-b')
pair('2025-01-04','opex','cash','10',false,'center-b')
const snapshot={companyName:'Example',unitName:'HQ',currencyCode:'GHS',decimals:2,fiscalMonth:1,generatedAt:'2026-02-01',through:'2026-01-31',accounts,lines,budgets:[{accountId:'sales',costCenterId:'center-a',year:2026,month:1,original:'250',revised:'220'},{accountId:'cogs',costCenterId:'center-a',year:2026,month:1,original:'60',revised:'55'}]}
const filters={from:'2026-01-01',to:'2026-01-31'}
const build=(kind,extra={},data=snapshot)=>financialReport(data,{...filters,kind,...extra})
const rows=kind=>build(kind).report.sections.flatMap(s=>s.rows)
const value=(kind,label)=>rows(kind).find(r=>r[0]===label)?.[1]
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++}
for(const [kind] of reportCatalog){const result=build(kind);check(result.report.id===kind&&result.report.columns.length>0,'report builds '+kind);for(const section of result.report.sections)for(const row of section.rows)check(row.length===result.report.columns.length,`${kind} export column parity`)}
check(value('income-basic','Net income / (loss)')==='102.00','income signed calculation')
check(value('income-multistep','Gross profit')==='150.00','gross profit')
check(value('income-multistep','Operating profit (EBIT)')==='120.00','EBIT')
check(value('income-ebitda','EBITDA')==='132.00','EBITDA reconciliation includes other income')
check(value('balance-sheet','Accounting equation difference (must be zero)')==='0.00','balance sheet reconciles')
check(value('balance-sheet','Total assets')==='232.00','as of includes prior history')
check(value('balance-sheet','Unclosed earnings (cumulative revenue less expense)')==='132.00','earnings not lost at year boundary')
check(value('trial-balance','Difference (must be zero)')==='0.00','trial balance reconciles')
check(rows('general-ledger').some(row=>row[0]==='Opening'&&row[5]==='130.00'),'ledger opening is before range')
check(rows('income-comparative').find(r=>r[0]==='Net income / (loss)')[2]==='30.00','prior year comparison')
check(build('income-budget').report.sections.find(s=>s.title==='Net income').rows[0][2]==='165.00','revised budget net')
check(build('income-budget',{budgetBasis:'original'}).report.sections.find(s=>s.title==='Net income').rows[0][2]==='190.00','original budget net')
check(build('income-ytd',{from:'2026-01-15'}).report.sections.find(s=>s.title==='Summary').rows.at(-1)[1]==='102.00','YTD fiscal start')
check(build('income-basic',{costCenterId:'center-b'}).report.sections.find(s=>s.title==='Summary').rows.at(-1)[1]==='0.00','center isolation current period')
const missing=structuredClone(snapshot);missing.accounts.find(a=>a.id==='cogs').category=''
assert.throws(()=>build('income-ebitda',{},missing),/requires report mappings/);checks++
check(build('income-basic',{},missing).warnings.some(w=>w.startsWith('Unmapped income')),'basic reports flag unmapped')
assert.throws(()=>build('income-budget',{from:'2026-01-02'}),/complete calendar months/);checks++
assert.throws(()=>build('income-basic',{to:'2026-02-01'}),/within the loaded snapshot/);checks++
check(build('journal-register',{accountId:'cash'}).report.sections.filter(s=>s.title.includes('Posted')).every(s=>s.rows.every(r=>r[2].includes('cash'))),'register account filter')
check(build('general-ledger',{accountId:'cash'}).report.sections.every(s=>s.title.includes('cash')),'ledger account filter')
const huge=structuredClone(snapshot);huge.lines=[];for(const accountId of ['cash','sales'])huge.lines.push({...lines[2],id:accountId,accountId,debit:accountId==='cash'?'99999999999999.123456':'0',credit:accountId==='sales'?'99999999999999.123456':'0'})
huge.decimals=6
check(build('income-basic',{},huge).report.sections.find(s=>s.title==='Summary').rows[0][1]==='99,999,999,999,999.123456','large balances remain exact')
assert.equal(micros('-0.123456'),-123456n);checks++
const original=JSON.stringify(snapshot);build('income-crosstab');check(JSON.stringify(snapshot)===original,'snapshot immutable')
console.log(`${checks} financial report engine checks passed`)
