import { SitemapStream, streamToPromise } from 'sitemap'
import fs from 'fs'
import path from 'path'

const hostname = 'https://johntamakloe.com'
const blogdataPath = path.join(process.cwd(), 'public', 'blogdata.json')
const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml')

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname })
  let posts = []
  try {
    const data = JSON.parse(fs.readFileSync(blogdataPath, 'utf-8'))
    posts = Array.isArray(data) ? data : data.data
  } catch {
    posts = []
  }
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
  sitemap.write({ url: '/', changefreq: 'monthly', priority: 1 })
  sitemap.write({ url: '/blog', changefreq: 'weekly', priority: 0.9 })
  sitemap.end()
  const xml = await streamToPromise(sitemap)
  fs.writeFileSync(sitemapPath, xml)
  console.log('Generated sitemap.xml')
}

generateSitemap()
