# Recording MSP how-tos on Windows (OBS)

Practical setup for ~2 minute clips. Two modes, one hotkey to switch, optional flare between them.

- **Mode A — Talking Head:** you, full-screen
- **Mode B — Desktop + PiP:** the screen, your face in a corner

Stack: **OBS Studio** (free, obsproject.com). It is the right tool. Do not pay for a switcher until this is boring.

This is a playbook, not code. OBS scene-collection JSON is version-fragile; type the transforms below once and save the collection as `MSP How-tos`.

---

## 1. Two canvases (do not mix them)

| Job | OBS canvas | YouTube |
|---|---|---|
| Desktop how-to (Mode B) | **1920×1080** (16:9) | Regular upload |
| Talking-head Short | **1080×1920** (9:16) | Shorts (≤ 3 min, vertical) |

Mode B is a 16:9 format. Cropping a desktop to 9:16 looks like a postage stamp. Record desktop how-tos wide. Record talking-head tips vertical if you want the Shorts shelf.

Duplicate the scene collection for Shorts (`MSP How-tos` and `MSP Shorts`). Switching canvas size inside one collection is a headache.

~2 minutes is fine for both. Shorts allow up to 3 minutes (vertical or square). A 2-minute **16:9** file is a normal video, not a Short.

---

## 2. Install and first-run

1. Install [OBS Studio](https://obsproject.com/).
2. First-run wizard: **Optimize just for recording**, 1080p, 30 fps.
3. Settings → **Output** (Simple mode is enough):
   - Recording Quality: **High Quality, Medium File Size**
   - Recording Format: **mkv** (crash-safe), remux to mp4 after: File → Remux Recordings
   - Encoder: **NVENC** if NVIDIA, **AMD AMF** if AMD, else **x264** (preset veryfast)
4. Settings → **Video**:
   - Base (Canvas) Resolution: `1920x1080`
   - Output Resolution: `1920x1080`
   - FPS: `30`
5. Settings → **Audio**: Mic/Auxiliary = the headset or USB mic you actually use. Disable desktop audio if you do not want Windows pings in the take.

Save scene collection: **Scene Collection → New → `MSP How-tos`**.

---

## 3. Scenes

You need two scenes. A third “Transition” scene is optional; the flare lives on the **transition**, not on a scene.

### Scene: Talking Head

Sources (bottom → top):

1. **Color Source** named `Head BG` — dark (`#0a0c10`) so a camera glitch never shows the desktop.
2. **Video Capture Device** named `Cam` — your webcam.
   - Right-click Cam → **Transform → Edit Transform**
   - Bounding Box Type: **Scale to inner bounds** (crop to fill)
   - Size: `1920` × `1080`
   - Position: `0`, `0`
   - Crop a little off the sides if the lens is too wide. Eyes on the upper third. Shoulders in. Not a lot of ceiling.

Optional: Filters on `Cam` → Color Correction (lift shadows a hair). Skip beauty plugins.

### Scene: Desktop + PiP

Sources (bottom → top):

1. **Display Capture** named `Desktop` — the monitor you demo on.
   - Capture Method: **Windows 10 (1903 and later)** if available.
   - Hide the OBS window (OBS does this by default on Display Capture).
2. **Color Source** named `PiP matte` — brass/dark frame behind the camera.
   - Size: `416` × `242` (8px border around a 400×225 cam)
   - Position: **`1480`, `805`**
3. **Video Capture Device** named `PiP Cam` — same webcam as Talking Head (OBS allows the device on two scenes).
   - Transform size: `400` × `225` (16:9, ~21% of canvas width)
   - Position: **`1488`, `813`**
   - That is **32px** from the right edge, **42px** from the bottom — enough margin that Start/taskbar chrome is not under your chin, and enough that a toast in the corner does not cover your eyes.

If the cam is a different aspect, keep **width 400**, let height follow 16:9. Do not cover:

- notification corner (you just left 32px; also turn Focus Assist on)
- the thing you are clicking (keep demos left and center)
- Windows taskbar (auto-hide it while recording)

Right-click `PiP Cam` → **Transform → Edit Transform** → Bounding Box: **Scale to inner bounds**.

### Optional scene: Flare Hold

Only if you want to *linger* on the leak instead of switching A→B in one hit. A **Color Source** plus a **Media Source** playing a light-leak webm, looping off. Most takes will not need this. Use a stinger instead (next section).

---

## 4. Switch A ↔ B mid-take (hotkeys)

Settings → **Hotkeys** → find each scene:

| Action | Hotkey |
|---|---|
| Switch to scene **Talking Head** | `F8` |
| Switch to scene **Desktop + PiP** | `F9` |
| Start Recording | `F10` |
| Stop Recording | `F11` |

Avoid keys you type while demoing (letters, Ctrl+C, Win). Function keys stay out of the way. NumPad 1 / 2 is fine if you never use the numpad in the demo.

**Studio Mode: off.** Studio Mode is a preview/program switcher. You want the hotkey to cut (or flare) immediately.

Practice once without recording: F8, talk, F9, click around, F8. Watch that the PiP does not cover the UI you need.

---

## 5. Flare vs cut vs fade

The transition is global. Whatever is selected in the scene-transition dropdown is what F8/F9 play.

### Cut (zero cost)

Dropdown: **Cut**. Hard cut on the hotkey. Use this when you stop talking at the switch (“and here’s the screen”). Clean. No file to hunt.

### Fade (free, usually enough)

Dropdown: **Fade**. Click the gear → Duration **250 ms** (200–300). Smooth enough that a mid-sentence switch does not pop. This is the default I would ship with.

### Stinger / light-leak (the “flare”)

Dropdown: **Stinger**. This is OBS’s free flare. You need a short video file (webm or mov) with a bright leak / film-flash that covers the frame around the midpoint.

1. Drop the file in `%AppData%\obs-studio\stingers\flare.webm` (create the folder).
2. Scene Transition → **Stinger** → gear:
   - Video File: that webm
   - **Transition Point:** ~halfway through the file (if the file is 20 frames at 30 fps, try **330 ms**)
   - Audio Monitoring: **Monitor Off** (unless the stinger has a whoosh you want)
   - Check **Use audio from stinger** only if you want that whoosh
   - Prefetch: on
3. Select **Stinger** as the current transition. F8/F9 now flare A ↔ B.

Where to get a leak: search “light leak overlay webm transparent” on Mixkit / Pixabay / OBS Resources. Prefer a file with an alpha channel. A 0.6–1.0s clip is plenty. You do **not** need a third scene.

If the stinger file is missing, fall back to Fade. Do not stall recording for a prettier wipe.

---

## 6. Export

Remux mkv → mp4 in OBS (File → Remux Recordings). Upload the mp4.

### 16:9 how-to (desktop + PiP)

- 1920×1080, 30 fps, H.264, AAC
- YouTube: upload as a normal video
- Title like the markdown `title`; first line of the description = the site blurb
- End screen optional later; skip it on v1

### YouTube Shorts (talking head)

- Duplicate collection, canvas **1080×1920**, 30 fps
- Talking Head cam: bounding box fill, 1080×1920
- Skip Desktop + PiP on this collection (or crop a single window into the upper 60% and park PiP at the bottom — only if you really need it)
- Length ≤ 3 minutes, taller than wide
- YouTube classifies Shorts from **aspect + duration**. A 2-minute 16:9 file will not become a Short.

Bitrate: Simple “High Quality” is enough. If you switch to Advanced: 8–12 Mbps CBR for 1080p30, audio 160–192 kbps AAC.

---

## 7. Checklist (before F10)

**Room**

- [ ] Key light 45° off your face, or a window. Avoid overhead-only (raccoon eyes).
- [ ] Nothing bright directly behind your head.
- [ ] Phone on silent; other monitors off or dim.

**Windows**

- [ ] Auto-hide taskbar (Settings → Personalization → Taskbar).
- [ ] Focus Assist / Do not disturb **on**.
- [ ] Notifications: clock, Teams, Slack, Outlook, OneDrive — quiet.
- [ ] Browser: one window, bookmarks bar off, the demo already logged in.
- [ ] OBS, camera app, and Teams cannot share the webcam at once. Close the others.

**Cam / mic**

- [ ] 1080p camera mode if the driver allows it.
- [ ] Mic is the headset/USB you tested, not the laptop array.
- [ ] Windows sound: that mic is default, levels ~-12 dB talking, never clipping.
- [ ] Talking Head framing: eyes on the upper third.
- [ ] PiP: bottom-right, 400×225, 32px right / ~42px bottom, UI you will click is **not** in that corner.

**OBS**

- [ ] Collection `MSP How-tos`, canvas 1920×1080.
- [ ] Scenes **Talking Head** and **Desktop + PiP** both preview correctly.
- [ ] Transition = Fade 250ms (or Stinger if the file is in place).
- [ ] Hotkeys F8 / F9 / F10 / F11 work with OBS in the background (Settings → Hotkeys: “Never disable hotkeys” if a game/app steals them).
- [ ] Disk has space. Record to a local SSD, not OneDrive.

**Take**

- [ ] F10, wait one beat, talk.
- [ ] F8 talking head → F9 desktop when you show the thing → F8 to close.
- [ ] Stop on F11. Watch the file once. If the PiP covered a button, move the button next time, not the essay.

---

## 8. Put it on the site

1. Upload to YouTube (unlisted is fine until you like it).
2. Copy `journal/content/msp/videos/_sample.md` to `short-name.md`.
3. Paste the watch or Shorts URL into `youtube:`.
4. `node journal/build.mjs`
5. PR + demo. No prod until you say so.

Channel URL is `journal/content/msp/config.json` → `youtubeChannelUrl`. One field.

---

## Transform cheat sheet (1920×1080)

```
Talking Head / Cam
  position  0, 0
  size      1920 x 1080

Desktop + PiP / PiP matte
  position  1480, 805
  size      416 x 242

Desktop + PiP / PiP Cam
  position  1488, 813
  size      400 x 225
```

For a **Shorts** canvas (1080×1920), put PiP at the **bottom-center** instead of the corner so thumbs do not hide it:

```
PiP Cam   size  360 x 202
          position  360, 1680    (30px side margins, 38px off the bottom)
```
