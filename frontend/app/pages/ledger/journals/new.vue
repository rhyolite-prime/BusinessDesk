<script setup lang="ts">
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, CheckCircle2 } from '@lucide/vue'
import type { AccountsResponse, CreateJournalDraftInput } from '../../../features/ledger/types'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })

interface DraftLine {
  accountId: string
  description: string
  debit: string
  credit: string
}

const api = useLedgerApi()
const today = new Date().toISOString().slice(0, 10)
const batchDate = ref(today)
const description = ref('')
const lines = ref<DraftLine[]>([
  { accountId: '', description: '', debit: '', credit: '' },
  { accountId: '', description: '', debit: '', credit: '' },
])
const saving = ref(false)
const saveError = ref('')
const { data: accountsData, error: accountsError } = await useAsyncData<AccountsResponse>('ledger-journal-account-options', () => api.accounts())
const accounts = computed(() => accountsData.value?.items ?? [])
const amountScale = BigInt(1_000_000)

function parseAmount(value: string): bigint | null {
  const amount = value.trim()
  if (!amount) return BigInt(0)
  if (amount.length > 64 || !/^\d+(\.\d{1,6})?$/.test(amount)) return null
  const [whole, fraction = ''] = amount.split('.')
  const normalizedWhole = (whole ?? '0').replace(/^0+/, '') || '0'
  if (normalizedWhole.length > 14) return null
  return BigInt(normalizedWhole) * amountScale + BigInt(fraction.padEnd(6, '0'))
}

function formatUnits(units: bigint): string {
  const whole = units / amountScale
  const fraction = String(units % amountScale).padStart(6, '0')
  return `${whole}.${fraction}`
}

const debitUnits = computed(() => lines.value.reduce((sum, line) => sum + (parseAmount(line.debit) ?? BigInt(0)), BigInt(0)))
const creditUnits = computed(() => lines.value.reduce((sum, line) => sum + (parseAmount(line.credit) ?? BigInt(0)), BigInt(0)))
const totalDebit = computed(() => formatUnits(debitUnits.value))
const totalCredit = computed(() => formatUnits(creditUnits.value))
const linesValid = computed(() => lines.value.length >= 2 && lines.value.every((line) => {
  const debit = parseAmount(line.debit)
  const credit = parseAmount(line.credit)
  return Boolean(line.accountId) && debit !== null && credit !== null && (debit > BigInt(0) || credit > BigInt(0)) && !(debit > BigInt(0) && credit > BigInt(0))
}))
const balanced = computed(() => linesValid.value && debitUnits.value === creditUnits.value)
const difference = computed(() => formatUnits(debitUnits.value >= creditUnits.value ? debitUnits.value - creditUnits.value : creditUnits.value - debitUnits.value))
const canSave = computed(() => Boolean(description.value.trim()) && Boolean(batchDate.value) && linesValid.value && !saving.value)

function addLine() {
  lines.value.push({ accountId: '', description: '', debit: '', credit: '' })
}

function removeLine(index: number) {
  if (lines.value.length > 2) lines.value.splice(index, 1)
}

async function saveDraft() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    const input: CreateJournalDraftInput = {
      batchDate: batchDate.value,
      description: description.value.trim(),
      lines: lines.value.map((line) => ({
        accountId: line.accountId,
        accountName: accounts.value.find((account) => account.id === line.accountId)?.name ?? '',
        description: line.description.trim(),
        debit: line.debit || '0',
        credit: line.credit || '0',
      })),
    }
    const validation = await api.validateJournalDraft(input)
    if (!validation.valid) {
      saveError.value = validation.errors.join(' ')
      return
    }
    await api.createJournalDraft(input)
    await navigateTo('/ledger/journals')
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    saveError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The journal draft could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1100px] space-y-6">
    <NuxtLink to="/ledger/journals" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"><ArrowLeft :size="15" /> Back to journal entries</NuxtLink>

    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Journal entries <span class="mx-1 text-slate-300">/</span> New</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Create journal draft</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Enter a journal header and at least two ledger lines. Drafts can be saved before they balance.</p>
      </div>
      <span class="inline-flex w-fit items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><span class="h-1.5 w-1.5 rounded-full bg-violet-500" /> Draft</span>
    </section>

    <div v-if="accountsError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">Unable to load the chart of accounts. Please retry from the accounts page before preparing a journal.</div>

    <section class="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:p-6">
      <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Journal header</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Journal date</span><input v-model="batchDate" type="date" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Description</span><input v-model="description" required maxlength="200" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="What is this journal recording?" /></label>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Journal lines</h2><p class="mt-1 text-[11px] text-slate-500">Debit and credit totals must match before this batch can be submitted for approval.</p></div>
        <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="addLine"><Plus :size="14" /> Add line</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="w-12 px-5 py-3">#</th><th class="min-w-[250px] px-3 py-3">Account</th><th class="min-w-[220px] px-3 py-3">Line description</th><th class="w-[170px] px-3 py-3 text-right">Debit (GHS)</th><th class="w-[170px] px-3 py-3 text-right">Credit (GHS)</th><th class="w-12 px-3 py-3" /></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(line, index) in lines" :key="index">
              <td class="px-5 py-3 text-xs font-medium text-slate-400">{{ String(index + 1).padStart(2, '0') }}</td>
              <td class="px-3 py-2.5"><select v-model="line.accountId" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select ledger account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></td>
              <td class="px-3 py-2.5"><input v-model="line.description" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Optional line details" /></td>
              <td class="px-3 py-2.5"><input v-model="line.debit" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="line.credit = line.debit ? '' : line.credit" /></td>
              <td class="px-3 py-2.5"><input v-model="line.credit" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="line.debit = line.credit ? '' : line.debit" /></td>
              <td class="px-3 py-2.5"><button type="button" :disabled="lines.length <= 2" class="rounded-md p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Remove line" @click="removeLine(index)"><Trash2 :size="14" /></button></td>
            </tr>
            <tr class="bg-slate-50/70 dark:bg-slate-900/50"><td colspan="3" class="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Totals</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(totalDebit, 'GHS') }}</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(totalCredit, 'GHS') }}</td><td /></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="flex flex-col justify-between gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center" :class="balanced ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20'">
      <div class="flex items-start gap-2.5"><CheckCircle2 v-if="balanced" :size="16" class="mt-0.5 shrink-0 text-emerald-600" /><AlertTriangle v-else :size="16" class="mt-0.5 shrink-0 text-amber-600" /><p class="text-xs" :class="balanced ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'"><span class="font-semibold">{{ balanced ? 'Journal is balanced.' : 'Journal is not balanced yet.' }}</span> {{ balanced ? 'It can be reviewed for approval after saving.' : 'You can save this as a draft; approval submission requires equal debit and credit totals.' }}</p></div>
      <span class="shrink-0 text-[10px] font-semibold tabular-nums" :class="balanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">Difference {{ formatCurrency(difference, 'GHS') }}</span>
    </div>

    <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
    <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
      <NuxtLink to="/ledger/journals" class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</NuxtLink>
      <button type="button" :disabled="!canSave" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-xs font-semibold text-white shadow-sm shadow-brand-900/10 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50" @click="saveDraft"><Save :size="14" />{{ saving ? 'Saving draft…' : 'Save draft' }}</button>
    </div>
  </div>
</template>
