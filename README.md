# JFK Personal Blog (Nuxt.js + Clerk + Cloudflare Worker)

A robust, mobile-friendly personal blog built with Nuxt.js, featuring a WYSIWYG editor, Clerk authentication, and a Cloudflare Worker API proxy that commits content directly to the GitHub repository. Zero server costs, zero cold starts.

---

## Features

- **Nuxt.js 3** with Tailwind CSS for a modern, responsive UI
- **Clerk** authentication for multi-user editor access (free tier: 10K MAU)
- **Cloudflare Worker** API proxy for post CRUD — commits directly to GitHub repo
- **Hybrid static+API fallback**: Blog post pages are statically generated at build time, with client-side Worker API fallback for newly published posts
- **Mobile-optimized WYSIWYG editor** (CKEditor 5, dynamic import)
- **Autosave drafts** to localStorage
- **SEO**: robots.txt, dynamic sitemap.xml, canonical tags, meta tags, and JSON-LD structured data
- **GitHub Actions**: auto-deploys Nuxt site + Cloudflare Worker on push to `main`
- **Zero monthly cost**: Clerk free tier + Cloudflare Workers free tier + GitHub Pages

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Author    │     │  Clerk (Auth)    │     │  Cloudflare Worker  │
│  (Writes    │────▶│  Sign In / JWT   │────▶│  (API Proxy)        │
│   Posts)    │     │                  │     │  Validates JWT       │
└─────────────┘     └──────────────────┘     │  CRUD on blogdata    │
                                              │  Commits to repo     │
                                              └─────────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────────┐
                                              │  GitHub Repo        │
                                              │  blogdata.json      │
                                              │  (single source)    │
                                              └─────────────────────┘
                                                       │
                                               push triggers deploy
                                                       │
                                                       ▼
                                              ┌─────────────────────┐
                                              │  GitHub Pages       │
                                              │  (Static Hosting)   │
                                              └─────────────────────┘
```

### Data Flow

1. **Author logs in** at `/editor` via Clerk (email/password)
2. **Creates/edits a post** — frontend calls Cloudflare Worker with Clerk JWT
3. **Worker validates JWT**, fetches `blogdata.json` from GitHub, modifies it, commits back
4. **Push to `main` triggers GitHub Actions** → builds Nuxt → deploys to GitHub Pages
5. **Visitors** load the static site; if a post isn't in the static cache yet, the frontend falls back to the public Worker API

---

## Setup

```bash
yarn install
```

### Environment Variables

Create a `.env` file in the project root:

```env
NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_***
NUXT_PUBLIC_WORKER_URL=https://blog-api.***.workers.dev
```

For CI (GitHub Actions), add these as **Repository Secrets** under Settings → Secrets and variables → Actions. Also add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for automated Worker deploys.

---

## Development

```bash
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Production

```bash
yarn generate --preset github_pages
```

---

## Editor Workflow

- `/editor` — Clerk login, dashboard, search, and list posts
- `/editor/edit` — Create or edit posts (autosave, modals, slug auto-gen)
- `/editor/preview` — WYSIWYG preview

---

## Static & Hybrid Fallback Logic

- All blog post pages (`/blog/:slug`) are statically generated at build time using `public/blogdata.json`
- If a post isn't in the static cache (published within the last 1-2 minutes), the page falls back to the public Worker API (`GET /posts?slug=...`)
- Fallback is implemented in `pages/index.vue`, `pages/blog/index.vue`, and `pages/blog/[id].vue`

---

## Cloudflare Worker (`blog-api/`)

The Worker provides these endpoints:

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/posts` | No | List all posts |
| `GET` | `/posts?slug=...` | No | Get single post |
| `POST` | `/posts` | Clerk JWT | Create post |
| `PUT` | `/posts?slug=...` | Clerk JWT | Update post |
| `DELETE` | `/posts?slug=...` | Clerk JWT | Delete post |

Deploy manually: `cd blog-api && npx wrangler deploy`
Or automatically via GitHub Actions on push (requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets).

---

## GitHub Actions Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `deploy.yml` | Push to `main` | Builds Nuxt → deploys to GitHub Pages |
| `deploy-worker.yml` | Push to `blog-api/**` | Deploys Worker to Cloudflare |

---

## Key Files

| File | Purpose |
|------|---------|
| `blog-api/src/index.js` | Cloudflare Worker — Clerk JWT verification + GitHub CRUD |
| `blog-api/wrangler.toml` | Worker configuration |
| `public/blogdata.json` | Single source of truth for blog posts |
| `nuxt.config.ts` | Prerender routes, runtime config, route rules |
| `plugins/clerk.client.ts` | Clerk Vue plugin (client-only) |
| `scripts/generateSitemap.js` | Generate `public/sitemap.xml` |
| `.github/workflows/deploy.yml` | GitHub Pages build + deploy |
| `.github/workflows/deploy-worker.yml` | Cloudflare Worker deploy |

---

## License

MIT
