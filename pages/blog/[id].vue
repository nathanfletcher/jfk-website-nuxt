<template>
  <div class="container mx-auto py-8">
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="!post" class="text-center text-red-500">Post not found.</div>
    <div v-else>
      <NuxtLink to="/blog" class="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Blog</NuxtLink>
      <h1 class="text-3xl font-bold mb-2">{{ post.title }}</h1>
      <div class="text-gray-500 text-sm mb-4">By {{ post.sender }} | {{ formatDate(post.timestamp) }}</div>
      <div class="whitespace-pre-line text-gray-800 mb-8">{{ post.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const post = ref<{ timestamp: string; sender: string; title: string; text: string } | null>(null)
const loading = ref(true)

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

onMounted(async () => {
  try {
    console.log('Blog detail page mounted.')
    console.log('Route params ID:', route.params.id)
    const res = await fetch('/sampleblog.json')
    console.log('Fetch response status:', res.status)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const posts = await res.json()
    console.log('Fetched posts data:', posts)
    const postId = decodeURIComponent(route.params.id as string)
    console.log('Decoded Post ID for matching:', postId)
    post.value = posts.find((p: any) => p.timestamp === postId)
    console.log('Result of find operation (post.value):', post.value)
  } catch (error) {
    console.error('Failed to fetch or find blog post:', error)
  } finally {
    loading.value = false
    console.log('Loading finished.')
  }
})
</script>

<style scoped>
.container {
  max-width: 700px;
}
</style>
