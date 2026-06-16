"use strict";
// ===========================================================================
// Shared DLS core — grid math, data model, and constants used by the poster
// page (and, in Phase 2, the desktop & mobile maps too). Load AFTER
// cottonwood-data.js (needs COTTONWOOD_SEED) and cottonwood-river.js.
// ===========================================================================

// ---- DLS grid math — Township 35, Ranges 2 & 3, W5M -----------------------
// latNudge/lonNudge calibrated from the OSM road grid (Range Roads & Township
// Roads): the plain-numbered grid roads cluster at lon -138 m / lat -382 m from
// the un-nudged math, so these shifts bring the drawn grid onto the real survey
// grid. Re-derive with maps/calib.py (after maps/fetch_roads.py).
const CFG = {
  meridianLon: -114.0, twpHeightDeg: 0.087447, twpWidthDeg: 0.142654,
  latNudge: -0.003437, lonNudge: -0.001998,
  twp: 35, ranges: [3, 2],   // legacy "home" township/ranges (migrateData + default canvas)
  // Canvas = townships × ranges drawn on the live map (blank where no data).
  // Default = Cottonwood only, so the site looks identical until you opt into more
  // (e.g. ?canvas=34,35,36). Growing the canvas is how the project expands.
  canvas: { twps: [35], ranges: [2, 3] }
};
// Dev/test switch: ?canvas=34,35,36 (or #canvas=) widens the drawn townships.
if (typeof location !== "undefined") {
  const _cm = (location.search + "&" + location.hash).match(/canvas=([0-9]+(?:,[0-9]+)*)/);
  if (_cm) CFG.canvas = { twps: _cm[1].split(",").map(Number), ranges: CFG.canvas.ranges };
}
const SEC_H = CFG.twpHeightDeg / 6;
const SEC_W = CFG.twpWidthDeg / 6;
// South latitude of a township's grid. Uniform (no correction-line jogs) — exact
// within one correction block (Twps ~30–36 W5M); past Twp 36 north the survey
// jogs and this would drift. Good for the neighbours actually in scope (34–36).
function twpSouth(twp) { return 49 + (twp - 1) * CFG.twpHeightDeg + CFG.latNudge; }

function secRowCol(sec) {
  const row = Math.floor((sec - 1) / 6);
  const i = (sec - 1) % 6;
  const colE = (row % 2 === 0) ? i : 5 - i;   // columns from the EAST
  return { row, colE };
}
function secSW(twp, rge, sec) {
  const { row, colE } = secRowCol(sec);
  const rgeEastLon = CFG.meridianLon - (rge - 1) * CFG.twpWidthDeg + CFG.lonNudge;
  return { lat: twpSouth(twp) + row * SEC_H, lon: rgeEastLon - (colE + 1) * SEC_W };
}
function secBounds(twp, rge, sec) {
  const sw = secSW(twp, rge, sec);
  return [[sw.lat, sw.lon], [sw.lat + SEC_H, sw.lon + SEC_W]];
}
function secCenter(twp, rge, sec, fx = 0.5, fy = 0.5) {
  const sw = secSW(twp, rge, sec);
  return [sw.lat + fy * SEC_H, sw.lon + fx * SEC_W];
}
function latlngToFrac(twp, rge, sec, latlng) {
  const sw = secSW(twp, rge, sec);
  return {
    fx: Math.max(0, Math.min(1, (latlng.lng - sw.lon) / SEC_W)),
    fy: Math.max(0, Math.min(1, (latlng.lat - sw.lat) / SEC_H))
  };
}
// Canvas extent [[s,w],[n,e]] over its townships × ranges (sec 6 = SW corner of a
// township, sec 36 = NE corner).
function canvasBounds(c = CFG.canvas) {
  let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
  for (const twp of c.twps) for (const rge of c.ranges) {
    const sw = secSW(twp, rge, 6), ne = secSW(twp, rge, 36);
    minLat = Math.min(minLat, sw.lat); minLon = Math.min(minLon, sw.lon);
    maxLat = Math.max(maxLat, ne.lat + SEC_H); maxLon = Math.max(maxLon, ne.lon + SEC_W);
  }
  return [[minLat, minLon], [maxLat, maxLon]];
}
// Section key <-> parts. Keys are T{twp}R{rge}S{sec} (e.g. "T35R3S16").
function sectionKey(twp, rge, sec) { return `T${twp}R${rge}S${sec}`; }
function keyParts(key) {
  const m = String(key).match(/^T(\d+)R(\d+)S(\d+)$/);
  return m ? { twp: +m[1], rge: +m[2], sec: +m[3] } : null;
}
// Human label for a township/range set: "Township 35, Ranges 2 & 3, W5M".
function canvasLabel(c = CFG.canvas) {
  const twps = [...c.twps].sort((a, b) => a - b);
  const rngs = [...c.ranges].sort((a, b) => a - b);
  const t = twps.length === 1 ? `Township ${twps[0]}` : `Townships ${twps[0]}–${twps[twps.length - 1]}`;
  const r = rngs.length === 1 ? `Range ${rngs[0]}`
          : rngs.length === 2 ? `Ranges ${rngs[0]} & ${rngs[1]}`
          : `Ranges ${rngs[0]}–${rngs[rngs.length - 1]}`;
  return `${t}, ${r}, West of the 5th Meridian`;
}

// ---- Data model + storage -------------------------------------------------
//   cell = { type:null|"CPR"|"HBC"|"SCHOOL"|"SSB",
//            q:{NW:[],NE:[],SW:[],SE:[]}, free:[{t,fx,fy}] }
const STORAGE_KEY = "cottonwood-data-v4";
const SCHEMA = 4;
const LEGACY_KEY = "cottonwood-data-v3";
const QUARTERS = ["NW", "NE", "SW", "SE"];
const QUAD_POS = { NW: [0.27, 0.74], NE: [0.73, 0.74], SW: [0.27, 0.28], SE: [0.73, 0.28] };
const TYPE_INFO = {
  CPR: { label: "C.P.R.", color: "#e06050", fill: 0.18 },
  HBC: { label: "H.B.C.", color: "#4a78c8", fill: 0.16 },
  SCHOOL: { label: "School Section", color: "#3f9e3f", fill: 0.18 },
  SSB: { label: "S.S.B.", color: "#9a6fb0", fill: 0.18 }
};
const LANDMARK_GLYPH = { school: "★", house: "⛪", ferry: "⚓", bridge: "🌉" };

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function normCell(c) {
  const out = { type: null, q: { NW: [], NE: [], SW: [], SE: [] }, free: [] };
  if (!c) return out;
  if (c.type) out.type = c.type;
  if (c.q) for (const k of QUARTERS) if (Array.isArray(c.q[k])) out.q[k] = c.q[k].slice();
  if (Array.isArray(c.free)) out.free = c.free.map(f => ({ t: f.t, fx: f.fx ?? 0.5, fy: f.fy ?? 0.5 }));
  return out;
}
function buildFromSeed() {
  const data = { schema: SCHEMA, sections: {}, landmarks: deepClone(COTTONWOOD_SEED.landmarks) };
  for (const [key, periods] of Object.entries(COTTONWOOD_SEED.sections)) {
    data.sections[key] = {};
    for (const p of COTTONWOOD_SEED.periods) data.sections[key][p.id] = normCell(periods[p.id]);
  }
  return data;
}
// One-time migration: rewrite legacy "R{rge}S{sec}" section keys to
// "T{CFG.twp}R{rge}S{sec}" and add twp to landmarks. Idempotent (schema-stamped),
// so it's safe to run on already-migrated data.
function migrateData(d) {
  if (!d || typeof d !== "object") return buildFromSeed();
  if (d.schema === SCHEMA) return d;
  const out = { schema: SCHEMA, sections: {}, landmarks: [] };
  for (const k in d.sections) {
    const m = String(k).match(/^R(\d+)S(\d+)$/);
    out.sections[m ? `T${CFG.twp}R${m[1]}S${m[2]}` : k] = d.sections[k];
  }
  out.landmarks = (d.landmarks || []).map(lm => lm.twp != null ? lm : Object.assign({ twp: CFG.twp }, lm));
  return out;
}
let DATA;
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return migrateData(JSON.parse(saved));        // v4 (current) or already-migrated
  } catch (e) { console.warn("load failed", e); }
  // One-shot: migrate the legacy v3 blob up to v4 and leave v3 in place as a
  // recovery fallback (the mom's pre-upgrade edits live there until v4 is confirmed).
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateData(JSON.parse(legacy));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (e) { /* private mode */ }
      return migrated;
    }
  } catch (e) { console.warn("legacy migration failed", e); }
  return buildFromSeed();
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); } catch (e) { console.warn("save failed", e); }
}
DATA = loadData();

function getCell(key, pid) {
  if (!DATA.sections[key]) DATA.sections[key] = {};
  if (!DATA.sections[key][pid]) DATA.sections[key][pid] = normCell(null);
  return DATA.sections[key][pid];
}
function cellHasContent(c) {
  return !!c.type || c.free.length > 0 || QUARTERS.some(q => c.q[q].length > 0);
}
function fillFor(cell) {
  if (cell.type && TYPE_INFO[cell.type]) return { fillColor: TYPE_INFO[cell.type].color, fillOpacity: TYPE_INFO[cell.type].fill };
  if (QUARTERS.some(q => cell.q[q].length) || cell.free.length) return { fillColor: "#f5c544", fillOpacity: 0.20 };
  return { fillColor: "#000", fillOpacity: 0 };
}
// Bounds of every section that actually carries data (any period) — used to frame
// the map on load so it fits whatever's been transcribed: one area today, and it
// zooms out automatically as data spreads to neighbouring townships.
function dataBounds() {
  let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180, n = 0;
  for (const key in DATA.sections) {
    const periods = DATA.sections[key];
    let has = false;
    for (const pid in periods) if (cellHasContent(periods[pid])) { has = true; break; }
    if (!has) continue;
    const p = keyParts(key); if (!p) continue;
    const sw = secSW(p.twp, p.rge, p.sec);
    if (sw.lat < minLat) minLat = sw.lat;
    if (sw.lon < minLon) minLon = sw.lon;
    if (sw.lat + SEC_H > maxLat) maxLat = sw.lat + SEC_H;
    if (sw.lon + SEC_W > maxLon) maxLon = sw.lon + SEC_W;
    n++;
  }
  return n ? [[minLat, minLon], [maxLat, maxLon]] : canvasBounds();
}

// the period the poster (and maps) currently show
let currentPeriod = COTTONWOOD_SEED.periods[0].id;
