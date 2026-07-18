# Bottle Sort

Neon water-sort puzzle — pour glowing liquids until every bottle is a solid color.

**Play:** https://jmitchell238.github.io/bottle-sort/

## Controls

| Input | Action |
|-------|--------|
| Tap bottle → tap another | Select & pour |
| ↩ / Z / U | Undo |
| ↻ / R | Restart level |
| Esc | Menu |
| 1–9 | Select bottle by index |

## Rules

- Bottles hold **4** units of liquid.
- Pour only onto the **same top color**, or into an **empty** bottle.
- Whole top runs of a color pour at once (as much as fits).
- Win when every bottle is empty or filled with one solid color.
- **Color modes** (menu): Auto · Classic · Shapes · Neon  
  - Classic = bold crayon solids (default everyday look)  
  - Shapes = icons for helper play  
  - Neon = glow palette variety  
  - Auto = classic most levels; occasional Shape Help / Neon Mix specials  
- **FX** — pour sparks, splash, bottle-complete rings, screen shake, win confetti.

## Stack

Static HTML/CSS/Canvas. Installable PWA (`manifest` + service worker). Progress in `localStorage`.

## Versioning

Same scheme as Drop & Fuse / VoidRush:

- `GAME_VERSION` in `js/config.js` — `MAJOR.MINOR.PATCH` (patch zero-padded to 3 digits)
- UI shows `Bottle Sort v…` (corner tag + menu / win lines)
- Keep `CACHE` in `sw.js` in sync: `'bottle-sort-' + GAME_VERSION`
- SW + remote `config.js` version check auto-reload when not mid-game

## Tests

```bash
node tests/run.mjs
```

## Local

```bash
python3 -m http.server 8080
```
