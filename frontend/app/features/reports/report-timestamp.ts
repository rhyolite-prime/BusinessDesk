/** Shared report dates: display only; ISO query/storage values remain unchanged. */
const reportDateOptions: Intl.DateTimeFormatOptions = { day:'2-digit', month:'short', year:'numeric' }
function dateParts(date:Date,timeZone:string){
 try{return new Intl.DateTimeFormat('en-GB',{...reportDateOptions,timeZone:timeZone||'UTC'}).formatToParts(date)}
 catch{return new Intl.DateTimeFormat('en-GB',{...reportDateOptions,timeZone:'UTC'}).formatToParts(date)}
}
export function formatReportDate(value:Date|string,timeZone='UTC'):string {
 const date=value instanceof Date?value:new Date(value)
 if(!Number.isFinite(date.getTime()))return 'Date unavailable'
 const parts=dateParts(date,timeZone),part=(type:string)=>parts.find(p=>p.type===type)?.value||''
 return `${part('day')}-${part('month')}-${part('year')}`
}
export function formatReportTimestamp(value:Date|string,timeZone='UTC'):string {
 const date=value instanceof Date?value:new Date(value)
 if(!Number.isFinite(date.getTime()))return 'Date/time unavailable'
 let time:string
 try{time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timeZone||'UTC'}).format(date)}
 catch{time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(date)}
 return `${formatReportDate(date,timeZone)}, ${time}`
}
/** Exact half-up display rounding; never convert exchange-rate precision to Number. */
export function formatReportRate(value:string):string {
 if(!/^\d+(\.\d+)?$/.test(value))throw new Error('Invalid exchange rate in report snapshot.')
 const [whole,fraction='']=value.split('.'),digits=fraction.padEnd(3,'0')
 const cents=BigInt(whole!)*100n+BigInt(digits.slice(0,2))+(digits[2]!>='5'?1n:0n)
 return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`
}
