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
  twp: 35, ranges: [3, 2], latNudge: -0.003437, lonNudge: -0.001998
};
const TWP_S = 49 + (CFG.twp - 1) * CFG.twpHeightDeg + CFG.latNudge;
const SEC_H = CFG.twpHeightDeg / 6;
const SEC_W = CFG.twpWidthDeg / 6;

function secRowCol(sec) {
  const row = Math.floor((sec - 1) / 6);
  const i = (sec - 1) % 6;
  const colE = (row % 2 === 0) ? i : 5 - i;   // columns from the EAST
  return { row, colE };
}
function secSW(rge, sec) {
  const { row, colE } = secRowCol(sec);
  const rgeEastLon = CFG.meridianLon - (rge - 1) * CFG.twpWidthDeg + CFG.lonNudge;
  return { lat: TWP_S + row * SEC_H, lon: rgeEastLon - (colE + 1) * SEC_W };
}
function secBounds(rge, sec) {
  const sw = secSW(rge, sec);
  return [[sw.lat, sw.lon], [sw.lat + SEC_H, sw.lon + SEC_W]];
}
function secCenter(rge, sec, fx = 0.5, fy = 0.5) {
  const sw = secSW(rge, sec);
  return [sw.lat + fy * SEC_H, sw.lon + fx * SEC_W];
}
function latlngToFrac(rge, sec, latlng) {
  const sw = secSW(rge, sec);
  return {
    fx: Math.max(0, Math.min(1, (latlng.lng - sw.lon) / SEC_W)),
    fy: Math.max(0, Math.min(1, (latlng.lat - sw.lat) / SEC_H))
  };
}

// ---- Data model + storage -------------------------------------------------
//   cell = { type:null|"CPR"|"HBC"|"SCHOOL"|"SSB",
//            q:{NW:[],NE:[],SW:[],SE:[]}, free:[{t,fx,fy}] }
const STORAGE_KEY = "cottonwood-data-v3";
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
  const data = { sections: {}, landmarks: deepClone(COTTONWOOD_SEED.landmarks) };
  for (const [key, periods] of Object.entries(COTTONWOOD_SEED.sections)) {
    data.sections[key] = {};
    for (const p of COTTONWOOD_SEED.periods) data.sections[key][p.id] = normCell(periods[p.id]);
  }
  return data;
}
let DATA;
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.warn("load failed", e); }
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

// the period the poster (and maps) currently show
let currentPeriod = COTTONWOOD_SEED.periods[0].id;
