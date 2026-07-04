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

// Secure base64url decode helper with proper padding support
function base64UrlDecode(str) {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0: break;
    case 2: output += '=='; break;
    case 3: output += '='; break;
    default: throw new Error('Illegal base64url string!');
  }
  return atob(output);
}

async function verifyClerkToken(token, env) {
  const jwks = await getClerkJwks(env)

  // Decode token header to get kid
  const [headerB64, payloadB64, sigB64] = token.split('.')
  if (!headerB64 || !payloadB64 || !sigB64) {
    throw new Error('Malformed JWT token structure')
  }

  const header = JSON.parse(base64UrlDecode(headerB64))
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
  const sig = Uint8Array.from(base64UrlDecode(sigB64), c => c.charCodeAt(0))
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    sig,
    data
  )
  if (!valid) throw new Error('JWT signature verification failed')

  // Decode and check expiry
  const payload = JSON.parse(base64UrlDecode(payloadB64))
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
    'User-Agent': 'blog-api-worker/1.1',
  }
}

const BLOGDATA_PATH = 'public/blogdata.json'

// Fetch current blogdata.json from repo (supports files > 1MB via Git Blobs API fallback)
async function getBlogData(env) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/contents/${BLOGDATA_PATH}`
  const res = await fetch(url, { headers: ghHeaders(env) })
  if (!res.ok) {
    if (res.status === 404) return { posts: [], sha: null }
    throw new Error(`GitHub API error: ${res.status}`)
  }
  const data = await res.json()
  const sha = data.sha

  let base64Content = data.content
  // If the file exceeds 1MB, the GitHub Contents API omits content. Fallback to Git Blobs API.
  if (!base64Content && sha) {
    const blobUrl = `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/git/blobs/${sha}`
    const blobRes = await fetch(blobUrl, { headers: ghHeaders(env) })
    if (!blobRes.ok) {
      throw new Error(`GitHub Blobs API error: ${blobRes.status}`)
    }
    const blobData = await blobRes.json()
    base64Content = blobData.content
  }

  // Symmetrical UTF-8 base64url decoding to prevent JSON syntax crash on special characters
  const decodedB64 = atob(base64Content.replace(/\n/g, ''))
  const content = decodeURIComponent(escape(decodedB64))
  return { posts: JSON.parse(content), sha }
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

async function handleGetPosts(request, env, ctx) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')

  // Setup Cloudflare Edge Cache for public requests to eliminate GitHub API rate limit exhaustion
  const cacheUrl = new URL(request.url)
  const cacheKey = new Request(cacheUrl.toString(), request)
  const cache = caches.default

  // Try retrieving cached response (ignored if Authorization header is present)
  let cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) return cachedResponse

  const { posts } = await getBlogData(env)
  let responseData

  if (slug) {
    const post = posts.find(p => p.slug === slug)
    if (!post) return errorResponse('Post not found', 404)
    responseData = { data: [post] }
  } else {
    posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    responseData = { data: posts }
  }

  const response = jsonResponse(responseData)
  
  // Cache the response at the edge for 1 hour to prevent GitHub rate-limiting
  response.headers.set('Cache-Control', 'public, max-age=3600')
  ctx.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

async function handleCreatePost(request, env) {
  const body = await request.json()
  const { title, slug, text } = body
  if (!title || !slug || !text) return errorResponse('Missing required fields: title, slug, text')

  // Security: Sanity check inputs
  if (slug.match(/[^a-z0-9-]/)) return errorResponse('Invalid slug format. Lowercase alphanumeric and hyphens only.')

  const { posts, sha } = await getBlogData(env)

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

  // Invalidate edge cache for list request
  const cache = caches.default
  const listUrl = new URL('/posts', request.url)
  await cache.delete(new Request(listUrl.toString()))

  return jsonResponse({ data: newPost }, 201)
}

async function handleUpdatePost(request, env) {
  const body = await request.json()
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return errorResponse('Missing slug query parameter')

  const { title, text, newSlug } = body
  if (!title && !text && !newSlug) return errorResponse('No fields to update')

  // Security: Sanity check inputs
  if (newSlug && newSlug.match(/[^a-z0-9-]/)) return errorResponse('Invalid newSlug format. Lowercase alphanumeric and hyphens only.')

  const { posts, sha } = await getBlogData(env)
  const idx = posts.findIndex(p => p.slug === slug)
  if (idx === -1) return errorResponse('Post not found', 404)

  const now = new Date().toISOString()
  if (title) posts[idx].title = title
  if (text) posts[idx].text = text
  if (newSlug && newSlug !== slug) {
    if (posts.find(p => p.slug === newSlug)) {
      return errorResponse('A post with the new slug already exists', 409)
    }
    posts[idx].slug = newSlug
  }
  posts[idx].updatedAt = now

  await commitBlogData(posts, sha, `blog: update post "${posts[idx].title}"`, env)

  // Invalidate edge caches
  const cache = caches.default
  const listUrl = new URL('/posts', request.url)
  await cache.delete(new Request(listUrl.toString()))
  const oldPostUrl = new URL(`/posts?slug=${encodeURIComponent(slug)}`, request.url)
  await cache.delete(new Request(oldPostUrl.toString()))
  if (newSlug) {
    const newPostUrl = new URL(`/posts?slug=${encodeURIComponent(newSlug)}`, request.url)
    await cache.delete(new Request(newPostUrl.toString()))
  }

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

  // Invalidate edge caches
  const cache = caches.default
  const listUrl = new URL('/posts', request.url)
  await cache.delete(new Request(listUrl.toString()))
  const postUrl = new URL(`/posts?slug=${encodeURIComponent(slug)}`, request.url)
  await cache.delete(new Request(postUrl.toString()))

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
      return handleGetPosts(request, env, ctx)
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
