# James Networks (`www.jamesnetworks.net`)

Front site for **James Enterprises** — launch pad for apps, ventures, and AI do-it-with-you partnerships with small and medium businesses.

## Live intent

| Item | Value |
|------|--------|
| Domain | [www.jamesnetworks.net](https://www.jamesnetworks.net) |
| Brand | James Networks (James Enterprises property) |
| Stack | Static HTML / CSS / JS (no build step) |
| Suggested host | Cloudflare Pages (same pattern as APA Captain / Rural Roots) |

## What’s on the page

- **Hero / philosophy** — AI *do it with you* positioning for SMB
- **Ventures** — AI for Missouri + Rural Roots Hub PWA highlight; placeholder slots
- **Apps** — APA Captain live first; placeholder app cards
- **Launch pad** — idea placeholders
- **Contact** — AI for Missouri email + Calendly (James Networks form TBD)

## Local preview

Open `index.html` in a browser, or:

```bash
npx --yes serve .
```

## Deploy (Cloudflare Pages)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect Git
2. Repo: `mrdjames-us/jamesnetworks-net`
3. Production branch: `main`
4. Build command: *(empty)*
5. Build output directory: `/` (repo root)
6. Custom domain: `www.jamesnetworks.net` (and apex if desired)

DNS lives on Squarespace for `jamesnetworks.net` (same zone as `apacaptain.jamesnetworks.net`).

## Related properties

- [aiformissouri.com](https://aiformissouri.com)
- [ruralroots.aiformissouri.com](https://ruralroots.aiformissouri.com)
- [apacaptain.jamesnetworks.net](https://apacaptain.jamesnetworks.net)

## Note

Ignores the older `jamesnetworks-site` repo. This repo (`jamesnetworks-net`) is the source of truth for the front site.
