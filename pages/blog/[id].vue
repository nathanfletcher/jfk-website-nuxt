<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <div v-if="loading" class="text-center p-8">
      <div class="inline-block animate-pulse">
        <div class="h-4 w-24 bg-blue-200 rounded"></div>
      </div>
    </div>
    <div v-else-if="!post" class="text-center text-red-500 p-8">
      <h2 class="text-xl font-semibold">Post not found</h2>
      <p class="mt-2">The blog post you're looking for doesn't exist.</p>
      <NuxtLink to="/blog" class="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Return to Blog
      </NuxtLink>
    </div>
    <article v-else class="bg-white rounded-lg shadow-sm p-6 sm:p-8">
      <div class="mb-8">
        <NuxtLink to="/blog" class="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 mb-4">
          <span>&larr;</span>
          <span>Back to Blog</span>
        </NuxtLink>
        <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{{ post.title }}</h1>
        <div class="text-gray-500 text-sm flex items-center gap-2">
          <span>By {{ post.sender }}</span>
          <span>&bull;</span>
          <time :datetime="post.timestamp">{{ formatDate(post.timestamp) }}</time>
        </div>
      </div>
      <div class="prose prose-blue max-w-none" v-html="renderedText"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked';

const route = useRoute()
const post = ref<{ timestamp: string; sender: string; title: string; text: string } | null>(null)
const loading = ref(true)

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

const renderedText = computed(() => {
  if (post.value && post.value.text) {
    return marked(post.value.text);
  } else {
    return '';
  }
});

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


