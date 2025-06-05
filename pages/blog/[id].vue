<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <div v-if="loading" class="text-center p-8">
      <div class="inline-block animate-pulse">
        <div class="h-4 w-24 bg-blue-200 rounded"></div>
      </div>
    </div>
    <div v-else-if="!post" class="text-center text-red-500 p-8">
      <h2 class="text-xl font-semibold">Post not found</h2>
      <p class="mt-2">The blog post you're looking for doesn't exist.</p>
      <NuxtLink to="/blog" class="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
        Return to Blog
      </NuxtLink>
    </div>
    <article v-else class="bg-white rounded-lg shadow-sm p-6 sm:p-8">
      <div class="mb-8">
        <NuxtLink to="/blog" class="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 mb-4">
          <span>&larr;</span>
          <span>Back to Blog</span>
        </NuxtLink>
        <!-- Hero Section -->
    <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.jpg)] bg-cover bg-center flex items-end min-h-[60vh]">
      <div class="container mx-auto items-start  backdrop-blur-sm shadow-lg mb-8 pl-25 pt-5 pb-10 md:text-left">
        <!-- <img src="https://ui-avatars.com/api/?name=John+Franklin+Tamakloe&background=0D8ABC&color=fff&size=128" alt="JFK Avatar" class="rounded-full shadow-lg mb-6 animate-pop-in" width="128" height="128" /> -->
        <h1 class="text-3xl text-blue-500 sm:text-4xl font-bold mb-3">{{ post.title }}</h1>
        
      </div>
    </section>
        
        <div class="text-gray-500 text-sm flex items-center gap-2">
          <span>By {{ post.sender }}</span>
          <span>&bull;</span>
          <time :datetime="post.timestamp">{{ formatDate(post.timestamp) }}</time>
        </div>
      </div>
      <div class="prose prose-blue max-w-none" v-html="renderedText"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import  MarkdownIt  from 'markdown-it';
import { useRuntimeConfig } from '#imports'

const route = useRoute()
const post = ref<{ timestamp: string; sender: string; title: string; text: string } | null>(null)
const loading = ref(true)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString()
}

// Converts WhatsApp-style markdown to standard markdown
function whatsappToMarkdown(text: string): string {
  // Bold: *text* => **text** (but not inside a word)
  text = text.replace(/(^|\W)\*(\S[^*]*\S)\*(?=\W|$)/g, '$1**$2**');
  // Italic: _text_ => *text* (but not inside a word)
  text = text.replace(/(^|\W)_(\S[^_]*\S)_(?=\W|$)/g, '$1*$2*');
  // Strikethrough: ~text~ => ~~text~~
  text = text.replace(/(^|\W)~(\S[^~]*\S)~(?=\W|$)/g, '$1~~$2~~');
  // Monospace: ```text``` => ```text```
  text = text.replace(/```([\s\S]*?)```/g, function(_, code) {
    return '```' + code + '```';
  });
  // Inline code: `text` => `text` (already markdown)
  // Bulleted list: * item or - item (normalize to - )
  text = text.replace(/^(\s*)([\*-])\s+/gm, '$1- ');
  // Numbered list: 1. item (already markdown)
  // Block quote: > text (already markdown, but normalize extra spaces)
  text = text.replace(/^>\s+/gm, '> ');
  return text;
}

const renderedText = computed(() => {
  if (post.value && post.value.text) {
    const mdText = whatsappToMarkdown(post.value.text);
    return md.render(mdText.replace(/\n/g, '<br>'));
  } else {
    return '';
  }
});

onMounted(async () => {
  try {
    const config = useRuntimeConfig()
    const base = config.app.baseURL || '/'
    const res = await fetch(`${base}sampleblog.json`)
    
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


