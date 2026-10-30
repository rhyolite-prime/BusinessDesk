<script setup lang="ts">
import { financialReport, type FinancialSnapshot } from '../../../features/reports/financial-reports'
import { chartOfAccountsReport } from '../../../features/reports/chart-of-accounts'
import { reportGroups, plannedReportGroups, type LedgerReportKind } from '../../../features/reports/report-catalog'
import type { AccountDetail } from '../../../features/ledger/account-detail-types'
import type { LedgerAccountControl } from '../../../features/ledger/setup-data'
import type { EmbeddedReport } from '../../../features/reports/report-types'
import { useJournals } from '../../../features/ledger/useJournals'
definePageMeta({layout:'admin-ledger'})
useHead({title:'General Ledger reports'})
const route=useRoute(),request=useRequestFetch(),api=useJournals()
const kind=ref<LedgerReportKind>('trial-balance'),unitId=ref(''),units=ref<{id:string;name:string}[]>([])
const today=new Date().toISOString().slice(0,10),from=ref(today.slice(0,7)+'-01'),to=ref(today)
const accountId=ref(''),costCenterId=ref(''),budgetBasis=ref<'original'|'revised'>('revised')
const snapshot=shallowRef<FinancialSnapshot|null>(null),report=shallowRef<EmbeddedReport|null>(null),warnings=ref<string[]>([])
const chartType=ref(''),chartStatus=ref(''),search=ref('')
const loading=ref(false),error=ref('');let generation=0
function routeKind(){const value=String(route.query.type||'trial-balance');kind.value=reportGroups.flatMap(group=>group.reports).some(([id])=>id===value)?value as LedgerReportKind:'trial-balance'}
routeKind();watch(()=>route.query.type,routeKind)
watch(kind,value=>{if(route.query.type!==value)void navigateTo({path:'/ledger/reports',query:{...route.query,type:value}},{replace:true})})
const centers=computed(()=>[...new Map((snapshot.value?.lines||[]).filter(l=>l.costCenterId).map(l=>[l.costCenterId!,{id:l.costCenterId!,name:l.costCenter||'Unavailable cost center'}])).values()])
watch([kind,unitId,from,to,accountId,costCenterId,budgetBasis,chartType,chartStatus,search],()=>{++generation;loading.value=false;report.value=null;warnings.value=[];error.value=''})
watch(unitId,()=>{snapshot.value=null;accountId.value='';costCenterId.value=''})
async function allPages<T>(resource:string,unit:string,current:number):Promise<T[]>{
 const rows:T[]=[]
 for(let pageNo=1;;pageNo++){
  if(current!==generation)return []
  if(pageNo>500)throw new Error('This report exceeds 100,000 records. Contact your administrator.')
  const result=await request<{data:T[];totalPages:number}>(`/api/ledger/${resource}`,{query:{accountingUnitId:unit,pageNo,pageSize:200}})
  if(current!==generation)return []
  rows.push(...result.data)
  if(!result.data.length||pageNo>=result.totalPages)return rows
 }
}
async function profile(){
 try{return await request<{companyName:string}>('/api/shared/company-profile')}
 catch(e:any){if(e?.statusCode===404||e?.status===404)return null;throw e}
}
async function generate(){
 const current=++generation;loading.value=true;report.value=null;error.value='';warnings.value=[]
 const filters={kind:kind.value,from:from.value,to:to.value,accountId:accountId.value,costCenterId:costCenterId.value,budgetBasis:budgetBasis.value,status:chartStatus.value,type:chartType.value,query:search.value},unit=unitId.value
 try {
  if(filters.kind==='chart-of-accounts'){
   const [accounts,controls,currencies,unitData,company]=await Promise.all([
    allPages<AccountDetail>('accounts',unit,current),allPages<LedgerAccountControl>('account-controls',unit,current),
    request<{id:string;name:string;code:string}[]>('/api/ledger/accounting-unit-currencies'),
    request<{name:string;baseCurrencyId:string;timeZone:string}>(`/api/ledger/accounting-units/${unit}`),profile(),
   ])
   if(current!==generation)return
   if(!company?.companyName)warnings.value=['Company profile is not configured. The report header will indicate this.']
   report.value=chartOfAccountsReport({accounts,controls,currencies,companyName:company?.companyName||'',unitName:unitData.name,baseCurrencyId:unitData.baseCurrencyId,
    generatedAt:new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:unitData.timeZone||'UTC'}).format(new Date()),status:filters.status,type:filters.type,query:filters.query})
   return
  }
  const data=await request<FinancialSnapshot>('/api/ledger/financial-reports',{query:{accountingUnitId:unit,through:filters.to}})
  if(current!==generation)return
  snapshot.value=data
  const result=financialReport(data,{...filters,kind:filters.kind});report.value=result.report;warnings.value=result.warnings
 }catch(e:any){if(current===generation)error.value=e?.data?.statusMessage||e?.message||'Unable to generate financial report.'}
 finally{if(current===generation)loading.value=false}
}
onMounted(async()=>{try{units.value=await api.units();unitId.value=units.value[0]?.id||''}catch(e:any){error.value=e?.data?.statusMessage||'Unable to load accounting units.'}})
onBeforeUnmount(()=>++generation)
</script>
<template>
 <div class="space-y-5">
  <header class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="text-2xl font-semibold">General Ledger reports</h1><p class="mt-2 text-sm text-slate-500">Select a report below. Financial statements use posted ledger entries; Chart of Accounts lists account setup records.</p></div><div class="flex gap-4 text-sm text-brand-700"><NuxtLink to="/ledger/reports/mappings">Report mappings</NuxtLink></div></header>
  <form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:grid-cols-2 xl:grid-cols-3" @submit.prevent="generate">
   <label class="text-sm">Report<select aria-label="Report" v-model="kind" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><optgroup v-for="group in reportGroups" :key="group.label" :label="group.label"><option v-for="[id,label] in group.reports" :key="id" :value="id">{{ label }}</option></optgroup><optgroup v-for="group in plannedReportGroups" :key="group.label" :label="group.label + ' (coming soon)'"><option v-for="label in group.reports" :key="label" disabled>{{ label }} — coming soon</option></optgroup></select></label>
   <label class="text-sm">Accounting unit<select aria-label="Accounting unit" v-model="unitId" required class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="" disabled>Select a unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></label>
   <label v-if="kind !== 'chart-of-accounts' && kind !== 'balance-sheet' && kind !== 'trial-balance'" class="text-sm">From<input v-model="from" required type="date" min="1900-01-01" :max="to" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label>
   <label v-if="kind !== 'chart-of-accounts'" class="text-sm">{{ kind === 'balance-sheet' || kind === 'trial-balance' ? 'As of' : 'Through' }}<input v-model="to" required type="date" min="1900-01-01" max="2999-12-31" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label>
   <label v-if="kind !== 'chart-of-accounts'" class="text-sm">Cost center<select aria-label="Cost center" v-model="costCenterId" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All cost centers</option><option value="unassigned">Unassigned only</option><option v-for="center in centers" :key="center.id" :value="center.id">{{ center.name }} · {{ center.id.slice(0,8) }}</option></select><span class="text-xs text-slate-500">Generate once to load available cost centers.</span></label>
   <label v-if="kind === 'general-ledger' || kind === 'journal-register'" class="text-sm">Account<select aria-label="Account" v-model="accountId" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All accounts</option><option v-for="account in snapshot?.accounts" :key="account.id" :value="account.id">{{ account.number }} · {{ account.name }}</option></select></label>
   <label v-if="kind === 'income-budget'" class="text-sm">Budget basis<select aria-label="Budget basis" v-model="budgetBasis" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="revised">Revised</option><option value="original">Original</option></select></label>
   <template v-if="kind === 'chart-of-accounts'">
    <label class="text-sm">Account type<select aria-label="Account type" v-model="chartType" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All types</option><option v-for="(label,index) in ['Asset','Liability','Equity','Revenue','Expense']" :key="label" :value="String(index)">{{ label }}</option></select></label>
    <label class="text-sm">Status<select aria-label="Status" v-model="chartStatus" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
    <label class="text-sm">Search<input aria-label="Search" v-model="search" type="search" maxlength="120" placeholder="Account number, name or control…" class="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label>
   </template>
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
