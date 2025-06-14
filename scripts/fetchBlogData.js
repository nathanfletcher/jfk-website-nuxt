// scripts/fetchBlogData.js
// Usage: node scripts/fetchBlogData.js
// Fetches all blog posts from Strapi API and writes to public/blogdata.json

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_URL = process.env.STRAPI_API_URL || 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
const OUT_PATH = path.join(__dirname, '../public/blogdata.json')

// Use native fetch if available, otherwise fallback to node-fetch
let fetchFn
try {
  fetchFn = globalThis.fetch || fetch
} catch {
  fetchFn = fetch
}

async function fetchAllPosts() {
  let allPosts = []
  let page = 1
  let pageSize = 100
  let totalPages = 1
  do {
    const url = `${API_URL}/blog-posts?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
    console.log(`Fetching page ${page} from: ${url}`)
    const res = await fetchFn(url)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText} - ${text}`)
    }
    const data = await res.json()
    if (Array.isArray(data.data)) {
      allPosts.push(...data.data)
    }
    totalPages = data.meta?.pagination?.pageCount || 1
    page++
  } while (page <= totalPages)
  return allPosts
}

async function main() {
  try {
    console.log('--- Starting fetchBlogData.js ---')
    // Read existing blogdata.json if it exists
    let existing = []
    if (fs.existsSync(OUT_PATH)) {
      try {
        console.log('Reading existing blogdata.json...')
        existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'))
      } catch (e) {
        console.warn('Warning: Could not parse existing blogdata.json, starting fresh.')
        existing = []
      }
    } else {
      console.log('No existing blogdata.json found, starting fresh.')
    }
    // Index existing posts by documentId
    console.log('Indexing existing posts...')
    const existingMap = new Map()
    if (Array.isArray(existing)) {
      for (const post of existing) {
        if (post && post.documentId) existingMap.set(post.documentId, post)
      }
    } else if (existing && Array.isArray(existing.data)) {
      for (const post of existing.data) {
        if (post && post.documentId) existingMap.set(post.documentId, post)
      }
    }
    // Fetch all posts from Strapi (all pages)
    console.log('Fetching all posts from Strapi...')
    const posts = await fetchAllPosts()
    console.log(`Fetched ${posts.length} posts from Strapi.`)
    // Merge: update or add new posts from Strapi
    let updated = 0
    for (const post of posts) {
      if (post.documentId) {
        const existingPost = existingMap.get(post.documentId)
        if (!existingPost || (post.updatedAt && existingPost.updatedAt !== post.updatedAt)) {
          existingMap.set(post.documentId, post)
          updated++
        }
      }
    }
    console.log(`Merged posts. ${updated} new or updated posts.`)
    // Write merged posts (all, including old ones) back to blogdata.json
    const merged = Array.from(existingMap.values())
    fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2))
    console.log(`Merged and saved ${merged.length} posts to blogdata.json`)
    console.log('--- fetchBlogData.js complete ---')
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
