# Cloudflare Worker Code (blog-api)

This document contains the full Worker source code. Deploy with `wrangler deploy`.

## Environment Variables (set via `wrangler secret put`)

```
GITHUB_PAT           = GitHub fine-grained PAT (Contents: Read & Write, repo-scoped)
GITHUB_REPO_OWNER    = your-github-username
GITHUB_REPO_NAME     = jfk-website-nuxt
CLERK_SECRET_KEY     = From Clerk dashboard > API Keys > Secret Key
CLERK_PUBLISHABLE_KEY = From Clerk dashboard > API Keys > Publishable Key
```

## Worker: `src/index.js` (ESM format for Cloudflare Workers)

```js
// src/index.js
// Cloudflare Worker — Clerk-authenticated CRUD proxy for blogdata.json via GitHub API

// ── Clerk JWT Verification ──────────────────────────────────────────────────

// Clerk public JWKS keys — fetched lazily and cached
let jwksCache = null
let jwksCacheExpiry = 0

async function getClerkJwks(env) {
  if (jwksCache && Date.now() < jwksCacheExpiry) return jwksCache
  const res = await fetch('https://api.clerk.com/v1/jwks', {
    headers: {
      'Authorization': `Bearer ${env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  jwksCache = await res.json()
  jwksCacheExpiry = Date.now() + 3600_000 // 1 hour
  return jwksCache
}

async function verifyClerkToken(token, env) {
  const jwks = await getClerkJwks(env)

  // Decode token header to get kid
  const [headerB64] = token.split('.')
  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
  const key = jwks.keys.find(k => k.kid === header.kid)
  if (!key) throw new Error('JWK not found for kid: ' + header.kid)

  // Import public key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, n: key.n, e: key.e, alg: key.alg },
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
    false,
    ['verify']
  )

  // Verify signature
  const [rawHeader, rawPayload, rawSig] = token.split('.')
  const sig = Uint8Array.from(atob(rawSig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const data = new TextEncoder().encode(`${rawHeader}.${rawPayload}`)

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    sig,
    data
  )
  if (!valid) throw new Error('JWT signature verification failed')

  // Decode and check expiry
  const payload = JSON.parse(atob(rawPayload.replace(/-/g, '+').replace(/_/g, '/')))
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired')
  }

  return payload
}

// ── GitHub API ─────────────────────────────────────────────────────────────

function ghHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_PAT}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'blog-api-worker/1.0',
  }
}

const BLOGDATA_PATH = 'public/blogdata.json'

// Fetch current blogdata.json from repo
async function getBlogData(env) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${BLOGDATA_PATH}`
  const res = await fetch(url, { headers: ghHeaders(env) })
  if (!res.ok) {
    if (res.status === 404) return { posts: [], sha: null }
    throw new Error(`GitHub API error: ${res.status}`)
  }
  const data = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return { posts: JSON.parse(content), sha: data.sha }
}

// Commit updated blogdata.json to repo
async function commitBlogData(posts, sha, message, env) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${BLOGDATA_PATH}`
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2))))

  const body = {
    message,
    content,
  }
  if (sha) body.sha = sha // required for updates

  const res = await fetch(url, {
    method: 'PUT',
    headers: ghHeaders(env),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`GitHub commit failed: ${res.status} ${errBody}`)
  }
  return res.json()
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateDocumentId() {
  return crypto.randomUUID()
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  })
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status)
}

// ── Route Handlers ─────────────────────────────────────────────────────────

async function handleGetPosts(request, env) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')

  const { posts } = await getBlogData(env)

  if (slug) {
    const post = posts.find(p => p.slug === slug)
    if (!post) return errorResponse('Post not found', 404)
    // Return in Strapi-compatible format { data: [...] }
    return jsonResponse({ data: [post] })
  }

  // Return all posts sorted by most recent first
  posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return jsonResponse({ data: posts })
}

async function handleCreatePost(request, env) {
  const body = await request.json()
  const { title, slug, text } = body
  if (!title || !slug || !text) return errorResponse('Missing required fields: title, slug, text')

  const { posts, sha } = await getBlogData(env)

  // Check for duplicate slug
  if (posts.find(p => p.slug === slug)) {
    return errorResponse('A post with this slug already exists', 409)
  }

  const now = new Date().toISOString()
  const newPost = {
    documentId: generateDocumentId(),
    title,
    slug,
    text,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  posts.push(newPost)

  await commitBlogData(posts, sha, `blog: create post "${title}"`, env)
  return jsonResponse({ data: newPost }, 201)
}

async function handleUpdatePost(request, env) {
  const body = await request.json()
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return errorResponse('Missing slug query parameter')

  const { title, text, newSlug } = body
  if (!title && !text && !newSlug) return errorResponse('No fields to update')

  const { posts, sha } = await getBlogData(env)
  const idx = posts.findIndex(p => p.slug === slug)
  if (idx === -1) return errorResponse('Post not found', 404)

  const now = new Date().toISOString()
  if (title) posts[idx].title = title
  if (text) posts[idx].text = text
  if (newSlug && newSlug !== slug) {
    // Check new slug isn't taken
    if (posts.find(p => p.slug === newSlug)) {
      return errorResponse('A post with the new slug already exists', 409)
    }
    posts[idx].slug = newSlug
  }
  posts[idx].updatedAt = now

  await commitBlogData(posts, sha, `blog: update post "${posts[idx].title}"`, env)
  return jsonResponse({ data: posts[idx] })
}

async function handleDeletePost(request, env) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return errorResponse('Missing slug query parameter')

  const { posts, sha } = await getBlogData(env)
  const idx = posts.findIndex(p => p.slug === slug)
  if (idx === -1) return errorResponse('Post not found', 404)

  const deleted = posts.splice(idx, 1)[0]

  await commitBlogData(posts, sha, `blog: delete post "${deleted.title}"`, env)
  return jsonResponse({ data: deleted })
}

// ── Entry Point ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      })
    }

    const url = new URL(request.url)

    // GET /posts — public, no auth required
    if (request.method === 'GET' && url.pathname === '/posts') {
      return handleGetPosts(request, env)
    }

    // All write operations require Clerk auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing or invalid Authorization header', 401)
    }

    let payload
    try {
      payload = await verifyClerkToken(authHeader.slice(7), env)
    } catch (e) {
      return errorResponse('Unauthorized: ' + e.message, 401)
    }

    // POST /posts — create new post
    if (request.method === 'POST' && url.pathname === '/posts') {
      return handleCreatePost(request, env)
    }

    // PUT /posts?slug=... — update post
    if (request.method === 'PUT' && url.pathname === '/posts') {
      return handleUpdatePost(request, env)
    }

    // DELETE /posts?slug=... — delete post
    if (request.method === 'DELETE' && url.pathname === '/posts') {
      return handleDeletePost(request, env)
    }

    return errorResponse('Not found', 404)
  },
}
```

## wrangler.toml

```toml
name = "blog-api"
main = "src/index.js"
compatibility_date = "2024-07-01"

[[kv_namespaces]]
binding = ""

[vars]
GITHUB_REPO_OWNER = "your-github-username"
GITHUB_REPO_NAME = "jfk-website-nuxt"
```

## Deploy

```bash
# Install wrangler if not installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put GITHUB_PAT
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY

# Deploy
wrangler deploy
```

After deploy, note the worker URL (e.g. `https://blog-api.your-subdomain.workers.dev`).
Add it as `NUXT_PUBLIC_WORKER_URL` in GitHub secrets and your local `.env`.
