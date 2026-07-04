# Bug Log — Strapi → Clerk + Cloudflare Worker Migration

This document records every issue encountered during the migration of the JFK Blog from Strapi to the Clerk + Cloudflare Worker stack, along with root cause analysis and the final fix applied.

---

## BUG-01: Clerk Vue SDK — `signOut` / `getToken` are not functions

**Date:** 2026-07-04
**Affected files:** `pages/editor/index.vue`, `pages/editor/edit.vue`
**Severity:** Critical (blocks logout and all write operations)

### Symptoms
- Browser console: `TypeError: signOut is not a function`
- Browser console: `TypeError: getToken is not a function`
- Logout button does nothing
- Save/Update/Delete article fails with "An error occurred while saving"

### Root Cause
The Clerk Vue SDK (`@clerk/vue` v2.4.10) wraps **every** property returned by `useAuth()` inside a `ComputedRef`, including functions. Destructuring like this:

```typescript
const { getToken, signOut } = useAuth()
```

produces `ComputedRef<Function>` values, **not raw functions**. Calling `signOut()` directly fails because a `ComputedRef` is not callable — you must access `.value` first.

The SDK's internal implementation:
```js
function toComputedRefs(objectRef) {
  const result = {};
  for (const key in objectRef.value) 
    result[key] = computed(() => objectRef.value[key]);
  return result;
}
```

This converts ALL keys (including `getToken` and `signOut`) into individual `computed()` refs.

### Fix
Access functions through `.value`:

```typescript
// Before (broken)
await signOut()
const token = await getToken()

// After (fixed)
await signOut.value()
const token = await getToken.value()
```

### Key Takeaway
Always check the SDK version's type signature. `ToComputedRefs<UseAuthReturn>` means everything — reactive booleans AND functions — is wrapped in `ComputedRef`. Template auto-unwrapping hides this for `v-if="isSignedIn"`, but `<script>` code must explicitly use `.value`.

---

## BUG-02: Login redirects to homepage instead of `/editor`

**Date:** 2026-07-04
**Affected files:** `pages/editor/index.vue`
**Severity:** Medium (usability)

### Symptoms
After successfully signing in via the Clerk `<SignIn />` component, the browser redirects to `/` (homepage) instead of staying on the editor dashboard.

### Root Cause
Clerk's `<SignIn />` component defaults to redirecting to the site root (`/`) after authentication unless explicitly told otherwise.

### Fix
Added the `force-redirect-url` prop to the `<SignIn />` component:

```html
<SignIn 
  sign-up-url="" 
  :appearance="{ elements: { footer: 'hidden' } }" 
  force-redirect-url="/editor" 
/>
```

---

## BUG-03: Missing `.env` file — Clerk and Worker silently broken

**Date:** 2026-07-04
**Severity:** Critical (blocks all functionality)

### Symptoms
- Clerk sign-in form never renders
- Previous posts never appear in the editor dashboard
- No visible errors (silent failure)

### Root Cause
The `.env` file was never created during the migration. Nuxt's `runtimeConfig.public` relies on environment variables with the `NUXT_PUBLIC_` prefix. Without them:

- `config.public.clerkPublishableKey` → `''` (empty string) → ClerkPlugin initializes with no key → `useAuth()` returns inert stubs
- `config.public.workerUrl` → `''` (empty string) → `fetch(''/posts')` resolves to a relative URL hitting the local dev server → 404

### Fix
Created `.env` at the project root with:

```env
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
NUXT_PUBLIC_WORKER_URL=https://blog-api.***.workers.dev
```

**Important:** The `.env` file is gitignored and must be recreated on any new machine. For CI (GitHub Actions), these must be set as Repository Secrets.

---

## BUG-04: Worker writes silently fail on UTF-8 blog content

**Date:** 2026-07-04
**Affected files:** `blog-api/src/index.js`
**Severity:** High (data corruption risk)

### Symptoms
- Worker returns HTTP 500 when fetching `blogdata.json` containing curly quotes, em dashes, or accented characters
- Posts with special typography cannot be read or written

### Root Cause
Standard `atob()` in JavaScript decodes base64 as a binary-to-ASCII operation. It does NOT handle multi-byte UTF-8 sequences. John's articles contain directional apostrophes (`'` vs `'`), em dashes (`—`), and other Unicode characters. Using plain `atob()` on GitHub's base64-encoded content corrupted these characters, causing `JSON.parse()` to throw a `SyntaxError`.

### Fix
Added symmetrical UTF-8 base64 decoding inside `getBlogData()`:

```javascript
const decodedB64 = atob(base64Content.replace(/\n/g, ''))
const content = decodeURIComponent(escape(decodedB64))
return { posts: JSON.parse(content), sha }
```

This mirrors the encoding pattern (`btoa(unescape(encodeURIComponent(...)))`) used by `commitBlogData()`.

### Key Takeaway
Always pair `atob` with `decodeURIComponent(escape(...))` when the encoded content may contain non-ASCII characters. GitHub's Contents API returns UTF-8 JSON encoded as base64.

---

## BUG-05: Nuxt static generation crashes on `/editor/*` routes

**Date:** 2026-07-04
**Affected files:** `nuxt.config.ts`
**Severity:** High (blocks deployment)

### Symptoms
Running `yarn generate` fails with 500 errors on `/editor` and `/editor/edit` routes during prerendering.

### Root Cause
Nuxt 3's static generator (`nitro prerender`) attempts to server-side render every page in `pages/`. The Clerk Vue SDK and CKEditor 5 both depend on browser-only APIs (`window`, `document`, `localStorage`). When Nitro tries to render these pages in a Node.js context, they throw `ReferenceError: window is not defined`.

### Fix
Added `routeRules` to mark all `/editor/**` paths as SPA-only (no SSR):

```typescript
routeRules: {
  '/editor/**': { ssr: false }
}
```

This tells Nitro to skip server-side rendering for these routes entirely. They are served as a client-side SPA shell.

---

## BUG-06: Cloudflare Worker `GET /posts` prone to GitHub rate-limit exhaustion

**Date:** 2026-07-04
**Affected files:** `blog-api/src/index.js`
**Severity:** Medium (availability risk)

### Symptoms
- Every public page view triggers a GitHub API call
- 5,000 requests/hour limit could be exhausted by crawlers or traffic spikes
- Editor breaks when rate limit is hit

### Root Cause
The public `GET /posts` endpoint fetched `blogdata.json` from GitHub's API on every single request with no caching layer.

### Fix
Implemented Cloudflare Edge Cache API for all public GET responses:

```javascript
const cache = caches.default
let cachedResponse = await cache.match(cacheKey)
if (cachedResponse) return cachedResponse

// ... fetch from GitHub ...

response.headers.set('Cache-Control', 'public, max-age=3600')
ctx.waitUntil(cache.put(cacheKey, response.clone()))
```

Write operations (POST, PUT, DELETE) invalidate the cache for both the list and affected slug endpoints.

### Key Takeaway
Always cache public GET responses at the edge when the underlying data source has rate limits. Cloudflare's Cache API is free and adds zero latency overhead.

---

## BUG-07: `blogdata.json` exceeds 1 MB GitHub Contents API limit

**Date:** 2026-07-04
**Affected files:** `blog-api/src/index.js`
**Severity:** Medium (future-proofing)

### Symptoms
- GitHub Contents API omits `content` field for files > 1 MB
- `getBlogData()` receives `base64Content = undefined` → crashes on `atob(undefined)`
- Current `blogdata.json` is ~1.2 MB

### Root Cause
GitHub's Contents API has a hard 1 MB limit for inline content. For files exceeding this, the API returns metadata (including `sha`) but omits the `content` field.

### Fix
Added Git Blobs API fallback in `getBlogData()`:

```javascript
if (!base64Content && sha) {
  const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`
  const blobRes = await fetch(blobUrl, { headers: ghHeaders(env) })
  base64Content = (await blobRes.json()).content
}
```

The Git Blobs API supports files up to 100 MB.

---

## BUG-08: Base64URL padding causes intermittent JWT verification failures

**Date:** 2026-07-04
**Affected files:** `blog-api/src/index.js`
**Severity:** Low (rare edge case)

### Symptoms
- Clerk JWT verification intermittently fails with a `DOMException`
- Happens when JWT payload length is not a multiple of 4

### Root Cause
JWTs use Base64URL encoding (no `=` padding). Standard `atob()` in some JavaScript engines throws `DOMException: "The string to be decoded is not correctly encoded"` when the input length is not a multiple of 4.

### Fix
Added a padding helper function used for all JWT decoding:

```javascript
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
```

---

## Summary of Files Modified

| File | Bugs Addressed |
|------|---------------|
| `pages/editor/index.vue` | BUG-01, BUG-02, BUG-03 |
| `pages/editor/edit.vue` | BUG-01 |
| `nuxt.config.ts` | BUG-05 |
| `blog-api/src/index.js` | BUG-04, BUG-06, BUG-07, BUG-08 |
| `plugins/clerk.client.ts` | BUG-03 (created), BUG-09 |
| `server/routes/blogdata.json.get.ts` | BUG-10 (created) |
| `.github/workflows/deploy.yml` | BUG-11 |
| `.env` | BUG-03 (created) |

---

## BUG-09: Clerk plugin crashes entire site when publishable key is missing

**Date:** 2026-07-04
**Affected files:** `plugins/clerk.client.ts`
**Severity:** Critical (blanks entire website)

### Symptoms
- All pages on the live site render blank (no blog posts, no navigation)
- Browser console: `Error: @clerk/vue: useAuth can only be used when the Vue plugin is installed`
- Only occurs when `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is not set in CI

### Root Cause
The Clerk plugin was loaded globally (via `plugins/clerk.client.ts`). When the publishable key was empty (missing GitHub Secret), the plugin skipped initialization entirely. This caused `useAuth()` calls in the editor pages to throw "plugin not installed" errors — but since Nuxt plugins load globally, this error crashed the *entire* client-side Vue app, including public blog pages.

### Fix
Always install the Clerk plugin, even with an empty key. The `clerkPlugin` can handle an empty key gracefully — the `<SignIn />` component will show a configuration error instead of crashing:

```typescript
nuxtApp.vueApp.use(clerkPlugin, {
  publishableKey: key || ''
})
```

Also added a `console.warn` so the missing key is visible in logs.

---

## BUG-10: Blog posts not rendered in prerendered HTML (blank pages on live site)

**Date:** 2026-07-04
**Affected files:** `pages/index.vue`, `pages/blog/index.vue`, `pages/blog/[id].vue`, `server/routes/blogdata.json.get.ts`
**Severity:** Critical (SEO + user-facing)

### Symptoms
- Build logs show 40+ instances of `Could not fetch /blogdata.json [GET] "/blogdata.json": 404 Page not found`
- Blog pages and Latest Posts section render empty on the live site
- Prerendered HTML contains no blog post content — only "Loading..." or empty divs

### Root Cause
During static generation (`yarn generate`), Nuxt's Nitro prerenderer runs a local server and calls `$fetch('/blogdata.json')` from the blog page components. However, Nitro does not serve files from `public/` over HTTP during prerendering. The fetch returns 404, the `useAsyncData` call returns empty data, and the prerendered HTML is generated without blog content.

### Fix
Created a Nitro server route at `server/routes/blogdata.json.get.ts` that reads `blogdata.json` from disk and serves it during prerendering:

```typescript
import { readFileSync } from 'fs'

export default defineEventHandler(() => {
  try {
    const content = readFileSync('./public/blogdata.json', 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
})
```

At runtime (static hosting), the physical `public/blogdata.json` file is served directly. The server route only activates during prerendering and development.

---

## BUG-11: GitHub Secrets not injected into CI build — Clerk broken on live site

**Date:** 2026-07-04
**Affected files:** `.github/workflows/deploy.yml`
**Severity:** Critical (editor non-functional on live site)

### Symptoms
- Editor page at `johntamakloe.com/editor` throws error: `@clerk/vue: useAuth can only be used when the Vue plugin is installed`
- Clerk login form never appears on the live site despite working locally
- GitHub Secrets (`NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NUXT_PUBLIC_WORKER_URL`) are set in the repository

### Root Cause
GitHub Secrets are not automatically available as environment variables during CI builds. The `deploy.yml` workflow needed to explicitly pass them to the build step via the `env` block:

```yaml
- name: Build the project
  run: yarn generate --preset github_pages
  env:
    NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
    NUXT_PUBLIC_WORKER_URL: ${{ secrets.NUXT_PUBLIC_WORKER_URL }}
```

Without this, `runtimeConfig.public.clerkPublishableKey` and `runtimeConfig.public.workerUrl` were empty strings at build time.

### Fix
Added the `env` block to the build step in `deploy.yml`, explicitly mapping each GitHub Secret to the corresponding `NUXT_PUBLIC_*` environment variable that Nuxt's runtime config expects.

---

## BUG-12: GitHub Pages deployment intermittently fails with `actions/deploy-pages@v4`

**Date:** 2026-07-04
**Affected files:** `.github/workflows/deploy.yml`
**Severity:** Medium (blocks deployment)

### Symptoms
- Build step succeeds, artifact uploaded correctly (10.8 MB)
- Deploy step fails with "Deployment failed, try again later" after 10 retries
- Inconsistent: some commits deploy fine, others fail repeatedly

### Root Cause
The `actions/deploy-pages@v4` floating tag pulled in a version that had intermittent failures with larger artifacts (~10 MB+) on the GitHub Actions infrastructure. The exact cause is opaque (GitHub internal error).

### Fix
Pinned the action to a known-stable specific version: `actions/deploy-pages@v4.0.5`. This resolved the flaky deployments immediately.

---

## Updated Summary of Files Modified

| File | Bugs Addressed |
|------|---------------|
| `pages/editor/index.vue` | BUG-01, BUG-02, BUG-03 |
| `pages/editor/edit.vue` | BUG-01 |
| `nuxt.config.ts` | BUG-05 |
| `blog-api/src/index.js` | BUG-04, BUG-06, BUG-07, BUG-08 |
| `plugins/clerk.client.ts` | BUG-03, BUG-09 |
| `server/routes/blogdata.json.get.ts` | BUG-10 (created) |
| `.github/workflows/deploy.yml` | BUG-11, BUG-12 |
| `.env` | BUG-03 (created) |
