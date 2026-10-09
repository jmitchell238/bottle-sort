# Bottle Sort

A neon water-sort puzzle. Pour liquids between bottles until each one holds a single color.

Play at https://jmitchell238.github.io/bottle-sort/

You can install it as an app from the browser (Add to Home Screen on iPhone and iPad).

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

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for running it locally, tests and versioning, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organized.
