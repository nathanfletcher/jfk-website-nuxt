<template>
  <div class="container mx-auto py-8">
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="!post" class="text-center text-red-500">Post not found.</div>
    <div v-else>
      <NuxtLink to="/blog" class="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Blog</NuxtLink>
      <h1 class="text-3xl font-bold mb-2">{{ post.title }}</h1>
      <div class="text-gray-500 text-sm mb-4">By {{ post.sender }} | {{ formatDate(post.timestamp) }}</div>
      <div class="blog-content text-gray-800 mb-8" v-html="renderedText"></div>
    </div>
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

<style scoped>
.container {
  max-width: 700px;
}

/* Add basic styling for rendered markdown */
.blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
  font-weight: bold;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.blog-content h1 { font-size: 2em; }
.blog-content h2 { font-size: 1.5em; }
.blog-content h3 { font-size: 1.2em; }

.blog-content p {
  margin-bottom: 1em;
}

.blog-content pre {
  background-color: #f4f4f4;
  padding: 1em;
  overflow-x: auto;
  border-radius: 4px;
}

.blog-content code {
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.blog-content pre code {
  display: block;
}

.blog-content blockquote {
  border-left: 4px solid #ccc;
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
}

.blog-content ul, .blog-content ol {
  margin-bottom: 1em;
  padding-left: 2em;
}

.blog-content li {
  margin-bottom: 0.5em;
}

.blog-content a {
  color: #2563eb;
  text-decoration: underline;
}

.blog-content img {
  max-width: 100%;
  height: auto;
}
</style>
