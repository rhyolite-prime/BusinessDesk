<script setup lang="ts">
useHead({ title: 'New Client' })
const toast = useToast()
const api = useApi()
const router = useRouter()
const { data: refData } = await useAsyncData('meta-new-client', () => $fetch<any>('/api/system/meta'))

const form = reactive({
  clientType: 'individual',
  firstname: '', lastname: '', businessName: '',
  mobile: '', email: '', gender: 'female', dob: '',
  idType: 'Ghana Card', idNumber: '',
  officeId: 1, staffId: '', active: true,
  addressLine: '', town: '', city: 'Accra',
})
const saving = ref(false)
const errors = ref<Record<string, string>>({})

function validate() {
  errors.value = {}
  if (form.clientType === 'business' && !form.businessName.trim()) errors.value.businessName = 'Business name required'
  if (form.clientType === 'individual' && (!form.firstname.trim() || !form.lastname.trim())) errors.value.firstname = 'Full name required'
  if (!/^\+?[0-9 ]{9,}$/.test(form.mobile)) errors.value.mobile = 'Valid mobile number required'
  if (!form.idNumber.trim()) errors.value.idNumber = 'ID number required'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) { toast.error('Please fix the highlighted fields'); return }
  saving.value = true
  try {
    const res: any = await api.post('/clients', {
      ...form,
      staffId: form.staffId || null,
      activationDate: form.active ? new Date().toISOString().slice(0, 10) : null,
      address: { line1: form.addressLine, town: form.town, city: form.city },
    })
    toast.success('Client onboarded', res.message)
    router.push(`/clients/${res.data.id}`)
  } catch (e: any) {
    toast.error('Could not create client', e.message)
  } finally { saving.value = false }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="Onboard New Client" icon="user-plus"
      subtitle="KYC capture — mirrors the Fineract Create Client API." />

    <BaseCard>
      <div class="space-y-5">
        <!-- Client type -->
        <div class="flex gap-2">
          <button v-for="t in [{ k: 'individual', l: 'Individual', i: 'user' }, { k: 'business', l: 'Business / Enterprise', i: 'building-library' }]"
            :key="t.k" type="button"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition"
            :class="form.clientType === t.k ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink-soft hover:border-ink-faint'"
            @click="form.clientType = t.k">
            <AppIcon :name="t.i" :size="17" /> {{ t.l }}
          </button>
        </div>

        <div v-if="form.clientType === 'business'" class="grid sm:grid-cols-2 gap-4">
          <FormField label="Business name" required>
            <TextInput v-model="form.businessName" placeholder="e.g. Ama Serwaa Provisions" />
            <p v-if="errors.businessName" class="text-[11px] text-red-600 mt-1">{{ errors.businessName }}</p>
          </FormField>
          <FormField label="Contact person (full name)">
            <TextInput v-model="form.firstname" placeholder="First name" />
          </FormField>
        </div>

        <div v-if="form.clientType === 'individual'" class="grid sm:grid-cols-3 gap-4">
          <FormField label="First name" required>
            <TextInput v-model="form.firstname" placeholder="Ama" />
          </FormField>
          <FormField label="Last name" required>
            <TextInput v-model="form.lastname" placeholder="Mensah" />
          </FormField>
          <FormField label="Gender">
            <SelectInput v-model="form.gender" :options="[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]" />
          </FormField>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <FormField label="Mobile money / phone" required>
            <TextInput v-model="form.mobile" placeholder="+233 24 000 0000" />
            <p v-if="errors.mobile" class="text-[11px] text-red-600 mt-1">{{ errors.mobile }}</p>
          </FormField>
          <FormField label="Email">
            <TextInput v-model="form.email" type="email" placeholder="name@example.com" />
          </FormField>
          <FormField v-if="form.clientType === 'individual'" label="Date of birth">
            <TextInput v-model="form.dob" type="date" />
          </FormField>
          <FormField label="Branch / office">
            <SelectInput v-model="form.officeId" :options="refData?.offices ?? []" />
          </FormField>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <FormField label="ID type">
            <SelectInput v-model="form.idType" :options="refData?.idTypes ?? []" />
          </FormField>
          <FormField label="ID number" required>
            <TextInput v-model="form.idNumber" placeholder="GHA-XXXXXXXX" />
            <p v-if="errors.idNumber" class="text-[11px] text-red-600 mt-1">{{ errors.idNumber }}</p>
          </FormField>
        </div>

        <div class="grid sm:grid-cols-3 gap-4">
          <FormField label="Address line">
            <TextInput v-model="form.addressLine" placeholder="House / street" />
          </FormField>
          <FormField label="Town / community">
            <TextInput v-model="form.town" placeholder="Makola" />
          </FormField>
          <FormField label="City">
            <TextInput v-model="form.city" />
          </FormField>
        </div>

        <FormField label="Assigned loan officer">
          <SelectInput v-model="form.staffId" placeholder="Unassigned (self-service)" :options="refData?.loanOfficers ?? []" />
        </FormField>

        <label class="flex items-center gap-3 text-sm text-ink-soft cursor-pointer">
          <input v-model="form.active" type="checkbox" class="w-4 h-4 rounded border-line accent-[var(--brand-primary)]" />
          Activate immediately (otherwise created as pending for checker approval)
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" to="/clients">Cancel</BaseButton>
          <BaseButton icon="check" :disabled="saving" @click="submit">
            {{ saving ? 'Creating…' : 'Create Client' }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
