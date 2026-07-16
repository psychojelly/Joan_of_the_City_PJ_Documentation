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
| Audio Sync & Debug Mode | `sync-design.html` | Problem · Three layers · Delivery/mobility · Build order · Debug mode (return path, roster, HUD, test tone, mute) |
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

### Vercel (alternative — required for the docs chat)

`vercel.json` is included. Import the repo at [vercel.com/new](https://vercel.com/new)
— no framework needed; the configured build command just regenerates the chat
knowledge base.

## Docs chat assistant

Every page has a floating 💬 button — a Claude-backed assistant that answers
questions **from this documentation only**. The pieces:

- `chat.js` — the widget (injected on every page by `sidebar.js`)
- `api/chat.js` — Vercel serverless function that calls the Claude API
  (streaming, prompt-cached, rate-limited 10 req/min/IP)
- `api/_docs-context.json` — the knowledge base, generated from the HTML pages
  by `scripts/build-context.mjs`. Re-run it after editing pages
  (`npm run build:context`); Vercel also regenerates it on every deploy.

**Setup (once, on Vercel):**

1. Import the repo on Vercel.
2. Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY`
   (create one at [platform.claude.com](https://platform.claude.com)).
3. Optional: `CHAT_PASSCODE` — a shared passphrase visitors must enter once
   (use this if the site is client-shared but you don't want the whole
   internet spending your tokens). Optional: `CHAT_MODEL` — defaults to
   `claude-opus-4-8`; set `claude-haiku-4-5` for lower cost.

**Knowledge tiers:** everyone gets the public site pages. When `CHAT_PASSCODE`
is set, entering it unlocks the **team tier** — the assistant additionally
loads the engineering docs (`AUDIO-SYNC-HANDOFF.md`, `DEBUG-MODE.md`, the
unity-patch README + test report) live from the cue-controller repo on
GitHub (refetched ~15 min, so it stays current with no redeploys), and can
discuss protocols, handoffs, and test results in depth. The public tier never
sees those. To also index private repos, add a read-only `GITHUB_TOKEN` env
var and list the files in `TEAM_SOURCES` in `api/chat.js`.

**Who pays — two modes** (visitors switch via the widget's "⚙ key" button):

- **Site key** (default): answers are billed to the `ANTHROPIC_API_KEY` set on
  Vercel. Gate it with `CHAT_PASSCODE` so only the team/client can use it.
- **Bring-your-own-key**: a visitor pastes *their own* Anthropic API key; it's
  stored only in their browser and their questions go directly from their
  browser to Anthropic — nothing is billed to Psychojelly, and this mode even
  works on the GitHub Pages mirror (no server involved). The knowledge base
  for this mode is the public `docs-context.json` at the site root.

Message contracts and other internal details are deliberately excluded from
the knowledge base (they're not in the public pages it's built from).

---

© Psychojelly · Living document.
