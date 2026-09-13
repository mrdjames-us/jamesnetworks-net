# MSP libraries

Markdown in these folders becomes HTML on rebuild. No CMS.

| Folder | Public URL | What belongs here |
|---|---|---|
| `videos/` | `/msp/videos/` | Short YouTube-backed how-tos |
| `prompts/` | `/msp/prompts/` | Reusable prompts |
| `skills/` | `/msp/skills/` | Packaged skills / playbooks |

**Channel URL (one value):** `youtubeChannelUrl` in `config.json`.
Paste a channel URL (`https://www.youtube.com/@yourhandle`). Leave it blank until the channel exists — the public page will not show a broken link.

Skip files named `README.md` and anything starting with `_` or `.`.
Copy `_sample.md` in a folder, drop the underscore, fill the frontmatter, rebuild.

```bash
node journal/build.mjs
```

`draft: true` keeps an entry off the public site.
