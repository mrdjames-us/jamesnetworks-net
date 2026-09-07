# Henry County Consulting (`henrycountyconsulting.com`)

**AI-first consulting** for workflows, agents, and automations — led by David James in Henry County / Clinton, Missouri.

Short brand: **HCC**. Method: **Assess → Simplify → Automate → Train** (do-it-with-you).

## Positioning

| Item | Value |
|------|--------|
| Brand | Henry County Consulting (HCC) |
| Domain | henrycountyconsulting.com (also served via jamesnetworks.net Pages) |
| Offer | AI consulting — process assessment, agents/automations, team training |
| Who | David James · 30 years IT · MSP Dir of Ops background |
| Geography | Henry County / Clinton / west-central Missouri |
| CTA | [calendly.com/david-p-james/30min](https://calendly.com/david-p-james/30min) |
| Contact | david@henrycountyconsulting.com |
| Stack | Static HTML / CSS / JS (no build step) |
| Host | Cloudflare Pages project `jamesnetworks-net` |

Adjacent side doors (footer): AI for Missouri, NetNudge, FlowScout, Pool Hub (league scoring apps).

## Local preview

From this folder:

```bash
npx --yes serve .
```

Or open `index.html` directly in a browser.

## Deploy (Cloudflare Pages)

Static site — `wrangler.toml` sets `pages_build_output_dir = "."`.

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "180f457e46d097180035f855959ee95a"
npx wrangler pages deploy . --project-name=jamesnetworks-net --branch=main --commit-dirty=true
```

## Key files

- `index.html` — consulting homepage
- `ai-consulting-clinton-mo/`, `services/`, `workflow-automation/`, `about/`, `faq/`, `privacy/` — unique HTML pages
- `404.html` — real 404s (kills Cloudflare Pages SPA fallback)
- `functions/_middleware.js` — apex → www on HCC; lab apps 301 off the HCC host
- `robots.txt` / `sitemap.xml` — this host only
- `styles.css` / `script.js`
- `assets/hcc-mark.png` — logo / favicon on this domain
