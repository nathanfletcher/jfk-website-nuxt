# Migration Plan: Replace Strapi with Clerk + Cloudflare Worker + GitHub

## 1. Current Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CURRENT FLOW                       │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Editor UI (/editor/*)                                │
│    │  Login: POST /auth/local (Strapi)                │
│    │  Auth: JWT in localStorage                       │
│    │  CRUD:  GET/POST/PUT/DELETE /api/blog-posts/...  │
│    │                                                  │
│    ▼                                                  │
│  Strapi (paid, Koyeb-hosted, free-tier cold starts)   │
│    │  Stores posts in database                        │
│    │                                                  │
│    ▼  (every 6h or manual trigger)                    │
│  GitHub Actions: fetch-blogdata.yml                   │
│    │  Runs scripts/fetchBlogData.js                   │
│    │  Writes public/blogdata.json                     │
│    │  Commits blogdata.json to repo                   │
│    │                                                  │
│    ▼                                                  │
│  GitHub Actions: deploy.yml                           │
│    │  Builds with yarn generate                       │
│    │  Prerenders blog routes from blogdata.json       │
│    │  Deploys to GitHub Pages                         │
│    │                                                  │
│    ▼                                                  │
│  GitHub Pages serves static site                      │
│    │  Blog pages read blogdata.json client-side       │
│    │  Fallback: direct Strapi API fetch               │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Key files involved:**
| File | Role |
|---|---|
| `pages/editor/index.vue` | Login form, auth against Strapi `/auth/local` |
| `pages/editor/edit.vue` | Post CRUD via Strapi API, trigger deploy |
| `scripts/fetchBlogData.js` | Fetch from Strapi, merge into `public/blogdata.json` |
| `pages/blog/[id].vue` | Display post, reads `blogdata.json`, falls back to Strapi API |
| `pages/blog/index.vue` | List posts, reads `blogdata.json`, falls back to Strapi API |
| `pages/index.vue` | Homepage, shows latest 3 posts from `blogdata.json` |
| `.github/workflows/fetch-blogdata.yml` | CI: warmup Strapi, fetch, commit blogdata.json, trigger deploy |
| `.github/workflows/deploy.yml` | CI: build + deploy to GitHub Pages |
| `nuxt.config.ts` | Prerenders blog routes from `blogdata.json` |
| `scripts/generateSitemap.js` | Generates sitemap from `blogdata.json` |
| `server/routes/sitemap.xml.ts` | Runtime sitemap from `blogdata.json` |

---

## 2. Problem Statement

- Strapi instance gets suspended due to unpaid fees
- When suspended, cannot log in, create, or edit posts
- Need a zero-cost alternative that:
  - Supports multi-user authentication with individual email/password
  - Preserves the existing web-based editor CKEditor UI
  - Works with GitHub Pages static hosting
  - Commits blog posts directly to the repo for build/deploy
  - No servers to maintain or pay for

---

## 3. Target Architecture

```
┌──────────────────────────────────────────────────────┐
│                   TARGET FLOW                          │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Editor UI (/editor/*)                                │
│    │  Login: Clerk <SignIn /> component               │
│    │  Auth: Clerk session JWT (managed by Clerk SDK)  │
│    │  CRUD:  POST/PUT/DELETE → Cloudflare Worker      │
│    │                                                  │
│    ▼                                                  │
│  Clerk (auth SaaS, free tier: 10K MAU)                │
│    │  Multi-user signup/login via email/password      │
│    │  User management dashboard                       │
│    │  Session management, token refresh               │
│    │                                                  │
│    ▼                                                  │
│  Cloudflare Worker (serverless, free: 100K req/day)   │
│    │  Validates Clerk JWT                             │
│    │  Handles CRUD operations on blogdata.json        │
│    │  Uses GitHub API (PAT in env var, never browser)  │
│    │  Commits directly to repo                        │
│    │                                                  │
│    ▼                                                  │
│  GitHub Repo                                          │
│    │  Worker commits to public/blogdata.json on main  │
│    │  Push triggers deploy.yml                        │
│    │                                                  │
│    ▼                                                  │
│  GitHub Actions: deploy.yml (unchanged!)              │
│    │  Builds with yarn generate                       │
│    │  Deploys to GitHub Pages                         │
│    │                                                  │
│    ▼                                                  │
│  GitHub Pages serves static site                      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**What goes away:**
- Strapi Koyeb instance (and its costs)
- `scripts/fetchBlogData.js` pipeline
- `.github/workflows/fetch-blogdata.yml` workflow
- `.last-fetch-timestamp` file
- All Strapi API calls in the Nuxt frontend
- The `triggerDeploy()` function (Worker commits trigger deploy automatically)

**What stays the same:**
- `public/blogdata.json` as the single source of truth
- CKEditor in `/editor/edit.vue` (unchanged UI)
- Editor preview page (unchanged)
- Blog display pages (unchanged, still read `blogdata.json`)
- `deploy.yml` workflow (unchanged)
- `nuxt.config.ts` prerender logic (unchanged)
- Sitemap generation (unchanged)

**What's new:**
- Clerk SDK (`@clerk/vue`) for auth
- Cloudflare Worker (~100 lines) for post CRUD
- Editor login page rewritten to use Clerk `<SignIn />`
- Editor edit page: API URLs changed from Strapi to Worker URL

---

## 4. Detailed Migration Steps

### Phase 1: Setup Clerk (Auth)

**Step 1.1**: Create a Clerk account at https://clerk.com
- Free tier: 10,000 monthly active users
- Create an application, note the **Publishable Key** and **Secret Key**

**Step 1.2**: Add Clerk to environment
- Add `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to GitHub secrets (for CI builds)
- Add `CLERK_SECRET_KEY` to Cloudflare Worker secrets (for JWT verification, Phase 2)

**Step 1.3**: Update `nuxt.config.ts`
```ts
// Add to runtimeConfig.public:
clerkPublishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
// Add new Worker URL:
workerUrl: process.env.NUXT_PUBLIC_WORKER_URL,
```

**Step 1.4**: Install Clerk Vue SDK
```bash
yarn add @clerk/vue
```

**Step 1.5**: Create Clerk plugin at `plugins/clerk.ts`
```ts
import { clerkPlugin } from '@clerk/vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: useRuntimeConfig().public.clerkPublishableKey
  })
})
```

**Step 1.6**: Rewrite `pages/editor/index.vue` login form
- Remove Strapi auth logic (`identifier`, `password`, `login()`, `token.value`)
- Replace login form with Clerk `<SignIn />` component
- Use Clerk's `useUser()` / `useAuth()` composable to check auth state
- On authenticated: redirect to post list via Worker API (instead of Strapi)
- Remove `showColdStartModal` (no more cold starts!)
- Token storage: Clerk SDK handles session automatically (no `localStorage` needed)

**Step 1.7**: Update `pages/editor/edit.vue` auth
- Replace `token = localStorage.getItem('jfk_blog_editor_token')` with Clerk's `useAuth()` composable (gives you a `getToken()` function)
- Send `Authorization: Bearer <clerk_token>` on all Worker API calls
- Replace `logout()` with Clerk's `signOut()`
- Update `savePost()` and `deletePost()` API URLs from Strapi to Worker

### Phase 2: Create Cloudflare Worker (API proxy)

**Step 2.1**: Create a new Cloudflare Worker
- Sign up at https://workers.cloudflare.com (free plan)
- Install `wrangler` CLI: `npm install -g wrangler`
- Create new worker: `wrangler init blog-api`

**Step 2.2**: Worker environment variables
```
GITHUB_PAT          = <github_personal_access_token_with_repo_scope>
GITHUB_REPO_OWNER   = <your_github_username>
GITHUB_REPO_NAME    = jfk-website-nuxt
CLERK_SECRET_KEY    = <from_clerk_dashboard>
CLERK_PUBLISHABLE_KEY = <from_clerk_dashboard>
```

**Step 2.3**: Worker code (see `docs/WORKER_CODE.md`)

The Worker needs these endpoints:
| Method | Path | Description |
|---|---|---|
| `GET` | `/posts` | List all posts (public, no auth needed) |
| `POST` | `/posts` | Create a new post (requires Clerk auth) |
| `PUT` | `/posts` | Update a post (requires Clerk auth) |
| `DELETE` | `/posts` | Delete a post (requires Clerk auth) |

For each write operation:
1. Validate Clerk JWT from `Authorization` header
2. Fetch current `blogdata.json` from GitHub API
3. Modify the JSON (add/update/delete post)
4. Commit back to repo via GitHub API (`PUT /repos/:owner/:repo/contents/public/blogdata.json`)
5. The commit push automatically triggers `deploy.yml` in CI

**Step 2.4**: Deploy Worker
```bash
wrangler deploy
```
Note the Worker URL (e.g., `https://blog-api.your-subdomain.workers.dev`).

### Phase 3: Update Editor Pages

**Step 3.1**: `pages/editor/index.vue` -- key changes:

Before (Strapi):
```ts
const token = ref(localStorage.getItem('jfk_blog_editor_token'))
const isAuthenticated = ref(!!token.value)

async function login() {
  const res = await fetch(`${API_URL}/auth/local`, { ... })
  token.value = data.jwt
  localStorage.setItem('jfk_blog_editor_token', data.jwt)
}

async function fetchPosts() {
  const res = await fetch(`${API_URL}/blog-posts?sort=createdAt:desc`, {
    headers: { Authorization: `Bearer ${token.value}` }
  })
}
```

After (Clerk):
```ts
import { useAuth, useUser } from '@clerk/vue'
const { isSignedIn, getToken, signOut } = useAuth()
const { user } = useUser()
const WORKER_URL = config.public.workerUrl

// No login function needed -- Clerk <SignIn /> handles it
// Token management: getToken() returns a Clerk session JWT

async function fetchPosts() {
  const token = await getToken()
  const res = await fetch(`${WORKER_URL}/posts`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

function logout() {
  signOut()
}
```

**Step 3.2**: `pages/editor/edit.vue` -- key changes:

Before:
```ts
const API_URL = config.public.apiUrl
const token = ref(localStorage.getItem('jfk_blog_editor_token'))

// Fetch: GET /api/blog-posts?filters[slug][$eq]=...
// Create: POST /api/blog-posts
// Update: PUT /api/blog-posts/:documentId
// Delete: DELETE /api/blog-posts/:documentId
```

After:
```ts
import { useAuth } from '@clerk/vue'
const { getToken } = useAuth()
const WORKER_URL = config.public.workerUrl

async function loadPostBySlug(slug: string) {
  const token = await getToken()
  const res = await fetch(`${WORKER_URL}/posts?slug=${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  // Response format: { data: [{ title, slug, text, documentId, ... }] }
  // This matches the existing Strapi data format so minimal changes needed
}

async function savePost() {
  const token = await getToken()
  const body = { title: form.value.title, slug: form.value.slug, text: form.value.text }
  let method, url
  if (isEdit.value) {
    method = 'PUT'
    url = `${WORKER_URL}/posts?slug=${encodeURIComponent(form.value.slug)}`
  } else {
    method = 'POST'
    url = `${WORKER_URL}/posts`
  }
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  // Success: commit was made, deploy.yml auto-triggers
  // Remove triggerDeploy() call -- no longer needed
}

async function deletePost() {
  const token = await getToken()
  await fetch(`${WORKER_URL}/posts?slug=${encodeURIComponent(form.value.slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

**Step 3.3**: Remove `triggerDeploy()` from `edit.vue` -- Worker commits trigger deploy automatically.

### Phase 4: Clean Up Frontend

**Step 4.1**: `pages/blog/[id].vue` -- remove Strapi API fallback
- Keep the `blogdata.json` fetch (primary source)
- Remove the Strapi API fallback block (lines 62-75 of current file)
- This file mostly stays the same

**Step 4.2**: `pages/blog/index.vue` -- remove Strapi API fallback
- Keep `blogdata.json` fetch for post listing
- Remove the Strapi API fallback

**Step 4.3**: `pages/index.vue` -- remove Strapi API fallback
- Keep `blogdata.json` fetch for latest posts
- Remove the Strapi API fallback

**Step 4.4**: `nuxt.config.ts` -- update runtimeConfig
```ts
runtimeConfig: {
  public: {
    apiUrl: process.env.NUXT_PUBLIC_API_URL || '...', // Keep for backward compat during transition
    clerkPublishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    workerUrl: process.env.NUXT_PUBLIC_WORKER_URL || '',
  }
}
```

### Phase 5: CI/CD Cleanup

**Step 5.1**: Delete `.github/workflows/fetch-blogdata.yml`
- No longer needed -- Worker commits directly

**Step 5.2**: Delete `scripts/fetchBlogData.js`
- No longer needed

**Step 5.3**: Delete `.last-fetch-timestamp`
- No longer needed

**Step 5.4**: `deploy.yml` -- no changes needed
- Still triggers on push to main
- Still builds with `yarn generate --preset github_pages`
- Still deploys to GitHub Pages

**Step 5.5**: `generateSitemap.js` and `server/routes/sitemap.xml.ts` -- no changes needed
- Still read from `blogdata.json`

### Phase 6: Create GitHub PAT for Worker

**Step 6.1**: Create a fine-grained personal access token
- Go to GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens
- Repository access: only this repo (`jfk-website-nuxt`)
- Permissions:
  - `Contents`: Read and write
- Note: This token is ONLY stored in the Cloudflare Worker environment. It never reaches the browser.

---

## 5. Data Migration

**Step 7.1**: Export existing posts from Strapi
- The current `public/blogdata.json` already contains all posts
- No migration needed -- the Worker reads/writes this same file format

**Step 7.2**: Verify blogdata.json format compatibility
- Current format: Array of post objects with `documentId`, `title`, `slug`, `text`, `publishedAt`, `updatedAt`, `createdAt`
- Worker will preserve this exact format when adding/editing posts
- New posts created via Worker get: auto-generated `documentId` (UUID), timestamps set to `new Date().toISOString()`

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clerk outage | Low | Medium | Login won't work. Clerk has 99.99% uptime SLA. |
| Worker outage | Low | Medium | Can't save/delete posts. Read (blog display) is unaffected since it reads from static `blogdata.json`. |
| GitHub API rate limit | Very low | Low | Worker makes one API call per CRUD operation. Limit is 5000/hr for authenticated users. |
| Git merge conflicts in blogdata.json | Low | Medium | Worker always fetches latest SHA before committing. Concurrent edits could race. Mitigated by small user count. |
| Strapi cold start during migration | N/A | N/A | Keep Strapi live during transition. Cut over only after Worker is tested. |

---

## 7. Testing Plan

### Local testing
1. Run Nuxt dev server: `yarn dev`
2. Visit `/editor` -- should see Clerk sign-in
3. Sign in -- should see post list fetched from Worker
4. Create new post -- verify it appears in `blogdata.json` on GitHub
5. Edit existing post -- verify it updates
6. Delete post -- verify it's removed
7. Visit `/blog` -- verify posts display correctly
8. Visit `/blog/:slug` -- verify individual post renders

### CI testing
1. Push a change to `blogdata.json` (via Worker)
2. Verify `deploy.yml` triggers automatically
3. Verify build succeeds
4. Verify GitHub Pages is updated

### Rollback plan
- Keep Strapi running during transition
- If Clerk/Worker has issues, revert editor pages to Strapi auth
- `blogdata.json` is backwards compatible in both systems

---

## 8. Cost Summary

| Component | Cost |
|---|---|
| Clerk (auth) | $0 (10K MAU free) |
| Cloudflare Workers | $0 (100K req/day free) |
| GitHub Pages | $0 |
| GitHub Actions | $0 (public repos) |
| **Total** | **$0/month** |

---

## 9. Timeline Estimate

| Phase | Effort |
|---|---|
| Phase 1: Clerk setup | 1-2 hours |
| Phase 2: Cloudflare Worker | 2-3 hours |
| Phase 3: Editor pages rewrite | 2-3 hours |
| Phase 4: Frontend cleanup | 1 hour |
| Phase 5: CI/CD cleanup | 30 min |
| Phase 6: GitHub PAT | 15 min |
| **Total** | **~8 hours** |
