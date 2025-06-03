<template>
  <div class="container mx-auto py-8">
    <h1 class="text-4xl font-bold mb-6 text-center">Welcome to the JFK Blog</h1>
    <div class="flex flex-col items-center">
      <NuxtLink to="/blog" class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition">Read the Blog</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// No logic needed for homepage
</script>

<style scoped>
.container {
  max-width: 700px;
}
</style>
