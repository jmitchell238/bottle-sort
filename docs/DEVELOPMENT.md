# Development

## Running locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Tests

```bash
node tests/run.mjs
```

## Versioning

`GAME_VERSION` in `js/config.js` is `MAJOR.MINOR.PATCH` with a three-digit patch. When you bump it, set `CACHE` in `sw.js` to `'bottle-sort-' + GAME_VERSION`. The version shows in the corner, on the menu and on the win screen.
