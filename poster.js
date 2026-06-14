// Shared printable-poster engine for the Cottonwood map (desktop + mobile).
// Loaded BEFORE each page's main inline script. Depends on globals each page
// defines: CFG, SEC_W, SEC_H, TWP_S, secRowCol, getCell, fillFor, TYPE_INFO,
// QUARTERS, QUAD_POS, DATA, LANDMARK_GLYPH, COTTONWOOD_SEED, COTTONWOOD_WATER,
// renderPeriod, currentPeriod, plus the #poster-view markup.
"use strict";

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
  renderPeriod(pid);          // keep the underlying map + side period bar in sync
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
  const sel = document.getElementById("poster-size");
  const hint = document.getElementById("poster-size-hint");
  let st = document.getElementById("poster-print-css");
  if (!st) { st = document.createElement("style"); st.id = "poster-print-css"; document.head.appendChild(st); }
  const v = sel.value;
  document.getElementById("tile-sheets").innerHTML = "";   // clear any previous tiles
  if (!v) {
    st.textContent = "";
    hint.textContent = "prints to one landscape page (≈ Letter/Tabloid)";
    return;
  }
  if (v === "tile") { buildTiles(st, hint); return; }
  const [W, H] = v.split("x").map(Number);          // inches, landscape (W ≥ H)
  const DPI = 96, DW = 1500, DH = 1000;             // CSS px per inch + design size
  const Wpx = W * DPI, Hpx = H * DPI;
  const s = Math.min(Wpx / DW, Hpx / DH);
  const tx = (Wpx - DW * s) / 2, ty = (Hpx - DH * s) / 2;
  st.textContent = `@media print {
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar { display:none !important; }
    #poster-view { position:static; display:block; width:${W}in; height:${H}in; padding:0; margin:0; overflow:hidden; background:#fff; }
    .poster-page { width:${DW}px !important; height:${DH}px !important; max-width:none !important; aspect-ratio:auto !important;
      transform: translate(${tx}px, ${ty}px) scale(${s}); transform-origin: top left; box-shadow:none; border:none; margin:0; }
  }`;
  hint.textContent = `prints as one ${W}×${H}″ page — Save as PDF, then upload to a print shop`;
}

// "Tile on Letter pages": split the poster across a grid of Letter-landscape pages
// (with a small overlap) you can print at home and tape together.
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
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,#poster-view .toolbar,#poster-page { display:none !important; }
    #poster-view { position:static; display:block; padding:0; margin:0; background:#fff; }
    #tile-sheets { display:block !important; }
  }`;
  hint.textContent = `${COLS}×${ROWS} Letter pages (landscape) — print all, trim the dashed edges, tape into one ~21×14″ poster`;
}
