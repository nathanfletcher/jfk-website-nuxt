<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <NuxtLink :to="{ path: '/editor/edit', query: { slug: $route.query.slug } }" class="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 mb-4">
      <span>&larr;</span>
      <span>Back to Edit</span>
    </NuxtLink>
    <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.jpg)] bg-cover bg-center flex items-end min-h-[40vh] rounded-lg mb-8">
      <div class="container mx-auto items-start backdrop-blur-sm shadow-lg pl-5 pt-5 pb-10 md:text-left">
        <h1 class="text-3xl text-blue-500 sm:text-4xl font-bold mb-3">{{ $route.query.title }}</h1>
      </div>
    </section>
    <div class="text-gray-500 text-sm flex items-center gap-2 mb-6">
      <span>By John Tamakloe</span>
      <span>&bull;</span>
      <time>{{ publishedAt }}</time>
    </div>
    <article class="bg-white rounded-lg shadow-sm p-6 sm:p-8">
      <div class="ck-content prose prose-blue max-w-none" v-html="renderedText"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
// @ts-ignore
import MarkdownIt from 'markdown-it'

const route = useRoute()
const publishedAt = computed(() => {
  const val = route.query.publishedAt
  if (!val || Array.isArray(val)) return 'Draft'
  const d = new Date(val as string)
  return isNaN(d.getTime()) ? 'Draft' : d.toLocaleDateString()
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function getFirstSentences(text: string, count = 2): string {
  const plain = stripHtml(text)
  const match = plain.match(new RegExp(`(([^.!?]*[.!?]){1,${count}})`))
  return match ? match[0].trim() : plain.split('\n').slice(0, count).join(' ')
}

function whatsappToMarkdown(text: string): string {
  text = text.replace(/(^|\W)\*(\S[^*]*\S)\*(?=\W|$)/g, '$1**$2**')
  text = text.replace(/(^|\W)_(\S[^_]*\S)_(?=\W|$)/g, '$1*$2*')
  text = text.replace(/(^|\W)~(\S[^~]*\S)~(?=\W|$)/g, '$1~~$2~~')
  text = text.replace(/```([\s\S]*?)```/g, function(_, code) {
    return '```' + code + '```'
  })
  text = text.replace(/^(\s*)([\*-])\s+/gm, '$1- ')
  text = text.replace(/^>\s+/gm, '> ')
  return text
}

const renderedText = computed(() => {
  const text = route.query.text as string || ''
  const mdText = whatsappToMarkdown(text)
  return md.render(mdText.replace(/\n/g, '<br>'))
})
</script>

<style src="../../assets/css/ckeditor5-content.css"></style>
<style>
.hero-section {
  background-size: cover;
  background-position: center;
  border-radius: 1rem;
  min-height: 40vh;
  margin-bottom: 2rem;
}
.prose {
  font-size: 1.1rem;
}
</style>

