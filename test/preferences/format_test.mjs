import assert from 'node:assert/strict'
import {useFormat} from '../../frontend/layers/shared/app/composables/useFormat.ts'
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
const state={value:null}
globalThis.useState=()=>state
globalThis.useBrand=()=>({brand:{value:{currency:{code:'GHS',symbol:'GH₵',locale:'en-GH'}}}})
const format=useFormat()
check(format.money(1234.567).includes('1,234.57'),'existing display defaults are preserved without preferences')
state.value={locale:'en-GB',timeZone:'Pacific/Kiritimati',dateStyle:'short',timeFormat:'24h',moneyDecimals:3,useGrouping:false}
check(format.money(1234.5678).includes('1234.568'),'tenant money precision/grouping changes display only')
check(format.num(1234.56,2)==='1234.56','tenant grouping controls ordinary numbers')
check(format.date('2026-01-01')==='01/01/2026','date-only ledger dates never shift to next day in +14 zone')
check(format.dateTime('2026-01-01T22:00:00Z').includes('02/01/2026')&&format.dateTime('2026-01-01T22:00:00Z').includes('12:00'),'timestamp formatting uses tenant time zone')
state.value.timeFormat='12h'
check(/pm/i.test(format.dateTime('2026-01-01T22:00:00Z')),'tenant 12-hour clock applies')
state.value.locale='fr-FR'
check(format.num(1234.56,2)==='1234,56','display locale applies to number decimals')
check(format.pct(.125).includes('12,5'),'percent formatter respects tenant display locale')
check(format.date(null)==='—'&&format.dateTime(null)==='—','missing dates remain safe')
console.log(`${checks} tenant formatter checks passed`)
