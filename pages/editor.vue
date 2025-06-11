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
        <button class="btn-primary w-full" @click="startNewPost">+ New Post</button>
      </div>
      <div v-if="loading" class="text-center py-4">Loading...</div>
      <div v-else>
        <div v-for="post in filteredPosts" :key="post.id" class="post-list-item" @click="editPost(post)">
          <div class="font-semibold">{{ post.title }}</div>
          <div class="text-xs text-gray-500">{{ formatDate(post.publishedAt) }}</div>
        </div>
      </div>
      <div v-if="showEditor" class="editor-form mt-6">
        <h3 class="text-lg font-bold mb-2">{{ editingPost ? 'Edit Post' : 'New Post' }}</h3>
        <form @submit.prevent="savePost">
          <input v-model="form.title" type="text" placeholder="Title" class="input mb-2" required />
          <input v-model="form.slug" type="text" placeholder="Slug (unique, e.g. my-first-post)" class="input mb-2" required />
          <client-only>
            <component
              :is="editor"
              v-model="form.text"
              :editor="ClassicEditor"
              :config="editorConfig"
              class="input mb-2 ck-editor-wrapper"
            />
          </client-only>
          <div class="flex gap-2 mb-2">
            <button type="button" class="btn-secondary flex-1" @click="saveDraft">Save Draft</button>
            <button type="button" class="btn-secondary flex-1" @click="loadDraft">Load Draft</button>
            <button type="button" class="btn-secondary flex-1" @click="clearDraft">Clear Draft</button>
          </div>
          <button type="button" class="btn-secondary w-full mb-2" @click="showPreview = !showPreview">{{ showPreview ? 'Hide' : 'Show' }} Preview</button>
          <button type="submit" class="btn-primary w-full" :disabled="saving">{{ saving ? 'Saving...' : (editingPost ? 'Update' : 'Create') }}</button>
          <button v-if="editingPost" type="button" class="btn-secondary w-full mt-2" @click="deletePost">Delete</button>
          <button type="button" class="btn-secondary w-full mt-2" @click="cancelEdit">Cancel</button>
        </form>
        <div v-if="showPreview" class="preview-box mt-4 p-3 bg-white border rounded shadow">
          <h4 class="font-bold mb-2">Post Preview</h4>
          <div v-html="form.text"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const identifier = ref('')
const password = ref('')
const isAuthenticated = ref(false)
const loading = ref(false)
const error = ref('')
const token = ref('')
const posts = ref<any[]>([])
const filteredPosts = ref<any[]>([])
const searchQuery = ref('')
const showEditor = ref(false)
const editingPost = ref<any>(null)
const saving = ref(false)
const form = ref({ title: '', slug: '', text: '' })
const showPreview = ref(false)

const editor = ref()
const ClassicEditor = ref()
const editorConfig = { toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ] }

onMounted(async () => {
  if (process.client) {
    const { default: CKEditorComponent } = await import('@ckeditor/ckeditor5-vue')
    const { default: Classic } = await import('@ckeditor/ckeditor5-build-classic')
    editor.value = CKEditorComponent
    ClassicEditor.value = Classic
  }
})

const API_URL = 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'

async function login() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL}/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.value, password: password.value })
    })
    const data = await res.json()
    console.log('Login response:', data)
    // add a 30 second delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 30000))
    if (data.jwt) {
      token.value = data.jwt
      //isAuthenticated.value = true
      await fetchPosts()
    } else {
      error.value = data.error?.message || 'Login failed'
    }
  } catch (e) {
    //error.value = 'Login failed'
  } finally {
    //loading.value = false
  }
}

function logout() {
  isAuthenticated.value = false
  token.value = ''
  posts.value = []
  filteredPosts.value = []
  showEditor.value = false
  editingPost.value = null
  form.value = { title: '', slug: '', text: '' }
}

async function fetchPosts() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/blog-posts?sort=publishedAt:desc`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
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

function startNewPost() {
  showEditor.value = true
  editingPost.value = null
  form.value = { title: '', slug: '', text: '' }
  showPreview.value = false
}

function editPost(post: any) {
  showEditor.value = true
  editingPost.value = post
  form.value = { title: post.title, slug: post.slug, text: post.text }
  showPreview.value = false
}

function cancelEdit() {
  showEditor.value = false
  editingPost.value = null
  form.value = { title: '', slug: '', text: '' }
  showPreview.value = false
}

async function savePost() {
  saving.value = true
  try {
    if (editingPost.value) {
      // Update
      await fetch(`${API_URL}/blog-posts/${editingPost.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
    } else {
      // Create
      await fetch(`${API_URL}/blog-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
    }
    await fetchPosts()
    showEditor.value = false
    editingPost.value = null
    form.value = { title: '', slug: '', text: '' }
    showPreview.value = false
    clearDraft()
  } finally {
    saving.value = false
  }
}

async function deletePost() {
  if (!editingPost.value) return
  saving.value = true
  try {
    await fetch(`${API_URL}/blog-posts/${editingPost.value.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    await fetchPosts()
    showEditor.value = false
    editingPost.value = null
    form.value = { title: '', slug: '', text: '' }
    showPreview.value = false
    clearDraft()
  } finally {
    saving.value = false
  }
}

// Local draft storage
const DRAFT_KEY = 'jfk_blog_editor_draft'
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(form.value))
  alert('Draft saved locally!')
}
function loadDraft() {
  const draft = localStorage.getItem(DRAFT_KEY)
  if (draft) {
    Object.assign(form.value, JSON.parse(draft))
    alert('Draft loaded!')
  } else {
    alert('No draft found.')
  }
}
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// Register CKEditor plugin globally (Nuxt 3 plugin approach)
// In your nuxt.config.ts, add this plugin file to auto-import plugins
// Create a file: plugins/ckeditor.ts
//
// import { defineNuxtPlugin } from '#app'
// import CKEditor from '@ckeditor/ckeditor5-vue'
// export default defineNuxtPlugin((nuxtApp) => {
//   nuxtApp.vueApp.use(CKEditor)
// })
//
// Then, you can use <CKEditor> in your components without client-only.
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
.editor-form {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(37,99,235,0.07);
}
.ck-editor-wrapper {
  min-height: 180px;
  background: #fff;
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  margin-bottom: 0.5rem;
}
.preview-box {
  min-height: 100px;
  border: 1px solid #e0e7ef;
  border-radius: 0.5rem;
  background: #f9fafb;
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
