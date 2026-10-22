import assert from 'node:assert/strict'
import {suggestBatchDescription,suggestLineDescription,limitJournalDescription} from '../../frontend/app/features/ledger/journal-descriptions.ts'
const options={baseCurrencyId:'ghs',accounts:[{id:'cash',name:'Cash',currencyId:'ghs'},{id:'capital',name:'Capital',currencyId:'ghs'}],currencies:[{id:'ghs',code:'GHS',name:'Cedi'},{id:'usd',code:'USD',name:'US dollar'}],costCenters:[{id:'hq',name:'Head Office'}],periods:[]}
const line={accountId:'cash',currencyId:'ghs',costCenterId:'hq',debit:'1.000001',credit:'0',transactionDate:'2026-10-20',referenceNumber:'CAP-1',description:'',chequeNumber:'',exchangeRate:'1'}
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++}
const batch=suggestBatchDescription({batchDate:'2026-10-20',isMultiCurrency:false,currencyId:'ghs',lines:[line,{...line,accountId:'capital'}],options})
for(const keyword of ['Local journal','2026-10-20','GHS','Cash','Capital'])check(batch.includes(keyword),'batch keyword '+keyword)
const detail=suggestLineDescription(line,options)
for(const keyword of ['Debit','Cash','GHS','2026-10-20','CAP-1','Head Office'])check(detail.includes(keyword),'transaction keyword '+keyword)
check(suggestLineDescription({...line,debit:'0',credit:'1'},options).startsWith('Credit'),'credit side')
check(suggestLineDescription({...line,debit:'0',credit:'0'},options).startsWith('Journal entry'),'zero line does not invent a debit/credit')
check(suggestLineDescription({...line,debit:'1',credit:'1'},options).startsWith('Journal entry'),'invalid double-side line stays neutral')
check(suggestBatchDescription({batchDate:'2026-10-20',isMultiCurrency:true,currencyId:'ghs',lines:[line,{...line,currencyId:'usd'}],options}).includes('GHS/USD'),'multi-currency batch keywords')
for(const max of [1,3,4,199,200,300]){const value=limitJournalDescription('💰'.repeat(300),max);check(new TextEncoder().encode(value).length<=max,'UTF-8 byte limit');check(!value.includes('\ufffd'),'no split Unicode code points')}
const huge={...options,accounts:[{...options.accounts[0],name:'💰'.repeat(300)}]}
check(new TextEncoder().encode(suggestBatchDescription({batchDate:'2026-10-20',isMultiCurrency:false,currencyId:'ghs',lines:[line],options:huge})).length<=200,'header respects API limit')
check(new TextEncoder().encode(suggestLineDescription(line,huge)).length<=300,'line respects API limit')
check(suggestBatchDescription({batchDate:'2026-10-20',isMultiCurrency:false,currencyId:'usd',lines:[{...line,currencyId:'usd'}],options}).includes('Single-currency journal'),'single foreign-currency description does not claim local currency')
console.log(`${checks} journal description checks passed`)
