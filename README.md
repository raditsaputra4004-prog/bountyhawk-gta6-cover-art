# bountyhawk-gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/raditsaputra4004-prog/bountyhawk-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/raditsaputra4004-prog/bountyhawk-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Golden Hour Cover Studio — a web app that turns your own photos and a caption into GTA 6-style multi-panel cover art, exported as a PNG. Pick a layout (Triptych, Hero + Strip, or Quad 2×2), fill the panels with your photos, drag to pan and zoom each one, grade it sunset, neon, vivid or mono, set a bold poster caption, then export at 1080×1080, 1080×1350 or 1920×1080. Everything runs offline in the browser: photos are read on your own machine and never uploaded. All artwork is original — the two bundled samples are code-drawn illustrations, and the caption font is DejaVu Sans Bold (Bitstream Vera license, included under app/fonts/).

## Run it

```sh
python3 -m http.server 8080 --directory app
```

Then open http://localhost:8080 in a desktop browser. Or simply open `app/index.html` directly.

## How it works

- **Layouts** — Triptych (3 panels), Hero + Strip (one large panel plus a strip), Quad 2×2 (4 panels).
- **Photos** — load your own images from disk, or use the bundled sunset-skyline and neon-street samples. Each panel pans by dragging and zooms 1–3×.
- **Grades** — sunset, neon, vivid, mono, or the original photo, applied per cover.
- **Caption** — bold outlined poster lettering with text, size, position and style controls, plus a sunset-glow slider, vignette and film-grain toggles.
- **Export** — one click writes a PNG at 1080×1080, 1080×1350 or 1920×1080.

## Layout

- `app/index.html` — the editor page.
- `app/styles.css` — editor styling.
- `app/src/state.js` — the cover's state (layout, panels, caption, grades, effects).
- `app/src/photos.js` — loading photos from disk and the bundled samples.
- `app/src/render.js` — drawing panels, grades and caption onto a canvas.
- `app/src/export.js` — exporting the finished cover as a PNG.
- `app/src/ui.js` — the editor controls and their events.
- `app/src/boot.js` — wiring the app together on load.
- `app/fonts/` — DejaVu Sans Bold (Bitstream Vera license) for the caption.
- `app/samples/` — two code-drawn sample illustrations.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2yq7mcmp&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
