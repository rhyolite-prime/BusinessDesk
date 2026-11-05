<script setup lang="ts">
import { Check, Pencil, X } from '@lucide/vue'
import { companyProfileFields, emptyCompanyProfile, type ProfileForm } from '../../../features/ledger/company-profile-fields'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Company profile' })
const request = useRequestFetch(), form = reactive(emptyCompanyProfile()), saved = ref<ProfileForm>(emptyCompanyProfile())
const exists = ref(false), loaded = ref(false), loading = ref(true), saving = ref(false), editing = ref(false), error = ref(''), saveError = ref(''), currencyError = ref('')
const logoPending = ref(false), logoRevision = ref(0)
const password = ref(''), clearPassword = ref(false), hasPassword = ref(false)
const currencies = ref<{ id: string; code: string; name: string; isActive: boolean }[]>([])
const displayDecimals = useState<number | null>('tenant-display-decimals', () => null)
const sections = [
 { id: 'display', title: 'ERP display settings', description: 'Decimal places for monetary displays across the ERP (0–6). This does not change stored values, taxes, exchange rates or posting calculations.' },
 { id: 'company', title: 'Company details', description: 'Your business identity, location, registration and fiscal year.' },
 { id: 'social', title: 'Social security', description: 'Employer registration and employee/employer contribution percentages.' },
 { id: 'provident', title: 'Provident fund', description: 'Primary provident fund contributions and tax treatment.' },
 { id: 'second', title: 'Second provident fund / other contributions', description: 'Additional contribution rates and treatment.' },
 { id: 'overtime', title: 'Overtime basis', description: 'Store the salary and daily-wage calculation preferences.' },
 { id: 'mail', title: 'Email settings', description: 'SMTP configuration. Saved passwords are encrypted and are never displayed.' },
 { id: 'rules', title: 'Business rules', description: 'Invoice approval, tax levies and organization-unit requirements.' },
]
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(saved.value) || !!password.value || clearPassword.value)
const disabled = computed(() => !editing.value || loading.value || saving.value || !loaded.value)
const message = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
let version = 0, currencyVersion = 0
function populate(result: Record<string, any>) {
  logoRevision.value++; logoPending.value = false
  const next = emptyCompanyProfile()
  for (const f of companyProfileFields) if (f.key in result) next[f.key] = result[f.key]
  Object.assign(form, next); saved.value = { ...next }; password.value = ''; clearPassword.value = false; hasPassword.value = result.hasEmailPassword === true
}
async function load() {
  if (editing.value && dirty.value && !window.confirm('Discard unsaved company profile changes?')) return
  const current = ++version; loading.value = true; error.value = ''; saveError.value = ''
  try {
    const r = await request<Record<string, any>>('/api/shared/company-profile')
    if (current !== version) return
    populate(r); exists.value = true; editing.value = false; loaded.value = true
  } catch (e: any) {
    if (current !== version) return
    if ((e?.response?.status || e?.statusCode) === 404) { populate({}); exists.value = false; editing.value = true; loaded.value = true }
    else { error.value = message(e); loaded.value = false; editing.value = false }
  } finally { if (current === version) loading.value = false }
}
async function loadCurrencies() {
  const current = ++currencyVersion; currencyError.value = ''
  try {
    const all: typeof currencies.value = []; let page = 1, pages = 1
    do {
      const r = await request<{ data: typeof currencies.value; totalPages: number }>('/api/shared/currencies', { query: { pageNo: page, pageSize: 200 } })
      if (current !== currencyVersion) return
      all.push(...r.data); pages = r.totalPages; page++
    } while (page <= pages)
    currencies.value = all.filter(row => row.isActive)
  } catch { if (current === currencyVersion) currencyError.value = 'Currency choices could not be loaded. Retry before selecting a default.' }
}
function cancel() { logoRevision.value++; logoPending.value = false; Object.assign(form, saved.value); password.value = ''; clearPassword.value = false; saveError.value = ''; editing.value = !exists.value }
async function save() {
  if (disabled.value || logoPending.value) return
  saving.value = true; saveError.value = ''
  try {
    const body = { ...form, ...(password.value ? { emailPassword: password.value } : {}), ...(clearPassword.value ? { clearEmailPassword: true } : {}) }
    const result = exists.value ? await request<Record<string, any>>('/api/shared/company-profile', { method: 'PUT', body }) : await request<Record<string, any>>('/api/shared/company-profile', { method: 'POST', body })
    populate(result); displayDecimals.value = Number(result.displayDecimals ?? 2); exists.value = true; editing.value = false
  } catch (e) { saveError.value = message(e) }
  finally { saving.value = false }
}
watch(password, value => { if (value) clearPassword.value = false })
onMounted(() => { void load(); void loadCurrencies() })
onUnmounted(() => { version++; currencyVersion++ })
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4"><div><div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Shared config</div><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Company profile</h1><p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Manage your company’s identity, statutory settings and operational preferences. Each tenant has one profile.</p></div><div class="flex gap-3"><button :disabled="loading || saving" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 disabled:opacity-40 dark:border-slate-700" @click="load">Refresh</button><button v-if="exists && !editing" :disabled="!loaded || loading" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-40" @click="editing = true"><Pencil :size="14" />Edit profile</button></div></header>
    <p v-if="loading" role="status" class="text-sm text-slate-400">Loading company profile…</p>
    <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{{ error }}</p>
    <p v-if="loaded && !exists" class="rounded-lg border border-brand-100 bg-brand-50/60 p-4 text-xs text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">No company profile has been created yet. Complete the details below to create your tenant’s profile. It cannot be deleted.</p>
    <p class="text-xs text-slate-400">Fund rates are percentages (0–100, up to six decimal places). These settings do not run payroll, send email or change existing accounting-unit fiscal calendars.</p>
    <form v-if="loaded" class="space-y-5" @submit.prevent="save">
      <section v-for="section in sections" :key="section.id" class="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-[#15201e]">
        <header class="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ section.title }}</h2><p class="mt-1 text-xs text-slate-400">{{ section.description }}</p></header>
        <fieldset :disabled="disabled" class="grid gap-5 p-5 sm:grid-cols-2">
          <template v-for="field in companyProfileFields.filter(f => f.group === section.id && f.key !== 'companyLogoUrl')" :key="field.key">
            <label v-if="field.kind === 'b'" class="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"><input v-model="form[field.key]" type="checkbox" class="h-4 w-4 accent-brand-700" />{{ field.label }}</label>
            <label v-else class="block text-xs font-semibold text-slate-600 dark:text-slate-300" :class="field.key === 'address' ? 'sm:col-span-2' : ''">{{ field.label }}<span v-if="field.key === 'companyName'" class="text-rose-500"> *</span>
              <select aria-label="Monetary display decimal places" v-if="field.key === 'displayDecimals'" v-model.number="form.displayDecimals" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option v-for="n in [0,1,2,3,4,5,6]" :key="n" :value="n">{{ n }}</option></select>
              <select v-else-if="field.key === 'firstMonthOfFiscalYear'" v-model.number="form.firstMonthOfFiscalYear" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option></select>
              <select v-else-if="field.key === 'defaultCurrencyId'" v-model="form.defaultCurrencyId" required class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option :value="null" disabled>Select the local currency</option><option v-if="form.defaultCurrencyId && !currencies.some(c => c.id === form.defaultCurrencyId)" :value="form.defaultCurrencyId">Saved currency (currently unavailable)</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }} — {{ currency.name }}</option></select>
              <textarea v-else-if="field.key === 'address'" v-model="form.address as string" rows="3" :maxlength="field.max" class="mt-1.5 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700" />
              <input v-else-if="field.kind === 'r' || field.kind === 'i'" v-model.number="form[field.key]" required type="number" :min="0" :max="field.max" :step="field.kind === 'r' ? '0.000001' : '1'" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700" />
              <input v-else v-model="form[field.key]" :required="field.key === 'companyName'" :maxlength="field.max || 36" :type="field.key === 'email' || field.key === 'primaryEmailAddress' ? 'email' : field.key === 'phoneNo' ? 'tel' : 'text'" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700" />

            </label>
          </template>
          <CompanyLogoUpload :key="logoRevision" v-if="section.id === 'company'" :model-value="String(form.companyLogoUrl || '')" :disabled="disabled" @update:model-value="form.companyLogoUrl = $event" @pending="logoPending = $event" />
          <template v-if="section.id === 'mail'">
            <div class="sm:col-span-2"><p class="text-xs text-slate-500">SMTP password: <strong>{{ hasPassword ? 'Configured (hidden)' : 'Not configured' }}</strong></p><label v-if="editing" class="mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">New SMTP password<input v-model="password" type="password" maxlength="1024" autocomplete="new-password" placeholder="Leave blank to keep the saved password" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700" /></label><label v-if="editing && hasPassword" class="mt-3 flex items-center gap-2 text-xs text-slate-500"><input v-model="clearPassword" type="checkbox" class="accent-brand-700" @change="clearPassword && (password = '')" />Remove saved SMTP password</label></div>
          </template>
        </fieldset>
        <div v-if="section.id === 'company' && currencyError" class="px-5 pb-4 text-xs text-rose-600" role="alert">{{ currencyError }} <button type="button" class="underline" @click="loadCurrencies">Retry currency lookup</button></div>
      </section>
      <div v-if="editing" class="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-[#172321]/95"><p v-if="saveError" role="alert" class="text-xs text-rose-600">{{ saveError }}</p><span v-else class="text-xs text-slate-400">{{ exists ? 'Changes apply only to your tenant.' : 'Create the single profile for this tenant.' }}</span><div class="ml-auto flex gap-3"><button type="button" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700" @click="cancel"><X :size="14" />{{ exists ? 'Cancel' : 'Reset' }}</button><button type="submit" :disabled="saving || loading || logoPending" class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"><Check :size="14" />{{ saving ? 'Saving…' : exists ? 'Save changes' : 'Create company profile' }}</button></div></div>
    </form>
  </div>
</template>
