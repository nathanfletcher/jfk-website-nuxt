<template>
            <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.webp)] bg-cover bg-center flex items-end min-h-[60vh]">
      <div class="container mx-auto items-start  backdrop-blur-sm shadow-lg mb-8 pl-25 pt-5 pb-10 md:text-left">
        <!-- <img src="https://ui-avatars.com/api/?name=John+Franklin+Tamakloe&background=0D8ABC&color=fff&size=128" alt="JFK Avatar" class="rounded-full shadow-lg mb-6 animate-pop-in" width="128" height="128" /> -->
        <h1 class="text-3xl text-blue-500 sm:text-4xl font-bold mb-3">Blog Posts</h1>
        
      </div>
    </section>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6 text-center"></h1>
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else>
      <div v-for="post in posts" :key="post.publishedAt" class="mb-8 p-6 border rounded shadow bg-white">
        <NuxtLink :to="`/blog/${encodeURIComponent(post.slug)}`" class="text-2xl font-semibold text-blue-700 hover:underline">{{ post.title }}</NuxtLink>
        <div class="text-gray-500 text-sm mb-2">By John Tamakloe | {{ formatDate(post.publishedAt) }}</div>
        <p class="line-clamp-4 text-gray-700">{{ getFirstSentences(post.text, 2) }}...</p>
        <NuxtLink :to="`/blog/${encodeURIComponent(post.slug)}`" class="text-blue-500 hover:underline mt-2 inline-block">Read more</NuxtLink>
      </div>
      <div v-if="hasMore" class="text-center mt-8">
        <button @click="loadMore" class="px-6 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">Load More</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#imports'

const PAGE_SIZE = 10
const allPosts = ref<Array<{slug: string; id: number; publishedAt: string; title: string; text: string }>>([])
const posts = ref<Array<{slug: string; id: number; publishedAt: string; title: string; text: string }>>([])
const loading = ref(true)
const hasMore = ref(false)
const currentPage = ref(1)
let usingFallback = false

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

function stripHtml(html: string): string {
  // Remove tags
  let text = html.replace(/<[^>]*>/g, '');
  // Replace &nbsp; and other common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  // Optionally: decode more entities if needed
  return text;
}

function getFirstSentences(text: string, count = 2): string {
  const plain = stripHtml(text);
  // Match up to `count` sentences (ends with . ! or ?)
  const match = plain.match(new RegExp(`(([^.!?]*[.!?]){1,${count}})`));
  return match ? match[0].trim() : plain.split('\n').slice(0, count).join(' ');
}

function loadMore() {
  const start = (currentPage.value - 1) * PAGE_SIZE
  const end = currentPage.value * PAGE_SIZE
  posts.value = allPosts.value.slice(0, end)
  hasMore.value = end < allPosts.value.length
  currentPage.value++
}

onMounted(async () => {
  const config = useRuntimeConfig()
  let apiTimedOut = false
  const timeout = new Promise((_, reject) => setTimeout(() => { apiTimedOut = true; reject(new Error('timeout')) }, 3000))
  try {
    const res = await Promise.race([
      fetch(`${config.public.apiUrl}/blog-posts?sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=${PAGE_SIZE}`),
      timeout
    ])
    if (res instanceof Response && res.ok) {
      const data = await res.json()
      allPosts.value = (data.data as Array<{slug: string; id: number; publishedAt: string; title: string; text: string}>)
      posts.value = allPosts.value.slice(0, PAGE_SIZE)
      // Check if more pages exist
      hasMore.value = data.meta?.pagination?.total > PAGE_SIZE
      // If more, fetch all for client-side load more
      if (hasMore.value) {
        let total = data.meta?.pagination?.total || allPosts.value.length
        let pageCount = data.meta?.pagination?.pageCount || 1
        let fetched = allPosts.value.length
        let page = 2
        while (fetched < total) {
          const resMore = await fetch(`${config.public.apiUrl}/blog-posts?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`)
          if (!resMore.ok) break
          const moreData = await resMore.json()
          if (Array.isArray(moreData.data)) {
            allPosts.value.push(...moreData.data)
            fetched += moreData.data.length
          }
          page++
          if (page > pageCount) break
        }
        hasMore.value = posts.value.length < allPosts.value.length
      }
    } else {
      throw new Error('API response not ok')
    }
  } catch (err) {
    // Fallback to blogdata.json
    usingFallback = true
    const fallback = await fetch('/blogdata.json')
    const fallbackData = await fallback.json()
    allPosts.value = (Array.isArray(fallbackData) ? fallbackData : fallbackData.data) as Array<{slug: string; id: number; publishedAt: string; title: string; text: string}>
    allPosts.value = allPosts.value.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    posts.value = allPosts.value.slice(0, PAGE_SIZE)
    hasMore.value = allPosts.value.length > PAGE_SIZE
    if (typeof window !== 'undefined') {
      (window as any).__JFK_BLOGDATA_FALLBACK = fallbackData
    }
    if (apiTimedOut) {
      console.warn('API timed out, using fallback blogdata.json')
    } else {
      console.error('API failed, using fallback blogdata.json:', err)
    }
  }
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
