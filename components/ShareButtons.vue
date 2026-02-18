<template>
  <div class="flex flex-wrap items-center gap-4 py-6 border-t border-b border-gray-100 my-8">
    <span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Share this post:</span>
    <div class="flex flex-wrap gap-3">
      <!-- WhatsApp -->
      <a
        :href="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-all hover:scale-110 shadow-sm"
        title="Share on WhatsApp"
      >
        <Icon name="i-simple-icons-whatsapp" class="w-5 h-5" />
      </a>

      <!-- Facebook -->
      <a
        :href="facebookUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-[#1877F2] text-white hover:bg-[#074497] transition-all hover:scale-110 shadow-sm"
        title="Share on Facebook"
      >
        <Icon name="i-simple-icons-facebook" class="w-5 h-5" />
      </a>

      <!-- Twitter (X) -->
      <a
        :href="twitterUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 transition-all hover:scale-110 shadow-sm"
        title="Share on X"
      >
        <Icon name="i-simple-icons-x" class="w-5 h-5" />
      </a>

      <!-- Copy Link -->
      <button
        @click="copyToClipboard"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all hover:scale-110 shadow-sm relative group"
        title="Copy Link"
      >
        <Icon :name="copied ? 'i-lucide-check' : 'i-lucide-link'" class="w-5 h-5" :class="{'text-green-600': copied}" />
        <span v-if="copied" class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1.5 px-3 rounded shadow-lg whitespace-nowrap z-10">
          Link copied!
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  title: string
}>()

const currentUrl = ref('')
const copied = ref(false)

onMounted(() => {
  currentUrl.value = window.location.href
})

const whatsappUrl = computed(() => {
  const message = `${props.title}
${currentUrl.value}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
})

const facebookUrl = computed(() => {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl.value)}`
})

const twitterUrl = computed(() => {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl.value)}&text=${encodeURIComponent(props.title)}`
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
</script>
