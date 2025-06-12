<template>
  <div class="editor-form-page">
    <nav class="editor-nav flex justify-between items-center mb-4 p-2 bg-blue-600 text-white rounded-lg shadow">
      <NuxtLink to="/editor" class="font-bold text-lg">Back to Editor</NuxtLink>
      <button class="btn-secondary" @click="logout">Logout</button>
    </nav>
    <h3 class="text-lg font-bold mb-2">{{ isEdit ? 'Edit Post' : 'New Post' }}</h3>
    <form v-if="ready" @submit.prevent="savePost">
      <label class="block mb-2">
        <div class="text-base font-semibold">Title</div>
        <input v-model="form.title" @input="onTitleInput" type="text" placeholder="Title" class="input mb-1 text-xl font-bold editable-title w-full" required />
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
      
      <button type="button" class="btn-preview w-full mb-2" @click="goToPreview">👁️ Preview</button>
      <button type="submit" class="btn-primary w-full mb-2 btn-article" :disabled="saving">
        <span v-if="saving" class="animate-spin mr-2">⏳</span>
        <span v-else>{{ isEdit ? 'Update Article' : 'Post Article' }}</span>
      </button>
      <button type="button" class="btn-cancel w-full mt-2" @click="showCancelConfirm = true">Cancel Editing</button>
      <button v-if="isEdit" type="button" class="btn-danger w-full mt-2" @click="showDeleteConfirm = true">🗑️ Delete Article</button>

      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <button type="button" class="btn-draft flex-1" @click="saveDraft">💾 Save Draft to Phone</button>
        <button type="button" class="btn-draft flex-1" @click="loadDraft">📥 Load Draft from Phone</button>
        <button type="button" class="btn-draft flex-1" @click="clearDraft">🗑️ Clear Draft</button>
      </div>
    </form>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-box">
        <h4 class="font-bold text-lg mb-2 text-red-600">Delete Post?</h4>
        <p class="mb-4">Are you sure you want to permanently delete this post? This action cannot be undone.</p>
        <div class="flex gap-2">
          <button class="btn-danger flex-1" @click="deletePost">Yes, Delete</button>
          <button class="btn-secondary flex-1" @click="showDeleteConfirm = false">Cancel</button>
        </div>
      </div>
    </div>
    <!-- Cancel Confirmation Modal -->
    <div v-if="showCancelConfirm" class="modal-overlay">
      <div class="modal-box">
        <h4 class="font-bold text-lg mb-2">Cancel Editing?</h4>
        <p class="mb-4">Are you sure you want to cancel? Unsaved changes will be lost.</p>
        <div class="flex gap-2">
          <button class="btn-danger flex-1" @click="cancelEdit">Yes, Cancel</button>
          <button class="btn-secondary flex-1" @click="showCancelConfirm = false">Continue Editing</button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal-box">
        <h4 class="font-bold text-lg mb-2 text-green-600">{{ isEdit ? 'Article Updated!' : 'Article Posted!' }}</h4>
        <p class="mb-4">Your article was {{ isEdit ? 'updated' : 'posted' }} successfully.</p>
        <div class="mb-2 break-all text-blue-700 underline text-sm">{{ articleUrl }}</div>
        <div class="flex gap-2 mb-2">
          <button class="btn-primary flex-1" @click="visitArticle">Visit Article</button>
          <button class="btn-secondary flex-1" @click="copyLink">Copy Link</button>
        </div>
        <button class="btn-secondary w-full mt-2" @click="closeSuccessModal">Close</button>
      </div>
    </div>
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
const showDeleteConfirm = ref(false)
const showCancelConfirm = ref(false)
const showSuccessModal = ref(false)
const articleUrl = ref('')

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

function closeSuccessModal() { showSuccessModal.value = false }
function visitArticle() { if (articleUrl.value) window.open(articleUrl.value, '_blank') }
function copyLink() {
  if (articleUrl.value) {
    navigator.clipboard.writeText(articleUrl.value)
    alert('Link copied!')
  }
}

async function savePost() {
  saving.value = true
  try {
    let slug = form.value.slug
    let postId = editingPostId.value
    let success = false
    if (isEdit.value && postId) {
      const res = await fetch(`${API_URL}/blog-posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
      success = res.ok
    } else {
      const res = await fetch(`${API_URL}/blog-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        },
        body: JSON.stringify({ data: { ...form.value } })
      })
      if (res.ok) {
        const data = await res.json()
        slug = data.data?.slug || form.value.slug
        postId = data.data?.id
        success = true
      }
    }
    if (success) {
      articleUrl.value = `${window.location.origin}/blog/${encodeURIComponent(slug)}`
      showSuccessModal.value = true
      clearDraft()
    } else {
      alert('Failed to save article. Please try again.')
    }
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

// Autosave draft on edit
watch(
  () => form.value,
  (newVal) => {
    localStorage.setItem('jfk_blog_editor_draft', JSON.stringify(newVal))
  },
  { deep: true }
)
</script>

<style scoped>
.editor-form-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
}
.btn-draft {
  background: #f1f5f9;
  color: #2563eb;
  font-weight: 600;
  border-radius: 0.5rem;
  padding: 0.6rem 1.2rem;
  border: 1px solid #cbd5e1;
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-draft:hover {
  background: #e0e7ef;
}
.btn-preview {
  background: linear-gradient(90deg, #38bdf8 0%, #2563eb 100%);
  color: #fff;
  font-weight: 600;
  border-radius: 0.5rem;
  padding: 0.75rem 2rem;
  box-shadow: 0 2px 8px rgba(56,189,248,0.10);
  transition: background 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-preview:hover {
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
}
.btn-danger {
  background: #fee2e2;
  color: #dc2626;
  font-weight: 700;
  border-radius: 0.5rem;
  padding: 0.75rem 2rem;
  border: 1px solid #fecaca;
  transition: background 0.2s, color 0.2s;
}
.btn-danger:hover {
  background: #fecaca;
  color: #b91c1c;
}
.btn-article {
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
  color: #fff;
  font-weight: 700;
  border-radius: 0.5rem;
  padding: 0.9rem 2rem;
  font-size: 1.1rem;
  box-shadow: 0 4px 16px rgba(56,189,248,0.15);
  transition: background 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-article:disabled {
  opacity: 0.7;
}
.btn-cancel {
  background: #f1f5f9;
  color: #dc2626;
  font-weight: 600;
  border-radius: 0.5rem;
  padding: 0.75rem 2rem;
  border: 1px solid #fecaca;
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-cancel:hover {
  background: #fee2e2;
  color: #b91c1c;
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal-box {
  background: #fff;
  border-radius: 0.75rem;
  padding: 2rem 1.5rem;
  box-shadow: 0 8px 32px rgba(37,99,235,0.13);
  max-width: 90vw;
  width: 350px;
  text-align: center;
}
.editable-title {
  border: 2px solid #2563eb;
  background: #f8fafc;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(37,99,235,0.07);
  cursor: text;
}
.editable-title:focus {
  border: 2px solid #38bdf8;
  background: #fff;
  box-shadow: 0 2px 8px rgba(56,189,248,0.13);
}
</style>
