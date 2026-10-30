<script setup lang="ts">
const { brand, init } = useBrand()
init()
</script>

<template>
  <div class="min-h-screen flex" style="background: var(--color-canvas)">
    <!-- Brand side -->
    <div class="hidden lg:flex flex-col justify-between w-[42%] p-10 text-white relative overflow-hidden"
      style="background: linear-gradient(150deg, var(--brand-primary-dark), var(--brand-sidebar));">
      <div class="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/5" />
      <div class="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-white/5" />
      <NuxtLink to="/" class="relative flex items-center gap-3">
        <BrandMark dark />
      </NuxtLink>
      <div class="relative">
        <h2 class="text-2xl font-bold leading-snug">Your business, connected.<br />Your operations, in control.</h2>
        <p class="text-white/70 text-sm mt-3 max-w-sm leading-relaxed">
          One ERP platform for finance, procurement, inventory, and people —
          bringing your teams, workflows, and business insights together.
        </p>
      </div>
      <p class="relative text-[11px] text-white/40">{{ brand.institutionName }} · {{ brand.tagline }}</p>
    </div>

    <!-- Form side -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <div class="lg:hidden mb-8 flex justify-center">
          <BrandMark />
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
