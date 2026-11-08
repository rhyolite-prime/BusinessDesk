<script setup lang="ts">
const { brand, init } = useBrand()
init()
</script>

<template>
  <div class="min-h-full">
    <AppSidebar />
    <div class="lg:pl-[264px] flex flex-col min-h-screen">
      <AppTopbar />
      <main class="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto">
        <slot />
      </main>
      <footer class="px-6 py-4 text-center text-[11px] text-ink-faint border-t border-line">
        <p>{{ brand.institutionName }} — {{ brand.tagline }}.</p>
        <p v-if="brand.footerNote" class="mt-0.5">{{ brand.footerNote }}</p>
      </footer>
    </div>
    <ToastHost />
  </div>
</template>
