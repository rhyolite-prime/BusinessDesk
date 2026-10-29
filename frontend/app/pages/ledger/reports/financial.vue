<script setup lang="ts">
import { reportCatalog, financialReport, type ReportKind, type FinancialSnapshot } from '../../../features/reports/financial-reports'
import type { EmbeddedReport } from '../../../features/reports/report-types'
import { useJournals } from '../../../features/ledger/useJournals'
definePageMeta({layout:'admin-ledger'})
useHead({title:'Financial reports'})
const route=useRoute(),request=useRequestFetch(),api=useJournals()
const kind=ref<ReportKind>('trial-balance'),unitId=ref(''),units=ref<{id:string;name:string}[]>([])
const today=new Date().toISOString().slice(0,10),from=ref(today.slice(0,7)+'-01'),to=ref(today)
const accountId=ref(''),costCenterId=ref(''),budgetBasis=ref<'original'|'revised'>('revised')
const snapshot=shallowRef<FinancialSnapshot|null>(null),report=shallowRef<EmbeddedReport|null>(null),warnings=ref<string[]>([])
const loading=ref(false),error=ref('');let generation=0
function routeKind(){const value=String(route.query.type||'trial-balance');if(reportCatalog.some(([id])=>id===value))kind.value=value as ReportKind}
routeKind();watch(()=>route.query.type,routeKind)
const centers=computed(()=>[...new Map((snapshot.value?.lines||[]).filter(l=>l.costCenterId).map(l=>[l.costCenterId!,{id:l.costCenterId!,name:l.costCenter||'Unavailable cost center'}])).values()])
watch([kind,unitId,from,to,accountId,costCenterId,budgetBasis],()=>{++generation;loading.value=false;report.value=null;warnings.value=[];error.value=''})
watch(unitId,()=>{snapshot.value=null;accountId.value='';costCenterId.value=''})
async function generate(){
 const current=++generation;loading.value=true;report.value=null;error.value='';warnings.value=[]
 const filters={kind:kind.value,from:from.value,to:to.value,accountId:accountId.value,costCenterId:costCenterId.value,budgetBasis:budgetBasis.value},unit=unitId.value
 try {
  const data=await request<FinancialSnapshot>('/api/ledger/financial-reports',{query:{accountingUnitId:unit,through:filters.to}})
  if(current!==generation)return
  snapshot.value=data
  const result=financialReport(data,filters);report.value=result.report;warnings.value=result.warnings
 }catch(e:any){if(current===generation)error.value=e?.data?.statusMessage||e?.message||'Unable to generate financial report.'}
 finally{if(current===generation)loading.value=false}
}
onMounted(async()=>{try{units.value=await api.units();unitId.value=units.value[0]?.id||''}catch(e:any){error.value=e?.data?.statusMessage||'Unable to load accounting units.'}})
onBeforeUnmount(()=>++generation)
</script>
<template>
 <div class="space-y-5">
  <header class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold">Financial reports</h1><p class="mt-2 text-sm text-slate-500">Posted ledger only · base-currency statements · transaction-date basis · tenant display precision</p></div><div class="flex gap-4 text-sm text-brand-700"><NuxtLink to="/ledger/reports/chart-of-accounts">Chart of Accounts</NuxtLink><NuxtLink to="/ledger/reports/mappings">Report mappings</NuxtLink></div></header>
  <form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:grid-cols-2 xl:grid-cols-3" @submit.prevent="generate">
   <label class="text-sm">Report<select aria-label="Report" v-model="kind" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option v-for="[id,label] in reportCatalog" :key="id" :value="id">{{ label }}</option></select></label>
   <label class="text-sm">Accounting unit<select aria-label="Accounting unit" v-model="unitId" required class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="" disabled>Select a unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></label>
   <label v-if="kind !== 'balance-sheet' && kind !== 'trial-balance'" class="text-sm">From<input v-model="from" required type="date" min="1900-01-01" :max="to" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label>
   <label class="text-sm">{{ kind === 'balance-sheet' || kind === 'trial-balance' ? 'As of' : 'Through' }}<input v-model="to" required type="date" min="1900-01-01" max="2999-12-31" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label>
   <label class="text-sm">Cost center<select aria-label="Cost center" v-model="costCenterId" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All cost centers</option><option value="unassigned">Unassigned only</option><option v-for="center in centers" :key="center.id" :value="center.id">{{ center.name }} · {{ center.id.slice(0,8) }}</option></select><span class="text-xs text-slate-500">Generate once to load available cost centers.</span></label>
   <label v-if="kind === 'general-ledger' || kind === 'journal-register'" class="text-sm">Account<select aria-label="Account" v-model="accountId" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All accounts</option><option v-for="account in snapshot?.accounts" :key="account.id" :value="account.id">{{ account.number }} · {{ account.name }}</option></select></label>
   <label v-if="kind === 'income-budget'" class="text-sm">Budget basis<select aria-label="Budget basis" v-model="budgetBasis" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="revised">Revised</option><option value="original">Original</option></select></label>
   <p v-if="kind === 'income-ytd'" class="text-xs text-slate-500">From is replaced with the fiscal-year start configured on Company Profile.</p>
   <p v-if="kind === 'balance-sheet'" class="text-xs text-slate-500">As-of balances include all posted history through the date, not just From. Unclosed earnings are included explicitly in equity.</p>
   <p v-if="kind === 'income-budget'" class="text-xs text-slate-500">Select complete calendar months. Approved/closed budgets only. No daily proration.</p>
   <div class="self-end"><button :disabled="loading || !unitId" class="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{{ loading ? 'Generating…' : 'Generate report' }}</button></div>
  </form>
  <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{{ error }}</p>
  <ul v-if="warnings.length" class="list-inside list-disc rounded-lg bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul>
  <ReportViewer v-if="report" :report="report" />
  <p v-else-if="!loading && !error" class="text-sm text-slate-500">Choose a report and filters, then generate a fresh snapshot. Exports contain all rows and report notes, not just the displayed PDF page.</p>
 </div>
</template>
