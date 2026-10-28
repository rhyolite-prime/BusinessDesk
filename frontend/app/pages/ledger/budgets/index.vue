<script setup lang="ts">
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "@lucide/vue";
import type {
  LedgerBudget,
  LedgerBudgetDetail,
} from "../../../features/ledger/budget-types";
import {
  allocateBudgetTotal,
  budgetDecimal,
  budgetMicros,
  budgetPeriods,
  budgetTotal,
  percentBudgetAmount,
} from "../../../features/ledger/budget-amounts";
const displayBudgetAmount = (value: string) => formatDecimalAmount(value)
definePageMeta({ layout: "admin-ledger" });
useHead({ title: "Budgets" });
const request = useRequestFetch(),
  unitId = useState<string>("ledger-accounting-unit", () => "");
const units = ref<
  { id: string; code: string; name: string; isActive: boolean }[]
>([]);
const budgets = ref<LedgerBudget[]>([]),
  choices = ref<{
    accounts: { id: string; name: string; accountNumber: string }[];
    costCenters: { id: string; name: string }[];
  }>({ accounts: [], costCenters: [] });
const loading = ref(true),
  loaded = ref(false),
  saving = ref(false),
  error = ref(""),
  saveError = ref(""),
  deleteError = ref("");
const search = ref(""),
  statusFilter = ref(""),
  yearFilter = ref(""),
  expanded = ref(new Set<string>());
const showForm = ref(false),
  editingId = ref<string | null>(null),
  original = ref<LedgerBudget | null>(null),
  deleteTarget = ref<LedgerBudget | null>(null);
const form = reactive({
  accountId: "",
  costCenterId: "",
  begin: "",
  end: "",
  clearOrganizationUnit: false,
});
const lines = ref<LedgerBudgetDetail[]>([]),
  allocationAmount = ref("0"),
  allocationMode = ref("each"),
  allocationTarget = ref<"budgetAmount" | "revisedAmount">("budgetAmount");
const priorPercentage = ref("100");
const cache = new Map<string, LedgerBudgetDetail>();
let version = 0;
const key = (line: { year: number; month: number }) =>
  `${line.year}-${String(line.month).padStart(2, "0")}`;
const message = (e: any) =>
  e?.data?.statusMessage || "Request failed. Please retry.";
const total = (b: LedgerBudget, type: "budgetAmount" | "revisedAmount") =>
  displayBudgetAmount(budgetTotal(b.details.map((d) => d[type])));
const visible = computed(() =>
  budgets.value.filter(
    (b) =>
      (!search.value ||
        `${b.accountNumber} ${b.accountName} ${b.costCenterName} ${b.organizationUnitName}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase())) &&
      (!statusFilter.value || b.status === statusFilter.value) &&
      (!yearFilter.value ||
        b.details.some((d) => String(d.year) === yearFilter.value)),
  ),
);
const years = computed(() =>
  [...new Set(budgets.value.flatMap((b) => b.details.map((d) => d.year)))].sort(
    (a, b) => b - a,
  ),
);
const periodRows = computed(() => budgetPeriods(form.begin, form.end));
const formTotals = computed(() => ({
  budget: displayBudgetAmount(
    budgetTotal(lines.value.map((d) => d.budgetAmount)),
  ),
  revised: displayBudgetAmount(
    budgetTotal(lines.value.map((d) => d.revisedAmount)),
  ),
}));
function syncPeriods() {
  for (const line of lines.value) cache.set(key(line), { ...line });
  lines.value = periodRows.value.map((p) => ({
    ...(cache.get(key(p)) || {
      id: "",
      ...p,
      budgetAmount: "0",
      revisedAmount: "0",
    }),
  }));
}
watch(() => [form.begin, form.end], syncPeriods);
function toggle(id: string) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}
async function load() {
  const current = ++version,
    unit = unitId.value;
  budgets.value = [];
  choices.value = { accounts: [], costCenters: [] };
  loaded.value = false;
  error.value = "";
  showForm.value = false;
  deleteTarget.value = null;
  expanded.value = new Set();
  if (!unit) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const [rows, options] = await Promise.all([
      request<{ data: LedgerBudget[] }>("/api/ledger/budgets", {
        query: { accountingUnitId: unit },
      }),
      request<typeof choices.value>("/api/ledger/budgets/options", {
        query: { accountingUnitId: unit },
      }),
    ]);
    if (current !== version) return;
    budgets.value = rows.data;
    choices.value = options;
    loaded.value = true;
  } catch (e) {
    if (current === version) error.value = message(e);
  } finally {
    if (current === version) loading.value = false;
  }
}
async function initialize() {
  loading.value = true;
  error.value = "";
  try {
    const all: typeof units.value = [];
    for (let pageNo = 1; ; pageNo++) {
      const r = await request<{ data: typeof units.value; totalPages: number }>(
        "/api/ledger/accounting-units",
        { query: { pageNo, pageSize: 200 } },
      );
      all.push(...r.data);
      if (!r.data.length || pageNo >= r.totalPages) break;
      if (pageNo >= 50) throw new Error("Too many accounting units");
    }
    units.value = all.filter((u) => u.isActive);
    if (unitId.value && !units.value.some((u) => u.id === unitId.value))
      unitId.value = "";
    if (unitId.value) await load();
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function openEditor(row: LedgerBudget | null = null, copy = false) {
  if (!loaded.value || saving.value || (!copy && row && row.status !== "draft"))
    return;
  editingId.value = copy ? null : row?.id || null;
  original.value = row;
  saveError.value = "";
  cache.clear();
  lines.value = [];
  const year = new Date().getFullYear();
  Object.assign(form, {
    accountId: row?.accountId || "",
    costCenterId: row?.costCenterId || "",
    begin: row?.beginDate.slice(0, 7) || `${year}-01`,
    end: row?.endDate.slice(0, 7) || `${year}-12`,
    clearOrganizationUnit: false,
  });
  if (row)
    for (const line of row.details)
      cache.set(key(line), { ...line, id: copy ? "" : line.id });
  syncPeriods();
  allocationAmount.value = "0";
  showForm.value = true;
}
function closeForm() {
  if (!saving.value) showForm.value = false;
}
function allocate() {
  saveError.value = "";
  const amount = budgetMicros(allocationAmount.value);
  if (amount === null || !periodRows.value.length) {
    saveError.value =
      "Enter a nonnegative decimal amount (up to 14 integer and 6 fractional digits) and valid monthly range.";
    return;
  }
  const amounts =
    allocationMode.value === "total"
      ? allocateBudgetTotal(allocationAmount.value, lines.value.length)
      : lines.value.map(() => budgetDecimal(amount));
  if (!amounts) return;
  lines.value.forEach((line, i) => {
    line[allocationTarget.value] = amounts[i];
  });
}
function copyPriorYear() {
  saveError.value = "";
  const sources = budgets.value.filter(
    (b) =>
      b.id !== editingId.value &&
      b.accountId === form.accountId &&
      (b.costCenterId || "") === form.costCenterId &&
      (b.organizationUnitId || "") ===
        (editingId.value && !form.clearOrganizationUnit
          ? original.value?.organizationUnitId || ""
          : "") &&
      ["approved", "closed"].includes(b.status),
  );
  const amounts = lines.value.map((line) => {
    const candidates = sources
      .flatMap((b) => b.details)
      .filter((d) => d.year === line.year - 1 && d.month === line.month);
    return candidates.length === 1
      ? percentBudgetAmount(
          candidates[0][allocationTarget.value],
          priorPercentage.value,
        )
      : null;
  });
  if (amounts.some((v) => v === null)) {
    saveError.value =
      "Each period needs exactly one approved/closed prior-year source. Check the percentage and resulting amount limits.";
    return;
  }
  lines.value.forEach((line, i) => {
    line[allocationTarget.value] = amounts[i]!;
  });
}
async function save() {
  if (saving.value || !loaded.value) return;
  saveError.value = "";
  if (
    !periodRows.value.length ||
    lines.value.length !== periodRows.value.length ||
    lines.value.some(
      (d) =>
        budgetMicros(d.budgetAmount) === null ||
        budgetMicros(d.revisedAmount) === null,
    )
  ) {
    saveError.value =
      "Use 1–60 monthly periods and valid nonnegative amounts with up to 6 decimals.";
    return;
  }
  const body = {
    accountingUnitId: unitId.value,
    accountId: form.accountId,
    costCenterId: form.costCenterId || null,
    beginDate: `${form.begin}-01`,
    endDate: `${form.end}-01`,
    details: lines.value.map(
      ({ year, month, budgetAmount, revisedAmount }) => ({
        year,
        month,
        budgetAmount,
        revisedAmount,
      }),
    ),
    ...(!editingId.value || form.clearOrganizationUnit
      ? { organizationUnitId: null }
      : {}),
  };
  const scope = version;
  saving.value = true;
  try {
    const row = editingId.value
      ? await request<LedgerBudget>(`/api/ledger/budgets/${editingId.value}`, {
          method: "PUT",
          body,
        })
      : await request<LedgerBudget>("/api/ledger/budgets", {
          method: "POST",
          body,
        });
    if (scope !== version) return;
    budgets.value = [row, ...budgets.value.filter((b) => b.id !== row.id)];
    expanded.value = new Set([...expanded.value, row.id]);
    showForm.value = false;
  } catch (e) {
    if (scope === version) saveError.value = message(e);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleteTarget.value || saving.value) return;
  const scope = version;
  saving.value = true;
  deleteError.value = "";
  try {
    const id = deleteTarget.value.id;
    await request<{ id: string; isDeleted: boolean }>(
      `/api/ledger/budgets/${id}`,
      { method: "DELETE", query: { accountingUnitId: unitId.value } },
    );
    if (scope !== version) return;
    budgets.value = budgets.value.filter((b) => b.id !== id);
    deleteTarget.value = null;
  } catch (e) {
    if (scope === version) deleteError.value = message(e);
  } finally {
    saving.value = false;
  }
}
watch(unitId, () => {
  void load();
});
onMounted(initialize);
onUnmounted(() => {
  version++;
});
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="mb-2 text-xs text-slate-400">General Ledger / Planning</p>
        <h1
          class="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
        >
          Budget
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          Manage account budgets and revised monthly schedules for your
          accounting unit.
        </p>
      </div>
      <button
        :disabled="!loaded || loading || saving"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
        @click="openEditor()"
      >
        <Plus :size="15" />Create budget
      </button>
    </header>
    <section
      class="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]"
    >
      <label class="text-xs font-semibold text-slate-600 dark:text-slate-300"
        >Accounting unit<select
          v-model="unitId"
          :disabled="loading || saving"
          class="mt-1.5 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        >
          <option value="">Select an accounting unit</option>
          <option v-for="unit in units" :key="unit.id" :value="unit.id">
            {{ unit.code }} · {{ unit.name }}
          </option>
        </select></label
      ><button
        :disabled="loading || saving"
        class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
        @click="unitId ? load() : initialize()"
      >
        Refresh
      </button>
      <p class="max-w-xl text-xs text-slate-400">
        Amounts retain up to six decimals. Only drafts can be edited/deleted;
        approval transitions are outside this CRUD screen.
      </p>
    </section>
    <p v-if="loading" role="status" class="text-sm text-slate-400">
      Loading budgets…
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
    >
      {{ error }}
    </p>
    <section
      class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#15201e]"
    >
      <div
        class="flex flex-wrap gap-3 border-b border-slate-100 p-4 dark:border-slate-800"
      >
        <label class="flex items-center gap-2 text-slate-400"
          ><Search :size="15" /><input
            v-model="search"
            aria-label="Search budgets"
            type="search"
            placeholder="Search account or dimensions…"
            class="h-9 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700" /></label
        ><select
          v-model="statusFilter"
          aria-label="Filter by status"
          class="rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
        >
          <option value="">All statuses</option>
          <option
            v-for="status in ['draft', 'submitted', 'approved', 'closed']"
            :key="status"
          >
            {{ status }}
          </option></select
        ><select
          v-model="yearFilter"
          aria-label="Filter by year"
          class="rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
        >
          <option value="">All years</option>
          <option v-for="year in years" :key="year" :value="String(year)">
            {{ year }}
          </option></select
        ><span class="ml-auto self-center text-xs text-slate-400"
          >{{ visible.length }} schedules</span
        >
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[950px] text-left text-xs">
          <thead
            class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900"
          >
            <tr>
              <th class="p-4">Account / dimensions</th>
              <th>Period</th>
              <th class="text-right">Budget</th>
              <th class="text-right">Revised</th>
              <th class="px-4">Status</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="!loading && !visible.length">
              <td colspan="6" class="p-12 text-center text-slate-400">
                {{
                  unitId
                    ? "No budgets found"
                    : "Select an accounting unit to view budgets"
                }}
              </td>
            </tr>
            <template v-for="budget in visible" :key="budget.id"
              ><tr>
                <td class="p-4">
                  <button
                    class="flex items-center gap-2 text-left font-semibold text-slate-800 dark:text-slate-200"
                    :aria-expanded="expanded.has(budget.id)"
                    @click="toggle(budget.id)"
                  >
                    <ChevronDown
                      v-if="expanded.has(budget.id)"
                      :size="14"
                    /><ChevronRight v-else :size="14" />{{
                      budget.accountNumber
                    }}
                    · {{ budget.accountName }}
                  </button>
                  <p class="ml-6 mt-1 text-[10px] text-slate-400">
                    {{ budget.costCenterName || "No cost center"
                    }}<span v-if="budget.organizationUnitId">
                      ·
                      {{
                        budget.organizationUnitName ||
                        "Legacy organizational unit"
                      }}</span
                    >
                  </p>
                </td>
                <td class="text-slate-500">
                  {{ budget.beginDate.slice(0, 7) }} —
                  {{ budget.endDate.slice(0, 7) }}
                </td>
                <td class="text-right font-mono">
                  {{ total(budget, "budgetAmount") }}
                </td>
                <td class="text-right font-mono">
                  {{ total(budget, "revisedAmount") }}
                </td>
                <td class="px-4">
                  <span
                    class="rounded-md bg-slate-100 px-2 py-1 text-[10px] dark:bg-slate-800"
                    >{{ budget.status }}</span
                  >
                </td>
                <td class="space-x-1 p-4 text-right">
                  <button
                    :disabled="saving"
                    class="rounded-lg p-2 text-slate-400 disabled:opacity-30"
                    aria-label="Copy budget"
                    @click="openEditor(budget, true)"
                  >
                    <Copy :size="14" /></button
                  ><button
                    :disabled="saving || budget.status !== 'draft'"
                    class="rounded-lg p-2 text-slate-400 disabled:opacity-30"
                    aria-label="Edit budget"
                    @click="openEditor(budget)"
                  >
                    <Pencil :size="14" /></button
                  ><button
                    :disabled="saving || budget.status !== 'draft'"
                    class="rounded-lg p-2 text-rose-500 disabled:opacity-30"
                    aria-label="Delete budget"
                    @click="
                      deleteError = '';
                      deleteTarget = budget;
                    "
                  >
                    <Trash2 :size="14" />
                  </button>
                </td>
              </tr>
              <tr v-if="expanded.has(budget.id)">
                <td
                  colspan="6"
                  class="bg-slate-50/50 px-8 py-4 dark:bg-slate-900/30"
                >
                  <table class="w-full text-xs">
                    <thead class="text-[10px] uppercase text-slate-400">
                      <tr>
                        <th class="pb-2">Monthly period</th>
                        <th class="text-right">Budget amount</th>
                        <th class="text-right">Revised amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="detail in budget.details" :key="detail.id">
                        <td class="py-1.5">{{ key(detail) }}</td>
                        <td class="text-right font-mono">
                          {{ displayBudgetAmount(detail.budgetAmount) }}
                        </td>
                        <td class="text-right font-mono">
                          {{ displayBudgetAmount(detail.revisedAmount) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></template
            >
          </tbody>
        </table>
      </div>
    </section>
    <div
      v-if="showForm"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      @click.self="closeForm"
    >
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="editingId ? 'Edit budget' : 'Create budget'"
        class="flex h-[calc(100dvh-3rem)] max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#15201e]"
      >
        <header
          class="flex shrink-0 items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"
        >
          <div>
            <h2 class="text-lg font-semibold">
              {{ editingId ? "Edit budget" : "Create budget" }}
            </h2>
            <p class="mt-1 text-xs text-slate-400">
              Monthly bounds, complete schedule and exact decimal amounts.
            </p>
          </div>
          <button
            :disabled="saving"
            aria-label="Close dialog"
            class="p-2 text-slate-400"
            @click="closeForm"
          >
            <X :size="18" />
          </button>
        </header>
        <form
          class="flex min-h-0 flex-1 flex-col overflow-hidden"
          @submit.prevent="save"
        >
          <div
            data-testid="budget-form-scroll"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <fieldset :disabled="saving" class="min-w-0 space-y-5 p-5">
              <section class="grid gap-4 sm:grid-cols-2">
                <label class="text-xs font-semibold"
                  >GL account<select
                    v-model="form.accountId"
                    required
                    class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
                  >
                    <option value="">Select an active GL account</option>
                    <option
                      v-if="
                        form.accountId &&
                        !choices.accounts.some((a) => a.id === form.accountId)
                      "
                      :value="form.accountId"
                    >
                      Unavailable account (replace)
                    </option>
                    <option
                      v-for="a in choices.accounts"
                      :key="a.id"
                      :value="a.id"
                    >
                      {{ a.accountNumber }} · {{ a.name }}
                    </option>
                  </select></label
                ><label class="text-xs font-semibold"
                  >Cost center<select
                    v-model="form.costCenterId"
                    class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
                  >
                    <option value="">Not configured</option>
                    <option
                      v-if="
                        form.costCenterId &&
                        !choices.costCenters.some(
                          (c) => c.id === form.costCenterId,
                        )
                      "
                      :value="form.costCenterId"
                    >
                      Unavailable cost center (replace)
                    </option>
                    <option
                      v-for="c in choices.costCenters"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }}
                    </option>
                  </select></label
                ><label class="text-xs font-semibold"
                  >Begin month<input
                    v-model="form.begin"
                    required
                    type="month"
                    min="1900-01"
                    max="2999-12"
                    class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label
                ><label class="text-xs font-semibold"
                  >End month<input
                    v-model="form.end"
                    required
                    type="month"
                    min="1900-01"
                    max="2999-12"
                    class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
                /></label>
              </section>
              <p class="text-xs text-slate-400">
                The organizational-unit catalog is not connected; no demo
                assignments are used. Existing assignments are preserved when
                editing.
              </p>
              <label
                v-if="editingId && original?.organizationUnitId"
                class="flex gap-2 text-xs"
                ><input
                  v-model="form.clearOrganizationUnit"
                  type="checkbox"
                />Clear legacy organizational-unit assignment:
                {{
                  original.organizationUnitName || original.organizationUnitId
                }}</label
              >
              <section
                class="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
              >
                <h3 class="text-xs font-semibold">Allocate amounts</h3>
                <div class="flex flex-wrap items-end gap-3">
                  <label class="text-xs"
                    >Allocation amount<input
                      v-model="allocationAmount"
                      inputmode="decimal"
                      class="mt-1 block h-9 w-36 rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700" /></label
                  ><select
                    v-model="allocationMode"
                    aria-label="Allocation method"
                    class="h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
                  >
                    <option value="each">Each period</option>
                    <option value="total">Share total exactly</option></select
                  ><select
                    v-model="allocationTarget"
                    aria-label="Allocation target"
                    class="h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-xs dark:border-slate-700"
                  >
                    <option value="budgetAmount">Budget amount</option>
                    <option value="revisedAmount">
                      Revised amount
                    </option></select
                  ><button
                    type="button"
                    class="h-9 rounded-lg bg-slate-100 px-3 text-xs font-semibold dark:bg-slate-800"
                    @click="allocate"
                  >
                    Apply allocation</button
                  ><label class="text-xs"
                    >Prior-year percentage<input
                      v-model="priorPercentage"
                      inputmode="decimal"
                      class="mt-1 block h-9 w-24 rounded-lg border border-slate-200 bg-transparent px-2 dark:border-slate-700" /></label
                  ><button
                    type="button"
                    class="h-9 rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700"
                    @click="copyPriorYear"
                  >
                    Apply prior year
                  </button>
                </div>
              </section>
              <p v-if="!periodRows.length" class="text-xs text-rose-600">
                Choose a valid range of 1–60 months.
              </p>
              <div class="overflow-x-auto">
                <table class="w-full min-w-[430px] text-xs">
                  <thead class="text-left text-slate-400">
                    <tr>
                      <th class="pb-2">Month</th>
                      <th>Budget amount</th>
                      <th>Revised amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in lines" :key="key(line)">
                      <td class="py-2">{{ key(line) }}</td>
                      <td class="p-1">
                        <input
                          v-model="line.budgetAmount"
                          required
                          inputmode="decimal"
                          :aria-label="`Budget amount ${key(line)}`"
                          class="h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 font-mono dark:border-slate-700"
                        />
                      </td>
                      <td class="p-1">
                        <input
                          v-model="line.revisedAmount"
                          required
                          inputmode="decimal"
                          :aria-label="`Revised amount ${key(line)}`"
                          class="h-9 w-full rounded-lg border border-slate-200 bg-transparent px-2 font-mono dark:border-slate-700"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="font-semibold">
                      <td class="pt-3">Totals</td>
                      <td>{{ formTotals.budget }}</td>
                      <td>{{ formTotals.revised }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p
                v-if="saveError"
                role="alert"
                class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
              >
                {{ saveError }}
              </p>
            </fieldset>
          </div>
          <footer
            class="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800"
          >
            <span class="text-xs text-slate-400"
              >{{ lines.length }} monthly periods · draft</span
            >
            <div class="flex gap-2">
              <button
                type="button"
                :disabled="saving"
                class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
                @click="closeForm"
              >
                Cancel</button
              ><button
                type="submit"
                :disabled="saving || !periodRows.length"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Check :size="14" />{{
                  saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Save budget"
                }}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
    <div
      v-if="deleteTarget"
      class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"
      @click.self="!saving && (deleteTarget = null)"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-label="Delete budget"
        class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-[#15201e]"
      >
        <h2 class="text-base font-semibold">Delete budget schedule?</h2>
        <p class="mt-2 text-sm text-slate-500">
          This soft-deletes the draft and its live monthly lines, retaining
          audit history. Live composite references prevent deletion.
        </p>
        <p v-if="deleteError" role="alert" class="mt-3 text-xs text-rose-600">
          {{ deleteError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            :disabled="saving"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
            @click="deleteTarget = null"
          >
            Cancel</button
          ><button
            :disabled="saving"
            class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
            @click="remove"
          >
            Delete schedule
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
