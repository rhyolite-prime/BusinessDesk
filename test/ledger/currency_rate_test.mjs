import assert from 'node:assert/strict'
import {normalizeSuggestedRate,publicCurrencyRate} from '../../frontend/server/utils/public-currency-rate.ts'
let checks=0;const check=(ok,label)=>{assert.ok(ok,label);checks++}
for(const [value,expected] of [[12.5,'12.5000000000'],['0.12345678905','0.1234567891'],['1e-10','0.0000000001'],['1e2','100.0000000000'],['9999999999.9999999999','9999999999.9999999999']])check(normalizeSuggestedRate(value)===expected,'exact ten-place rounding '+value)
for(const value of [0,-1,Infinity,NaN,'nope',null,{},'1e-20','10000000000','9999999999.99999999996']){assert.throws(()=>normalizeSuggestedRate(value));checks++}
const now=new Date('2026-10-21T12:00:00Z');let calls=[]
const quote=await publicCurrencyRate('USD','GHS',async url=>{calls.push(url);return {date:'2026-10-21',usd:{ghs:12.5}}},now)
check(quote.rate==='12.5000000000'&&quote.from==='USD'&&quote.to==='GHS'&&quote.date==='2026-10-21','correct transaction-to-base direction with source date')
check(calls[0].endsWith('/usd.json')&&!calls[0].includes('ghs.json'),'provider base is transaction currency, not inverted')
calls=[];const fallback=await publicCurrencyRate('USD','GHS',async url=>{calls.push(url);if(calls.length===1)throw new Error('network');return {date:'2026-10-21',usd:{ghs:'12.5'}}},now)
check(fallback.rate==='12.5000000000'&&calls.length===2&&calls[1].startsWith('https://latest.currency-api.pages.dev/'),'documented independent fallback')
let fetched=false;const base=await publicCurrencyRate('GHS','GHS',async()=>{fetched=true;throw new Error()},now);check(base.rate==='1'&&!fetched,'same currency is exactly 1 without external lookup')
for(const data of [{date:'2026-10-01',usd:{ghs:12.5}},{date:'2026-11-01',usd:{ghs:12.5}},{date:'2026-02-30',usd:{ghs:12.5}},{date:'2026-10-21',usd:{eur:1}},{date:'2026-10-21',usd:{ghs:0}},{date:'2026-10-21',usd:{ghs:-1}},{}]){await assert.rejects(publicCurrencyRate('USD','GHS',async()=>data,now));checks++}
for(const pair of [['../USD','GHS'],['USD','https://evil.test'],['usd','GHS'],['USD','GHS&key=x']]){await assert.rejects(publicCurrencyRate(...pair,async()=>{throw new Error('must not fetch')},now));checks++}
console.log(`${checks} currency rate checks passed`)
