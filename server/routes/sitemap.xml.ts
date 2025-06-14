import { SitemapStream, streamToPromise } from 'sitemap'
import { createReadStream } from 'fs'
import { join } from 'path'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const hostname = config.public.siteUrl || 'https://johntamakloe.com'
  const sitemap = new SitemapStream({ hostname })

  // Try to use static fallback data
  let posts: any[] = []
  try {
    const blogdataPath = join(process.cwd(), 'public', 'blogdata.json')
    const data = JSON.parse(await fs.promises.readFile(blogdataPath, 'utf-8'))
    posts = Array.isArray(data) ? data : data.data
  } catch (e) {
    // fallback: no posts
    posts = []
  }

  // Add blog post URLs
  for (const post of posts) {
    if (post.slug) {
      sitemap.write({
        url: `/blog/${encodeURIComponent(post.slug)}`,
        changefreq: 'monthly',
        lastmod: post.updatedAt || post.publishedAt,
        priority: 0.8
      })
    }
  }

  // Add homepage and blog listing
  sitemap.write({ url: '/', changefreq: 'monthly', priority: 1 })
  sitemap.write({ url: '/blog', changefreq: 'weekly', priority: 0.9 })

  sitemap.end()
  return streamToPromise(sitemap)
})
