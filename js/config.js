'use strict';
// Bottle Sort — tuning knobs

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Shown in the UI as "Bottle Sort vMAJOR.MINOR.PPP" (patch zero-padded to 3 digits).
// Keep CACHE in sw.js in sync: 'bottle-sort-' + GAME_VERSION
const GAME_VERSION = '1.2.001';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Bottle Sort';

// Logical stage size (letterboxed to fit screen)
const W = 390;
const H = 700;

// Bottle capacity (units of liquid per bottle)
const CAPACITY = 4;

/**
 * Super-distinct “crayon” palette for normal play.
 * Ordered so early levels only get the easiest primaries.
 * Hue + lightness are pushed apart so kids can tell them without icons.
 * shapes kept for Shape-Help special levels only.
 */
const PALETTE_BOLD = [
  { id: 0,  color: '#FF1744', glow: '#FF5252', label: 'Red',     shape: 'circle',   outline: '#B71C1C' },
  { id: 1,  color: '#1565C0', glow: '#1E88E5', label: 'Blue',    shape: 'square',   outline: '#0D47A1' },
  { id: 2,  color: '#00C853', glow: '#69F0AE', label: 'Green',   shape: 'triangle', outline: '#1B5E20' },
  { id: 3,  color: '#FFD600', glow: '#FFEA00', label: 'Yellow',  shape: 'star',     outline: '#F9A825' },
  { id: 4,  color: '#FF6D00', glow: '#FF9100', label: 'Orange',  shape: 'heart',    outline: '#E65100' },
  { id: 5,  color: '#AA00FF', glow: '#E040FB', label: 'Purple',  shape: 'diamond',  outline: '#4A148C' },
  { id: 6,  color: '#FF80AB', glow: '#F8BBD0', label: 'Pink',    shape: 'moon',     outline: '#C2185B' },
  { id: 7,  color: '#00B8D4', glow: '#18FFFF', label: 'Cyan',    shape: 'plus',     outline: '#006064' },
  { id: 8,  color: '#5D4037', glow: '#8D6E63', label: 'Brown',   shape: 'bar',      outline: '#3E2723' },
  { id: 9,  color: '#FAFAFA', glow: '#FFFFFF', label: 'White',   shape: 'ring',     outline: '#424242' },
  { id: 10, color: '#212121', glow: '#616161', label: 'Black',   shape: 'x',        outline: '#000000' },
  { id: 11, color: '#FF00E5', glow: '#FF4CF0', label: 'Magenta', shape: 'hex',      outline: '#9C006E' },
];

/**
 * Neon variety palette — used only on special “Neon Mix” levels.
 * Still spaced far apart (no mint/cyan twins).
 */
const PALETTE_NEON = [
  { id: 0,  color: '#FF2D55', glow: '#FF5E7A', label: 'Neon Red',   shape: 'circle',   outline: '#99001F' },
  { id: 1,  color: '#0A84FF', glow: '#5AC8FF', label: 'Neon Blue',  shape: 'square',   outline: '#003D99' },
  { id: 2,  color: '#32D74B', glow: '#30DB5B', label: 'Neon Green', shape: 'triangle', outline: '#0B7A1B' },
  { id: 3,  color: '#FFD60A', glow: '#FFE566', label: 'Neon Gold',  shape: 'star',     outline: '#B88600' },
  { id: 4,  color: '#FF9F0A', glow: '#FFB340', label: 'Neon Orange',shape: 'heart',    outline: '#A35A00' },
  { id: 5,  color: '#BF5AF2', glow: '#DA8FFF', label: 'Neon Violet',shape: 'diamond',  outline: '#5B1A8A' },
  { id: 6,  color: '#FF375F', glow: '#FF6B8A', label: 'Neon Rose',  shape: 'moon',     outline: '#8B1030' },
  { id: 7,  color: '#64D2FF', glow: '#9AE2FF', label: 'Neon Ice',   shape: 'plus',     outline: '#0A5A80' },
  { id: 8,  color: '#AC8E68', glow: '#C9B396', label: 'Neon Sand',  shape: 'bar',      outline: '#5C4A30' },
  { id: 9,  color: '#F2F2F7', glow: '#FFFFFF', label: 'Neon White', shape: 'ring',     outline: '#555555' },
  { id: 10, color: '#1C1C1E', glow: '#3A3A3C', label: 'Neon Black', shape: 'x',        outline: '#000000' },
  { id: 11, color: '#FF2D95', glow: '#FF6AB5', label: 'Neon Pink',  shape: 'hex',      outline: '#8B0050' },
];

// Default export name used by older code / tests
const COLORS = PALETTE_BOLD;
const MAX_COLORS = PALETTE_BOLD.length;

// Visual preference options (saved)
//  auto    — classic usually; special Shape Help / Neon Mix levels appear
//  classic — always bold solids, no icons
//  shapes  — always shape badges (kid assist)
//  neon    — always neon palette, no icons
const VISUAL_PREFS = ['auto', 'classic', 'shapes', 'neon'];

/**
 * Pick the visual package for a level given user preference.
 * Returns { id, shapes, palette, title, tagline }
 */
function resolveVisualMode(level, pref) {
  const L = Math.max(1, level | 0);
  const p = VISUAL_PREFS.includes(pref) ? pref : 'auto';

  if (p === 'classic') {
    return {
      id: 'classic',
      shapes: false,
      palette: PALETTE_BOLD,
      title: null,
      tagline: null,
    };
  }
  if (p === 'shapes') {
    return {
      id: 'shapes',
      shapes: true,
      palette: PALETTE_BOLD,
      title: 'Shape Help',
      tagline: 'Match the icons too',
    };
  }
  if (p === 'neon') {
    return {
      id: 'neon',
      shapes: false,
      palette: PALETTE_NEON,
      title: 'Neon Mix',
      tagline: 'Glow palette',
    };
  }

  // auto — mostly classic, with occasional specials
  // Every 5th level: Shape Help (icons)
  if (L % 5 === 0) {
    return {
      id: 'shapes',
      shapes: true,
      palette: PALETTE_BOLD,
      title: 'Shape Help',
      tagline: 'Special level · match icons',
    };
  }
  // Every 7th level (not also 5): Neon Mix
  if (L % 7 === 0) {
    return {
      id: 'neon',
      shapes: false,
      palette: PALETTE_NEON,
      title: 'Neon Mix',
      tagline: 'Special level · glow colors',
    };
  }
  // Occasional random spice after level 4 (~12% when not already special)
  // Deterministic from level so restart is stable
  if (L > 4) {
    const spice = (L * 17 + 3) % 11;
    if (spice === 0) {
      return {
        id: 'shapes',
        shapes: true,
        palette: PALETTE_BOLD,
        title: 'Shape Help',
        tagline: 'Bonus helper level',
      };
    }
    if (spice === 1) {
      return {
        id: 'neon',
        shapes: false,
        palette: PALETTE_NEON,
        title: 'Neon Mix',
        tagline: 'Bonus glow level',
      };
    }
  }

  return {
    id: 'classic',
    shapes: false,
    palette: PALETTE_BOLD,
    title: null,
    tagline: null,
  };
}

// Level scaling — slightly gentler color climb so boards stay readable longer
// L1: 3 colors, L2: 4, L3: 4, L4: 5 … up to 12
function levelSpec(level) {
  const L = Math.max(1, level | 0);
  // Start with 3 super-clear primaries; add ~1 color every 1–2 levels
  let colorCount;
  if (L === 1) colorCount = 3;
  else if (L === 2) colorCount = 4;
  else colorCount = Math.min(MAX_COLORS, 4 + Math.floor((L - 2) / 1.5));

  let emptyCount = 2;
  if (colorCount >= 8) emptyCount = 3;
  if (L >= 10 && colorCount >= 9 && L % 4 === 0) emptyCount = 2;

  const bottleCount = colorCount + emptyCount;
  const scramble = 28 + L * 10 + colorCount * 8;
  return { level: L, colorCount, emptyCount, bottleCount, capacity: CAPACITY, scramble };
}

// Animation timings (seconds)
const POUR_DUR = 0.42;
const SELECT_PULSE = 2.4;
