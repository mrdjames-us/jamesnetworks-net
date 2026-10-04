---
name: jamesnetworks
description: >
  James Networks site (jamesnetworks.net), the Clinton journal. Use for any
  edit, preview, publish, deploy, Cloudflare, GitHub, homepage, crawl, gate,
  journal, MSP door, or "where we left the site" ask. Covers hosting, the
  host split with Henry County Consulting, and the unpublished homepage
  currently in the working copy.
metadata:
  short-description: "jamesnetworks.net hosting and current homepage state"
  user-invocable: false
---

# James Networks

Personal site for David James. Static HTML on Cloudflare Pages. It is **not**
a Grok app and it is **not** hosted on grok.me.

Read this before editing, previewing, or talking about publish.

## Hosting

| Piece | Fact |
|---|---|
| Live URL | https://www.jamesnetworks.net/ |
| Apex | `jamesnetworks.net` is still Squarespace. It 302s to `www`. Pages cannot do that redirect. |
| `www` | Cloudflare, in front of Cloudflare Pages |
| Repo | https://github.com/mrdjames-us/jamesnetworks-net (`main`) |
| Pages project | `jamesnetworks-net` (`wrangler.toml`, `pages_build_output_dir = "."`) |
| What gets deployed | The repo root, as-is. No Vite, no npm build on Pages. |
| Last shipped commit | `2f696ac` — "Fill MSP prompt and skill shelves from the library." (2026-09-28) |

**Grok Publish does not update this domain.** Publish in an App Builder chat
ships that chat's TanStack project to Vercel and a separate `*.grok.me` URL.
The preview in the builder can be this site while Publish still builds the
empty template. The only way onto jamesnetworks.net is a push to `main` that
Pages deploys. Do not push unless David explicitly says to.

The only grok.me page in his mail is AI for Missouri
(`acorn-opal-lotus-jade.grok.me`). That is a different site.

## One Pages project, two hosts

`functions/_middleware.js` is the router. `_redirects` cannot see the hostname.

- `henrycountyconsulting.com` / `www` → root HTML (consulting site).
- `jamesnetworks.net` / `www` → the journal under `journal/`.
- Apex of either host 301s to `www`.
- `/goldenbench` 301s to `/`.

On the journal host, most paths map to `/journal/...` and gain a trailing
slash. These stay on the **repo root**, not under `journal/`:

- `/msp` and `/msp/**` — the playbook ("THE David James — AI for MSPs Playbook"), not `journal/msp/`
- `/assets/**`
- lab apps: `/pool`, `/cipherladder`, `/netnudge`, `/flowscout`, `/mocks`
- `/api/**`

`/rss.xml`, `/sitemap.xml`, `/robots.txt`, `/favicon.ico` map into `journal/`.
`/journal/*.css|js|images` are served as static files. Pretty journal paths
redirect back off the `/journal` prefix (`/journal/work/` → `/work/`).

HCC-only paths (`/services`, `/faq`, `/ai-consulting-clinton-mo`,
`/workflow-automation`) 301 to the consulting host. Lab paths on the consulting
host 301 to jamesnetworks.net.

Unknown paths 404. Do not splat them to the homepage.

## Source of truth

Generated HTML. Edit the inputs, then rebuild. Do not hand-edit `journal/**/index.html` and leave the generator stale.

```bash
node journal/build.mjs
```

- Copy and pages: `journal/content/**/*.md`
- Homepage markup: `renderHome` / `renderHomeDoors` in `journal/build.mjs`
- CSS: `journal/styles.css` (hand-written, not generated)
- Tokens already in that file: iron `#0a0c10`, brass, teal `#2ec4b6`, cream text. Display face Cinzel, body Source Serif 4, UI Inter. Stay inside that. No second visual language.
- Voice: his, short, not a brochure. Keep "brass & bits."

## Where the work is (evening of 2026-10-03, America/Chicago)

**Live site is still the old homepage:** Star Wars crawl, both doors the same `assets/door-vault.jpg`, header is logo-only.

**Not on `main`.** Local working copy only, uncommitted:

- Crawl removed.
- Homepage is a gate. Place line "Clinton, Missouri", title "Built in brass & bits.", one sentence from `journal/content/pages/home.md`: "Using AI the way it was meant to be used."
- Two doors, distinct photos, captions over the image, 3:2, stacked on a phone:
  - Personal portfolio → `/work/` → `assets/gate-built.jpg` (open brass workshop)
  - MSP education → `/msp/` → `assets/gate-msp.jpg` (after-hours shop bench)
- Header on the homepage shows the name and the primary nav again (`logoOnly` is off).
- Files: `journal/build.mjs`, `journal/content/pages/home.md`, `journal/styles.css`, generated `journal/index.html`, plus the two jpgs.
- `preview-server.mjs` at the repo root is also untracked. It is a local stand-in for the journal host. It is not how production is hosted.

A new chat that only clones `main` will get the crawl, not the gate. The gate exists only in a working copy that still has those files. If they are missing, say so. Do not reinvent the crawl.

## Preview

From the repo root, if `preview-server.mjs` is present:

```bash
node preview-server.mjs
```

It listens on `0.0.0.0:8080` and applies the journal-host map, so `/` is the gate, `/work/` is the journal, `/msp/` is the root playbook, and `/journal/styles.css` is the stylesheet.

In the App Builder sandbox, `/workspace/startup.sh` should start that process and leave it up. Do not start the empty TanStack app on 8080 over it. Do not `npm run build` the builder template and call that this site.

If the server file is gone, any static server of the repo root is wrong for `/` unless it also rewrites to `journal/` the way the middleware does. Serving the `journal/` folder as the root breaks asset paths (`/journal/styles.css`, `/assets/...`).

## Continue from here

1. Confirm whether the gate files are in the tree. If yes, preview that. If no, you are on the shipped crawl.
2. Edit `journal/build.mjs`, `home.md`, and `styles.css`. Run `node journal/build.mjs`.
3. Do not point both doors at one image. Do not bring the crawl back unless he asks.
4. Do not push, and do not tell him Publish updated jamesnetworks.net.
5. When he says to ship: commit the gate files and the skill, push `main`, then check https://www.jamesnetworks.net/ for the gate instead of the crawl. Pages deploys the repo root. No Wrangler command is required if the GitHub connection is already live.
