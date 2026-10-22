<script setup lang="ts">
import {
  accountModules,
  accountUpdate,
  type TenantAccount,
} from '../features/tenant-account'
const props = defineProps<{ account: TenantAccount; host?: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
const tab = ref('Overview'),
  busy = ref(false),
  error = ref(''),
  success = ref('')
const draft = ref<TenantAccount>(structuredClone(toRaw(props.account)))
watch(
  () => props.account,
  (value) => {
    draft.value = structuredClone(toRaw(value))
    error.value = ''
  },
)
const tabs = computed(() => [
  'Overview',
  'Subscriptions',
  'Billing',
  'Security',
  'Requests',
  ...(props.host ? ['Audit history'] : []),
])
const requestMessage = ref(''),
  requestKey = ref(crypto.randomUUID()),
  responses = reactive<Record<string, string>>({})
const currencyOptions = ref<Array<{ id: string; code: string }>>([])
const currencyError = ref('')
if (props.host) {
  try {
    for (let pageNo = 1; pageNo <= 100; pageNo++) {
      const r = await useRequestFetch()<{
        data: Array<{ id: string; code: string; isActive: boolean }>
        totalPages: number
      }>('/api/host/currencies', { query: { pageNo, pageSize: 100 } })
      currencyOptions.value.push(...r.data.filter((c) => c.isActive))
      if (pageNo >= r.totalPages) break
    }
  } catch {
    currencyError.value =
      'Billing currencies could not be loaded. Reload before saving.'
  }
}
async function action(work: () => Promise<unknown>, message: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await work()
    success.value = message
    emit('refresh')
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage ||
      'Account action failed. Reload and retry; no changes are assumed saved.'
  } finally {
    busy.value = false
  }
}
async function save() {
  if (!props.host || currencyError.value) return
  await action(
    () =>
      $fetch(`/api/host/tenants/${props.account.id}`, {
        method: 'PUT',
        body: accountUpdate(draft.value),
      }),
    'Account changes saved and audited.',
  )
}
async function requestChange() {
  await action(async () => {
    await $fetch('/api/account/requests', {
      method: 'POST',
      body: { message: requestMessage.value, requestKey: requestKey.value },
    })
    requestMessage.value = ''
    requestKey.value = crypto.randomUUID()
  }, 'Change request submitted. Subscription terms and payment instructions have not changed.')
}
async function resolve(id: string, version: number, status: string) {
  await action(
    () =>
      $fetch(`/api/host/tenants/${props.account.id}/resolve`, {
        method: 'POST',
        body: { id, version, status, response: responses[id] || '' },
      }),
    'Request closed and audited. Apply any approved account changes separately.',
  )
}
function dateValue(value: string | null) {
  return value || 'Not set'
}
</script>
<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">{{ account.name }}</h2>
        <p class="mt-1 text-xs text-slate-500">
          Account {{ account.accountId }} ·
          {{ account.isActive ? 'Active' : 'Suspended' }} · Version
          {{ account.version }}
        </p>
      </div>
      <button
        v-if="host"
        :disabled="busy || !!currencyError"
        class="rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        @click="save"
      >
        {{ busy ? 'Saving…' : 'Save account changes' }}
      </button>
    </div>
    <nav
      class="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700"
      aria-label="Account sections"
    >
      <button
        v-for="item in tabs"
        :key="item"
        :aria-pressed="tab === item"
        class="rounded-lg px-3 py-2 text-xs font-medium"
        :class="
          tab === item
            ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
            : 'text-slate-500'
        "
        @click="tab = item"
      >
        {{ item }}
      </button>
    </nav>
    <p
      v-if="error || currencyError"
      role="alert"
      class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
    >
      {{ error || currencyError }}
    </p>
    <p
      v-if="success"
      role="status"
      class="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"
    >
      {{ success }}
    </p>
    <fieldset :disabled="!host || busy" class="space-y-5 disabled:opacity-90">
      <div v-show="tab === 'Overview'" class="grid gap-4 sm:grid-cols-2">
        <label class="account-field"
          >Organization name<input
            v-model="draft.name"
            maxlength="128" /></label
        ><label class="account-field"
          >Country<input v-model="draft.country" maxlength="20"
        /></label>
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="draft.isActive" type="checkbox" /> Account active
          (uncheck to suspend tenant access)</label
        >
        <div class="text-xs text-slate-500">
          Account ID and infrastructure configuration are managed separately.
          Connection strings, payment credentials and support-account secrets
          are never returned here.
        </div>
      </div>
      <div v-show="tab === 'Subscriptions'" class="space-y-4">
        <p class="text-xs text-slate-500">
          Dates are inclusive, using the database date. No dates means no date
          restriction. Fees use
          {{
            account.billing.currencyCode || 'an unconfigured billing currency'
          }}; billing metadata does not collect payments automatically.
        </p>
        <div
          v-for="(label, key) in accountModules"
          :key="key"
          class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <div class="mb-3 flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm font-semibold"
              ><input v-model="draft.modules[key].enabled" type="checkbox" />{{
                label
              }}</label
            ><span
              class="text-xs"
              :class="
                account.modules[key].effective
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              "
              >{{
                account.modules[key].effective
                  ? 'Access active'
                  : 'No current access'
              }}</span
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="account-field"
              >{{ label }} start<input
                v-model="draft.modules[key].startDate"
                type="date" /></label
            ><label class="account-field"
              >{{ label }} end<input
                v-model="draft.modules[key].endDate"
                type="date" /></label
            ><label class="account-field"
              >{{ label }} fee<input
                v-model="draft.modules[key].fee"
                inputmode="decimal" /></label
            ><label class="account-field"
              >{{ label }} billing cycle<select
                v-model="draft.modules[key].billingCycle"
              >
                <option value="">Not configured</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="one_time">One-time</option>
              </select></label
            ><label class="account-field"
              >{{ label }} next renewal<input
                v-model="draft.modules[key].nextRenewalDate"
                type="date"
            /></label>
          </div>
        </div>
      </div>
      <div v-show="tab === 'Billing'" class="grid gap-4 sm:grid-cols-2">
        <label class="account-field"
          >Billing currency<select
            v-if="host"
            v-model="draft.billing.currencyId"
          >
            <option :value="null">Select billing currency</option>
            <option
              v-for="currency in currencyOptions"
              :key="currency.id"
              :value="currency.id"
            >
              {{ currency.code }}
            </option></select
          ><span v-else>{{
            account.billing.currencyCode ||
            'Not configured — contact host support'
          }}</span></label
        >
        <label class="account-field"
          >Billing email<input
            v-model="draft.billing.email"
            type="email"
            maxlength="254" /></label
        ><label class="account-field"
          >Billing phone<input
            v-model="draft.billing.phone"
            maxlength="50" /></label
        ><label class="account-field"
          >Recorded payment method<select v-model="draft.billing.paymentMethod">
            <option value="unconfigured">Not configured</option>
            <option value="invoice">Invoice</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="card">Card</option>
          </select></label
        >
        <p class="text-xs text-slate-500 sm:col-span-2">
          Changing billing currency re-denominates the entered fees; amounts are
          not converted automatically. This is an administrative record, not a
          payment authorization. No card numbers, account secrets, mobile-money
          credentials or direct-debit mandates are stored by this form. Use
          Requests to ask the host to arrange a payment-method change.
        </p>
      </div>
      <div v-show="tab === 'Security'" class="space-y-3">
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="draft.requireTwoFactorAuth" type="checkbox" />
          Require tenant users to verify with an authenticator</label
        >
        <p class="text-xs text-slate-500">
          Host policy is enforced during authentication. Tenant users manage
          their individual authenticator enrollment through the existing
          security flow; they cannot reduce this account requirement.
        </p>
      </div>
    </fieldset>
    <div v-show="tab === 'Requests'" class="space-y-4">
      <div v-if="!host" class="space-y-3">
        <label class="account-field"
          >Request a subscription or billing change<textarea
            v-model="requestMessage"
            maxlength="1000"
            rows="3"
            placeholder="Describe the requested change. Do not include passwords or payment credentials."
          /></label
        ><button
          :disabled="busy || !requestMessage.trim()"
          class="rounded-lg bg-brand-700 px-4 py-2 text-xs text-white disabled:opacity-50"
          @click="requestChange"
        >
          Submit change request
        </button>
      </div>
      <p v-if="!account.requests?.length" class="text-sm text-slate-500">
        No account change requests.
      </p>
      <article
        v-for="item in account.requests"
        :key="item.id"
        class="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
      >
        <div class="flex justify-between text-xs text-slate-500">
          <span>{{ item.status }}</span
          ><span>{{ item.createdAt }}</span>
        </div>
        <p class="whitespace-pre-wrap text-sm">{{ item.message }}</p>
        <p
          v-if="item.response"
          class="whitespace-pre-wrap text-sm text-brand-700"
        >
          Host response: {{ item.response }}
        </p>
        <div v-if="host && item.status === 'open'" class="space-y-2">
          <label class="account-field"
            >Response<textarea v-model="responses[item.id]" maxlength="1000" />
          </label>
          <div class="flex gap-2">
            <button
              :disabled="busy || !responses[item.id]?.trim()"
              class="rounded-lg bg-brand-700 px-3 py-2 text-xs text-white disabled:opacity-50"
              @click="resolve(item.id, item.version, 'resolved')"
            >
              Resolve</button
            ><button
              :disabled="busy || !responses[item.id]?.trim()"
              class="rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
              @click="resolve(item.id, item.version, 'rejected')"
            >
              Reject
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-if="host" v-show="tab === 'Audit history'" class="space-y-3">
      <p class="text-xs text-slate-500">
        Latest 100 platform account events. Billing and subscription history
        survives tenant business-data resets.
      </p>
      <p v-if="!account.audit?.length" class="text-sm text-slate-500">
        No recorded account changes yet.
      </p>
      <details
        v-for="event in account.audit"
        :key="event.id"
        class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
      >
        <summary class="cursor-pointer text-xs">
          {{ event.createdAt }} · {{ event.action }} · Actor
          {{ event.actorUserId }}
        </summary>
        <pre
          class="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-[11px]"
          >{{
            JSON.stringify(
              { previous: event.previous, state: event.state },
              null,
              2,
            )
          }}</pre>
      </details>
    </div>
  </section>
</template>
<style scoped>
.account-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: inherit;
}
.account-field input,
.account-field select,
.account-field textarea {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.65rem;
  min-width: 0;
  width: 100%;
}
.account-field input:focus,
.account-field select:focus,
.account-field textarea:focus {
  outline: 2px solid #3d8a76;
  outline-offset: 1px;
}
</style>
