import type { EmbeddedReport, ReportSection, ReportColumn } from './report-types'
export const reportCatalog = [
 ['journal-register','Journal Register'], ['general-ledger','General Ledger / Account Activity'], ['trial-balance','Trial Balance'], ['balance-sheet','Balance Sheet'], ['cost-center','Cost-Center Report'],
 ['income-basic','Basic Income Statement'], ['income-multistep','Multi-step Operating Statement'], ['income-budget','Budget vs Actual'], ['income-prior','Prior-period Operating Statement'], ['income-comparative','Comparative Operating Statement (prior year)'], ['income-expenditure','Expenditure Returns'], ['income-revenue','Revenue Statement'], ['income-crosstab','Cross-Tab / Cost-Center Comparison'], ['income-monthly','Monthly Operating Trends'], ['income-ytd','Year-to-Date Income Statement'], ['income-common','Common-Size Income Statement'], ['income-ebitda','EBITDA Statement'],
] as const
export type ReportKind = typeof reportCatalog[number][0]
export const mappingCategories = [
 ['current_asset','Current assets',0],['noncurrent_asset','Noncurrent assets',0],['current_liability','Current liabilities',1],['noncurrent_liability','Noncurrent liabilities',1],['equity','Equity',2],['revenue','Operating revenue',3],['other_income','Other income',3],['cost_of_sales','Cost of sales',4],['operating_expense','Operating expenses',4],['depreciation','Depreciation / amortization',4],['finance_cost','Finance costs',4],['income_tax','Income tax',4],
] as const
export interface ReportAccount { id:string; number:string; name:string; type:number; category:string }
export interface ReportLine { id:string; accountId:string; accountName:string; type:number; batchId:string; batchNumber:string; date:string; batchDate:string; description:string; reference:string; source:string; costCenterId:string|null; costCenter:string|null; currency:string; rate:string; debit:string; credit:string; transactionDebit:string; transactionCredit:string; opening:boolean }
export interface ReportBudget { accountId:string; costCenterId:string|null; year:number; month:number; original:string; revised:string }
export interface FinancialSnapshot { companyName:string; unitName:string; currencyCode:string; decimals:number; fiscalMonth:number; generatedAt:string; through:string; accounts:ReportAccount[]; lines:ReportLine[]; budgets:ReportBudget[] }
export interface FinancialFilters { kind:ReportKind; from:string; to:string; accountId?:string; costCenterId?:string; budgetBasis?:'original'|'revised' }
const scale=1000000n
export function micros(value:string):bigint {
 if(!/^-?\d+(\.\d{1,6})?$/.test(value))throw Error('Invalid ledger decimal in report snapshot.')
 const negative=value.startsWith('-'), [whole,fraction='']=(negative?value.slice(1):value).split('.')
 return (BigInt(whole!)*scale+BigInt(fraction.padEnd(6,'0')))*(negative?-1n:1n)
}
const decimal=(value:bigint)=>`${value<0n?'-':''}${(value<0n?-value:value)/scale}.${String((value<0n?-value:value)%scale).padStart(6,'0')}`
function day(value:string):Date { if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Select valid report dates.');const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value)throw Error('Select valid report dates.');return date }
const iso=(date:Date)=>date.toISOString().slice(0,10)
const shift=(value:string,days:number)=>{const date=day(value);date.setUTCDate(date.getUTCDate()+days);return iso(date)}
const yearBefore=(value:string)=>{const date=day(value),month=date.getUTCMonth();date.setUTCFullYear(date.getUTCFullYear()-1);if(date.getUTCMonth()!==month)date.setUTCDate(0);return iso(date)}
const percent=(value:bigint,base:bigint)=>{if(base===0n)return 'N/A';const n=value*10000n/base;return `${n<0n?'-':''}${(n<0n?-n:n)/100n}.${String((n<0n?-n:n)%100n).padStart(2,'0')}%`}
const sum=(values:bigint[])=>values.reduce((a,b)=>a+b,0n)
const typeNames=['Assets','Liabilities','Equity','Revenue','Expenses']
export function financialReport(snapshot:FinancialSnapshot, filters:FinancialFilters):{report:EmbeddedReport;warnings:string[]} {
 const {kind,to}=filters;let from=filters.from
 day(to)
 if(kind==='balance-sheet'||kind==='trial-balance')from='1900-01-01'
 const fiscalStart=(date:string)=>{const d=day(date),month=snapshot.fiscalMonth||1;return `${d.getUTCFullYear()-(d.getUTCMonth()+1<month?1:0)}-${String(month).padStart(2,'0')}-01`}
 if(kind==='income-ytd')from=fiscalStart(to)
 if(day(from)>day(to)||to>snapshot.through)throw Error('Report dates must be ordered and within the loaded snapshot.')
 const digits=Math.max(0,Math.min(6,snapshot.decimals??2))
 const formatter=new Intl.NumberFormat('en-GH',{minimumFractionDigits:digits,maximumFractionDigits:digits})
 const money=(value:bigint)=>(formatter.format as unknown as (decimal:string)=>string)(decimal(value))
 const incompatible=snapshot.accounts.filter(a=>a.category&&!mappingCategories.some(([id,,type])=>id===a.category&&type===a.type))
 const accounts=new Map(snapshot.accounts.map(a=>[a.id,{...a,category:incompatible.some(item=>item.id===a.id)?'':a.category}]))
 for(const line of snapshot.lines)if(!accounts.has(line.accountId))accounts.set(line.accountId,{id:line.accountId,number:'[historical]',name:line.accountName||'Unavailable account',type:line.type,category:''})
 const accountList=[...accounts.values()].sort((a,b)=>a.type-b.type||a.number.localeCompare(b.number,'en',{numeric:true})||a.id.localeCompare(b.id))
 // Account filtering is meaningful for transactions/ledger, never for complete statements.
 const accountFilter=(kind==='general-ledger'||kind==='journal-register')?filters.accountId:''
 const centerMatch=(id:string|null)=>!filters.costCenterId||(filters.costCenterId==='unassigned'?!id:id===filters.costCenterId)
 if(accountFilter&&!accounts.has(accountFilter))throw Error('Selected account is no longer available. Reload the report options.')
 const lines=snapshot.lines.filter(l=>l.date<=to&&(!accountFilter||l.accountId===accountFilter)&&centerMatch(l.costCenterId))
 const byAccount=new Map<string,ReportLine[]>();for(const line of lines){if(!byAccount.has(line.accountId))byAccount.set(line.accountId,[]);byAccount.get(line.accountId)!.push(line)}
 const period=(a:string,b:string)=>lines.filter(l=>l.date>=a&&l.date<=b)
 const inPeriod=period(from,to)
 const net=(rows:ReportLine[])=>sum(rows.map(l=>micros(l.debit)-micros(l.credit)))
 const warnings:string[]=[]
 if(incompatible.length)warnings.push('Some stored classifications no longer match the current account type and are treated as unclassified. Update Report mappings.')
 if(lines.some(line=>accounts.get(line.accountId)!.type!==line.type))warnings.push('Historical account types differ from the current chart. Statements use the current chart classification; review reclassifications.')
 if(!snapshot.companyName)warnings.push('Company profile is not configured.')
 if(!lines.length)warnings.push('No posted ledger lines match this scope. No draft, approved-only, voided or unposted entry is included.')
 if(filters.costCenterId)warnings.push('Cost-center-filtered statements may not balance if only one side of a journal carries this cost center.')
 if(lines.some(l=>!snapshot.accounts.some(a=>a.id===l.accountId)))warnings.push('Historical deleted/unavailable accounts are included using their posted line identity; classify them before advanced reporting.')
 const title=reportCatalog.find(([id])=>id===kind)?.[1];if(!title)throw Error('Unknown financial report.')
 let columns:ReportColumn[]=[],sections:ReportSection[]=[]
 let trialTotals:{debit:bigint;credit:bigint}|null=null
 const cols=(labels:string[])=>{columns=labels.map((title,i)=>({key:String(i),title,width:labels.length===1?100:i===0?(labels.length>6?14:32):(100-(labels.length>6?14:32))/(labels.length-1)}))}
 const section=(title:string,rows:string[][])=>sections.push({title,rows})
 const accountLabel=(a:ReportAccount)=>`${a.number} · ${a.name}`
 const totals=(rows:ReportLine[])=>[money(sum(rows.map(l=>micros(l.debit)))),money(sum(rows.map(l=>micros(l.credit))))]
 if(kind==='journal-register'){
  cols(['Date','Batch / source','Account','Description / reference','Currency / rate','Transaction debit','Transaction credit','Base debit','Base credit'])
  const batches=new Map<string,ReportLine[]>();for(const line of inPeriod){if(!batches.has(line.batchId))batches.set(line.batchId,[]);batches.get(line.batchId)!.push(line)}
  for(const rows of batches.values())section(`${rows[0]!.batchNumber} · Posted · Batch date ${rows[0]!.batchDate}`,rows.map(l=>[l.date,`${l.batchNumber} / ${l.source}`,accountLabel(accounts.get(l.accountId)!),[l.description,l.reference].filter(Boolean).join(' · '),`${l.currency} / ${l.rate}`,money(micros(l.transactionDebit)),money(micros(l.transactionCredit)),money(micros(l.debit)),money(micros(l.credit))]))
  section('Totals (base currency only)',[['','','','','','','',...totals(inPeriod)]])
 }else if(kind==='general-ledger'){
  cols(['Date','Batch / reference','Description','Debit (base)','Credit (base)','Running balance (Dr + / Cr −)'])
  for(const a of accountList){const entries=byAccount.get(a.id)||[];if(!entries.length||accountFilter&&a.id!==accountFilter)continue;let balance=net(entries.filter(l=>l.date<from));const rows=[['Opening',from,'',money(0n),money(0n),money(balance)]]
   for(const l of entries.filter(l=>l.date>=from)){balance+=micros(l.debit)-micros(l.credit);rows.push([l.date,[l.batchNumber,l.reference].filter(Boolean).join(' / '),l.description||'',money(micros(l.debit)),money(micros(l.credit)),money(balance)])}
   rows.push(['Closing',to,'',...totals(entries.filter(l=>l.date>=from)),money(balance)]);section(accountLabel(a),rows)
  }
 }else if(kind==='trial-balance'){
  columns=[{key:'number',title:'General Ledger #',width:14},{key:'name',title:'',width:46},{key:'debit',title:'Debit',width:20,alignment:'right'},{key:'credit',title:'Credit',width:20,alignment:'right'}]
  let dr=0n,cr=0n
  for(const [type,label] of [[0,'Asset'],[1,'Liability'],[2,'Equity'],[3,'Revenue'],[4,'Expense']] as const){
   const rows:string[][]=[]
   for(const a of accountList.filter(account=>account.type===type)){
    const entries=byAccount.get(a.id)||[];if(!entries.length)continue
    const ending=net(entries),debit=ending>0n?ending:0n,credit=ending<0n?-ending:0n
    dr+=debit;cr+=credit;rows.push([a.number,a.name,money(debit),money(credit)])
   }
   if(rows.length)section(label,rows)
  }
  trialTotals={debit:dr,credit:cr}
  if(dr!==cr)warnings.push('Trial balance does not balance in the selected scope. Investigate missing/opening entries or cost-center allocation.')
 }else if(kind==='balance-sheet'){
  cols(['Classification / account','Balance (base)'])
  const balances=new Map(accountList.map(a=>[a.id,net(byAccount.get(a.id)||[])]))
  const typeTotal=(type:number)=>sum(accountList.filter(a=>a.type===type).map(a=>balances.get(a.id)!))
  for(const type of [0,1,2]){
   const groups=new Map<string,string[][]>();for(const a of accountList.filter(a=>a.type===type)){const value=balances.get(a.id)!;if(value===0n)continue;const category=mappingCategories.find(([id])=>id===a.category)?.[1]||`Unclassified ${typeNames[type]}`;if(!groups.has(category))groups.set(category,[]);groups.get(category)!.push([accountLabel(a),money(type===0?value:-value)]);if(!a.category)warnings.push(`Missing balance-sheet mapping: ${accountLabel(a)}`)}
   for(const [category,rows] of groups)section(category,rows)
  }
  const earnings=-typeTotal(3)-typeTotal(4),assets=typeTotal(0),liabilities=-typeTotal(1),equity=-typeTotal(2),difference=assets-liabilities-equity-earnings
  section('Balance-sheet reconciliation',[['Total assets',money(assets)],['Total liabilities',money(liabilities)],['Posted equity',money(equity)],['Unclosed earnings (cumulative revenue less expense)',money(earnings)],['Total equity including unclosed earnings',money(equity+earnings)],['Liabilities and equity',money(liabilities+equity+earnings)],['Accounting equation difference (must be zero)',money(difference)]])
  if(difference!==0n)warnings.push('Balance sheet does not reconcile. This is not silently plugged into equity.')
 }else if(kind==='cost-center'){
  cols(['Date','Batch','Account','Description','Debit (base)','Credit (base)','Net (Dr + / Cr −)'])
  const centers=new Map<string,ReportLine[]>();for(const line of inPeriod){const key=line.costCenterId||'unassigned';if(!centers.has(key))centers.set(key,[]);centers.get(key)!.push(line)}
  for(const rows of centers.values()){const first=rows[0]!;section(`${first.costCenter||'Unassigned cost center'} · ${first.costCenterId||'unassigned'}`,[...rows.map(l=>[l.date,l.batchNumber,accountLabel(accounts.get(l.accountId)!),l.description||'',money(micros(l.debit)),money(micros(l.credit)),money(micros(l.debit)-micros(l.credit))]),['TOTAL','','','',...totals(rows),money(net(rows))]])}
 }else {
  const incomeAccounts=accountList.filter(a=>a.type===3||a.type===4)
  const incomeRows=(a:string,b:string,center?:string)=>period(a,b).filter(l=>!l.opening&&[3,4].includes(accounts.get(l.accountId)!.type)&&(!center||(l.costCenterId||'unassigned')===center))
  const values=(a:string,b:string,center?:string)=>{const totals=new Map(incomeAccounts.map(account=>[account.id,0n]));for(const line of incomeRows(a,b,center)){const type=accounts.get(line.accountId)!.type;totals.set(line.accountId,totals.get(line.accountId)!+(micros(line.debit)-micros(line.credit))*(type===3?-1n:1n))}return totals}
  const current=values(from,to),priorStart=kind==='income-comparative'?yearBefore(from):shift(from,-Math.round((+day(to)-+day(from))/86400000)-1),priorEnd=kind==='income-comparative'?yearBefore(to):shift(from,-1)
  const prior=values(priorStart,priorEnd),revenue=sum(incomeAccounts.filter(a=>a.type===3).map(a=>current.get(a.id)!)),expense=sum(incomeAccounts.filter(a=>a.type===4).map(a=>current.get(a.id)!))
  if(inPeriod.some(l=>l.opening&&[3,4].includes(accounts.get(l.accountId)!.type)))warnings.push('Opening-balance entries are excluded from period income and expense activity.')
  const activeIncomeIds=new Set(incomeRows(from,to).map(line=>line.accountId))
  const unmapped=incomeAccounts.filter(a=>!a.category&&activeIncomeIds.has(a.id))
  if(unmapped.length)warnings.push(`Unmapped income accounts: ${unmapped.slice(0,10).map(accountLabel).join('; ')+(unmapped.length>10?` (+${unmapped.length-10} more)`: '')}`)
  if(['income-multistep','income-ebitda'].includes(kind)&&unmapped.length)throw Error('Advanced statement requires report mappings for every income/expense account with activity in this period. Configure Report mappings first.')
  if(kind==='income-multistep'||kind==='income-ebitda'){
   cols(['Statement line','Amount (base)'])
   const total=(category:string)=>sum(incomeAccounts.filter(a=>a.category===category).map(a=>current.get(a.id)!))
   const sales=total('revenue'),cost=total('cost_of_sales'),op=total('operating_expense'),da=total('depreciation'),other=total('other_income'),interest=total('finance_cost'),tax=total('income_tax'),gross=sales-cost,operating=gross-op-da,profit=operating+other-interest-tax,ebitda=profit+interest+tax+da
   section('Operating statement',[['Operating revenue',money(sales)],['Cost of sales',money(cost)],['Gross profit',money(gross)],['Operating expenses (excluding D&A)',money(op)],['Depreciation / amortization',money(da)],['Operating profit (EBIT)',money(operating)],['Other income',money(other)],['Finance costs',money(interest)],['Profit before tax',money(profit+tax)],['Income tax',money(tax)],['Net income',money(profit)]])
   if(kind==='income-ebitda'){section('EBITDA reconciliation (non-GAAP)',[['Net income',money(profit)],['Add finance costs',money(interest)],['Add income tax',money(tax)],['Add depreciation / amortization',money(da)],['EBITDA',money(ebitda)],['EBITDA margin',percent(ebitda,revenue)]]);warnings.push('EBITDA is a management/non-GAAP measure: net income + mapped finance costs + income tax + D&A. It includes other income, and is not cash flow.')}
  }else if(kind==='income-monthly'||kind==='income-crosstab'){
   const dimensions:{key:string;label:string;values:Map<string,bigint>}[]=[]
   if(kind==='income-monthly'){
    const cursor=day(from);cursor.setUTCDate(1);while(iso(cursor)<=to){const start=iso(cursor),next=new Date(cursor);next.setUTCMonth(next.getUTCMonth()+1);const end=shift(iso(next),-1);dimensions.push({key:start,label:start.slice(0,7),values:values(start<from?from:start,end>to?to:end)});cursor.setUTCMonth(cursor.getUTCMonth()+1)}
   }else {
    const centers=new Map<string,string>();for(const l of incomeRows(from,to))centers.set(l.costCenterId||'unassigned',`${l.costCenter||'Unassigned'} [${l.costCenterId||'none'}]`)
    for(const [key,label] of centers)dimensions.push({key,label,values:values(from,to,key)})
   }
   if(dimensions.length>12)throw Error('Cross-tab supports at most 12 months or cost centers per report. Narrow dates or select a cost center; no columns have been omitted.')
   cols(['Account',...dimensions.map(d=>d.label),'Total'])
   for(const type of [3,4])section(typeNames[type]!,incomeAccounts.filter(a=>a.type===type&&dimensions.some(d=>d.values.get(a.id)!==0n)).map(a=>[accountLabel(a),...dimensions.map(d=>money(d.values.get(a.id)!)),money(sum(dimensions.map(d=>d.values.get(a.id)!)))]))
   section('Net income',[['Revenue less expense',...dimensions.map(d=>money(sum(incomeAccounts.map(a=>d.values.get(a.id)!*(a.type===3?1n:-1n))))),money(revenue-expense)]])
  }else if(kind==='income-budget'){
   // Monthly budgets cannot be meaningfully prorated to arbitrary partial months.
   if(from.slice(8)!=='01'||shift(to,1).slice(8)!=='01')throw Error('Budget comparison requires complete calendar months. Select the first and last day of the period.')
   const budgets=new Map(incomeAccounts.map(a=>[a.id,0n]));let matched=0
   for(const b of snapshot.budgets){const date=`${b.year}-${String(b.month).padStart(2,'0')}-01`;if(date>=from&&date<=to&&centerMatch(b.costCenterId)&&budgets.has(b.accountId)){budgets.set(b.accountId,budgets.get(b.accountId)!+micros(filters.budgetBasis==='original'?b.original:b.revised));matched++}}
   if(!matched)warnings.push('No approved/closed budgets match this period and cost-center scope. Budget values are zero, not inferred.')
   cols(['Account','Actual','Budget','Actual − budget','Variance %','Favourable variance'])
   for(const type of [3,4])section(typeNames[type]!,incomeAccounts.filter(a=>a.type===type&&(current.get(a.id)!==0n||budgets.get(a.id)!==0n)).map(a=>{const actual=current.get(a.id)!,budget=budgets.get(a.id)!,delta=actual-budget;return [accountLabel(a),money(actual),money(budget),money(delta),percent(delta,budget),money(type===3?delta:-delta)]}))
   const budgetNet=sum(incomeAccounts.map(a=>budgets.get(a.id)!*(a.type===3?1n:-1n)));section('Net income',[['Revenue less expense',money(revenue-expense),money(budgetNet),money(revenue-expense-budgetNet),percent(revenue-expense-budgetNet,budgetNet),money(revenue-expense-budgetNet)]]);warnings.push(`Budget basis: ${filters.budgetBasis==='original'?'original':'revised (zero is an explicit revised value)'}. Approved/closed monthly budgets only; amounts are unit base currency. Overlapping approved budgets are additive.`)
  }else {
   const comparison=kind==='income-prior'||kind==='income-comparative',common=kind==='income-common'
   cols(['Account','Current',...(comparison?[`Comparison ${priorStart}–${priorEnd}`,'Change','Change %']:common?['% of total revenue']:[])])
   for(const type of [3,4]){
    if(kind==='income-revenue'&&type!==3||kind==='income-expenditure'&&type!==4)continue
    section(typeNames[type]!,incomeAccounts.filter(a=>a.type===type&&(current.get(a.id)!==0n||comparison&&prior.get(a.id)!==0n)).map(a=>{const value=current.get(a.id)!,prev=prior.get(a.id)!;return [accountLabel(a),money(value),...(comparison?[money(prev),money(value-prev),percent(value-prev,prev)]:common?[percent(value,revenue)]:[])]}))
   }
   const priorRev=sum(incomeAccounts.filter(a=>a.type===3).map(a=>prior.get(a.id)!)),priorExp=sum(incomeAccounts.filter(a=>a.type===4).map(a=>prior.get(a.id)!))
   const summary=(label:string,value:bigint,prev:bigint)=>[label,money(value),...(comparison?[money(prev),money(value-prev),percent(value-prev,prev)]:common?[percent(value,revenue)]:[])]
   section('Summary',kind==='income-revenue'?[summary('Total revenue',revenue,priorRev)]:kind==='income-expenditure'?[summary('Total expenditure',expense,priorExp)]:[summary('Total revenue',revenue,priorRev),summary('Total expenses',expense,priorExp),summary('Net income / (loss)',revenue-expense,priorRev-priorExp)])
   if(kind==='income-expenditure')warnings.push('Management expenditure return only; this is not a statutory/tax filing.')
  }
 }
 if(!sections.length)section('No matching posted activity',[])
 const uniqueWarnings=[...new Set(warnings)]
 // Warnings are part of the report snapshot and therefore all exported formats.
 if(uniqueWarnings.length)section('Report notes',uniqueWarnings.map(warning=>[warning,...Array(Math.max(0,columns.length-1)).fill('')]))
 if(trialTotals)sections.push({title:'Grand total',hideHeading:true,emphasized:true,rows:[['','GRAND TOTAL',money(trialTotals.debit),money(trialTotals.credit)]]})
 return {warnings:uniqueWarnings,report:{id:kind,title:title.toUpperCase(),companyName:snapshot.companyName||'Company profile not configured',generatedAt:snapshot.generatedAt,subtitle:`${snapshot.unitName} · ${snapshot.currencyCode} (base) · ${(kind==='balance-sheet'||kind==='trial-balance')?'As of '+to:from+' to '+to} · ${filters.costCenterId?'Cost center: '+filters.costCenterId:'All cost centers'}${accountFilter?' · Account: '+accountLabel(accounts.get(accountFilter)!):''}`,columns,sections,landscape:columns.length>=6}}
}
