<script setup lang="ts">
useHead({ title: 'Roles & Permissions' })
const { data } = await useAsyncData('roles', () => $fetch<any>('/api/system/roles'))
</script>

<template>
  <div>
    <PageHeader title="Roles & Permissions" icon="cog-6-tooth"
      subtitle="RBAC matrix — permissions are enforced by the Fineract API in production." />

    <BaseCard title="Roles" :pad="false" class="mb-5">
      <DataTable
        :columns="[
          { key: 'name', label: 'Role' },
          { key: 'description', label: 'Description' },
          { key: 'permissions', label: 'Permission count', align: 'center' },
          { key: 'members', label: 'Members', align: 'center' }]"
        :rows="data?.roles ?? []">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'name'" class="font-semibold text-ink flex items-center gap-2">
            {{ row.name }}
            <Badge v-if="row.wildcard" size="sm" tone="amber">full access</Badge>
          </span>
          <span v-else-if="col.key === 'permissions'" class="tnum">{{ row.wildcard ? '★' : row.permissions.length }}</span>
          <span v-else-if="col.key === 'members'" class="tnum font-semibold">{{ row.members }}</span>
          <span v-else class="text-xs text-ink-soft">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>

    <BaseCard title="Permission matrix" subtitle="Module-level capabilities assigned to each role">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-line">
              <th class="text-left py-2 pr-4 font-semibold text-ink-faint uppercase tracking-wide text-[10px]">Module / capability</th>
              <th v-for="r in data?.roles ?? []" :key="r.id" class="px-2 py-2 font-semibold text-ink text-center">{{ r.name.split(' ')[0] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in data?.groups ?? []" :key="g.group" class="border-b border-line/50">
              <td class="py-2.5 pr-4">
                <p class="font-semibold text-ink">{{ g.group }}</p>
                <p class="text-[10px] text-ink-faint">{{ g.perms.map(p => p.split('.')[1]).join(' · ') }}</p>
              </td>
              <td v-for="r in data?.roles ?? []" :key="r.id" class="px-2 text-center">
                <AppIcon v-if="r.wildcard || r.permissions.some((p: string) => g.perms.includes(p))" name="check" :size="16" class="text-emerald-600 inline" />
                <span v-else class="text-line">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
