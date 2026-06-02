// scripts/fetchBlogData.js
// Usage: node scripts/fetchBlogData.js
// Fetches blog posts from Strapi API and writes to public/blogdata.json
// Uses incremental timestamp-based fetching to minimize API requests

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_URL = process.env.STRAPI_API_URL || process.env.NUXT_PUBLIC_API_URL || 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
const OUT_PATH = path.join(__dirname, '../public/blogdata.json')
const TIMESTAMP_PATH = path.join(__dirname, '../.last-fetch-timestamp')

// Use native fetch if available
let fetchFn
try {
  fetchFn = globalThis.fetch || fetch
} catch {
  fetchFn = fetch
}

/**
 * Fetch only posts that have been updated since the given ISO timestamp.
 * If lastFetchTime is null, fetches ALL posts (initial full sync).
 */
async function fetchChangedPosts(lastFetchTime) {
  let allPosts = []
  let page = 1
  let pageSize = 100
  let totalPages = 1
  let totalAvailable = 0

  // Build the base URL
  let baseUrl = `${API_URL}/blog-posts?sort=updatedAt:desc&pagination[pageSize]=${pageSize}`
  if (lastFetchTime) {
    // Add filter: updatedAt >= lastFetchTime (with a 1-minute buffer to avoid edge cases)
    const since = new Date(new Date(lastFetchTime).getTime() - 60000).toISOString()
    baseUrl += `&filters[updatedAt][$gte]=${encodeURIComponent(since)}`
    console.log(`[fetchBlogData] Incremental fetch: only posts updated since ${since}`)
  } else {
    console.log('[fetchBlogData] Full fetch: no previous timestamp found, fetching all posts.')
  }

  do {
    const url = `${baseUrl}&pagination[page]=${page}`
    console.log(`[fetchBlogData] Fetching page ${page}...`)
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
    totalAvailable = data.meta?.pagination?.total || 0
    page++
  } while (page <= totalPages)

  console.log(`[fetchBlogData] Total available in Strapi for this query: ${totalAvailable} posts across ${totalPages} page(s)`)
  return allPosts
}

async function main() {
  try {
    console.log('--- Starting fetchBlogData.js ---')

    // Read last successful fetch timestamp (if any)
    let lastFetchTime = null
    if (fs.existsSync(TIMESTAMP_PATH)) {
      lastFetchTime = fs.readFileSync(TIMESTAMP_PATH, 'utf-8').trim()
      console.log(`[fetchBlogData] Last fetch timestamp: ${lastFetchTime}`)
    }

    // Read existing blogdata.json
    let existing = []
    if (fs.existsSync(OUT_PATH)) {
      try {
        console.log('[fetchBlogData] Reading existing blogdata.json...')
        existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'))
      } catch (e) {
        console.warn('[fetchBlogData] Warning: Could not parse existing blogdata.json, starting fresh.')
        existing = []
      }
    } else {
      console.log('[fetchBlogData] No existing blogdata.json found, starting fresh.')
    }

    // Decide whether we can do an incremental fetch
    // Only do incremental if we have a timestamp AND existing data to merge into
    const isIncremental = !!lastFetchTime && Array.isArray(existing) && existing.length > 0
    if (!isIncremental && lastFetchTime) {
      console.log('[fetchBlogData] Existing data empty despite having timestamp. Falling back to full fetch.')
      lastFetchTime = null
    }

    // Index existing posts by documentId for merging
    console.log('[fetchBlogData] Indexing existing posts...')
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

    console.log(`[fetchBlogData] Existing posts in blogdata.json: ${existingMap.size}`)

    // Fetch changed (or all) posts from Strapi
    const posts = await fetchChangedPosts(isIncremental ? lastFetchTime : null)
    console.log(`[fetchBlogData] Fetched ${posts.length} posts from Strapi.`)

    // Merge: update or add new posts
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

    console.log(`[fetchBlogData] Merged posts. ${updated} new or updated posts.`)

    // Only write if something changed
    if (updated > 0 || !fs.existsSync(OUT_PATH)) {
      const merged = Array.from(existingMap.values())
      fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2))
      console.log(`[fetchBlogData] Saved ${merged.length} posts to blogdata.json`)
    } else {
      console.log('[fetchBlogData] No changes detected. Skipping write.')
    }

    // Save the current timestamp for next incremental run
    const now = new Date().toISOString()
    fs.writeFileSync(TIMESTAMP_PATH, now)
    console.log(`[fetchBlogData] Saved fetch timestamp: ${now}`)

    console.log('[fetchBlogData] --- Script complete ---')
  } catch (e) {
    console.error('[fetchBlogData] Error:', e)
    process.exit(1)
  }
}

main()

