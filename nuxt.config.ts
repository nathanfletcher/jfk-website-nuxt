// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import fs from 'fs'

export default defineNuxtConfig({
  ssr: true,
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      script: [
        {
          async: true,
          src: 'https://www.googletagmanager.com/gtag/js?id=G-4K9WY16XWX'
        },
        {
          innerHTML: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4K9WY16XWX');
          `
        }
      ]
    }
  },
  devtools: { enabled: false },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/content',
    '@nuxt/image'
  ],
  css: ['~/assets/css/tailwind.css'],
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: '~/tailwind.config.ts',
    exposeConfig: false,
    viewer: true
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
    }
  },
  nitro: {
    prerender: {
      routes: (() => {
        // Always include sitemap
        const routes = ['/sitemap.xml']
        // Add blog post routes from blogdata.json
        try {
          const data = fs.readFileSync('./public/blogdata.json', 'utf-8')
          const posts = JSON.parse(data)
          if (Array.isArray(posts)) {
            posts.forEach(post => {
              if (post.slug) routes.push(`/blog/${post.slug}`)
            })
          }
        } catch (e) {
          console.warn('Could not read blogdata.json for prerender routes:', e)
        }
        return routes
      })(),
    },
  },
})