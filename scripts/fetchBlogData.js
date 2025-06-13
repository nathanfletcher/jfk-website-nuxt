// scripts/fetchBlogData.js
// Usage: node scripts/fetchBlogData.js
// Fetches all blog posts from Strapi API and writes to public/blogdata.json

const fs = require('fs')
const path = require('path')

const API_URL = process.env.STRAPI_API_URL || 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
const OUT_PATH = path.join(__dirname, '../public/blogdata.json')

async function fetchAllPosts() {
  let allPosts = []
  let page = 1
  let pageSize = 100
  let totalPages = 1
  do {
    const res = await fetch(`${API_URL}/blog-posts?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`)
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data.data)) {
      allPosts.push(...data.data)
    }
    // Defensive: handle both Strapi v4 and v3 meta
    totalPages = data.meta?.pagination?.pageCount || 1
    page++
  } while (page <= totalPages)
  return allPosts
}

async function main() {
  try {
    // Read existing blogdata.json if it exists
    let existing = []
    if (fs.existsSync(OUT_PATH)) {
      try {
        existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'))
      } catch (e) {
        console.warn('Warning: Could not parse existing blogdata.json, starting fresh.')
        existing = []
      }
    }
    // Index existing posts by documentId
    const existingMap = new Map()
    for (const post of existing) {
      if (post.documentId) existingMap.set(post.documentId, post)
    }
    // Fetch all posts from Strapi (up to 500)
    const posts = await fetchAllPosts()
    // Merge: update or add new posts from Strapi
    for (const post of posts) {
      if (post.documentId) {
        const existingPost = existingMap.get(post.documentId)
        if (!existingPost || (post.updatedAt && existingPost.updatedAt !== post.updatedAt)) {
          existingMap.set(post.documentId, post)
        }
      }
    }
    // Write merged posts (all, including old ones) back to blogdata.json
    const merged = Array.from(existingMap.values())
    fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2))
    console.log(`Merged and saved ${merged.length} posts to blogdata.json`)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
