<script setup lang="ts">
useHead({ title: 'Group' })
const route = useRoute()
const { money, date } = useFormat()
const { meta } = useStatusMeta()
const { data: g, pending } = await useAsyncData('group-' + route.params.id,
  () => $fetch<any>(`/api/groups/${route.params.id}`))
</script>

<template>
  <div v-if="g">
    <PageHeader :title="g.name" icon="user-group" :subtitle="`${g.accountNo} · ${g.officeName} · meets every ${g.meetingDay}`">
      <Badge :tone="meta(g.status).tone" dot size="sm">{{ meta(g.status).label }}</Badge>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Members" :value="g.totals.memberCount" icon="users" tone="primary" :hint="`${g.totals.activeMembers} active`" />
      <StatCard label="Group portfolio" :value="money(g.totals.portfolio)" icon="credit-card" tone="red" />
      <StatCard label="Group savings" :value="money(g.totals.savings)" icon="wallet" tone="green" />
      <StatCard label="Field officer" :value="g.staffName" icon="identification" tone="blue" />
    </div>

    <BaseCard title="Member roster" :subtitle="`${g.members.length} clients`" icon="list-bullet" :pad="false">
      <DataTable
        :columns="[
          { key: 'displayName', label: 'Member' }, { key: 'accountNo', label: 'Client #' },
          { key: 'mobile', label: 'Mobile' }, { key: 'loanOutstanding', label: 'Loans outstanding', align: 'right' },
          { key: 'savingsBalance', label: 'Savings', align: 'right' }, { key: 'status', label: 'Status', align: 'center' }]"
        :rows="g.members">
        <template #cell="{ col, row }">
          <span v-if="col.key === 'displayName'">
            <NuxtLink :to="`/clients/${row.id}`" class="font-semibold text-primary hover:underline">{{ row.displayName }}</NuxtLink>
          </span>
          <span v-else-if="col.key === 'loanOutstanding' || col.key === 'savingsBalance'" class="tnum text-xs">{{ money(row[col.key]) }}</span>
          <span v-else-if="col.key === 'status'"><Badge size="sm" :tone="meta(row.status).tone" dot>{{ meta(row.status).label }}</Badge></span>
          <span v-else class="text-xs">{{ row[col.key] }}</span>
        </template>
      </DataTable>
    </BaseCard>
  </div>
  <div v-else-if="pending" class="h-72 rounded-xl bg-surface border border-line animate-pulse" />
</template>
