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
        <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.jpg)] bg-cover bg-center flex items-end min-h-[40vh] rounded-lg mb-8">
          <div class="container mx-auto items-start backdrop-blur-sm shadow-lg pl-5 pt-5 pb-10 md:text-left">
            <h1 class="text-3xl text-blue-500 sm:text-4xl font-bold mb-3">{{ post.title }}</h1>
          </div>
        </section>
        <div class="text-gray-500 text-sm flex items-center gap-2">
          <span>By John Tamakloe</span>
          <span>&bull;</span>
          <time :datetime="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
        </div>
      </div>
      <div class="ck-content prose prose-blue max-w-none" v-html="renderedText"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import  MarkdownIt  from 'markdown-it';
import { useRuntimeConfig } from '#imports'
import { useHead } from '@unhead/vue'
import qs from 'qs'

const route = useRoute()
const post = ref<{ timestamp: string; sender: string; title: string; text: string; publishedAt: string } | null>(null)
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
  try {
    const config = useRuntimeConfig()
    const base = config.app.baseURL || '/'
    let apiTimedOut = false
    const timeout = new Promise((_, reject) => setTimeout(() => { apiTimedOut = true; reject(new Error('timeout')) }, 3000))
    try {
      const query = qs.stringify({
        filters: {
          slug: {
            $eq: decodeURIComponent(route.params.id as string),
          },
        },
      }, { encodeValuesOnly: true })
      const res = await Promise.race([
        fetch(`${config.public.apiUrl}/blog-posts?${query}`, {
          headers: { 'Content-Type': 'application/json' }
        }),
        timeout
      ])
      if (res instanceof Response && res.ok) {
        let postsData = await res.json()
        if (!Array.isArray(postsData.data)) throw new Error('Invalid data format')
        post.value = postsData.data[0] || null
      } else {
        throw new Error('API response not ok')
      }
    } catch (err) {
      // Fallback to blogdata.json
      const fallback = await fetch('/blogdata.json')
      const fallbackData = await fallback.json()
      // Find post by slug in fallback
      const postId = decodeURIComponent(route.params.id as string)
      // If blogdata fallback is set globally, use it (from blog/index.vue)
      let postsArr = fallbackData.data
      if (typeof window !== 'undefined' && (window as any).__JFK_BLOGDATA_FALLBACK) {
        postsArr = (window as any).__JFK_BLOGDATA_FALLBACK.data
      }
      post.value = postsArr.find((p: any) => p.slug === postId) || null
      if (apiTimedOut) {
        console.warn('API timed out, using fallback blogdata.json')
      } else {
        console.error('API failed, using fallback blogdata.json:', err)
      }
    }
    // Set SEO meta tags if post found
    if (post.value) {
      // Use route param as slug fallback if post.value.slug is missing
      const slug = (post.value as any).slug || route.params.id
      const canonicalUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://johntamakloe.com') + `/blog/${encodeURIComponent(slug as string)}`
      // Structured data (JSON-LD)
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.value.title,
        description: getFirstSentences(post.value.text, 2),
        datePublished: post.value.publishedAt,
        dateModified: (post.value as any).updatedAt || post.value.publishedAt,
        author: {
          '@type': 'Person',
          name: 'John Tamakloe',
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl
        },
        image: base + 'images/jt-hero-2.jpg',
        url: canonicalUrl
      }
      useHead({
        title: post.value.title + ' | JFK Blog',
        meta: [
          { name: 'description', content: getFirstSentences(post.value.text, 2) },
          { property: 'og:title', content: post.value.title },
          { property: 'og:description', content: getFirstSentences(post.value.text, 2) },
          { property: 'og:site_name', content: 'John Tamakloe (Evangelist)' },
          { property: 'og:type', content: 'article' },
          { property: 'og:url', content: canonicalUrl },
          { property: 'og:image', content: base + 'images/jt-hero-2.jpg' },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: post.value.title },
          { name: 'twitter:description', content: getFirstSentences(post.value.text, 2) },
          { name: 'twitter:image', content: base + 'images/jt-hero-2.jpg' },
          { name: 'robots', content: 'index,follow' }
        ],
        link: [
          { rel: 'canonical', href: canonicalUrl }
        ],
        script: [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(structuredData)
          }
        ]
      })
    }
  } catch (error) {
    console.error('Failed to fetch or find blog post:', error)
  } finally {
    loading.value = false
    console.log('Loading finished.')
  }
})
</script>

<style>
@import '@/assets/css/ckeditor5-content.css';
</style>


