<script setup lang="ts">
import { mappingCategories, type FinancialSnapshot } from '../../../features/reports/financial-reports'
import { useJournals } from '../../../features/ledger/useJournals'
definePageMeta({layout:'admin-ledger'})
useHead({title:'Financial report mappings'})
const request=useRequestFetch(),api=useJournals(),units=ref<{id:string;name:string}[]>([]),unitId=ref(''),snapshot=shallowRef<(FinancialSnapshot&{canManageMappings:boolean})|null>(null)
const mappings=ref<Record<string,string>>({}),saved=ref<Record<string,string>>({}),search=ref(''),loading=ref(false),saving=ref(false),error=ref(''),message=ref('')
const today=new Date().toISOString().slice(0,10)
const accounts=computed(()=>snapshot.value?.accounts.filter(a=>`${a.number} ${a.name}`.toLowerCase().includes(search.value.toLowerCase()))||[])
const changes=computed(()=>Object.entries(mappings.value).filter(([id,value])=>value!==saved.value[id]).map(([accountId,category])=>({accountId,category})))
let version=0
async function load(){const current=++version;loading.value=true;error.value='';message.value='';snapshot.value=null;try{const data=await request<FinancialSnapshot&{canManageMappings:boolean}>('/api/ledger/financial-reports',{query:{accountingUnitId:unitId.value,through:today}});if(current!==version)return;snapshot.value=data;mappings.value=Object.fromEntries(data.accounts.map(a=>[a.id,a.category]));saved.value={...mappings.value}}catch(e:any){if(current===version)error.value=e?.data?.statusMessage||'Unable to load mappings.'}finally{if(current===version)loading.value=false}}
async function save(){if(!changes.value.length||changes.value.length>500||saving.value)return;saving.value=true;error.value='';message.value='';try{await request('/api/ledger/financial-reports/mappings',{method:'PUT',query:{accountingUnitId:unitId.value,through:today},body:changes.value});saved.value={...mappings.value};message.value='Report mappings saved. Generate a new report snapshot to apply them.'}catch(e:any){error.value=e?.data?.statusMessage||'Unable to save mappings.'}finally{saving.value=false}}
function changeUnit(event:Event){const value=(event.target as HTMLSelectElement).value;if(changes.value.length&&!window.confirm('Discard unsaved report mappings?')){(event.target as HTMLSelectElement).value=unitId.value;return}unitId.value=value}
onBeforeRouteLeave(()=>!changes.value.length||window.confirm('Discard unsaved report mappings?'))
watch(unitId,()=>{if(unitId.value)void load()})
onMounted(async()=>{try{units.value=await api.units();unitId.value=units.value[0]?.id||''}catch{error.value='Unable to load units.'}})
onBeforeUnmount(()=>++version)
</script>
<template>
 <div class="space-y-5">
  <h1 class="text-2xl font-semibold">Financial report mappings</h1><p class="text-sm text-slate-500">Tenant administrators classify GL accounts explicitly. No classifications are inferred from names or account numbers. Only categories compatible with the account type are offered. Unclassified activity is flagged; advanced subtotals require complete mapping.</p>
  <NuxtLink to="/ledger/reports/financial" class="text-sm text-brand-700">← Financial reports</NuxtLink>
  <label class="block text-sm">Accounting unit<select :value="unitId" @change="changeUnit" :disabled="saving" class="mt-1 block h-10 w-full rounded border bg-transparent px-3"><option value="" disabled>Select a unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></label>
  <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }} <button v-if="unitId && !saving" class="underline" @click="load">Reload</button></p><p v-if="message" role="status" class="text-sm text-emerald-700">{{ message }}</p>
  <p v-if="loading" role="status">Loading accounts…</p>
  <p v-if="snapshot && !snapshot.canManageMappings" class="text-sm text-amber-700">Read-only. A tenant administrator must save report mappings.</p>
  <label class="block text-sm">Search account<input v-model="search" type="search" class="mt-1 block h-10 w-full rounded border bg-transparent px-3" /></label>
  <div class="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table class="w-full text-left text-sm"><thead><tr><th class="p-3">Account</th><th class="p-3">Report classification</th></tr></thead><tbody><tr v-for="account in accounts" :key="account.id" class="border-t border-slate-100 dark:border-slate-800"><td class="p-3">{{ account.number }} · {{ account.name }}</td><td class="p-3"><select v-model="mappings[account.id]" :aria-label="`Classification for ${account.number} ${account.name}`" :disabled="saving || !snapshot?.canManageMappings" class="h-10 w-full rounded border bg-transparent px-2"><option value="">Unclassified</option><option v-for="[id,label] in mappingCategories.filter(category=>category[2] === account.type)" :key="id" :value="id">{{ label }}</option></select></td></tr></tbody></table></div>
  <p v-if="changes.length>500" role="alert" class="text-sm text-rose-600">Save at most 500 changed accounts per operation.</p><button :disabled="!snapshot?.canManageMappings || saving || !changes.length || changes.length>500" class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" @click="save">{{ saving ? 'Saving…' : `Save ${changes.length} changed mappings` }}</button>
 </div>
</template>
