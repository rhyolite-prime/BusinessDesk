<script setup lang="ts">
type Option = { id: string; employeeIdentifier: string; name: string }
const props = defineProps<{ modelValue: string; selectedLabel?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const request = useRequestFetch()
const { user } = useBusinessDeskAuth()
const options = ref<Option[]>([]), search = ref(''), page = ref(1), total = ref(0), error = ref(''), loading = ref(false)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true; error.value = ''
  try {
    const data = await request<{ data: Option[]; totalCount: number }>('/api/shared/employees/options', { query: { pageNo: page.value, pageSize: 20, query: search.value } })
    if (current === generation) { options.value = data.data; total.value = data.totalCount }
  } catch (e: any) { if (current === generation) { options.value = []; error.value = e?.data?.statusMessage || 'Unable to load employees.' } }
  finally { if (current === generation) loading.value = false }
}
watch(() => `${user.value?.accountId}:${user.value?.username}`, () => { ++generation; options.value = []; search.value = ''; page.value = 1; total.value = 0; error.value = ''; loading.value = false; load() })
onMounted(load)
onBeforeUnmount(() => { ++generation })
</script>
<template>
  <div class="space-y-2">
    <label class="block text-xs font-semibold" for="hr-employee-search">Find employee</label>
    <div class="flex gap-2"><input id="hr-employee-search" v-model="search" class="hr-field" placeholder="Name, ID or department" @keyup.enter.prevent="page = 1; load()"><button type="button" class="hr-secondary" @click="page = 1; load()">Search</button></div>
    <label class="block text-xs font-semibold" for="hr-employee">Employee</label>
    <select id="hr-employee" :value="modelValue" required class="hr-field" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option value="">Select an employee</option>
      <option v-if="modelValue && !options.some(o => o.id === modelValue)" :value="modelValue">{{ selectedLabel || 'Selected employee' }}</option>
      <option v-for="employee in options" :key="employee.id" :value="employee.id">{{ employee.name }} · {{ employee.employeeIdentifier }}</option>
    </select>
    <div class="flex gap-3 text-xs text-ink-faint"><button type="button" :disabled="page <= 1 || loading" @click="page--; load()">Previous</button><span>Page {{ page }} · {{ total }} found</span><button type="button" :disabled="page * 20 >= total || loading" @click="page++; load()">Next</button></div>
    <p v-if="error" role="alert" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
<style scoped>
.hr-field { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; background:transparent; padding:.6rem .75rem; font-size:.875rem; }
.hr-secondary { border:1px solid #cbd5e1; border-radius:.6rem; padding:.5rem .75rem; font-size:.8rem; font-weight:600; }
button:disabled { opacity:.45; cursor:not-allowed; }
</style>
