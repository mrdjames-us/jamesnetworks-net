# MSP videos

Each `.md` file here is one card on `/msp/videos/` plus a detail page.

## Add a video

1. Copy `_sample.md` to `short-name.md` (no leading underscore).
2. Fill `title`, `summary`, and `youtube` (watch URL, shorts URL, or 11-character id).
3. Optional: `duration`, `tags`, `thumb` (local image path), `date`.
4. Rebuild: `node journal/build.mjs`

YouTube thumbnails are used unless `thumb` is set.
The index does **not** embed or autoplay. Detail pages use a click-to-play `youtube-nocookie` iframe after a click.

Channel link comes from `../config.json` → `youtubeChannelUrl`.
