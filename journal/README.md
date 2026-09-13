# Personal journal (jamesnetworks.net)

David James — notes from Clinton, Missouri.

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
| `/rss.xml` | Feed |

Lab apps (`/pool`, `/flowscout`, `/netnudge`, `/cipherladder`) still live on this host.
