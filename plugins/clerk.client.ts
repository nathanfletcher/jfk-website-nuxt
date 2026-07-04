import { clerkPlugin } from '@clerk/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const key = config.public.clerkPublishableKey as string
  
  if (!key) {
    console.warn('[Clerk] Publishable key is missing. Editor login will not work. Set NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env or GitHub Secrets.')
  }
  
  // Always install the plugin — even with an empty key — so useAuth() and
  // <SignIn /> don't throw "plugin not installed" errors. The sign-in UI
  // will show a configuration error instead of crashing the page.
  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: key || ''
  })
})
