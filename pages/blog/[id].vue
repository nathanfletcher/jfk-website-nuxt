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
        <section class="hero-section animate-fade-in-up bg-[url(/assets/images/jt-hero-2.webp)] bg-cover bg-center flex items-end min-h-[40vh] rounded-lg mb-8">
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
      <ShareButtons v-if="post" :title="post.title" :description="getFirstSentences(post.text, 2)" />
      <div class="ck-content prose prose-blue max-w-none" v-html="renderedText"></div>
      
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { useHead, useRuntimeConfig, useAsyncData } from '#imports'
import qs from 'qs'

const route = useRoute()
const postId = decodeURIComponent(route.params.id as string)
const config = useRuntimeConfig()

const { data: post, pending: loading } = await useAsyncData(`post-${postId}`, async () => {
  // @ts-ignore
  const postsArr = await $fetch('/blogdata.json').catch((err) => {
    console.error('Could not fetch /blogdata.json', err)
    return [] // Return empty array on error
  })

  const posts = Array.isArray(postsArr) ? postsArr : (postsArr as any).data;
  let foundPost = posts.find((p: any) => p.slug === postId) || null;

  // Fallback to API if not found in static data
  if (!foundPost) {
    try {
      const query = qs.stringify({
        filters: { slug: { $eq: postId } },
      }, { encodeValuesOnly: true })
      // @ts-ignore
      const res = await $fetch(`${config.public.apiUrl}/blog-posts?${query}`)
      if (Array.isArray(res.data) && res.data[0]) {
        foundPost = res.data[0]
      }
    } catch (e) {
      console.error('API fetch error:', e)
    }
  }

  return foundPost
})

const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true })

watchEffect(() => {
  if (post.value) {
    setMetaTags(post.value)
  }
})

function formatDate(ts: string) {
  const date = new Date(ts)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function whatsappToMarkdown(text: string): string {
  text = text.replace(/(^|\W)\*(\S[^*]*\S)\*(?=\W|$)/g, '$1**$2**')
  text = text.replace(/(^|\W)_(\S[^_]*\S)_(?=\W|$)/g, '$1*$2*')
  text = text.replace(/(^|\W)~(\S[^~]*\S)~(?=\W|$)/g, '$1~~$2~~')
  text = text.replace(/```([\s\S]*?)```/g, function(_, code) { return '```' + code + '```' })
  text = text.replace(/^(\s*)([\*-])\s+/gm, '$1- ')
  text = text.replace(/^>\s+/gm, '> ')
  return text
}

const renderedText = computed(() => {
  if (post.value && post.value.text) {
    const mdText = whatsappToMarkdown(post.value.text)
    return md.render(mdText.replace(/\n/g, '<br>'))
  } else {
    return ''
  }
})

function stripHtml(html: string): string {
  // Replace &nbsp; and other common HTML entities
  html = html.replace(/&nbsp;/g, ' ');
  return html.replace(/<[^>]*>/g, '')
}

function getFirstSentences(text: string, count = 2): string {
  const plain = stripHtml(text)
  const match = plain.match(new RegExp(`(([^.!?]*[.!?]){1,${count}})`))
  return match ? match[0].trim() : plain.split('\n').slice(0, count).join(' ')
}

function setMetaTags(postObj: any) {
  if (!postObj) return
  const slug = postObj.slug || route.params.id
  const canonicalUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://johntamakloe.com') + `/blog/${encodeURIComponent(slug as string)}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: postObj.title,
    description: getFirstSentences(postObj.text, 2),
    datePublished: postObj.publishedAt,
    dateModified: postObj.updatedAt || postObj.publishedAt,
    author: { '@type': 'Person', name: 'John Tamakloe' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    image: '/jt-hero-2.jpg',
    url: canonicalUrl
  }
  useHead({
    title: postObj.title + ' | JFK Blog',
    meta: [
      { name: 'description', content: getFirstSentences(postObj.text, 2) },
      { property: 'og:title', content: postObj.title },
      { property: 'og:description', content: getFirstSentences(postObj.text, 2) },
      { property: 'og:site_name', content: 'John Tamakloe (Evangelist)' },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: 'https://johntamakloe.com/jt-hero-2.jpg' },
      { property: 'og:image:alt', content: postObj.title },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: postObj.title },
      { name: 'twitter:description', content: getFirstSentences(postObj.text, 2) },
      { name: 'twitter:image', content: 'https://johntamakloe.com/jt-hero-2.jpg' },
      { name: 'robots', content: 'index,follow' }
    ],
    link: [
      { rel: 'canonical', href: canonicalUrl }
    ],
    script: [
      { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData) }
    ]
  })
}
</script>

<style>
@import '@/assets/css/ckeditor5-content.css';
</style>


