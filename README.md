# Bottle Sort

A neon water-sort puzzle. Pour liquids between bottles until each one holds a single color.

Play at https://jmitchell238.github.io/bottle-sort/

## Controls

| Input | Action |
|-------|--------|
| Tap a bottle, then another | Pour from the first into the second |
| 1–9 | Select a bottle by position |
| ↩ / Z / U | Undo |
| ↻ / R | Restart the level |
| Esc | Menu |

## Rules

- Each bottle holds 4 units.
- You can only pour onto the same color, or into an empty bottle.
- The whole run of the top color pours at once, as much as fits.
- You win when every bottle is either empty or a single solid color.

## Color modes

Pick one from the menu:

- Auto (the default): Classic on most levels, with the occasional Shape Help or Neon Mix level
- Classic: solid crayon colors
- Shapes: each color also has an icon, which helps younger players
- Neon: a glowing palette

## Running locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

Plain HTML, CSS and canvas. Installable as a PWA, and progress is saved in localStorage.

## Tests

```bash
node tests/run.mjs
```

## Versioning

`GAME_VERSION` in `js/config.js` is `MAJOR.MINOR.PATCH` with a three-digit patch. When you bump it, set `CACHE` in `sw.js` to `'bottle-sort-' + GAME_VERSION`.

The version shows in the corner, on the menu and on the win screen. Installed copies check the live `js/config.js` for a newer version and reload, but not in the middle of a level.
