# Architecture

Plain HTML, CSS and canvas with no build step. The scripts are plain `<script>` tags that share global scope, loaded in this order from `index.html`.

## Files

| File | Contents |
|------|----------|
| `js/config.js` | `GAME_VERSION`, bottle capacity, color palettes, color modes (`resolveVisualMode()`), level difficulty (`levelSpec()`) |
| `js/save.js` | Progress and settings in localStorage |
| `js/audio.js` | Sound effects |
| `js/particles.js` | Sparks, splashes, rings, confetti |
| `js/level.js` | Pure puzzle rules: what can pour where, how much, when a bottle or level is solved, and scrambling a solved board into a new level |
| `js/game.js` | Game state (`menu`, `play`, `win`): starting levels, tapping bottles, undo, effects |
| `js/render.js` | Canvas sizing and drawing the bottles, liquid, pour stream and HUD |
| `js/main.js` | Screens, the frame loop, input, the color mode picker, service worker registration |
| `sw.js`, `manifest.webmanifest` | Offline cache and PWA install |
| `tests/run.mjs` | Test runner |

## Updates

`js/main.js` registers `sw.js` and checks for updates two ways:

- It calls `registration.update()` on load, when the tab regains focus, and every minute. A new service worker takes over as soon as it installs.
- Every two minutes, and whenever the tab becomes visible, it fetches `js/config.js` with caching disabled and compares `GAME_VERSION`.

Either way, the page reloads to pick up the new version, but not in the middle of a level. A pending reload happens at the next menu or win screen.
