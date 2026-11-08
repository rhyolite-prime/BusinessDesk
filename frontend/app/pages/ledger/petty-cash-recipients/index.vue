<script setup lang="ts">
import { Check, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { LedgerPettyCashRecipient } from '../../../features/ledger/setup-data'
import { useLedgerSetup } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

const setup = useLedgerSetup()
const search = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<LedgerPettyCashRecipient | null>(null)
const saveError = ref('')
const form = reactive({ recipient: '', phoneNo: '', email: '' })

const visibleRecipients = computed(() => {
  const term = search.value.trim().toLowerCase()
  return [...setup.pettyCashRecipients.value]
    .sort((a, b) => a.recipient.localeCompare(b.recipient))
    .filter((recipient) => !term || `${recipient.recipient} ${recipient.phoneNo} ${recipient.email}`.toLowerCase().includes(term))
})

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, { recipient: '', phoneNo: '', email: '' })
  showForm.value = true
}

function openEdit(recipient: LedgerPettyCashRecipient) {
  editingId.value = recipient.id
  saveError.value = ''
  Object.assign(form, { recipient: recipient.recipient, phoneNo: recipient.phoneNo, email: recipient.email })
  showForm.value = true
}

function saveRecipient() {
  saveError.value = ''
  const recipient = form.recipient.trim()
  const phoneNo = form.phoneNo.trim()
  const email = form.email.trim().toLowerCase()
  if (!recipient || !phoneNo || !email) {
    saveError.value = 'Enter the recipient name, phone number, and email address.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    saveError.value = 'Enter a valid email address.'
    return
  }
  if (setup.pettyCashRecipients.value.some((item) => item.id !== editingId.value && item.email.toLowerCase() === email)) {
    saveError.value = 'A petty cash recipient with this email address already exists.'
    return
  }
  if (setup.pettyCashRecipients.value.some((item) => item.id !== editingId.value && item.phoneNo.replace(/\s+/g, '') === phoneNo.replace(/\s+/g, ''))) {
    saveError.value = 'A petty cash recipient with this phone number already exists.'
    return
  }
  setup.savePettyCashRecipient({ id: editingId.value || undefined, recipient, phoneNo, email })
  showForm.value = false
}

function removeRecipient() {
  if (!deleteTarget.value) return
  setup.removePettyCashRecipient(deleteTarget.value.id)
  deleteTarget.value = null
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PC'
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Petty Cash</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Petty Cash Recipients</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Keep the recipient directory current for petty cash disbursements and supporting records.</p>
      </div>
      <button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate"><Plus :size="15" /> Add recipient</button>
    </section>

    <div class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
      <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold dark:bg-brand-900/60">i</span>
      <p><span class="font-semibold">Preview mode:</span> recipient changes are held in local workspace demo data until the setup API is connected.</p>
    </div>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Recipient directory</h2>
          <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{{ visibleRecipients.length }} of {{ setup.pettyCashRecipients.value.length }} recipients</p>
        </div>
        <label class="relative block w-full sm:max-w-[360px]">
          <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" placeholder="Search name, phone, or email…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" />
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Recipient</th><th class="px-4 py-3">Phone number</th><th class="px-4 py-3">Email address</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="recipient in visibleRecipients" :key="recipient.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ initials(recipient.recipient) }}</span>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">{{ recipient.recipient }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5"><a :href="`tel:${recipient.phoneNo.replace(/\s+/g, '')}`" class="text-xs text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300">{{ recipient.phoneNo }}</a></td>
              <td class="px-4 py-3.5"><a :href="`mailto:${recipient.email}`" class="text-xs text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300">{{ recipient.email }}</a></td>
              <td class="px-4 py-3.5 text-right">
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`Edit ${recipient.recipient}`" title="Edit recipient" @click="openEdit(recipient)"><Pencil :size="14" /></button>
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete ${recipient.recipient}`" title="Delete recipient" @click="deleteTarget = recipient"><Trash2 :size="14" /></button>
              </td>
            </tr>
            <tr v-if="!visibleRecipients.length">
              <td colspan="4" class="px-5 py-12 text-center">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No petty cash recipients found</p>
                <p class="mt-1 text-xs text-slate-400">Try another search or add a recipient to the directory.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Name, phone, and email are required; email addresses and phone numbers must be unique.</span>
        <NuxtLink to="/ledger/bank-accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage bank accounts →</NuxtLink>
      </div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="showForm = false">
      <section role="dialog" aria-modal="true" aria-labelledby="petty-recipient-form-title" class="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between">
          <div><h2 id="petty-recipient-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit recipient' : 'New recipient' }}</h2><p class="mt-1 text-xs text-slate-500">These contact details are used when recording petty cash payments.</p></div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="saveRecipient">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Recipient name</span>
            <input v-model="form.recipient" required maxlength="160" autocomplete="name" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="Full name" />
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Phone number</span>
              <input v-model="form.phoneNo" required type="tel" maxlength="80" autocomplete="tel" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="+233 24 000 0000" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Email address</span>
              <input v-model="form.email" required type="email" maxlength="254" autocomplete="email" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="name@example.com" />
            </label>
          </div>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button>
            <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingId ? 'Save changes' : 'Add recipient' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="deleteTarget = null">
      <section role="dialog" aria-modal="true" aria-labelledby="petty-recipient-delete-title" class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 id="petty-recipient-delete-title" class="text-base font-semibold text-slate-900 dark:text-white">Delete recipient?</h2>
        <p class="mt-2 text-sm text-slate-500">“{{ deleteTarget.recipient }}” will be removed from the local recipient directory.</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button>
          <button type="button" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="removeRecipient">Delete recipient</button>
        </div>
      </section>
    </div>
  </div>
</template>
