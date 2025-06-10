<template>
            <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.jpg)] bg-cover bg-center flex items-end min-h-[60vh]">
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
        <NuxtLink :to="`/blog/${encodeURIComponent(post.publishedAt)}`" class="text-blue-500 hover:underline mt-2 inline-block">Read more</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#imports'

const posts = ref<Array<{slug: string; id: number; publishedAt: string; title: string; text: string }>>([])
const loading = ref(true)

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function getFirstSentences(text: string, count = 2): string {
  const plain = stripHtml(text);
  // Match up to `count` sentences (ends with . ! or ?)
  const match = plain.match(new RegExp(`(([^.!?]*[.!?]){1,${count}})`));
  return match ? match[0].trim() : plain.split('\n').slice(0, count).join(' ');
}

onMounted(async () => {
  const config = useRuntimeConfig()
  // const base = config.app.baseURL || '/'
  const res = await fetch(`https://reliable-bubble-e0aafb3b9e.strapiapp.com/api/blog-posts/`, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
  const data = await res.json()
  if (!Array.isArray(data.data)) {
    loading.value = false
    return
  }
  posts.value = (data.data as Array<{slug: string; id: number; publishedAt: string; title: string; text: string}>).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
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
