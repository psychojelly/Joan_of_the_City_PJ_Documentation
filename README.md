# Joan of the City — Design & Tech Documentation

The documentation site for **Joan of the City**, an augmented-reality opera built in
Unity (`6000.0.26f1`) for XR glasses. It is a static site — plain HTML, CSS, and a
little JavaScript. No build step, no dependencies.

## Pages

| Page | File | Sub-sections |
|------|------|--------------|
| Story Overview | `index.html` | Story · Pillars · The Movements |
| System Overview | `system-overview.html` | Architecture · Systems · Events · Data flow · Layout |
| Brain PC & Glasses | `brain-pc.html` | Two halves · Topology · Data flows · Current · Open questions · Verifying |
| How It Works & Recs | `how-it-works.html` | Plain-English breakdown · Wi-Fi · Optimization · Monitoring |
| System Set Up | `system-setup.html` | Prerequisites · Running a Local Test · Larger System Set Up |
| Cues | `cues.html` | Overview · Editing & Cueing System |
| Audio Sync Design (WIP) | `sync-design.html` | Problem · Three layers · Delivery/mobility · Build order |
| Design Style Guide | `design-style-guide.html` | Principles · Color · Typography · Motion · Spatial/AR UX · Review |
| Assets Documentation | `assets.html` | Pipeline · Formats · Naming · Visual language |
| Opera Terminology | `terminology.html` | Text & Score · Solo Forms · Ensemble · Structure · Voices · In Joan |
| Bridging Dev & Show Design | `bridging.html` | Why · Translation table · Overloaded words · Lifecycle · Hand-offs · Gotchas |
| Resources | `resources.html` | Glossary · Contributing · Tools · Contacts |

Shared across every page:

- `styles.css` — all styling, including the light/dark theme.
- `sidebar.js` — single source of truth for the left navigation, the right-hand
  table of contents, scroll-spy, search, prev/next links, and the theme toggle.

## Run locally

It's a static site, so just open `index.html` in a browser. For clean relative
paths you can also serve it:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Editing

- **Navigation** lives in the `NAV` array at the top of `sidebar.js`. Edit it once
  and every page updates. Each page's sub-sections are the `children` entries and
  must match the `id` of a `<section>` on that page.
- **Content** is plain HTML inside `<main class="main">` on each page. Reuse the
  existing components: `.callout`, `.card-grid`, `.steps`, `.badge`, tables, and
  `<pre><code>` blocks.
- **Theme** colours are CSS variables in `styles.css` (`:root` for dark,
  `:root[data-theme="light"]` for light).

## Deployment

### GitHub Pages (configured)

`.github/workflows/deploy.yml` deploys the repo root to GitHub Pages on every push
to `main`. To enable it once:

1. Push to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. The next push to `main` publishes the site; the live URL appears in the
   workflow run and on the Pages settings screen.

### Vercel (alternative)

`vercel.json` is included for a zero-config static deploy. Import the repo at
[vercel.com/new](https://vercel.com/new) — no framework, no build command, output
directory is the repo root.

---

© Psychojelly · Living document.
