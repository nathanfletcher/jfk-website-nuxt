import { clerkPlugin } from '@clerk/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const key = config.public.clerkPublishableKey as string
  
  // Only initialize Clerk if a publishable key is provided.
  // Without this guard, an empty key (missing env var in CI) crashes
  // the entire client-side app, including public blog pages.
  if (!key) return
  
  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: key
  })
})
