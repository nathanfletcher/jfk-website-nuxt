<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <NuxtLink :to="{ path: '/editor/edit', query: { slug: $route.query.slug } }" class="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 mb-4">
      <span>&larr;</span>
      <span>Back to Edit</span>
    </NuxtLink>
    <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.jpg)] bg-cover bg-center flex items-end min-h-[40vh] rounded-lg mb-8">
      <div class="container mx-auto items-start backdrop-blur-sm shadow-lg pl-5 pt-5 pb-10 md:text-left">
        <h1 class="text-3xl text-blue-500 sm:text-4xl font-bold mb-3">{{ $route.query.title }}</h1>
      </div>
    </section>
    <div class="text-gray-500 text-sm flex items-center gap-2 mb-6">
      <span>By John Tamakloe</span>
      <span>&bull;</span>
      <time>{{ publishedAt }}</time>
    </div>
    <article class="bg-white rounded-lg shadow-sm p-6 sm:p-8">
      <div class="prose prose-blue max-w-none" v-html="$route.query.text"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const publishedAt = computed(() => {
  const val = route.query.publishedAt
  if (!val || Array.isArray(val)) return 'Draft'
  const d = new Date(val)
  return isNaN(d.getTime()) ? 'Draft' : d.toLocaleDateString()
})
</script>

<style scoped>
.hero-section {
  background-size: cover;
  background-position: center;
  border-radius: 1rem;
  min-height: 40vh;
  margin-bottom: 2rem;
}
.prose {
  font-size: 1.1rem;
}
</style>
