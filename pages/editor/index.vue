<template>
  <div class="editor-mobile-wrapper">
    <nav class="editor-nav flex justify-between items-center mb-4 p-2 bg-blue-600 text-white rounded-lg shadow">
      <NuxtLink to="/" class="font-bold text-lg">JFK Blog</NuxtLink>
      <div>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
        <NuxtLink to="/editor" class="nav-link nav-link-active">Editor</NuxtLink>
      </div>
    </nav>
    <div v-if="!isSignedIn" class="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Editor Login</h2>
      <client-only>
        <SignIn sign-up-url="" :appearance="{ elements: { footer: 'hidden' } }" force-redirect-url="/editor" />
      </client-only>
    </div>
    <div v-else class="editor-panel">
      <div class="flex justify-between items-center mb-4">
        <div class="flex flex-col">
          <h2 class="text-xl font-bold">Blog Editor</h2>
          <span v-if="user" class="text-xs text-gray-500">Signed in as: {{ user.primaryEmailAddress?.emailAddress }}</span>
        </div>
        <button class="btn-secondary" @click="handleLogout">Logout</button>
      </div>
      <div class="mb-4">
        <input v-model="searchQuery" @input="searchPosts" type="text" placeholder="Search posts..." class="input w-full" />
      </div>
      <div class="mb-4">
        <button class="btn-primary w-full" @click="() => $router.push('/editor/edit')">+ New Post</button>
      </div>
      <div v-if="loading" class="text-center py-4">Loading...</div>
      <div v-else>
        <div v-for="post in filteredPosts" :key="post.slug" class="post-list-item" @click="goToEdit(post)">
          <span class="font-semibold">{{ post.title }}</span>
          <div class="text-xs text-gray-500">{{ formatDate(post.createdAt || post.publishedAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRuntimeConfig } from '#imports'
import { SignIn, useAuth, useUser } from '@clerk/vue'

const router = useRouter()
const config = useRuntimeConfig()

const { isSignedIn, getToken, signOut } = useAuth()
const { user } = useUser()

const loading = ref(false)
const posts = ref<any[]>([])
const filteredPosts = ref<any[]>([])
const searchQuery = ref('')

const WORKER_URL = config.public.workerUrl

async function fetchPosts() {
  loading.value = true
  try {
    const res = await fetch(`${WORKER_URL}/posts`)
    if (res.status === 401) {
      await handleLogout()
      return
    }
    const data = await res.json()
    posts.value = data.data || []
    filteredPosts.value = posts.value
  } catch (err) {
    console.error('Failed to fetch posts:', err)
  } finally {
    loading.value = false
  }
}

watch(isSignedIn, async (newVal) => {
  if (newVal) {
    await fetchPosts()
  } else {
    posts.value = []
    filteredPosts.value = []
  }
}, { immediate: true })

onMounted(async () => {
  if (isSignedIn.value) {
    await fetchPosts()
  }
})

function formatDate(ts: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString()
}

async function handleLogout() {
  await signOut.value()
  router.push('/editor')
}

function searchPosts() {
  const q = searchQuery.value.toLowerCase()
  filteredPosts.value = posts.value.filter(post => post.title.toLowerCase().includes(q) || post.slug.toLowerCase().includes(q))
}

function goToEdit(post: any) {
  router.push({ path: '/editor/edit', query: { slug: post.slug } })
}
</script>

<style scoped>
.editor-mobile-wrapper {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
}
.editor-nav {
  margin-bottom: 1.5rem;
}
.nav-link {
  color: #fff;
  font-weight: 500;
  margin-left: 1rem;
  text-decoration: none;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  transition: background 0.2s;
}
.nav-link-active, .nav-link:hover {
  background: #2563eb;
  color: #fff;
}
.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}
.btn-primary {
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
  color: #fff;
  font-weight: 600;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(56,189,248,0.15);
  transition: background 0.2s, transform 0.2s;
  text-decoration: none;
  display: inline-block;
}
.btn-primary:disabled {
  opacity: 0.7;
}
.btn-secondary {
  background: #e0e7ef;
  color: #2563eb;
  font-weight: 600;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
  display: inline-block;
}
.post-list-item {
  background: #f1f5f9;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}
.post-list-item:hover {
  background: #e0e7ef;
}
@media (max-width: 600px) {
  .editor-mobile-wrapper {
    padding: 0.5rem;
  }
  .input {
    font-size: 0.95rem;
    padding: 0.6rem;
  }
  .btn-primary, .btn-secondary {
    padding: 0.6rem 1.2rem;
    font-size: 1rem;
  }
}
</style>
