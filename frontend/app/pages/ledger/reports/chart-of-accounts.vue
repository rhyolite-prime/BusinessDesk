<script setup lang="ts">
const route=useRoute()
await navigateTo({path:'/ledger/reports',query:{...route.query,type:'chart-of-accounts'}},{replace:true})
</script>
<template><div /></template>
