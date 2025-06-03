<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6 text-center">Blog</h1>
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else>
      <div v-for="post in posts" :key="post.timestamp" class="mb-8 p-6 border rounded shadow bg-white">
        <NuxtLink :to="`/blog/${encodeURIComponent(post.timestamp)}`" class="text-2xl font-semibold text-blue-700 hover:underline">{{ post.title }}</NuxtLink>
        <div class="text-gray-500 text-sm mb-2">By {{ post.sender }} | {{ formatDate(post.timestamp) }}</div>
        <p class="line-clamp-4 text-gray-700">{{ post.text.split('\n').slice(0, 3).join(' ') }}...</p>
        <NuxtLink :to="`/blog/${encodeURIComponent(post.timestamp)}`" class="text-blue-500 hover:underline mt-2 inline-block">Read more</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const posts = ref<Array<{ timestamp: string; sender: string; title: string; text: string }>>([])
const loading = ref(true)

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

onMounted(async () => {
  const res = await fetch('/sampleblog.json')
  posts.value = await res.json()
  loading.value = false
})
</script>

<style scoped>
.container {
  max-width: 700px;
}
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
