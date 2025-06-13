// scripts/fetchBlogData.js
// Usage: node scripts/fetchBlogData.js
// Fetches all blog posts from Strapi API and writes to public/blogdata.json

const fs = require('fs')
const path = require('path')

const API_URL = process.env.STRAPI_API_URL || 'https://reliable-bubble-e0aafb3b9e.strapiapp.com/api'
const OUT_PATH = path.join(__dirname, '../public/blogdata.json')

async function fetchAllPosts() {
  const res = await fetch(`${API_URL}/blog-posts?sort=createdAt:desc`)
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
  const data = await res.json()
  return data.data
}

async function main() {
  try {
    const posts = await fetchAllPosts()
    fs.writeFileSync(OUT_PATH, JSON.stringify(posts, null, 2))
    console.log(`Fetched and saved ${posts.length} posts to blogdata.json`)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  }
}

main()
