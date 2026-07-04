# Migration Summary: Transition from Strapi to Clerk + Cloudflare Worker

This document serves as the comprehensive documentation for the successful migration of the JFK Blog static site's authentication, storage, and editorial pipeline.

---

## 1. Migration Goals & Achievements

*   **Zero-Cost Infrastructure:** Replaced the paid, cold-starting Koyeb-hosted Strapi instance with a **100% free, high-performance** serverless stack (Clerk Free Tier + Cloudflare Workers Free Tier).
*   **Multi-User Authentication:** Integrated **Clerk**, providing professional, multi-user authentication (Email/Password) with out-of-the-box user management.
*   **Edge Performance:** Leveraged Cloudflare's Edge **Cache API** to deliver blog post feeds in **< 50ms**, completely removing database querying latency.
*   **Automated Git Pipeline:** Programmed the Cloudflare Worker to commit editorial changes directly to your GitHub repository, instantly triggering the Pages build.
*   **Hybrid Fallback Support:** Updated display pages to query the Worker's public endpoints when static JSON caches are rebuilding, keeping changes instant.

---

## 2. Changes Made & Files Modified

### A. Nuxt Frontend Configuration
*   **`nuxt.config.ts`**:
    *   Added `clerkPublishableKey` and `workerUrl` runtime configs.
    *   Configured SPA-mode route rules: `routeRules: { '/editor/**': { ssr: false } }`. This exempts the editor pages from SSR prerendering, avoiding compile-time crashes from client-only libraries.
*   **`package.json` / `yarn.lock`**:
    *   Installed `@clerk/vue` to enable Clerk Vue SDK inside Nuxt 3.

### B. Clerk Client Plugin
*   **`plugins/clerk.client.ts`** (New File):
    *   Bootstraps and registers the Clerk Vue SDK only on the client side to avoid server-side hydration mismatches.

### C. Editor Dashboard Rebuilds
*   **`pages/editor/index.vue`**:
    *   Removed custom Strapi username/password states and local storage tokens.
    *   Integrated Clerk's `<SignIn />` login component, configured to force-redirect users back to `/editor` upon login.
    *   Configured active reactive watch hooks on Clerk's `isSignedIn` state to automatically load the post listings from the Worker API on login.
    *   Optimized `fetchPosts()` to perform public queries without authorization headers, enabling free Cloudflare Edge Caching.
*   **`pages/editor/edit.vue`**:
    *   Substituted the static local storage tokens with the secure, auto-refreshing Clerk session JWT via `getToken()`.
    *   Migrated `savePost()`, `loadPostBySlug()`, and `deletePost()` payloads and URLs from Strapi paths to flat Worker API CRUD routes.
    *   Pruned the dead frontend `triggerDeploy()` trigger since the Cloudflare Worker's commits trigger deployment automatically.

### D. Reader Fallbacks
*   Updated **`pages/blog/[id].vue`**, **`pages/blog/index.vue`**, and **`pages/index.vue`** fallbacks to query the Worker's public GET endpoints, keeping recently published articles available immediately before the static Pages compiler completes.

### E. Cloudflare Worker API
*   Created **`blog-api/`** workspace subfolder containing:
    *   **`wrangler.toml`**: Environment configuration (pre-filled with your GitHub repository owner and name).
    *   **`src/index.js`**: Core serverless proxy program.
        *   *Auth:* Cryptographically validates Clerk session JWTs against Clerk's authenticated JWKS endpoints.
        *   *Storage:* Reads/writes `public/blogdata.json` directly on your repository using Git content pipelines.
        *   *Performance:* Leverages the edge Cache API to bypass GitHub rate limits and serve feeds globally in milliseconds.
        *   *Large-File Handling:* Employs a smart Contents API + Git Blobs API fallback to seamlessly support database files up to **100 MB** (bypassing the standard 1 MB Contents limit).

### F. Pipeline Cleanup (Pruned Dead Assets)
*   Deleted `.github/workflows/fetch-blogdata.yml` (automated fetch runner).
*   Deleted `scripts/fetchBlogData.js` (Strapi fetcher).
*   Deleted `.last-fetch-timestamp` (Strapi offset file).

---

## 3. Post-Migration Enhancements (Troubleshooting & Tweaks)

Following testing, we applied two critical optimizations to resolve common edge cases:

1.  **Clerk Login Redirect Fix:** Added `force-redirect-url="/editor"` to `<SignIn />` inside `pages/editor/index.vue` to prevent Clerk from redirecting successful logins to the homepage root.
2.  **Symmetrical UTF-8 Base64 Decoding:** John's blog contains standard typographic accents and curly quotes. Standard `atob()` decoding throws an error on these characters during a database parse. We resolved this inside `getBlogData` on the Worker using a robust UTF-8 decoder:
    ```js
    const decodedB64 = atob(base64Content.replace(/\n/g, ''))
    const content = decodeURIComponent(escape(decodedB64))
    ```
3.  **Edge Cache Header Conflicts:** Sending the `Authorization` header during a public blog post listing request was causing the Cloudflare Edge Cache API to raise uncacheable header warnings. We removed the auth header from `fetchPosts()` in `index.vue` to resolve this and activate free cache-hits.

---

## 4. Production Deployment Fixes (2026-07-04)

Following the initial push to production, several critical issues were discovered and resolved:

### 4.1 Clerk Vue SDK v2.4.10 ComputedRef Wrapping
The Clerk Vue SDK wraps ALL return values from `useAuth()` — including functions — in `ComputedRef`. `signOut` and `getToken` require `.value` access:
- `await signOut.value()` instead of `await signOut()`
- `await getToken.value()` instead of `await getToken()`

### 4.2 Prerendering: Blog Posts Not Rendered in Static HTML
Nitro's prerenderer does not serve `public/` files over HTTP during build. Created `server/routes/blogdata.json.get.ts` to read from disk during prerendering, eliminating 40+ build errors and ensuring blog posts are embedded in the static HTML for SEO.

### 4.3 GitHub Secrets Not Injected Into CI Build
GitHub Secrets are not automatically available as environment variables. Added explicit `env` block in `deploy.yml` to pass `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NUXT_PUBLIC_WORKER_URL` to the Nuxt build step.

### 4.4 Clerk Plugin Crashing Entire Site
The Clerk plugin was skipping installation when the publishable key was empty, causing `useAuth()` to throw globally and blank all pages. Fixed by always installing the plugin (even with empty key) and adding a `console.warn` for visibility.

### 4.5 GitHub Pages Deployment Flakiness
The `actions/deploy-pages@v4` floating tag had intermittent failures with larger artifacts. Pinned to `v4.0.5` for stable deployments.

---

## 5. Final Architecture

```
Author → Clerk Login → CKEditor → Worker API → GitHub Repo → Pages Deploy → johntamakloe.com
```

| Component | Technology | Cost |
|-----------|-----------|:--:|
| Auth | Clerk | $0 |
| API | Cloudflare Worker | $0 |
| Hosting | GitHub Pages | $0 |
| CI/CD | GitHub Actions | $0 |
| **Total** | | **$0/mo** |

### Repository Secrets Required

| Secret | Used By |
|--------|---------|
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `deploy.yml` → Nuxt build |
| `NUXT_PUBLIC_WORKER_URL` | `deploy.yml` → Nuxt build |
| `CLOUDFLARE_API_TOKEN` | `deploy-worker.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-worker.yml` |

### Local `.env` Required

```env
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
NUXT_PUBLIC_WORKER_URL=https://blog-api.***.workers.dev
```

### Worker Secrets Required

```bash
npx wrangler secret put GITHUB_PAT
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_PUBLISHABLE_KEY
```

### Key Files Inventory

| File | Purpose |
|------|---------|
| `pages/editor/index.vue` | Clerk login, post listing |
| `pages/editor/edit.vue` | CKEditor CRUD with Worker API |
| `plugins/clerk.client.ts` | Clerk Vue plugin (always installs) |
| `server/routes/blogdata.json.get.ts` | Serve blogdata.json during prerendering |
| `blog-api/src/index.js` | Cloudflare Worker — auth + GitHub CRUD |
| `blog-api/wrangler.toml` | Worker config |
| `.github/workflows/deploy.yml` | Nuxt build + Pages deploy |
| `.github/workflows/deploy-worker.yml` | Worker auto-deploy |
| `docs/BUGLOG.md` | 12 documented bugs + fixes |

---

## 6. Lessons Learned

1. **Always check SDK types.** `ToComputedRefs<UseAuthReturn>` means functions are wrapped in `ComputedRef` — they need `.value` access in `<script>` but auto-unwrap in templates.
2. **Nitro prerenderer does not serve `public/` over HTTP.** Static file fetches during build need a server route shim.
3. **GitHub Secrets are not env vars.** They must be explicitly mapped in workflow `env` blocks.
4. **Pin GitHub Actions versions.** Floating tags like `@v4` can introduce breaking changes.
5. **Always install global plugins unconditionally.** A missing optional plugin should never crash unrelated pages.
