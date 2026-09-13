# Personal journal (jamesnetworks.net)

David James â€” notes from Clinton, Missouri.

**This folder IS the blog** for jamesnetworks.net (Latest on the home page, Writing archive). Not a separate product or subdomain.

Henry County Consulting stays on `henrycountyconsulting.com`. This folder is the
personal site. Host-aware middleware in `functions/_middleware.js` serves it on
`jamesnetworks.net` / `www.jamesnetworks.net`.

## Write a post

1. Add `journal/content/posts/YYYY-MM-DD-slug.md` with frontmatter.

   Every weekly post **must** highlight one hosted build (`build` + `build_url`).
   The build script will refuse to run without them.

   ```md
   ---
   title: The title
   date: 2026-09-20
   summary: One or two sentences for the index and RSS.
   build: APA Captain
   build_url: https://apacaptain.jamesnetworks.net/
   build_note: Optional one-liner. Pulled from the shelf if omitted.
   ---

   Markdown body.
   ```

2. Rebuild:

   ```bash
   node journal/build.mjs
   ```

3. Deploy (demo first):

   ```powershell
   .\deploy-demo.ps1
   ```

   Preview the journal on demo as `https://jamesnetworks-net-demo.pages.dev/?site=journal`

   Production (after looking at demo):

   ```powershell
   .\deploy-prod.ps1
   ```

Pages (`about`, `now`, `work`, `privacy`) live in `journal/content/pages/`.

Generated HTML is committed so Cloudflare Pages can deploy with no build step.
Always run `node journal/build.mjs` before deploy.

## Public URLs (on jamesnetworks.net)

| Path | What |
|---|---|
| `/` | Home + latest |
| `/writing/` | Archive |
| `/writing/<slug>/` | A post |
| `/about/` `/now/` `/work/` `/privacy/` | Pages |
| `/msp/` | MSP education hub |
| `/msp/prompts/` `/msp/skills/` `/msp/videos/` | Libraries |
| `/rss.xml` | Feed |

Lab apps (`/pool`, `/flowscout`, `/netnudge`, `/cipherladder`) still live on this host.

## Posting / updating (Grok Bot or human)

Keep this stack. No CMS. No blog subdomain.

1. Add `journal/content/posts/YYYY-MM-DD-slug.md` with frontmatter (`title`, `date`, `summary`, `build`, `build_url` required).
2. Run `node journal/build.mjs` (refuses posts missing a hosted build).
3. Open a PR on `jamesnetworks-net` â€” do not push straight to main.
4. Maker deploys demo (`.\deploy-demo.ps1`), then prod (`.\deploy-prod.ps1`) only after CoS / David OK.

Optional automation later: a Grok Bot skill that writes the markdown + opens the PR. Human approval still gates merge and deploy.

## MSP vs personal

- Home doors: Personal Portfolio → `/work/`, MSP Education → `/msp/`.
- Built shelf (`content/built.json` `personal`) stays on `/work/`. Do not move HCC / FlowScout / lab apps onto MSP.
- `/msp/` — education hub with cards into prompts, skills, videos, and MSP writing.
- `/msp/prompts/`, `/msp/skills/`, `/msp/videos/` — libraries from `content/msp/{prompts,skills,videos}/*.md`.
- `/writing/msp/` — posts with `section: msp` (or files under `content/posts/msp/`). Empty until a real post lands.
- Email intake (CoS): `[JN MSP POST]` → MSP post; `[JN MSP PAGE]` → `msp.md` / msp cards.

### Add an MSP library entry

Copy `content/msp/<library>/_sample.md` to `short-name.md` (drop the underscore), fill frontmatter, rebuild.

**YouTube channel URL (one value):** `content/msp/config.json` → `youtubeChannelUrl`.

Videos need a `youtube` field (watch URL, Shorts URL, or 11-character id). Index cards never autoplay. Detail pages use a click-to-play `youtube-nocookie` embed after a click.

Recording playbook (OBS, talking-head ↔ desktop PiP, flare): `docs/msp-recording-obs.md`.
