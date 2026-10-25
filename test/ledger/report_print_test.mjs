// Browser print dialogs/physical printers cannot be exercised by headless tests.
// Verify full-PDF handoff, callback invocation, failures and resource cleanup.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=await readFile(new URL('../../frontend/app/features/reports/print-report.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {printReportPdf}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const originals={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,create:URL.createObjectURL,revoke:URL.revokeObjectURL}
let frame,blob,printed=0,removed=0,revoked=0,errors=0,fail=false,timerId=0
const timers=new Map();globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId};globalThis.clearTimeout=id=>timers.delete(id)
globalThis.window=new EventTarget()
globalThis.document={createElement:()=>frame={style:{},setAttribute(){},contentWindow:Object.assign(new EventTarget(),{focus(){},print(){if(fail)throw Error('Browser print denied');printed++}}),remove(){removed++}},body:{appendChild(){frame.onload()}}}
URL.createObjectURL=value=>{blob=value;return 'blob:report'};URL.revokeObjectURL=()=>revoked++
const print=()=>{const timer=[...timers.values()].find(t=>t.ms===500);assert.ok(timer);timer.fn()}
try{
 const bytes=new Uint8Array([37,80,68,70,1,2,3,4]),cleanup=printReportPdf(bytes,()=>errors++)
 assert.equal(blob.type,'application/pdf');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes)
 print();assert.equal(printed,1);assert.equal(errors,0)
 window.dispatchEvent(new Event('afterprint'));assert.equal(removed,1);assert.equal(revoked,1);cleanup();assert.equal(revoked,1)
 timers.clear();fail=true;printReportPdf(bytes,()=>errors++);print();assert.equal(errors,1);assert.equal(revoked,2)
 timers.clear();fail=false;const cancel=printReportPdf(bytes,()=>errors++);cancel();assert.equal(timers.size,0);assert.equal(revoked,3)
 timers.clear();printReportPdf(bytes,()=>errors++);frame.onerror();assert.equal(errors,2);assert.equal(revoked,4)
 console.log('12 report print handoff/cleanup checks passed')
}finally{globalThis.document=originals.document;globalThis.window=originals.window;globalThis.setTimeout=originals.setTimeout;globalThis.clearTimeout=originals.clearTimeout;URL.createObjectURL=originals.create;URL.revokeObjectURL=originals.revoke}
