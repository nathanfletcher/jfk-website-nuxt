import { clerkPlugin } from '@clerk/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const key = config.public.clerkPublishableKey as string
  
  if (!key) {
    console.warn('[Clerk] Publishable key is missing. Editor login will not work. Set NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env or GitHub Secrets.')
    return
  }
  
  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: key
  })
})
