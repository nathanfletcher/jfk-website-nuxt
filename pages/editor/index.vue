<template>
  <div class="editor-mobile-wrapper">
    <nav class="editor-nav flex justify-between items-center mb-4 p-2 bg-blue-600 text-white rounded-lg shadow">
      <NuxtLink to="/" class="font-bold text-lg">JFK Blog</NuxtLink>
      <div>
        <NuxtLink to="/blog" class="nav-link">Blog</NuxtLink>
        <NuxtLink to="/editor" class="nav-link nav-link-active">Editor</NuxtLink>
      </div>
    </nav>
    <div v-if="!isAuthenticated" class="login-form">
      <h2 class="text-2xl font-bold mb-4 text-center">Editor Login</h2>
      <form @submit.prevent="login">
        <input v-model="identifier" type="text" placeholder="Email or Username" class="input" required />
        <input v-model="password" type="password" placeholder="Password" class="input" required />
        <button type="submit" class="btn-primary w-full mt-4" :disabled="loading">Login</button>
        <div v-if="error" class="text-red-500 text-center mt-2">{{ error }}</div>
      </form>
    </div>
    <div v-else class="editor-panel">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Blog Editor</h2>
        <button class="btn-secondary" @click="logout">Logout</button>
      </div>
      <div class="mb-4">
        <input v-model="searchQuery" @input="searchPosts" type="text" placeholder="Search posts..." class="input w-full" />
      </div>
      <div class="mb-4">
        <button class="btn-primary w-full" @click="() => $router.push('/editor/edit')">+ New Post</button>
      </div>
      <div v-if="loading" class="text-center py-4">Loading...</div>
      <div v-else>
        <div v-for="post in filteredPosts" :key="post.id" class="post-list-item" @click="goToEdit(post)">
          <span class="font-semibold">{{ post.title }}</span>
          <div class="text-xs text-gray-500">{{ formatDate(post.createdAt) }}</div>
        </div>
      </div>
    </div>
    <div v-if="showColdStartModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
        <h3 class="text-lg font-bold mb-2 text-blue-700">Editor is Waking Up</h3>
        <p class="mb-4 text-gray-700">The editor backend is starting up. This may take up to a minute if the server was idle. Please wait and try again in a few moments.</p>
        <button class="btn-primary w-full" @click="showColdStartModal = false">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRuntimeConfig } from '#imports'

const router = useRouter()
const config = useRuntimeConfig()

const identifier = ref('')
const password = ref('')
const isAuthenticated = ref(false)
const loading = ref(false)
const error = ref('')
const token = ref<string | null>(null)
const posts = ref<any[]>([])
const filteredPosts = ref<any[]>([])
const searchQuery = ref('')

onMounted(async () => {
  if (process.client) {
    // Restore token and auth state from localStorage
    const savedToken = localStorage.getItem('jfk_blog_editor_token')
    if (savedToken) {
      token.value = savedToken
      isAuthenticated.value = true
      await fetchPosts()
    }
  }
})

const API_URL = config.public.apiUrl

const loginTimeoutMs = 4000
let loginTimeoutHandle: ReturnType<typeof setTimeout> | null = null
const showColdStartModal = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  showColdStartModal.value = false
  if (loginTimeoutHandle) clearTimeout(loginTimeoutHandle)
  loginTimeoutHandle = setTimeout(() => {
    showColdStartModal.value = true
  }, loginTimeoutMs)
  try {
    const res = await fetch(`${API_URL}/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.value, password: password.value })
    })
    const data = await res.json()
    if (data.jwt) {
      token.value = data.jwt
      isAuthenticated.value = true
      // Save token to localStorage for persistence
      localStorage.setItem('jfk_blog_editor_token', data.jwt)
      await fetchPosts()
      showColdStartModal.value = false
    } else {
      error.value = data.error?.message || 'Login failed'
    }
  } catch (e) {
    error.value = 'Login failed'
  } finally {
    loading.value = false
    if (loginTimeoutHandle) clearTimeout(loginTimeoutHandle)
  }
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

function logout() {
  isAuthenticated.value = false
  token.value = ''
  localStorage.removeItem('jfk_blog_editor_token')
  posts.value = []
  filteredPosts.value = []
}

async function fetchPosts() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/blog-posts?sort=publishedAt:desc`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    if (res.status === 401) {
      // Token expired or invalid
      logout()
      error.value = 'Session expired. Please log in again.'
      return
    }
    const data = await res.json()
    posts.value = data.data || []
    filteredPosts.value = posts.value
  } finally {
    loading.value = false
  }
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
