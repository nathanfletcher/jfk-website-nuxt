import { defineNuxtPlugin } from '#app'
import { Ckeditor } from '@ckeditor/ckeditor5-vue'

export default defineNuxtPlugin((nuxtApp) => {
  // CKEditor plugin registration is not needed for Nuxt 3 SSR compatibility.
  // Use dynamic import and <client-only> in your page/component instead.
})
