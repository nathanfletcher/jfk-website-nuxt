# JFK Personal Blog (Nuxt.js + Strapi + Static/Hybrid Fallback)

A robust, mobile-friendly personal blog built with Nuxt.js, featuring a WYSIWYG editor, Strapi CMS integration, and static JSON fallback for resilience against API downtime or cold starts. Includes a modern UI, advanced SEO, and a GitHub Actions workflow for automated static data, sitemap updates, and deployment.

---

## Features

- **Nuxt.js 3** with Tailwind CSS for a modern, responsive UI
- **Strapi CMS** integration for blog post management (API URL configurable)
- **Hybrid static+API fallback**: Blog post pages are statically generated at build time (SEO-friendly), with client-side API fallback for newly published posts not yet in the static cache
- **Mobile-optimized WYSIWYG editor** (CKEditor 5, dynamic import)
- **Autosave drafts** to localStorage with indicator
- **SEO**: robots.txt, dynamic sitemap.xml, canonical tags, meta tags, and JSON-LD structured data
- **Sitewide footer** with current year and contact info
- **GitHub Actions**: fetches/merges Strapi posts to `blogdata.json` every 6 hours (with webhook support), generates and commits `sitemap.xml`, and triggers deployment
- **Resilient editor UX**: login modal, cold start warning, grouped actions, modals
- **Markdown rendering** with WhatsApp-style conversion
- **Global fallback**: blogdata is set on `window` for all blog pages

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Author    │     │   Strapi CMS     │     │   GitHub Actions    │
│  (Writes    │────▶│  (Cloud Hosted)  │────▶│  (Every 6 hours)    │
│   Posts)    │     │                  │     │                     │
└─────────────┘     └──────────────────┘     └─────────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────────┐
                                              │  public/            │
                                              │  blogdata.json      │
                                              │  sitemap.xml        │
                                              │  .last-fetch-       │
                                              │  timestamp          │
                                              └─────────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────────┐
                                              │  Nuxt.js Static     │
                                              │  Site Generation    │
                                              │  (yarn generate)    │
                                              └─────────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────────┐
                                              │  GitHub Pages       │
                                              │  (Static Hosting)   │
                                              └─────────────────────┘
                                                      │
                          ┌───────────────────────────┘
                          ▼
              ┌─────────────────────┐
              │  Visitor's Browser  │
              │                     │
              │  1. Loads static    │
              │     blogdata.json   │
              │  2. If post missing │
              │     → fetches live  │
              │     from Strapi API │
              └─────────────────────┘
```

### Data Flow

1. **Author publishes** a blog post in Strapi CMS
2. **GitHub Actions** runs `scripts/fetchBlogData.js` (every 6 hours, or on-demand)
3. The script **incrementally fetches** only posts updated since the last run (tracked via `.last-fetch-timestamp`)
4. New/updated posts are **merged** into `public/blogdata.json`
5. A **sitemap** is generated at `public/sitemap.xml`
6. The site is **deployed** to GitHub Pages via `yarn generate --preset github_pages`
7. **Visitors** load the static site; if a post isn't in the static data (e.g., brand new), the frontend **falls back to the live Strapi API**

---

## Setup

Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `STRAPI_API_URL` | No | Demo instance | Strapi API base URL (used by fetch script) |
| `NUXT_PUBLIC_API_URL` | No | Demo instance | Strapi API base URL (used by frontend) |

---

## Development

Start the dev server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Production

Build and preview:

```bash
npm run build
npm run preview
```

---

## Editor Workflow

- `/editor` — Dashboard, search, and list posts
- `/editor/edit` — Create or edit posts (autosave, modals, slug auto-gen)
- `/editor/preview` — WYSIWYG preview

---

## Static & Hybrid Fallback Logic

- All blog post pages (`/blog/:slug`) are statically generated at build time using `public/blogdata.json` for maximum SEO and link preview support.
- If a user visits a blog post page that was not present at build time (e.g., a new post added to the API after deployment), the page will attempt to fetch the post from the Strapi API on the client side and display it if found.
- If neither static nor API data is found, a "Post not found" message is shown.

**Fallback is implemented in:**
- `pages/index.vue` — Homepage (latest 3 posts)
- `pages/blog/index.vue` — Blog listing (paginated)
- `pages/blog/[id].vue` — Single post view

---

## Data Pipeline (scripts/)

### `scripts/fetchBlogData.js`

Fetches blog posts from Strapi and merges them into `public/blogdata.json`.

**How it works:**
1. Reads `.last-fetch-timestamp` to determine the last successful fetch time
2. If timestamp exists: sends an **incremental** query (`filters[updatedAt][$gte]=...`) to Strapi — only downloads posts changed since last run
3. If no timestamp: performs a **full fetch** of all posts (first run)
4. Merges fetched posts with existing data by `documentId`
5. Only writes to `blogdata.json` if something changed (avoids unnecessary commits)
6. Saves the current timestamp to `.last-fetch-timestamp` for next run

**Key properties:**
- `updatedAt` is used for sorting and filtering (not `createdAt`)
- A 60-second buffer is applied to avoid edge-case misses
- Total posts in Strapi are logged for observability

### `scripts/generateSitemap.js`

Generates `public/sitemap.xml` from all blog posts in `blogdata.json`.

---

## GitHub Actions Workflows

### `fetch-blogdata.yml` — Fetch & Deploy Pipeline

**Triggers:**
| Trigger | Description |
|---|---|
| `schedule: 0 */6 * * *` | Runs every 6 hours as a backup safety net |
| `workflow_dispatch` | Manual trigger via GitHub UI |
| `repository_dispatch` | Webhook trigger (for Strapi webhook integration) |

**Steps:**
1. Checkout repository
2. Run `scripts/fetchBlogData.js` (incremental fetch)
3. Commit `public/blogdata.json` and `.last-fetch-timestamp`
4. Install sitemap package
5. Run `scripts/generateSitemap.js`
6. Commit `public/sitemap.xml`
7. Trigger deployment via repository dispatch (`event-type: trigger-deploy`)

### `deploy.yml` — GitHub Pages Deployment

**Triggers:**
| Trigger | Description |
|---|---|
| `push` to `main` | Deploy on code changes |
| `workflow_dispatch` | Manual deploy |
| `repository_dispatch` with `types: [trigger-deploy]` | Triggered by fetch-blogdata.yml |

**Steps:**
1. Build with `yarn generate --preset github_pages`
2. Upload artifact to GitHub Pages
3. Deploy to `github_pages` environment

---

### Incremental Fetching — Optimization Detail

| Metric | Before | After |
|---|---|---|
| Schedule | Every hour (24/day) | Every 6 hours (4/day) + webhook |
| Fetch method | All posts every time | Only changed posts since last fetch |
| Typical data per run | ~377 posts (full dataset) | ~0-3 posts (incremental) |
| Monthly API calls | ~720 | ~120 (scheduled) + webhook triggers |

The `.last-fetch-timestamp` file is committed to the repo so each workflow run picks up where the last one left off. The first run after deployment will do a full sync; all subsequent runs are incremental.

---

## Strapi Webhook Integration (Optional)

The workflow supports `repository_dispatch` with `types: [strapi-content-updated]`. To enable:

1. In Strapi admin: Settings → Webhooks → Add new webhook
2. URL: `https://api.github.com/repos/nathanfletcher/jfk-website-nuxt/dispatches`
3. Headers: `Authorization: Bearer <your-github-pat>`, `Accept: application/vnd.github.v3+json`
4. Events: `entry.publish`, `entry.update`, `entry.unpublish`

> **Note:** GitHub requires the request body to contain `{"event_type": "strapi-content-updated"}`. If Strapi's webhook config doesn't allow custom body, the request will not trigger the workflow. In that case, the 6-hour backup schedule and frontend API fallback will still serve content correctly.

---

## SEO

- `robots.txt` excludes `/editor` and subpages from search engines
- `public/sitemap.xml` is generated automatically from blog data for search engines
- Each blog post includes canonical tags, robots meta, Open Graph/Twitter meta, and JSON-LD structured data

---

## Customization

- Update contact info in `components/SiteFooter.vue`
- Adjust Tailwind styles in `assets/css/tailwind.css` and `tailwind.config.ts`
- Configure Strapi API URL in `nuxt.config.ts` or via environment variable
- Update site URL for sitemap in `scripts/generateSitemap.js`

---

## Automation & Deployment

- Blog data and sitemap are updated and committed via GitHub Actions
- Deployment is automatically triggered after data/sitemap update
- Designed for static hosting (e.g., GitHub Pages)

---

## Key Files

| File | Purpose |
|---|---|
| `scripts/fetchBlogData.js` | Fetch and merge blog data from Strapi |
| `scripts/generateSitemap.js` | Generate sitemap.xml from blog data |
| `.github/workflows/fetch-blogdata.yml` | Automated fetch + deploy pipeline |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |
| `public/blogdata.json` | Static cached blog data |
| `.last-fetch-timestamp` | Tracks last fetch time for incremental sync |
| `pages/blog/index.vue` | Blog listing with pagination |
| `pages/blog/[id].vue` | Single blog post with API fallback |

---

## License

MIT
