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
import { ref, computed } from 'vue'
import { useAsyncData, useRuntimeConfig } from '#imports'

const PAGE_SIZE = 10
const currentPage = ref(1)

const { data: allPosts, pending: loading } = await useAsyncData('blog-posts-index', async () => {
  const config = useRuntimeConfig()
  let posts: any[] = []

  // 1. Try to fetch from blogdata.json
  try {
    // @ts-ignore
    const data = await $fetch('/blogdata.json')
    const jsonData = Array.isArray(data) ? data : data.data
    if (jsonData && jsonData.length > 0) {
      posts = jsonData
    }
  } catch (err) {
    console.warn('Could not load /blogdata.json, will fallback to API.', err)
  }

  // 2. Fallback to API if blogdata.json is empty or failed
  if (posts.length === 0) {
    console.log('Fetching from API as a fallback...')
    try {
      const firstPage = await $fetch(`${config.public.apiUrl}/blog-posts?sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=${PAGE_SIZE}`)
      if (firstPage && firstPage.data) {
        posts.push(...firstPage.data)
        const pagination = firstPage.meta?.pagination
        if (pagination && pagination.total > posts.length) {
          const { pageCount } = pagination
          for (let page = 2; page <= pageCount; page++) {
            const nextPage = await $fetch(`${config.public.apiUrl}/blog-posts?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`)
            if (nextPage && nextPage.data) {
              posts.push(...nextPage.data)
            }
          }
        }
      }
    } catch (apiErr) {
      console.error('API fallback failed.', apiErr)
    }
  }

  // 3. Sort whatever data we got
  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  return posts
})

// Computed ref for the posts to display
const posts = computed(() => {
  if (!allPosts.value) return []
  return allPosts.value.slice(0, currentPage.value * PAGE_SIZE)
})

// Computed ref to check if more posts are available
const hasMore = computed(() => {
  if (!allPosts.value) return false
  return posts.value.length < allPosts.value.length
})

function loadMore() {
  currentPage.value++
}

function formatDate(ts: string) {
  const date = new Date(ts)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
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
