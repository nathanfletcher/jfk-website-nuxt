# JFK Personal Blog (Nuxt.js + Strapi + Static Fallback)

A robust, mobile-friendly personal blog built with Nuxt.js, featuring a WYSIWYG editor, Strapi CMS integration, and static JSON fallback for resilience against API downtime or cold starts. Includes a modern UI, advanced SEO, and a GitHub Actions workflow for automated static data, sitemap updates, and deployment.

---

## Features

- **Nuxt.js 3** with Tailwind CSS for a modern, responsive UI
- **Strapi CMS** integration for blog post management (API URL configurable)
- **Static fallback**: Uses `public/blogdata.json` if Strapi API is slow/unavailable
- **Mobile-optimized WYSIWYG editor** (CKEditor 5, dynamic import)
- **Autosave drafts** to localStorage with indicator
- **SEO**: robots.txt, dynamic sitemap.xml, canonical tags, meta tags, and JSON-LD structured data
- **Sitewide footer** with current year and contact info
- **GitHub Actions**: fetches/merges Strapi posts to `blogdata.json` hourly, generates and commits `sitemap.xml`, and triggers deployment
- **Resilient editor UX**: login modal, cold start warning, grouped actions, modals
- **Markdown rendering** with WhatsApp-style conversion
- **Global fallback**: blogdata is set on `window` for all blog pages

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

- `STRAPI_API_URL` (optional): Set your Strapi API base URL. Defaults to demo instance.

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

## Static Fallback & Data Sync

- If Strapi API is unavailable, blog pages load from `public/blogdata.json`.
- `scripts/fetchBlogData.js` fetches all posts (with pagination) from Strapi and merges with existing static data.
- `.github/workflows/fetch-blogdata.yml` runs the script hourly, auto-commits updates, generates `sitemap.xml`, and triggers deployment.

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

## License

MIT
