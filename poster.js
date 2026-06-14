// Shared printable-poster engine for the Cottonwood map (desktop + mobile).
// Loaded BEFORE each page's main inline script. Depends on globals each page
// defines: CFG, SEC_W, SEC_H, TWP_S, secRowCol, getCell, fillFor, TYPE_INFO,
// QUARTERS, QUAD_POS, DATA, LANDMARK_GLYPH, COTTONWOOD_SEED, COTTONWOOD_WATER,
// renderPeriod, currentPeriod, plus the #poster-view markup.
"use strict";

// ===========================================================================
// VIEW RECT — the framed region of the 1500×1000 sheet that is shown on screen
// and sent to print. Zoom/pan edit this object; renderView() turns it into a
// transform on .poster-page. One primitive drives BOTH the on-screen framing
// (renderView) and the print sizing (applyPosterSize), so what you frame prints.
// ===========================================================================
const DESIGN_W = 1500, DESIGN_H = 1000;
const MIN_VIEW_W = 150;                       // max zoom-in ≈ one section wide
const VIEW_KEY = "cottonwood-poster-view-v1";
let VIEW = { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H };
let ASPECT = DESIGN_W / DESIGN_H;             // target w/h (= selected print size)

let lastRender = { z: 1, Tx: 0, Ty: 0, sW: 0, sH: 0 };
function aspectForSize(v) {
  if (!v) return 3 / 2;            // "" = full sheet; Letter print fits with margin (today's behaviour)
  if (v === "tile") return 11 / 8.5;
  const [W, H] = v.split("x").map(Number);
  return W / H;
}
// largest rect of `aspect` centred in the design space — the default/reset frame
function fullFrame(aspect) {
  let w = DESIGN_W, h = w / aspect;
  if (h > DESIGN_H) { h = DESIGN_H; w = h * aspect; }
  return { x: (DESIGN_W - w) / 2, y: (DESIGN_H - h) / 2, w, h };
}
// reshape VIEW to ASPECT about its centre, keeping zoom; then clamp
function refitViewToAspect() {
  const cx = VIEW.x + VIEW.w / 2, cy = VIEW.y + VIEW.h / 2;
  let w = VIEW.w, h = w / ASPECT;
  if (h > DESIGN_H) { h = DESIGN_H; w = h * ASPECT; }
  if (w > DESIGN_W) { w = DESIGN_W; h = w / ASPECT; }
  VIEW.x = cx - w / 2; VIEW.y = cy - h / 2; VIEW.w = w; VIEW.h = h;
  clampView();
}
function clampView() {
  VIEW.w = Math.max(MIN_VIEW_W, Math.min(DESIGN_W, VIEW.w));
  VIEW.h = VIEW.w / ASPECT;
  if (VIEW.h > DESIGN_H) { VIEW.h = DESIGN_H; VIEW.w = VIEW.h * ASPECT; }
  VIEW.x = Math.max(0, Math.min(DESIGN_W - VIEW.w, VIEW.x));
  VIEW.y = Math.max(0, Math.min(DESIGN_H - VIEW.h, VIEW.y));
}
// persistence + deep links
function saveView() {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ v: VIEW })); } catch (e) { /* private mode */ }
}
function restoreView() {
  try {
    const s = localStorage.getItem(VIEW_KEY);
    if (s) { const o = JSON.parse(s); if (o && o.v) { VIEW = Object.assign(fullFrame(ASPECT), o.v); clampView(); } }
  } catch (e) { /* ignore */ }
}
// #crop=x,y,w,h  (honour the exact frame)  or  #zoom=z,cx,cy  (zoom about a centre)
function loadViewFromHash() {
  const hh = location.hash.replace(/^#/, "");
  const c = hh.match(/crop=([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
  if (c) {
    VIEW = { x: +c[1], y: +c[2], w: +c[3], h: +c[4] };
    ASPECT = VIEW.w / VIEW.h; clampView(); return;
  }
  const z = hh.match(/zoom=([\d.]+),([\d.]+),([\d.]+)/);
  if (z) {
    VIEW.w = DESIGN_W / +z[1]; VIEW.h = VIEW.w / ASPECT;
    VIEW.x = +z[2] - VIEW.w / 2; VIEW.y = +z[3] - VIEW.h / 2;
    clampView();
  }
}
// Meet-fit VIEW into the on-screen stage (centred) and apply the transform.
function renderView() {
  const area = document.querySelector(".poster-stage-area");
  const stage = document.getElementById("poster-stage");
  const page = document.getElementById("poster-page");
  if (!area || !stage || !page) return;
  const AW = area.clientWidth, AH = area.clientHeight;
  if (!AW || !AH) return;
  let sW = AW, sH = sW * VIEW.h / VIEW.w;        // stage = VIEW's aspect
  if (sH > AH) { sH = AH; sW = sH * VIEW.w / VIEW.h; }
  stage.style.width = sW + "px"; stage.style.height = sH + "px";
  const z = Math.min(sW / VIEW.w, sH / VIEW.h);  // exact (aspects match)
  const Tx = (sW - VIEW.w * z) / 2 - VIEW.x * z;
  const Ty = (sH - VIEW.h * z) / 2 - VIEW.y * z;
  page.style.transform = `translate(${Tx.toFixed(2)}px, ${Ty.toFixed(2)}px) scale(${z.toFixed(5)})`;
  lastRender = { z, Tx, Ty, sW, sH };
  const pct = document.getElementById("zoom-pct");
  if (pct) pct.textContent = Math.round(DESIGN_W / VIEW.w * 100) + "%";
  saveView();
}
let _stageObserved = false;
function ensureStageObserved() {
  if (_stageObserved) return; _stageObserved = true;
  const area = document.querySelector(".poster-stage-area");
  if (area && typeof ResizeObserver !== "undefined") new ResizeObserver(renderView).observe(area);
  window.addEventListener("resize", renderView);
}

// ---- zoom/pan: wheel + drag + pinch + buttons + keyboard ------------------
function screenToDesign(sx, sy) {
  return [(sx - lastRender.Tx) / lastRender.z, (sy - lastRender.Ty) / lastRender.z];
}
// Zoom by `factor` (<1 = in) keeping design point (fx,fy) under stage point (sx,sy).
function zoomAbout(fx, fy, sx, sy, factor) {
  VIEW.w = Math.max(MIN_VIEW_W, Math.min(DESIGN_W, VIEW.w * factor));
  VIEW.h = VIEW.w / ASPECT;
  const zNew = lastRender.sW / VIEW.w;
  VIEW.x = fx - sx / zNew;
  VIEW.y = fy - sy / zNew;
  clampView();
  renderView();
}
function _dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function _mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function initPosterZoom() {
  if (initPosterZoom._done) return; initPosterZoom._done = true;
  const stage = document.getElementById("poster-stage");
  if (!stage) return;
  const ptrs = new Map();
  let pan = null, pinch = null;
  stage.addEventListener("wheel", e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const [fx, fy] = screenToDesign(sx, sy);
    zoomAbout(fx, fy, sx, sy, e.deltaY > 0 ? 1.15 : 1 / 1.15);   // down = out, up = in
  }, { passive: false });
  stage.addEventListener("pointerdown", e => {
    stage.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { lastDist: _dist(a, b) };
      pan = null;
    } else {
      pan = { sx: e.clientX, sy: e.clientY, view: { ...VIEW } };
    }
  });
  stage.addEventListener("pointermove", e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = _dist(a, b);
      if (pinch.lastDist && Math.abs(d - pinch.lastDist) > 0.5) {
        const r = stage.getBoundingClientRect();
        const m = _mid(a, b), sx = m.x - r.left, sy = m.y - r.top;
        const [fx, fy] = screenToDesign(sx, sy);
        zoomAbout(fx, fy, sx, sy, pinch.lastDist / d);
        pinch.lastDist = d;
      }
    } else if (pan && ptrs.size === 1) {
      const z = lastRender.z;
      VIEW.x = pan.view.x - (e.clientX - pan.sx) / z;
      VIEW.y = pan.view.y - (e.clientY - pan.sy) / z;
      clampView();
      renderView();
    }
  });
  const endPtr = () => {
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) {
      const [p] = [...ptrs.values()];
      pan = { sx: p.x, sy: p.y, view: { ...VIEW } };   // resume 1-finger drag after pinch
    } else if (ptrs.size === 0) {
      pan = null;
    }
  };
  stage.addEventListener("pointerup", e => { ptrs.delete(e.pointerId); endPtr(); });
  stage.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); endPtr(); });
  const ctl = document.getElementById("zoom-ctl");
  if (ctl) ctl.addEventListener("click", e => {
    const b = e.target.closest("button[data-z]"); if (!b) return;
    const cx = lastRender.sW / 2, cy = lastRender.sH / 2;
    const [fx, fy] = screenToDesign(cx, cy);
    if (b.dataset.z === "in") zoomAbout(fx, fy, cx, cy, 1 / 1.3);
    else if (b.dataset.z === "out") zoomAbout(fx, fy, cx, cy, 1.3);
    else { VIEW = fullFrame(ASPECT); clampView(); renderView(); }   // fit
  });
  document.addEventListener("keydown", e => {
    const ae = document.activeElement;
    if (ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
    const cx = lastRender.sW / 2, cy = lastRender.sH / 2;
    const [fx, fy] = screenToDesign(cx, cy);
    const step = VIEW.w * 0.12;
    let h = true;
    if (e.key === "+" || e.key === "=") zoomAbout(fx, fy, cx, cy, 1 / 1.3);
    else if (e.key === "-" || e.key === "_") zoomAbout(fx, fy, cx, cy, 1.3);
    else if (e.key === "0") { VIEW = fullFrame(ASPECT); clampView(); renderView(); }
    else if (e.key === "ArrowLeft") { VIEW.x -= step; clampView(); renderView(); }
    else if (e.key === "ArrowRight") { VIEW.x += step; clampView(); renderView(); }
    else if (e.key === "ArrowUp") { VIEW.y -= step; clampView(); renderView(); }
    else if (e.key === "ArrowDown") { VIEW.y += step; clampView(); renderView(); }
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

  let cells = "", lines = "", names = "", marks = "";
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
    // range outline
    const r0 = globalCol(rge, 5), x0 = gx + r0 * cw;
    cells += `<rect x="${x0.toFixed(1)}" y="${gy}" width="${(cw * 6).toFixed(1)}" height="${gh}" fill="none" stroke="#5c3a1e" stroke-width="2.4"/>`;
    names += `<text x="${(x0 + cw * 3).toFixed(1)}" y="${(gy + gh + 30).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#5c3a1e">Range ${rge}</text>`;
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

  // legend (shifted right so it clears the corner flourish)
  const leg = [["#f5c544", "Settler"], ["#e06050", "C.P.R."], ["#4a78c8", "H.B.C."], ["#3f9e3f", "School"], ["#9a6fb0", "S.S.B."]];
  let lx = gx + 110;
  let legendSwatches = "";
  leg.forEach(([c, lab]) => {
    legendSwatches += `<rect x="${lx}" y="${gy + gh + 52}" width="16" height="12" fill="${c}" fill-opacity="0.5" stroke="#888"/>`;
    legendSwatches += `<text x="${lx + 22}" y="${gy + gh + 62}" font-family="Georgia,serif" font-size="12" fill="#4a3520">${lab}</text>`;
    lx += 40 + lab.length * 7.5;
  });

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${cells}${lakeGroup}${waterGroup}${riverLabels}${lines}${names}${marks}${lakeLabel}${legendSwatches}
  </svg>`;

  const page = document.getElementById("poster-page");
  page.innerHTML = `
    ${svg}
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
  buildPoster(currentPeriod);
  document.getElementById("poster-view").style.display = "block";
  applyPosterSize();
  markActiveSize();
  ensureStageObserved();
  initPosterZoom();
  restoreView();
  loadViewFromHash();
  // run after layout settles: now, next frame, and again after load (covers the
  // case where flex sizing lands a tick after the inline openPoster() call)
  renderView();
  requestAnimationFrame(() => requestAnimationFrame(renderView));
  window.addEventListener("load", renderView, { once: true });
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
function rebuildPoster() { if (document.getElementById("poster-view").style.display === "block") { buildPoster(currentPeriod); applyPosterSize(); } }

// Print size: inject @page + a transform so "Print / Save PDF" yields ONE page at
// the chosen physical size (drop the PDF at a print shop). The design is 1500×1000
// (3:2), so 24×36" landscape fills the sheet exactly; other sizes fit & centre.
function applyPosterSize() {
  const v = document.getElementById("poster-size").value;
  ASPECT = aspectForSize(v);
  refitViewToAspect();                          // frame tracks the chosen print size's aspect
  document.getElementById("tile-sheets").innerHTML = "";   // clear any previous tiles
  writePrintCSS();                              // inject from the (now final) view rect
  requestAnimationFrame(renderView);
}
// (Re)write the @media print rules from the CURRENT view rect + size. Called on
// size change AND right before printing, so the framed region — not a stale
// full sheet from when the size was picked — is what actually prints.
function writePrintCSS() {
  const sel = document.getElementById("poster-size");
  const hint = document.getElementById("poster-size-hint");
  let st = document.getElementById("poster-print-css");
  if (!st) { st = document.createElement("style"); st.id = "poster-print-css"; document.head.appendChild(st); }
  const v = sel.value;
  if (v === "tile") { buildTiles(st, hint); return; }
  const [W, H] = v ? v.split("x").map(Number) : [11, 8.5];   // "" → Letter landscape
  const DPI = 96, Wpx = W * DPI, Hpx = H * DPI;
  // meet-fit the VIEW rect into the page (exact edge-to-edge once aspect matches)
  const s = Math.min(Wpx / VIEW.w, Hpx / VIEW.h);
  const tx = (Wpx - VIEW.w * s) / 2 - VIEW.x * s;
  const ty = (Hpx - VIEW.h * s) / 2 - VIEW.y * s;
  st.textContent = `@media print {
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar,.zoom-ctl,#tile-sheets { display:none !important; }
    #poster-view { position:static; display:block; width:${W}in; height:${H}in; padding:0; margin:0; overflow:hidden; background:#fff; }
    .poster-stage-area { display:block; position:static; width:100%; height:100%; }
    .poster-stage { width:${W}in !important; height:${H}in !important; box-shadow:none !important; border:none !important; }
    .poster-page { width:${DESIGN_W}px !important; height:${DESIGN_H}px !important; max-width:none !important;
      transform: translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)}) !important;
      transform-origin: 0 0 !important; box-shadow:none; border:none; margin:0; }
  }`;
  hint.textContent = v ? `prints as one ${W}×${H}″ page — Save as PDF, then upload to a print shop`
                       : `prints to one landscape page (≈ Letter)`;
}
window.addEventListener("beforeprint", writePrintCSS);   // always print the current frame

// "Tile on Letter pages": split the poster across a grid of Letter-landscape pages
// (with a small overlap) you can print at home and tape together.
function buildTiles(st, hint) {
  const DPI = 96;
  const COLS = 2, ROWS = 2;                          // four Letter-landscape pages
  const PW = 11 * DPI, PH = 8.5 * DPI;               // page size in CSS px (landscape)
  const OV = 0.3 * DPI;                              // overlap for taping (~0.3")
  const STEPX = PW - OV, STEPY = PH - OV;
  const coverW = COLS * PW - (COLS - 1) * OV;        // total canvas covered by the grid
  const coverH = ROWS * PH - (ROWS - 1) * OV;
  // scale + centre the VIEW rect (not the full sheet) into the tiled canvas
  const s = Math.min(coverW / VIEW.w, coverH / VIEW.h);
  const offX = (coverW - VIEW.w * s) / 2 - VIEW.x * s;
  const offY = (coverH - VIEW.h * s) / 2 - VIEW.y * s;

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
        <div class="poster-page" style="width:${DESIGN_W}px;height:${DESIGN_H}px;transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(4)});transform-origin:top left;">${src}</div>
        ${guides}
        <div class="tilemark badge">Row ${r + 1} · Col ${c + 1} — trim dashed edge &amp; tape</div>
      </div>`;
    }
  }
  host.innerHTML = html;

  st.textContent = `@media print {
    @page { size: 11in 8.5in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar,.poster-stage-area,.zoom-ctl,#poster-page { display:none !important; }
    #poster-view { position:static; display:block; padding:0; margin:0; background:#fff; }
    #tile-sheets { display:block !important; }
  }`;
  hint.textContent = `${COLS}×${ROWS} Letter pages (landscape) — print all, trim the dashed edges, tape into one ~21×14″ poster`;
}
