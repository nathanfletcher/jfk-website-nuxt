<template>
  <div class="editor-preview-page">
    <nav class="editor-nav flex justify-between items-center mb-4 p-2 bg-blue-600 text-white rounded-lg shadow">
      <NuxtLink :to="{ path: '/editor/edit', query: { slug: $route.query.slug } }" class="font-bold text-lg">Back to Edit</NuxtLink>
    </nav>
    <h3 class="text-lg font-bold mb-2">Post Preview</h3>
    <div class="preview-box mt-4 p-3 bg-white border rounded shadow">
      <h4 class="font-bold mb-2 text-lg break-words whitespace-pre-line">{{ $route.query.title }}</h4>
      <div v-html="$route.query.text"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.editor-preview-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
}
.preview-box {
  min-height: 100px;
  border: 1px solid #e0e7ef;
  border-radius: 0.5rem;
  background: #f9fafb;
}
h4 {
  word-break: break-word;
  white-space: pre-line;
  font-size: 1.25rem;
}
</style>
