/* ==========================================================================
   Time & season color engine
   - Background gradient shifts through spring → summer → fall → winter
     based on the visitor's local calendar date.
   - Light/dark balance fades through the visitor's local clock, peaking
     at noon and bottoming out at midnight.
   - Text/line colors are computed from the same "light" value so contrast
     holds at every point in the cycle, not just noon and midnight.
   Cost: a handful of number crunching, no images, no per-frame loop.
   Runs on load, then every 5 minutes — cheap enough to ignore.
   ========================================================================== */

const SEASON_HEX = {
  spring: "#78bc61",
  summer: "#faa613",
  fall:   "#472c1b",
  winter: "#cfcfea"
};

// approximate day-of-year for each seasonal anchor (non-leap-year basis)
const SEASON_ANCHORS = [
  { day: 79,  color: SEASON_HEX.spring },
  { day: 172, color: SEASON_HEX.summer },
  { day: 265, color: SEASON_HEX.fall   },
  { day: 355, color: SEASON_HEX.winter }
];

const DARK_BASE  = "#16140F"; // near-black, warm not cold
const LIGHT_BASE = "#FAF8F2"; // paper

const TEXT_DARK  = "#201F1C"; // ink on light backgrounds
const TEXT_LIGHT = "#F3F0E6"; // near-white on dark backgrounds
const SOFT_DARK  = "#201F1C";
const SOFT_LIGHT = "#C9C4B4";
const LINE_DARK  = "#DCD6C6";
const LINE_LIGHT = "#201F1C";

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbToHex(a.map((c, i) => c + (b[i] - c) * t));
}
// smooth easing so transitions don't feel linear/mechanical
function smoothstep(t) { return t * t * (3 - 2 * t); }

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000);
}

function seasonColorFor(date) {
  const doy = dayOfYear(date);
  // find surrounding anchors, wrapping around the year
  let prev = SEASON_ANCHORS[SEASON_ANCHORS.length - 1];
  let prevDay = prev.day - 365;
  let next = SEASON_ANCHORS[0];
  let nextDay = next.day;

  for (let i = 0; i < SEASON_ANCHORS.length; i++) {
    const a = SEASON_ANCHORS[i];
    const b = SEASON_ANCHORS[(i + 1) % SEASON_ANCHORS.length];
    const bDay = i === SEASON_ANCHORS.length - 1 ? b.day + 365 : b.day;
    if (doy >= a.day && doy < bDay) {
      prev = a; prevDay = a.day;
      next = b; nextDay = bDay;
      break;
    }
  }
  const t = smoothstep((doy - prevDay) / (nextDay - prevDay));
  return mix(prev.color, next.color, t);
}

// 1 = full daylight (noon), 0 = deepest night (midnight)
function lightFor(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const raw = (Math.cos(((hour - 12) / 24) * 2 * Math.PI) + 1) / 2;
  return raw;
}

function applyTimeAndSeason() {
  const now = new Date();
  const season = seasonColorFor(now);
  const light = lightFor(now);

  // background: season color tinted toward paper (day) or near-black (night)
  const dayTint   = mix(LIGHT_BASE, season, 0.32);
  const nightTint = mix(DARK_BASE, season, 0.22);
  const bgBottom  = mix(nightTint, dayTint, light);
  // top stop stays a touch closer to neutral for a subtle vertical gradient
  const dayTop    = mix(LIGHT_BASE, season, 0.14);
  const nightTop  = mix(DARK_BASE, season, 0.10);
  const bgTop     = mix(nightTop, dayTop, light);

  const ink = light > 0.5 ? "#201F1C" : "#F3F0E6";
  const inkSoft = light > 0.5 ? "#201F1C" : "#F3F0E6";
  const line = light > 0.5 ? "#201F1C" : "#F3F0E6";

  const root = document.documentElement.style;
  root.setProperty("--bg-top", bgTop);
  root.setProperty("--bg-bottom", bgBottom);
  root.setProperty("--ink", ink);
  root.setProperty("--ink-soft", inkSoft);
  root.setProperty("--line", line);
}

applyTimeAndSeason();
setInterval(applyTimeAndSeason, 5 * 60 * 1000); // refresh every 5 min, plenty
