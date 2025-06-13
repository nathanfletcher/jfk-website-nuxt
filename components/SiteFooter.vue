<template>
  <footer class="site-footer w-full bg-white text-gray-900 py-8 mt-12 border-t border-gray-200 shadow-lg">
    <div class="container mx-auto flex flex-col md:flex-row items-center justify-between px-4 gap-2">
      <div class="text-center md:text-left mb-2 md:mb-0">
        <span class="font-bold tracking-wide text-lg">John Tamakloe (Evangelist)</span>
        <span class="mx-2 text-gray-400">&bull;</span>
        <span class="text-gray-600">{{ year }}</span>
      </div>
      <div class="text-center md:text-right text-base flex flex-col md:flex-row items-center gap-1 md:gap-2">
        <span class="flex items-center gap-1">Made with <span class="text-red-500 animate-pulse">&#10084;&#65039;</span> in <span class="font-semibold text-yellow-600">Ghana</span></span>
        <span class="hidden md:inline text-gray-300">|</span>
        <a href="mailto:contact@johntamakloe.com" class="underline underline-offset-2 hover:text-blue-700 font-medium transition-colors">Contact</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  box-shadow: 0 -2px 16px rgba(0,0,0,0.06);
  font-size: 1.05rem;
  letter-spacing: 0.01em;
}
</style>
