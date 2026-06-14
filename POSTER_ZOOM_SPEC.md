# Poster zoom-to-frame (Option A) — design spec

Status: **design, not yet implemented.** Goal: let the user zoom and pan the
printable sheet (`cottonwood-poster.html`) to frame a sub-region, and have that
framed region be exactly what prints — filling the chosen page size edge-to-edge.

This is one half of a shared capability. The same *view rect* primitive is what a
future "frame on the live map" (Option B) would set via map bounds; building it
here first keeps the work inside the poster page and proves the print path.

---

## 1. Architecture decision

**Apply zoom/pan as a CSS `transform` on `.poster-page` (the existing full
1500×1000 sheet), not by changing the SVG `viewBox` or migrating the DOM
overlays into the SVG.**

Reasons:

- The print pipeline is **already transform-based** (`poster.js:268-276`,
  `applyPosterSize` does `translate(tx,ty) scale(s)` on `.poster-page`). A crop
  is a natural generalization of that transform — same mechanism on screen and
  in print.
- The decorative overlays (corner flourishes, compass, title cartouche —
  `poster.js:191-204`) live as DOM siblings of the SVG and are carefully tuned
  in `cqw`. A transform on their shared parent (`.poster-page`) carries them
  along unchanged; a `viewBox` change would not, and would force a migration of
  ~10 elements into SVG. Lower blast radius to transform.
- `buildPoster(pid)` stays **unchanged** — it always emits the full sheet. Zoom
  and pan become a pure overlay layer (`renderView` + interaction handlers +
  `applyPosterSize` generalization). Clean separation, low risk to existing
  rendering.

**Consequence:** `.poster-page` layout is pinned to **exactly 1500×1000 px**
(design px = layout px, 1:1) on screen as well as in print (print already does
this at `poster.js:275`). All fitting/zoom/pan is done by one transform computed
from the view rect. Responsive scaling currently achieved via `max-width:100%`
is replaced by transform-fit into a stage — visually identical, mechanically
unified with print.

### Layout change

Wrap the sheet in a stage:

```
#poster-view
  .toolbar                 (unchanged, sticky)
  .poster-stage            (NEW — the framed viewport = print-preview box)
    .poster-page           (fixed 1500×1000; transformed by renderView)
      svg + DOM overlays   (unchanged)
  #tile-sheets             (unchanged)
```

`.poster-stage` is `overflow:hidden`, and its **aspect-ratio tracks the view
rect** (= the selected print size's aspect), maximized within the available
space. So the on-screen framed box is literally a preview of the printed page.

**`cqw` / container-query interaction (screenshot-verify).** Keep
`container-type: inline-size` **on `.poster-page`** (where it is today,
`cottonwood-poster.html:64`) — do *not* put it on `.poster-stage`. The overlays
(`.pd-corner`, `.poster-title`, `.pd-compass`) are sized in `cqw` = 1% of their
nearest query container's width; with container-type on `.poster-page` and its
width pinned to 1500px, `1cqw = 15px` (design px) and the overlays render at
their design sizes, then scale uniformly with the SVG under the transform —
visually identical to today. (A CSS transform is post-layout, so it does not
change the box a container query measures; wrapping is safe. The failure mode is
moving `container-type` onto the stage, which would make `cqw` resolve against
the stage and resize the overlays unexpectedly. This is the #1 thing to
screenshot-diff against today before going further.)

---

## 2. State model

All in `poster.js`, module scope:

```js
// View rect in the 1500×1000 design space. This is what prints.
let VIEW = { x: 0, y: 0, w: 1500, h: 1000 };

// Target aspect = selected print size's W/H (e.g. 36×24 → 1.5). VIEW always has
// this aspect. Source of truth: the #poster-size select.
function aspectForSize(v) {
  if (!v || v === "tile") return 11 / 8.5;        // Letter landscape
  const [W, H] = v.split("x").map(Number);
  return W / H;
}
let ASPECT = aspectForSize(document.getElementById("poster-size").value);
```

Invariants maintained after every change:

- `VIEW.w / VIEW.h === ASPECT`
- `0 ≤ VIEW.x ≤ 1500 - VIEW.w`  and  `0 ≤ VIEW.y ≤ 1000 - VIEW.h`  (clamped)
- `VIEW.w ≥ MIN_W` (e.g. **150** ≈ just over one section column of 125; prevents
  zooming in to nothing). Equivalent max zoom ≈ 10×.

A scalar zoom is convenient: `zoom = 1500 / VIEW.w` (1 = full width).

`fullFrame(aspect)` = the largest `aspect`-rect centred in `[0,1500]×[0,1000]` —
the default/reset view for a given size.

---

## 3. The math

### 3a. On screen — `renderView()`

Called on zoom, pan, resize, size change, period change, open. Measures the
stage and applies the transform. Because the stage's aspect is forced to VIEW's
aspect, fit is exact (no letterbox):

```js
function renderView() {
  const stage = document.querySelector(".poster-stage");
  const SW = stage.clientWidth, SH = stage.clientHeight;     // == VIEW aspect
  const z = SW / VIEW.w;                                      // == SH / VIEW.h
  const Tx = -VIEW.x * z, Ty = -VIEW.y * z;                   // pan VIEW to origin
  const page = document.getElementById("poster-page");
  page.style.transform = `translate(${Tx}px, ${Ty}px) scale(${z})`;
  page.style.transformOrigin = "0 0";
  stage.style.aspectRatio = (VIEW.w / VIEW.h).toFixed(4);     // keep stage == frame
}
```

(If the stage is allowed a free shape, use meet-fit `z = min(SW/VIEW.w, SH/VIEW.h)`
and centre with `Tx = (SW - VIEW.w*z)/2 - VIEW.x*z`. Forcing the stage aspect is
preferred — the stage *is* the page preview.)

### 3b. Print — `applyPosterSize()` (generalized)

Today this transforms the full 1500×1000 to fit the page
(`poster.js:268-276`). Generalize so the **view rect** is the content. Because
`VIEW` aspect == page aspect, it fills edge-to-edge:

```js
function applyPosterSize() {
  const v = document.getElementById("poster-size").value;
  ASPECT = aspectForSize(v);
  refitViewToAspect(ASPECT);              // keep centre + zoom, reshape to aspect
  renderView();                           // screen follows

  // ... (tile path unchanged in shape — see 3c)
  const [W, H] = v ? v.split("x").map(Number) : [11, 8.5];
  const DPI = 96, Wpx = W * DPI, Hpx = H * DPI;
  const z = Wpx / VIEW.w;                  // == Hpx / VIEW.h (aspects equal)
  const Tx = -VIEW.x * z, Ty = -VIEW.y * z;

  st.textContent = `@media print {
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { margin:0; padding:0; background:#fff; }
    /* hide chrome (same list as today) */
    .title-bar,.period-bar,.panel,.legend,#map,#adjust-banner,
    #poster-view .toolbar { display:none !important; }
    #poster-view { position:static; display:block; width:${W}in; height:${H}in;
      padding:0; margin:0; overflow:hidden; background:#fff; }
    .poster-page { width:1500px !important; height:1000px !important;
      max-width:none !important; aspect-ratio:auto !important;
      transform: translate(${Tx}px, ${Ty}px) scale(${z}) !important;
      transform-origin: 0 0 !important; box-shadow:none; border:none; margin:0; }
  }`;
}
```

Note this **unifies the `""` (Letter one-page) case**, which today falls back to
the static `@media print` in `cottonwood-poster.html:94-99`. Route `""` through
the same path (treat as 11×8.5) so every print uses the VIEW transform and the
dual CSS-source disappears.

**Screen vs print transforms must not fight — print wins by `!important`.**
`renderView` sets the on-screen transform as an *inline* `style.transform` on
`.poster-page`; the print path sets it via the injected `@media print` rule
above. An inline style would otherwise beat a stylesheet rule, so the print
transform carries `!important` (transform + transform-origin) to guarantee the
*cropped* view is what prints, at the correct physical size. (Today's code at
`poster.js:276` omits `!important` on the transform only because nothing sets an
inline transform yet — this refactor introduces one, so the `!important` becomes
mandatory.) The static `@media print` block at `cottonwood-poster.html:94-99` is
removed so there is exactly one print transform. Alternative to `!important`:
clear the inline transform in a `beforeprint` handler, restore it `afterprint`.

### 3c. Tiles — `buildTiles()` (generalized)

Today tiles the full sheet (`poster.js:283-322`). Generalize so the **framed
region (VIEW)** is what gets split across the 2×2 Letter grid: replace
`DW=1500/DH=1000` with `VIEW.w/VIEW.h` in the cover/scale/offset math, and pan
within VIEW per tile. The dashed trim guides and badges stay as-is.

---

## 4. Interaction

Pointer Events (mouse + touch + pen in one). `touch-action:none` on the stage so
browser pinch-zoom doesn't fight custom pinch.

- **Wheel zoom (desktop):** adjust `zoom` by `deltaY`; keep the design point
  under the cursor fixed. Focal design point `f` (from cursor position via the
  inverse of the renderView transform) stays put: after changing `VIEW.w`, solve
  for `VIEW.x` so `f` maps to the same screen px.
- **Pinch zoom (touch):** two pointers; track distance ratio; same focal logic
  on the midpoint.
- **Drag pan:** one pointer; `VIEW.x -= dx_design`, `VIEW.y -= dy_design`
  (screen delta ÷ current `z`); clamp.
- **Clamp:** enforce the §2 invariants after every gesture (re-impose aspect on
  the non-focal dim, then clamp position, then min-size).
- **Reset / Fit:** `VIEW = fullFrame(ASPECT)`, `renderView()`.
- **Keyboard (nice-to-have):** `+`/`-` zoom about centre; arrows pan; `0` reset.

**Pinch coexistence (see decision 5).** `.poster-stage` has `touch-action:none`,
so pinch/drag gestures that begin on the sheet are delivered to the handlers
above (framing), not to the browser. Decide separately whether to also suppress
browser page-zoom via the viewport meta on this page.

---

## 5. Decoration behaviour on sub-region prints

The overlays ride inside `.poster-page`, so they are cropped **honestly** to the
frame — a SE-quarter print shows the SE corner flourish and crops out the title
(centre-top) and legend (bottom).

- **v1 (default):** honest crop. Cheap, correct, matches "you framed a zoom."
- **v1.5 (recommended follow-up):** when `VIEW` is a strict sub-region, re-pin
  the **compass, period label, and a compact legend** to the frame so every
  print is self-describing (the grid/river/names stay honestly cropped). This is
  the only behaviour worth adding beyond honest crop; full decorative
  re-composition (re-fitting the title cartouche) is out of scope.

---

## 6. Controls / UI

- A small floating control, bottom-right of the stage, parchment-styled to match
  the `☰`/`snav` aesthetic: `−  [ 100% ]  +  ⤢(fit)`. Primary input remains
  wheel/pinch/drag; the widget is for discoverability + showing the live zoom %
  + a one-click "this frame prints" affordance.
- Toolbar gets a subtle "Framing on" hint when `VIEW` ≠ full frame, so it's
  obvious the print will be cropped.

---

## 7. Persistence & deep links

- Persist `VIEW` (and `ASPECT`) to `localStorage` (`cottonwood-poster-view-v1`)
  so a reload keeps the frame; "Reset" clears it. `VIEW` is kept across period
  switches (period changes data, not framing).
- Deep links: extend the existing `location.hash` reader
  (`cottonwood-poster.html:144-151`) to accept `#crop=x,y,w,h` (design units) or
  `#zoom=2.5,750,500` (zoom + centre). Reads cleanly alongside `#1917` /
  `#36x24`.

---

## 8. File-level change list

- **`poster.js`** — add `VIEW`/`ASPECT` state, `aspectForSize`, `fullFrame`,
  `refitViewToAspect`, `renderView`, interaction handlers, control wiring,
  persistence. Generalize `applyPosterSize` (§3b) and `buildTiles` (§3c). Call
  `renderView()` from `openPoster`, `setPosterPeriod`, `rebuildPoster`, and a
  `ResizeObserver` on the stage. `buildPoster` itself is unchanged.
- **`cottonwood-poster.html`** — add `.poster-stage` wrapper around
  `#poster-page`; pin `.poster-page` to `1500×1000` (drop the responsive
  `max-width:100%`/`aspect-ratio`); add stage CSS (`overflow:hidden`,
  `touch-action:none`, max sizing). Remove/retire the static `@media print`
  block (`:94-99`) now that `applyPosterSize` covers all sizes. Add the zoom
  control markup.
- **`README.md`** — short section: "Zoom the sheet to frame an area before you
  print."

No changes to `cottonwood-core.js`, `cottonwood-data.js`, `poster.js`'s geometry,
the live-map pages, or `site-nav.js`.

---

## 9. Decisions to confirm before building

1. **Aspect mode.** "Fill" (VIEW always = the selected size's aspect → every
   print is edge-to-edge; **changes Letter/Tabloid/Medium/Large output from
   today's fit-with-margin to full-bleed fill**) vs "legacy fit" (preserve
   today's margins when un-zoomed, only enforce aspect once the user zooms).
   **Recommend Fill** — more consistent and better WYSIWYG, and the margin
   change is an improvement. Confirm the full-bleed change is acceptable.
2. **Decoration re-anchor in v1?** Ship honest-crop only (v1), or include the
   compass/legend/period re-pin (v1.5) in the first release. **Recommend v1 =
   honest crop**, v1.5 right after.
3. **Persistence scope.** `localStorage` (survives reload) vs `sessionStorage`
   (per session) vs none. **Recommend localStorage + Reset.**
4. **Zoom control placement.** Floating bottom-right (Leaflet-like) vs a toolbar
   widget. **Recommend floating.**
5. **Mobile pinch-zoom coexistence.** The sheet page currently allows browser
   pinch-zoom (viewport meta has no `maximum-scale`/`user-scalable`,
   `cottonwood-poster.html:7`). Adding in-app framing zoom makes three zoom
   mechanisms on one screen. **Recommend:** capture pinch on the stage for
   *framing* (`touch-action:none`, §4) **and** set `user-scalable=no,
   maximum-scale=1` on the viewport meta **on this page only**, so pinch
   unambiguously means "frame," not "magnify the page." Mild accessibility cost,
   justified on a dedicated framing page. Alternative: leave browser zoom
   enabled off-stage and rely solely on `touch-action:none` to capture gestures
   that start on the sheet.

---

## 10. Build order (each increment independently verifiable)

1. Refactor: pin `.poster-page` to 1500×1000 (keep `container-type` on it, not
   the stage), add `.poster-stage`, run a `renderView()` that renders the full
   sheet. **Screenshot-diff overlays + sheet against today — output identical.**
2. Generalize `applyPosterSize` + `buildTiles` to use `VIEW` (still full).
   **Prints identical to today.**
3. Add `VIEW`/`ASPECT` state + `refitViewToAspect`; couple size → aspect; stage
   aspect tracks VIEW. Still no zoom. Verify frame reshapes with size.
4. Add wheel zoom (focal) + drag pan + clamp. Verify framing on screen + that the
   framed region prints.
5. Touch pinch + floating control (± / fit / %) + keyboard.
6. Persistence (`localStorage`) + deep links (`#crop=…`).
7. v1.5: re-pin compass/legend/period for sub-region prints.

Steps 1–2 are no-op-equivalent (a safe refactor that preserves today's output
exactly) before any new behaviour lands.

---

## 11. Out of scope / future

- **Option B (frame on the live map)** reuses this exact `VIEW` primitive: map
  bounds → design rect via the inverse of `posX/posY` (`poster.js:26-27`), handed
  to the poster page as `#crop=…`. No new core needed.
- Per-period or per-region saved "bookmarks" of framed views.
- Re-composed decorative frames for sub-region prints (full title re-fit) —
  explicitly deferred.
