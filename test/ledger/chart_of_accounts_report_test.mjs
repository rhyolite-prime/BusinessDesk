import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=await readFile(new URL('../../frontend/app/features/reports/chart-of-accounts.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {chartOfAccountsReport:build}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const input={accounts:[{id:'b',accountType:0,accountHeaderId:'cash',accountNumber:'10010',accountName:'Cash ten',currencyId:null,status:'inactive'},{id:'a',accountType:0,accountHeaderId:'cash',accountNumber:'10002',accountName:'Cash two',currencyId:'usd',status:'active'},{id:'c',accountType:1,accountHeaderId:'due',accountNumber:'20000',accountName:'Payable',currencyId:null,status:'active'}],controls:[{id:'cash',accountHeaderName:'Assets / Cash'},{id:'due',accountHeaderName:'Liabilities / Accounts Payable'}],currencies:[{id:'ghs',name:'Ghana Cedi',code:'GHS'},{id:'usd',name:'US Dollar',code:'USD'}],companyName:'Example',unitName:'Head Office',baseCurrencyId:'ghs',generatedAt:'25 Oct 2026, 12:00'}
const snapshot=JSON.stringify(input),report=build(input)
assert.equal(report.sections.length,2)
assert.equal(report.sections[0].title,'Asset / Cash')
assert.deepEqual(report.sections[0].rows.map(row=>row[0]),['10002','10010'])
assert.equal(report.sections[0].rows[0][2],'US Dollar')
assert.equal(report.sections[0].rows[1][2],'Ghana Cedi')
assert.equal(build({...input,status:'active'}).sections.flatMap(s=>s.rows).length,2)
assert.equal(build({...input,type:'0'}).sections.flatMap(s=>s.rows).length,2)
assert.equal(build({...input,query:'payable'}).sections.length,1)
assert.equal(build({...input,query:'10002'}).sections[0].rows[0][1],'Cash two')
assert.equal(build({...input,query:'cash'}).sections[0].rows.length,2)
assert.equal(build({...input,query:'not found'}).sections.length,0)
assert.equal(build({...input,accounts:[]}).sections.length,0)
assert.equal(build({...input,controls:[]}).sections[0].title,'Asset / Unavailable control')
assert.equal(build({...input,currencies:[]}).sections[0].rows[0][2],'Unavailable currency')
assert.equal(build({...input,currencies:[]}).sections[0].rows[1][2],'Unit base currency (unavailable)')
assert.equal(build({...input,companyName:''}).companyName,'Company profile not configured')
assert.equal(JSON.stringify(input),snapshot,'source records remain immutable')
console.log('17 chart-of-accounts report checks passed')
const hierarchySource=await readFile(new URL('../../frontend/app/features/reports/report-hierarchy.ts',import.meta.url),'utf8')
const hierarchyJs=ts.transpileModule(hierarchySource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {reportHierarchyRows}=await import(`data:text/javascript;base64,${Buffer.from(hierarchyJs).toString('base64')}`)
const nested={...input,controls:[...input.controls,{id:'bank',accountHeaderName:'Assets / Current Assets / Bank'},{id:'hand',accountHeaderName:'Assets / Current Assets / Cash'},{id:'asset',accountHeaderName:'Assets'},{id:'cash2',accountHeaderName:'Assets / Cash'},{id:'management',accountHeaderName:'Asset Management'}],accounts:[...input.accounts,{...input.accounts[0],id:'bank1',accountHeaderId:'bank'},{...input.accounts[0],id:'hand1',accountHeaderId:'hand'},{...input.accounts[0],id:'root',accountHeaderId:'asset'},{...input.accounts[0],id:'dupe-path',accountHeaderId:'cash2'},{...input.accounts[0],id:'management',accountHeaderId:'management'}]}
const hierarchical=build(nested),rendered=reportHierarchyRows(hierarchical),headings=rendered.filter(row=>row.kind==='heading')
assert.equal(headings.filter(row=>row.label==='Asset').length,1)
assert.equal(headings.filter(row=>row.label==='Current Assets').length,1)
assert.equal(headings.find(row=>row.label==='Bank').depth,2)
assert.equal(headings.find(row=>row.label==='Asset Management').depth,1,'strip only exact root aliases')
assert.equal(rendered.filter(row=>row.kind==='record').length,nested.accounts.length,'all accounts retained, including duplicate control paths')
assert.equal(hierarchical.sections.find(section=>section.title==='Asset / Cash').rows.length,3)
assert.deepEqual(headings.map(row=>row.label),['Asset','Cash','Asset Management','Current Assets','Bank','Cash','Liability','Accounts Payable'])
assert.equal(reportHierarchyRows(build({...nested,query:'Bank'}))[0].label,'Asset','filtered report retains full heading chain')
assert.equal(reportHierarchyRows(build({...nested,query:'Bank'}))[2].label,'Bank')
assert.deepEqual(reportHierarchyRows(build({...input,accounts:[]})),[])
console.log('10 nested report hierarchy checks passed')
const numbered={...input,controls:[{id:'biological',accountHeaderName:'Assets / Biological Assets'},{id:'receivable',accountHeaderName:'Assets / Accounts Receivable'},{id:'cash',accountHeaderName:'Assets / Cash and Cash Equivalents'},{id:'inventory',accountHeaderName:'Assets / Inventory'}],accounts:[['biological','13006'],['receivable','11002'],['cash','10006'],['inventory','12002'],['cash','10001'],['receivable','11001'],['biological','13001'],['inventory','12001']].map(([id,number],index)=>({...input.accounts[0],id:String(index),accountHeaderId:id,accountNumber:number}))}
const numberedReport=build(numbered)
assert.deepEqual(numberedReport.sections.map(section=>section.path.at(-1)),['Cash and Cash Equivalents','Accounts Receivable','Inventory','Biological Assets'])
assert.deepEqual(numberedReport.sections.flatMap(section=>section.rows.map(row=>row[0])),['10001','10006','11001','11002','12001','12002','13001','13006'])
const deep={...numbered,controls:[{id:'biological',accountHeaderName:'Assets / Z group / Biological Assets'},{id:'receivable',accountHeaderName:'Assets / A group / Accounts Receivable'},{id:'cash',accountHeaderName:'Assets / Z group / Cash and Cash Equivalents'},{id:'inventory',accountHeaderName:'Assets / A group / Inventory'}]}
assert.deepEqual(build(deep).sections.map(section=>section.path[1]),['Z group','Z group','A group','A group'],'nested sibling branches use descendant minima and remain contiguous')
assert.deepEqual(build({...numbered,status:'inactive'}).sections.map(section=>section.title),numberedReport.sections.map(section=>section.title))
const shortNumbers={...numbered,accounts:numbered.accounts.map((account,index)=>({...account,accountNumber:index===4?'2':index===1?'10':String(100+index)}))}
assert.equal(build(shortNumbers).sections[0].rows[0][0],'2','numeric order, not lexical order')
assert.equal(reportHierarchyRows(build(deep)).filter(row=>row.kind==='heading'&&row.label==='Z group').length,1)
console.log('6 posting-account number ordering checks passed')

// Account types always outrank posting-number and alphabetic ordering.
const enumRecords=[4,2,1,3,0].map((accountType,index)=>({...input.accounts[0],id:`enum-${index}`,accountHeaderId:`enum-control-${accountType}`,accountType,accountNumber:String((5-accountType)*10000)}))
const enumInput={...input,accounts:enumRecords,controls:enumRecords.map(account=>({id:account.accountHeaderId,accountHeaderName:['Z assets','Y liabilities','X equity','B revenue','A expense'][account.accountType]}))}
const enumReport=build(enumInput)
assert.deepEqual(enumReport.sections.map(section=>section.path[0]),['Asset','Liability','Equity','Revenue','Expense'])
assert.deepEqual(enumReport.sections.flatMap(section=>section.rows.map(row=>row[0])),['50000','40000','30000','20000','10000'],'numbers do not reorder the standard account types')
assert.deepEqual(reportHierarchyRows(enumReport).filter(row=>row.kind==='heading'&&row.depth===0).map(row=>row.label),['Asset','Liability','Equity','Revenue','Expense'])
const withUnknown=build({...enumInput,accounts:[{...enumRecords[0],id:'unknown',accountType:-1,accountNumber:'1'},...enumRecords]})
assert.equal(withUnknown.sections.at(-1).path[0],'Unknown')
assert.deepEqual(build({...enumInput,type:'2'}).sections.map(section=>section.path[0]),['Equity'])
console.log('5 standard account-type precedence checks passed')
