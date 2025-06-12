<template>
  <div class="editor-form-page">
    <nav class="editor-nav flex justify-between items-center mb-4 p-2 bg-blue-600 text-white rounded-lg shadow">
      <NuxtLink to="/editor" class="font-bold text-lg">Back to Editor</NuxtLink>
      <button class="btn-secondary" @click="logout">Logout</button>
    </nav>
    <h3 class="text-lg font-bold mb-2">{{ isEdit ? 'Edit Post' : 'New Post' }}</h3>
    <form v-if="ready" @submit.prevent="savePost">
      <label class="block mb-2">
        <span class="text-base font-semibold">Title</span>
        <input v-model="form.title" @input="onTitleInput" type="text" placeholder="Title" class="input mb-1 text-xl font-bold" required />
      </label>
      <div class="mb-3 text-sm text-gray-500">
        <span class="font-medium">Slug:</span> <span class="bg-gray-100 px-2 py-1 rounded select-all">{{ form.slug }}</span>
      </div>
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
      <button type="button" class="btn-secondary w-full mb-2" @click="goToPreview">Preview</button>
      <button type="submit" class="btn-primary w-full" :disabled="saving">{{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}</button>
      <button v-if="isEdit" type="button" class="btn-secondary w-full mt-2" @click="deletePost">Delete</button>
      <button type="button" class="btn-secondary w-full mt-2" @click="cancelEdit">Cancel</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const editor = ref()
const ClassicEditor = ref()
const editorConfig = { toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ] }

const isEdit = ref(false)
const form = ref({ title: '', slug: '', text: '' })
const saving = ref(false)
const editingPostId = ref(null)
const ready = ref(false)

const API_URL = 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
const token = ref<string | null>(null)

onMounted(async () => {
  if (process.client) {
    const { Ckeditor } = await import('@ckeditor/ckeditor5-vue')
    const { default: Classic } = await import('@ckeditor/ckeditor5-build-classic')
    editor.value = Ckeditor
    ClassicEditor.value = Classic
    // Restore token
    token.value = localStorage.getItem('jfk_blog_editor_token')
    // If editing, load post data by slug
    if (route.query.slug) {
      await loadPostBySlug(route.query.slug as string)
    }
    ready.value = true
  }
})

async function loadPostBySlug(slug: string) {
  isEdit.value = true
  const res = await fetch(`${API_URL}/blog-posts?filters[slug][$eq]=${encodeURIComponent(slug)}`,
    { headers: { Authorization: `Bearer ${token.value}` } })
  const data = await res.json()
  if (data.data && data.data.length > 0) {
    editingPostId.value = data.data[0].id
    form.value = {
      title: data.data[0].title,
      slug: data.data[0].slug,
      text: data.data[0].text
    }
  }
}

watch(
  () => route.query.slug,
  async (newSlug, oldSlug) => {
    if (newSlug && newSlug !== oldSlug) {
      await loadPostBySlug(newSlug as string)
    }
  }
)

function goToPreview() {
  router.push({ path: '/editor/preview', query: { ...form.value } })
}

function saveDraft() {
  localStorage.setItem('jfk_blog_editor_draft', JSON.stringify(form.value))
  alert('Draft saved locally!')
}
function loadDraft() {
  const draft = localStorage.getItem('jfk_blog_editor_draft')
  if (draft) {
    Object.assign(form.value, JSON.parse(draft))
    alert('Draft loaded!')
  } else {
    alert('No draft found.')
  }
}
function clearDraft() {
  localStorage.removeItem('jfk_blog_editor_draft')
}

async function savePost() {
  saving.value = true
  try {
    if (isEdit.value && editingPostId.value) {
      await fetch(`${API_URL}/blog-posts/${editingPostId.value}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
    } else {
      await fetch(`${API_URL}/blog-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
    }
    router.push('/editor')
    clearDraft()
  } finally {
    saving.value = false
  }
}

async function deletePost() {
  if (!editingPostId.value) return
  saving.value = true
  try {
    await fetch(`${API_URL}/blog-posts/${editingPostId.value}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    router.push('/editor')
    clearDraft()
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  router.push('/editor')
}

function logout() {
  localStorage.removeItem('jfk_blog_editor_token')
  router.push('/editor')
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
function onTitleInput() {
  form.value.slug = slugify(form.value.title);
}
</script>

<style scoped>
.editor-form-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
}
</style>
