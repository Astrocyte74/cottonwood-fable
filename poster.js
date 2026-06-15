// Shared printable-poster engine for the Cottonwood map (desktop + mobile).
// Loaded BEFORE each page's main inline script. Depends on globals each page
// defines: CFG, SEC_W, SEC_H, TWP_S, secRowCol, getCell, fillFor, TYPE_INFO,
// QUARTERS, QUAD_POS, DATA, LANDMARK_GLYPH, COTTONWOOD_SEED, COTTONWOOD_WATER,
// renderPeriod, currentPeriod, plus the #poster-view markup.
"use strict";

// ===========================================================================
// MAP VIEW — the region of the township grid shown inside the fixed map window.
// Only the MAP zooms/pans (via the #poster-map SVG's viewBox); the decorative
// frame (title, legend, compass, corner flourishes, range labels) stays pinned,
// and the whole sheet always prints with that frame around the framed map.
// ===========================================================================
const DESIGN_W = 1500, DESIGN_H = 1000;
const MAPX = 64, MAPY = 184, MAPW = 1372, MAPH = 712;   // the grid rectangle on the sheet
const MAP_ASPECT = MAPW / MAPH;                          // VIEW always matches this (fills the window)
const MIN_VIEW_W = 200;                                  // max zoom-in (~3 sections wide)
const VIEW_KEY = "cottonwood-poster-view-v1";
let VIEW = { x: MAPX, y: MAPY, w: MAPW, h: MAPH };        // default = the whole map
let ROAD_LEVEL = "off";                                    // "off" | "major" | "all" present-day roads
const ROADS_MAJOR = /^(motorway|trunk|primary|secondary|tertiary)/;  // classes shown at "major"

function clampView() {
  VIEW.w = Math.max(MIN_VIEW_W, Math.min(MAPW, VIEW.w));
  VIEW.h = VIEW.w / MAP_ASPECT;
  if (VIEW.h > MAPH) { VIEW.h = MAPH; VIEW.w = VIEW.h * MAP_ASPECT; }
  VIEW.x = Math.max(MAPX, Math.min(MAPX + MAPW - VIEW.w, VIEW.x));
  VIEW.y = Math.max(MAPY, Math.min(MAPY + MAPH - VIEW.h, VIEW.y));
}
// Push the current VIEW into the map SVG's viewBox + the % readout + storage.
function updateMapView() {
  const m = document.getElementById("poster-map");
  if (m) m.setAttribute("viewBox", `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
  const pct = document.getElementById("zoom-pct");
  if (pct) pct.textContent = Math.round(MAPW / VIEW.w * 100) + "%";
  saveView();
}
function saveView() { try { localStorage.setItem(VIEW_KEY, JSON.stringify({ v: VIEW, roads: ROAD_LEVEL })); } catch (e) { /* private mode */ } }
function restoreView() {
  try {
    const s = localStorage.getItem(VIEW_KEY);
    if (s) {
      const o = JSON.parse(s);
      if (o && o.v) { VIEW = Object.assign({ x: MAPX, y: MAPY, w: MAPW, h: MAPH }, o.v); clampView(); }
      if (o && o.roads) ROAD_LEVEL = o.roads;
    }
  } catch (e) { /* ignore */ }
}
// #crop=x,y,w,h (exact frame, in sheet/grid coords) or #zoom=z,cx,cy
function loadViewFromHash() {
  const hh = location.hash.replace(/^#/, "");
  const rd = hh.match(/roads=(off|major|all)/);
  if (rd) ROAD_LEVEL = rd[1];
  const c = hh.match(/crop=([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
  if (c) { VIEW = { x: +c[1], y: +c[2], w: +c[3], h: +c[4] }; clampView(); return; }
  const z = hh.match(/zoom=([\d.]+),([\d.]+),([\d.]+)/);
  if (z) {
    VIEW.w = MAPW / +z[1]; VIEW.h = VIEW.w / MAP_ASPECT;
    VIEW.x = +z[2] - VIEW.w / 2; VIEW.y = +z[3] - VIEW.h / 2; clampView();
  }
}

// ---- zoom/pan the MAP: wheel + drag + pinch + buttons + keyboard ----------
function winSize() {
  const w = document.getElementById("poster-map");
  if (!w) return { w: 1, h: 1 };
  const r = w.getBoundingClientRect();
  return { w: r.width || 1, h: r.height || 1 };
}
// stage (window) px -> map (grid) coords, via the current viewBox
function screenToMap(sx, sy, ws) {
  return [VIEW.x + sx / ws.w * VIEW.w, VIEW.y + sy / ws.h * VIEW.h];
}
// Zoom by `factor` (<1 = in) keeping map point (fx,fy) under window point (sx,sy).
function zoomAbout(fx, fy, sx, sy, factor) {
  const ws = winSize();
  VIEW.w = Math.max(MIN_VIEW_W, Math.min(MAPW, VIEW.w * factor));
  VIEW.h = VIEW.w / MAP_ASPECT;
  VIEW.x = fx - sx / ws.w * VIEW.w;
  VIEW.y = fy - sy / ws.h * VIEW.h;
  clampView();
  updateMapView();
}
function _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function _mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function initPosterZoom() {
  if (initPosterZoom._done) return; initPosterZoom._done = true;
  const win = document.querySelector(".map-window");
  if (!win) return;
  const ptrs = new Map();
  let pan = null, pinch = null;
  win.addEventListener("wheel", e => {
    e.preventDefault();
    const r = win.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const [fx, fy] = screenToMap(sx, sy, winSize());
    zoomAbout(fx, fy, sx, sy, e.deltaY > 0 ? 1.15 : 1 / 1.15);   // down = out, up = in
  }, { passive: false });
  win.addEventListener("pointerdown", e => {
    win.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; pinch = { lastDist: _dist(a, b) }; pan = null; }
    else { pan = { sx: e.clientX, sy: e.clientY, view: { ...VIEW } }; }
  });
  win.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ws = winSize();
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = _dist(a, b);
      if (pinch.lastDist && Math.abs(d - pinch.lastDist) > 0.5) {
        const r = win.getBoundingClientRect();
        const m = _mid(a, b), sx = m.x - r.left, sy = m.y - r.top;
        const [fx, fy] = screenToMap(sx, sy, ws);
        zoomAbout(fx, fy, sx, sy, pinch.lastDist / d);
        pinch.lastDist = d;
      }
    } else if (pan && ptrs.size === 1) {
      VIEW.x = pan.view.x - (e.clientX - pan.sx) / ws.w * pan.view.w;
      VIEW.y = pan.view.y - (e.clientY - pan.sy) / ws.h * pan.view.h;
      clampView();
      updateMapView();
    }
  });
  const endPtr = () => {
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { const [p] = [...ptrs.values()]; pan = { sx: p.x, sy: p.y, view: { ...VIEW } }; }
    else if (ptrs.size === 0) pan = null;
  };
  win.addEventListener("pointerup", e => { ptrs.delete(e.pointerId); endPtr(); });
  win.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); endPtr(); });
  const ctl = document.getElementById("zoom-ctl");
  if (ctl) ctl.addEventListener("click", e => {
    const b = e.target.closest("button[data-z]"); if (!b) return;
    const ws = winSize(), cx = ws.w / 2, cy = ws.h / 2;
    const [fx, fy] = screenToMap(cx, cy, ws);
    if (b.dataset.z === "in") zoomAbout(fx, fy, cx, cy, 1 / 1.3);
    else if (b.dataset.z === "out") zoomAbout(fx, fy, cx, cy, 1.3);
    else { VIEW = { x: MAPX, y: MAPY, w: MAPW, h: MAPH }; updateMapView(); }   // fit whole map
  });
  document.addEventListener("keydown", e => {
    const ae = document.activeElement;
    if (ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
    const ws = winSize(), cx = ws.w / 2, cy = ws.h / 2;
    const [fx, fy] = screenToMap(cx, cy, ws);
    const step = VIEW.w * 0.12;
    let h = true;
    if (e.key === "+" || e.key === "=") zoomAbout(fx, fy, cx, cy, 1 / 1.3);
    else if (e.key === "-" || e.key === "_") zoomAbout(fx, fy, cx, cy, 1.3);
    else if (e.key === "0") { VIEW = { x: MAPX, y: MAPY, w: MAPW, h: MAPH }; updateMapView(); }
    else if (e.key === "ArrowLeft") { VIEW.x -= step; clampView(); updateMapView(); }
    else if (e.key === "ArrowRight") { VIEW.x += step; clampView(); updateMapView(); }
    else if (e.key === "ArrowUp") { VIEW.y -= step; clampView(); updateMapView(); }
    else if (e.key === "ArrowDown") { VIEW.y += step; clampView(); updateMapView(); }
    else h = false;
    if (h) e.preventDefault();
  });
}

// ===========================================================================
// PRINTABLE POSTER — one clean page per period
// ===========================================================================
function globalCol(rge, colE) {            // 0..11 left(west)→right(east)
  const within = 5 - colE;                 // 0 = west side of a range
  return (rge === 3 ? 0 : 6) + within;
}
function buildPoster(pid) {
  const period = COTTONWOOD_SEED.periods.find(p => p.id === pid);
  const W = 1500, H = 1000;
  const gx = 64, gy = 184, gw = 1372, gh = 712;
  const cw = gw / 12, ch = gh / 6;
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // geographic (lat/lon) -> poster coords, using the same edges as the grid
  const rgeEastLon = r => CFG.meridianLon - (r - 1) * CFG.twpWidthDeg + CFG.lonNudge;
  const westEdge = rgeEastLon(3) - 6 * SEC_W, eastEdge = rgeEastLon(2);
  const northEdge = TWP_S + 6 * SEC_H, southEdge = TWP_S;
  const posX = lon => gx + (lon - westEdge) / (eastEdge - westEdge) * gw;
  const posY = lat => gy + (northEdge - lat) / (northEdge - southEdge) * gh;

  // word-wrap a name to a pixel width at font size fs
  function wrap(txt, fs, maxW) {
    const words = String(txt).split(/\s+/), out = []; let cur = "";
    const wsz = s => s.length * fs * 0.5;
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (cur && wsz(t) > maxW) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  function textSvg(txt, x, y, fs, maxW, unc) {
    const est = txt.length * fs * 0.5;
    const tl = est > maxW ? ` textLength="${maxW.toFixed(0)}" lengthAdjust="spacingAndGlyphs"` : "";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="${fs.toFixed(1)}" fill="${unc ? "#9a6d2b" : "#23170a"}"${unc ? ' font-style="italic"' : ""}${tl}>${esc(txt)}</text>`;
  }
  // wrap + shrink a quarter's names until the stack fits its half-cell height
  function quarterLines(list, maxW, maxH) {
    let fs = 9.4;
    for (let k = 0; k < 10; k++) {
      const ls = [];
      list.forEach((nm, i) => {
        if (i) ls.push({ gap: true });
        wrap(nm, fs, maxW).forEach(t => ls.push({ t, unc: /\?$/.test(nm) }));
      });
      const hgt = ls.reduce((s, o) => s + (o.gap ? fs * 0.45 : fs + 1.6), 0);
      if (hgt <= maxH || fs <= 6.6) return { fs, ls };
      fs -= 0.45;
    }
    return { fs: 6.6, ls: [] };
  }

  // MAP content (zooms/pan, lives in #poster-map inside the window)
  let cells = "", lines = "", names = "", marks = "";
  // FRAME content (fixed, lives in #poster-frame) — range labels sit below the grid
  let rangeLabels = "";
  for (const rge of CFG.ranges) {
    for (let sec = 1; sec <= 36; sec++) {
      const { row, colE } = secRowCol(sec);
      const gc = globalCol(rge, colE);
      const x = gx + gc * cw, y = gy + (5 - row) * ch;
      const cell = getCell(`R${rge}S${sec}`, pid);
      const f = fillFor(cell);
      cells += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${f.fillOpacity ? f.fillColor : "none"}" fill-opacity="${f.fillOpacity || 0}" stroke="#7a4a1e" stroke-width="1.1"/>`;
      // quarter dividers
      lines += `<line x1="${(x + cw / 2).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + cw / 2).toFixed(1)}" y2="${(y + ch).toFixed(1)}" stroke="#7a4a1e" stroke-width="0.4" stroke-dasharray="3 4" opacity="0.5"/>`;
      lines += `<line x1="${x.toFixed(1)}" y1="${(y + ch / 2).toFixed(1)}" x2="${(x + cw).toFixed(1)}" y2="${(y + ch / 2).toFixed(1)}" stroke="#7a4a1e" stroke-width="0.4" stroke-dasharray="3 4" opacity="0.5"/>`;
      // section number
      names += `<text x="${(x + 5).toFixed(1)}" y="${(y + 13).toFixed(1)}" font-family="Georgia,serif" font-size="10" fill="#9a7a4a">${sec}</text>`;
      // type tag
      if (cell.type && TYPE_INFO[cell.type]) {
        names += `<text x="${(x + cw / 2).toFixed(1)}" y="${(y + ch / 2 + 4).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="12" fill="#6b4e1f" opacity="0.8">${TYPE_INFO[cell.type].label}</text>`;
      }
      // quarter names — word-wrapped & shrunk to fit, so they never collide
      const cap = cw / 2 - 8, maxH = ch / 2 - 6;
      for (const q of QUARTERS) {
        const list = cell.q[q]; if (!list.length) continue;
        const qx = x + QUAD_POS[q][0] * cw, qy = y + (1 - QUAD_POS[q][1]) * ch;
        const { fs, ls } = quarterLines(list, cap, maxH);
        const tot = ls.reduce((s, o) => s + (o.gap ? fs * 0.45 : fs + 1.6), 0) - 1.6;
        let cur = qy - tot / 2;
        ls.forEach(o => {
          if (o.gap) { cur += fs * 0.45; return; }
          cur += fs;
          names += textSvg(o.t, qx, cur, fs, cap, o.unc);
          cur += 1.6;
        });
      }
      // free notes (wrapped, centered on their drag position)
      cell.free.forEach(fr => {
        const fxp = x + fr.fx * cw, fyp = y + (1 - fr.fy) * ch, mw = cw - 8, fs = 9;
        const wl = wrap(fr.t, fs, mw);
        let cy2 = fyp - (wl.length - 1) * (fs + 1) / 2;
        wl.forEach(t => { names += textSvg(t, fxp, cy2, fs, mw, /\?$/.test(fr.t)); cy2 += fs + 1; });
      });
    }
    // range outline (map) + range label (frame)
    const r0 = globalCol(rge, 5), x0 = gx + r0 * cw;
    cells += `<rect x="${x0.toFixed(1)}" y="${gy}" width="${(cw * 6).toFixed(1)}" height="${gh}" fill="none" stroke="#5c3a1e" stroke-width="2.4"/>`;
    rangeLabels += `<text x="${(x0 + cw * 3).toFixed(1)}" y="${(gy + gh + 30).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#5c3a1e">Range ${rge}</text>`;
  }
  // landmarks
  DATA.landmarks.forEach(lm => {
    const { row, colE } = secRowCol(lm.sec), gc = globalCol(lm.rge, colE);
    const x = gx + gc * cw + lm.fx * cw, y = gy + (5 - row) * ch + (1 - lm.fy) * ch;
    marks += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="15">${LANDMARK_GLYPH[lm.icon] || "✦"}</text>`;
  });

  // Rivers — drawn from OSM geometry as smooth curves, clipped to the grid.
  // Named so we can label them correctly (Red Deer vs its tributaries).
  let water = "", riverLabels = "";
  if (typeof COTTONWOOD_WATER !== "undefined" && COTTONWOOD_WATER.rivers) {
    // Catmull-Rom spline through the points -> flowing curve, no rigid angles
    const smoothPath = pts => {
      const P = pts.map(p => [posX(p[1]), posY(p[0])]);
      if (P.length < 3) return "M" + P.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L");
      let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    };
    const names = COTTONWOOD_WATER.names || [];
    const segs = COTTONWOOD_WATER.rivers.map((r, i) => ({ pts: r, nm: names[i] || "" }));
    (COTTONWOOD_WATER.bridge || []).forEach(b => segs.push({ pts: b, nm: "Red Deer River" }));
    segs.forEach(o => {
      if (o.pts.length < 2) return;
      const main = o.nm === "Red Deer River";          // main stem heavier than tributaries
      const d = smoothPath(o.pts);
      water += `<path d="${d}" fill="none" stroke="#a7c4dc" stroke-width="${main ? 6.5 : 4.5}" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>`;
      water += `<path d="${d}" fill="none" stroke="#5a82a8" stroke-width="${main ? 2.7 : 1.9}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
    });
    // label each named river once, on its longest in-grid run
    const inGrid = p => p[0] >= southEdge && p[0] <= northEdge && p[1] >= westEdge && p[1] <= eastEdge;
    const best = {};
    COTTONWOOD_WATER.rivers.forEach((r, i) => {
      const nm = names[i]; if (!["Red Deer River", "Little Red Deer River", "Raven River"].includes(nm)) return;
      const ing = r.filter(inGrid);
      if (!best[nm] || ing.length > best[nm].ing.length) best[nm] = { seg: r, ing };
    });
    Object.entries(best).forEach(([nm, o]) => {
      const arr = o.ing.length ? o.ing : o.seg, m = arr[Math.floor(arr.length / 2)];
      const lx = Math.max(gx + 75, Math.min(W - gx - 75, posX(m[1]))), ly = posY(m[0]) - 7;
      const fz = nm === "Red Deer River" ? 13 : 11;
      riverLabels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="${fz}" fill="#3f6b94" paint-order="stroke" stroke="#f7f0e1" stroke-width="3" stroke-linejoin="round">${nm}</text>`;
    });
  }
  const waterGroup = `<defs><clipPath id="gclip"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}"/></clipPath></defs><g clip-path="url(#gclip)">${water}</g>`;

  // Optional: present-day Gleniffer Lake reservoir (off by default — modern feature)
  let lakeGroup = "", lakeLabel = "";
  const lakeCb = document.getElementById("lake-toggle");
  if (lakeCb && lakeCb.checked && typeof COTTONWOOD_WATER !== "undefined" && COTTONWOOD_WATER.gleniffer) {
    let lk = "";
    COTTONWOOD_WATER.gleniffer.forEach(ring => {
      if (ring.length < 3) return;
      const d = "M" + ring.map(p => `${posX(p[1]).toFixed(1)},${posY(p[0]).toFixed(1)}`).join("L") + "Z";
      lk += `<path d="${d}" fill="#acc9e0" fill-opacity="0.22" stroke="#5f8bb0" stroke-width="1.6" stroke-dasharray="7 4"/>`;
    });
    lakeGroup = `<g clip-path="url(#gclip)">${lk}</g>`;
    const ring = COTTONWOOD_WATER.gleniffer[0];
    const cxg = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const cyg = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lxp = Math.max(gx + 80, Math.min(W - gx - 80, posX(cxg)));
    const lyp = Math.min(gy + gh - 12, Math.max(gy + 16, posY(cyg)));
    lakeLabel = `<text x="${lxp.toFixed(1)}" y="${lyp.toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="12" fill="#3f6b94" paint-order="stroke" stroke="#f7f0e1" stroke-width="3.5" stroke-linejoin="round">Gleniffer Lake (present-day)</text>`;
  }

  // Optional: present-day roads (orientation layer, off by default). Faint gray,
  // clipped to the grid like the river; lives in the MAP layer so it zooms too.
  let roadsGroup = "";
  if (typeof COTTONWOOD_ROADS !== "undefined" && COTTONWOOD_ROADS.roads && ROAD_LEVEL !== "off") {
    let rd = "";
    COTTONWOOD_ROADS.roads.forEach((pts, i) => {
      const cls = COTTONWOOD_ROADS.classes[i];
      const heavy = ROADS_MAJOR.test(cls);
      if (ROAD_LEVEL === "major" && !heavy) return;        // major = through-roads only
      if (pts.length < 2) return;
      const d = "M" + pts.map(p => `${posX(p[1]).toFixed(1)},${posY(p[0]).toFixed(1)}`).join("L");
      rd += `<path d="${d}" fill="none" stroke="#5c5c5c" stroke-width="${heavy ? 1.8 : 1.1}" stroke-opacity="${heavy ? 0.5 : 0.38}" stroke-linecap="round"/>`;
    });
    roadsGroup = `<g clip-path="url(#gclip)">${rd}</g>`;
  }

  // legend (shifted right so it clears the corner flourish) — fixed frame
  const leg = [["#f5c544", "Settler"], ["#e06050", "C.P.R."], ["#4a78c8", "H.B.C."], ["#3f9e3f", "School"], ["#9a6fb0", "S.S.B."]];
  let lx = gx + 110;
  let legendSwatches = "";
  leg.forEach(([c, lab]) => {
    legendSwatches += `<rect x="${lx}" y="${gy + gh + 52}" width="16" height="12" fill="${c}" fill-opacity="0.5" stroke="#888"/>`;
    legendSwatches += `<text x="${lx + 22}" y="${gy + gh + 62}" font-family="Georgia,serif" font-size="12" fill="#4a3520">${lab}</text>`;
    lx += 40 + lab.length * 7.5;
  });

  const mapSvg = `${cells}${roadsGroup}${lakeGroup}${waterGroup}${riverLabels}${lines}${names}${marks}${lakeLabel}`;
  const frameSvg = `${legendSwatches}${rangeLabels}`;

  const page = document.getElementById("poster-page");
  page.innerHTML = `
    <div class="map-window"><svg id="poster-map" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${mapSvg}</svg></div>
    <svg id="poster-frame" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${frameSvg}</svg>
    <img class="poster-deco pd-corner pd-tl" src="art/corner-flourish.png" alt="">
    <img class="poster-deco pd-corner pd-tr" src="art/corner-flourish.png" alt="">
    <img class="poster-deco pd-corner pd-bl" src="art/corner-flourish.png" alt="">
    <img class="poster-deco pd-corner pd-br" src="art/corner-flourish.png" alt="">
    <img class="poster-deco pd-compass" src="art/compass-rose.png" alt="">
    <div class="poster-title">
      <img class="cart" src="art/cartouche.png" alt="" onerror="this.style.display='none'">
      <h1>Cottonwood Land Ownership</h1>
      <div class="sub">Township 35, Ranges 2 &amp; 3, West of the 5th Meridian · Central Alberta</div>
      <div class="per">${period.label}</div>
    </div>`;
}
function openPoster() {
  buildPosterPeriods();
  restoreView();          // load VIEW + ROAD_LEVEL before building
  loadViewFromHash();
  buildPoster(currentPeriod);
  document.getElementById("poster-view").style.display = "block";
  applyPosterSize();
  markActiveSize();
  initPosterZoom();
  updateMapView();
  updateRoadsUI();
}
function closePoster() { document.getElementById("poster-view").style.display = "none"; closePrintMenu(); }

// ----- poster: switch the date (period) in place -----
function buildPosterPeriods() {
  const host = document.getElementById("poster-periods");
  if (host.childElementCount) { updatePosterPeriods(); return; }
  host.innerHTML = COTTONWOOD_SEED.periods
    .map(p => `<button data-pid="${p.id}" onclick="setPosterPeriod('${p.id}')">${p.label}</button>`).join("");
  updatePosterPeriods();
}
function updatePosterPeriods() {
  document.querySelectorAll("#poster-periods button").forEach(b => b.classList.toggle("active", b.dataset.pid === currentPeriod));
}
function setPosterPeriod(pid) {
  currentPeriod = pid;
  if (typeof renderPeriod === "function") renderPeriod(pid);   // sync the live map's grid, if present
  buildPoster(pid);
  applyPosterSize();
  updatePosterPeriods();
  updateMapView();
}

// ----- poster: print-size submenu under the Print button -----
function togglePrintMenu(ev) { ev.stopPropagation(); document.getElementById("print-menu").classList.toggle("open"); }
function closePrintMenu() { const m = document.getElementById("print-menu"); if (m) m.classList.remove("open"); }
function pickSize(el) {
  document.getElementById("poster-size").value = el.dataset.sz;
  applyPosterSize();
  markActiveSize();
}
function markActiveSize() {
  const v = document.getElementById("poster-size").value;
  document.querySelectorAll("#print-menu .pm-item").forEach(b => b.classList.toggle("active", b.dataset.sz === v));
}
document.addEventListener("click", e => { if (!e.target.closest(".pt-print")) closePrintMenu(); });
function rebuildPoster() { if (document.getElementById("poster-view").style.display === "block") { buildPoster(currentPeriod); applyPosterSize(); updateMapView(); } }
function setRoadsLevel(level) {
  ROAD_LEVEL = level;
  updateRoadsUI();
  rebuildPoster();
  saveView();
}
function updateRoadsUI() {
  document.querySelectorAll("#poster-roads button").forEach(b => b.classList.toggle("active", b.dataset.roads === ROAD_LEVEL));
}

// Print size: inject @page + a transform so "Print / Save PDF" yields ONE page at
// the chosen physical size. The WHOLE sheet prints (frame + decorations fixed);
// the framed map rides through in the #poster-map viewBox already in the DOM, so
// what you framed on screen is what prints inside the fixed frame. Design 1500×1000.
function applyPosterSize() {
  const sel = document.getElementById("poster-size");
  const hint = document.getElementById("poster-size-hint");
  let st = document.getElementById("poster-print-css");
  if (!st) { st = document.createElement("style"); st.id = "poster-print-css"; document.head.appendChild(st); }
  const v = sel.value;
  document.getElementById("tile-sheets").innerHTML = "";   // clear any previous tiles
  if (v === "tile") { buildTiles(st, hint); return; }
  const [W, H] = v ? v.split("x").map(Number) : [11, 8.5];   // "" → Letter landscape
  const DPI = 96, DW = 1500, DH = 1000;
  const Wpx = W * DPI, Hpx = H * DPI;
  const s = Math.min(Wpx / DW, Hpx / DH);
  const tx = (Wpx - DW * s) / 2, ty = (Hpx - DH * s) / 2;
  st.textContent = `@media print {
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar,.zoom-ctl,#tile-sheets { display:none !important; }
    #poster-view { position:static; display:block; width:${W}in; height:${H}in; padding:0; margin:0; overflow:hidden; background:#fff; }
    .poster-page { width:${DW}px !important; height:${DH}px !important; max-width:none !important; aspect-ratio:auto !important;
      transform: translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)}) !important;
      transform-origin: 0 0 !important; box-shadow:none; border:none; margin:0; }
  }`;
  hint.textContent = v ? `prints as one ${W}×${H}″ page — Save as PDF, then upload to a print shop`
                       : `prints to one landscape page (≈ Letter)`;
}

// "Tile on Letter pages": split the WHOLE sheet across a grid of Letter-landscape
// pages (with a small overlap) you can print at home and tape together. The framed
// map rides through in the cloned #poster-map viewBox.
function buildTiles(st, hint) {
  const DPI = 96, DW = 1500, DH = 1000;
  const COLS = 2, ROWS = 2;                          // four Letter-landscape pages
  const PW = 11 * DPI, PH = 8.5 * DPI;               // page size in CSS px (landscape)
  const OV = 0.3 * DPI;                              // overlap for taping (~0.3")
  const STEPX = PW - OV, STEPY = PH - OV;
  const coverW = COLS * PW - (COLS - 1) * OV;        // total canvas covered by the grid
  const coverH = ROWS * PH - (ROWS - 1) * OV;
  const s = Math.min(coverW / DW, coverH / DH);      // scale poster to fill (3:2 → fits width)
  const offX = (coverW - DW * s) / 2, offY = (coverH - DH * s) / 2;

  const src = document.getElementById("poster-page").innerHTML;
  const host = document.getElementById("tile-sheets");
  let html = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tx = offX - c * STEPX, ty = offY - r * STEPY;
      const last = (r === ROWS - 1 && c === COLS - 1);
      // dashed guides on the inner (overlap) edges show where to trim & align
      const guides =
        (c < COLS - 1 ? `<div class="cut" style="top:0;bottom:0;right:0;border-right-width:1px"></div>` : "") +
        (r < ROWS - 1 ? `<div class="cut" style="left:0;right:0;bottom:0;border-bottom-width:1px"></div>` : "");
      html += `<div class="tile" style="width:11in;height:8.5in;${last ? "" : "page-break-after:always;"}">
        <div class="poster-page" style="width:${DW}px;height:${DH}px;transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(4)});transform-origin:top left;">${src}</div>
        ${guides}
        <div class="tilemark badge">Row ${r + 1} · Col ${c + 1} — trim dashed edge &amp; tape</div>
      </div>`;
    }
  }
  host.innerHTML = html;

  st.textContent = `@media print {
    @page { size: 11in 8.5in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar,.zoom-ctl,#poster-page { display:none !important; }
    #poster-view { position:static; display:block; padding:0; margin:0; background:#fff; }
    #tile-sheets { display:block !important; }
  }`;
  hint.textContent = `${COLS}×${ROWS} Letter pages (landscape) — print all, trim the dashed edges, tape into one ~21×14″ poster`;
}
