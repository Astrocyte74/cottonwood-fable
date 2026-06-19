# Cottonwood Historical Land Map

An interactive, editable map of historical land ownership in the **Cottonwood
district — Township 35, Ranges 2 & 3, West of the 5th Meridian** (central
Alberta), built from L.D.'s hand-drawn plat maps. The Dominion Land Survey
section grid is drawn over an OpenStreetMap base layer; settler names are shown
**by quarter-section**, switchable across four time periods, and the original
hand-drawn sheets can be overlaid and aligned on top of the grid. A one-click
**printable poster** produces a clean, framed sheet for any period — and you can
**draw a frame** to print just the community area you care about.

The canvas now includes **Township 35–36 and Range 1** (blank, editable) so the
project can expand into neighbouring areas. A **Land-system** view on the live
map shows the survey structure — the snaking 1–36 section pattern, quarter-
sections, township/range boundaries, and the 5th Meridian — for education.

## How to use

Every page shares a **compact app header** (parchment-styled, fixed at the top):
the **✦ Cottonwood** wordmark (→ home), a subtitle, and a **☰ menu** for
navigation (Home · Printable map · Editable map · How the Survey Works · The
Story of the Survey). On the map pages, the header also holds the **controls
strip**: a **Maps** toggle (Printable / Editable), **Dates** (1901–1911 … 1927),
and (on the printable map) **Print ▾**.

**The printable map** (`cottonwood-poster.html`) is the front door — the clean
historical sheet. The map inside it **zooms and pans** (wheel, drag, pinch,
keyboard) within its fixed decorative frame (title, compass, corners, legend stay
pinned). A floating zoom control at bottom-right shows the zoom level. **🖨 Print ▾**
opens the size submenu + Print/Save PDF action.

**The editable map** (`cottonwood-map.html`, desktop) has the same header controls
plus a side **panel** led by **Print area (frame)** (draw a box to frame what the
poster will print) and a collapsed **Data & original sheets** section (export,
import, reset, plat-sheet overlays). **Click any section** — including blank
neighbour squares in Twp 36 / Rge 1 — to edit it.

- Section tints: **gold** = named settler, **red** = C.P.R., **blue** = H.B.C.,
  **green** = School, **purple** = S.S.B.
- **Drag** a floating note or a landmark (★ ⛪ ⚓ 🌉) to reposition; saves
  automatically.

### On a phone — `cottonwood-map-mobile.html`

Phones are sent to a touch-first version (add `?desktop=1` to force the full
map). Full-screen map, thumb-reachable **period selector** along the bottom, a
**☰ menu** (base-map · legend · links), and a **tap-a-section bottom sheet**.
Pinch to zoom; names appear as you zoom in. The same shared header sits at the
top. Editing stays on the desktop map.

## Land-system view

The editable map has a **View: Names | Land system** toggle (in the header
controls strip). In **Land system** mode:

- **Section squares fill with alternating row tints** — two tones flip every row,
  making the **boustrophedon (snaking) 1–36 pattern** visible on the real grid.
- **Large section numbers** (1–36) appear in every section (at zoom ≥ 12).
- **Quarter-section labels** (NW / NE / SW / SE) at high zoom (≥ 14).
- **Township/range boundaries** (thick dark borders) with **"Twp XX · Rge X W5M"**
  pill labels centred in each 6×6 block.
- The **5th Meridian** drawn as a dotted blue-teal line through and beyond the
  townships, with a rotated **"5th Meridian (W5M)"** label following the line.
- Settler names, tints, and landmarks hidden — clean structure view.
- Labels **shorten at low zoom** (full pills → "T35 · Rge 2" → axis-style "Twp 35"
  / "Rge 2") so they never overlap.

Toggle back to **Names** for the data view.

## Framing a print area

On the editable map, the panel's **Print area (frame)** section lets you draw a
soft geographic rectangle over the canvas:

1. Click **✏ Draw frame** — a crosshair cursor appears.
2. **Click-drag a box** over the community area (can cross township lines —
   Cottonwood + a slice of the next township, for example).
3. Four **brown corner handles** appear — drag one to fine-tune the bounds
   (opposite corner stays fixed). **Esc** cancels a draw-in-progress.
4. The dashed box is exactly what the poster will include.
5. **↻ Clear** reverts to printing everything.

The frame persists (localStorage) and is **capped at ~4 townships** so you can't
accidentally print the whole county. The poster prints **only the framed
sections** (letterboxed into the sheet), with the subtitle reflecting the frame's
township/range span.

## Present-day roads overlay

The printable poster can overlay **present-day roads** (from OpenStreetMap) as a
faint orientation layer — the same pipeline as the river: `maps/fetch_roads.py`
queries Overpass for vehicular highways in the township bbox, bakes them (with
their highway class) into `cottonwood-roads.js`; `poster.js` draws them as
**white lines with a charcoal casing** (classic road symbol) on top of the grid.
A **Display ▾** dropdown on the poster offers **roads off / major / all** (major
= secondary + tertiary through-roads; all = + the rural range/township grid
roads + residential). Choice persists.

## Editing — it all saves automatically

Click a section (blank or filled) to open its editor. Each section is divided
into the four real DLS **quarter-sections** (NW / NE / SW / SE = 160 acres each):

- Type names into the quarter where they belong; click **+ name** to add more.
  A name ending in **`?`** = uncertain reading (lighter italic tint).
- **Type buttons** mark a whole section *C.P.R. / H.B.C. / School / S.S.B.*
- **Floating notes** for anything that doesn't sit in one quarter.
- **Period tabs** to fill in every year in one sitting (saved as you switch).

Data keys are **`T{twp}R{rge}S{sec}`** (e.g. `T35R3S16` = Sec 16, Rge 3, Twp 35).
The app **auto-migrates** old `R{rge}S{sec}` keys on first load (non-destructive —
the old blob is left as a recovery fallback).

Edits live in the browser (localStorage). **Export JSON** / **Import JSON** /
**Reset to original** are in the panel's collapsed **Data & original sheets**
section (under **Print area (frame)**).

## Printing a poster

The **printable map** (`cottonwood-poster.html`) *is* the sheet: the full
township grid with names by quarter, owner tints, landmarks, the **Red Deer
River**, a legend, a compass rose, decorative borders, and a title — **without**
the web base map. The map inside the sheet **zooms and pans** so you can inspect
detail; the decorative frame stays fixed.

The header has a **date switcher** (1901–1911 … 1927), a **🖨 Print ▾** submenu,
and a **Display ▾** dropdown (roads + Gleniffer Lake). **If you drew a frame** on
the editable map, the poster prints only that framed area (letterboxed).

| Size | Use |
|---|---|
| **Letter / one page** | quick home print |
| **Tabloid 11×17″** | bigger home/office print |
| **Medium 18×24″** | small framed poster |
| **Poster 24×36″** | **recommended** — 3∶2 fills edge-to-edge |
| **Large 36×48″** | wall-sized print |
| **Tile on Letter pages** | print at home & tape together |

The **Tile** option splits the poster across **2×2 Letter sheets (landscape)**
with overlap — print all four, trim the dashed edges, tape into one ~21×14″ sheet.

The river is drawn from its real OSM course, mapped onto the grid (baked in
`cottonwood-river.js`); the **Gleniffer Lake** toggle overlays the modern
reservoir. Regenerate with `maps/fetch_river.py` then `maps/build_bridge.py`.
Present-day roads regenerate with `maps/fetch_roads.py`.

## Overlaying the original hand-drawn sheets

The sheets aren't drawn to scale, so each overlay can be pinned to the grid:

1. Turn an overlay on in **Data & original sheets** (collapsed in the panel).
2. Click **◎ Reposition** and follow the four prompts — click a section corner
   *as it appears on the sheet*, then *where it really belongs* on the grid, for
   the top-left and bottom-right. **Reset** puts it back. Positions are remembered.

The stitched overlays in `maps/merged_*c.JPG` were assembled from the original
photos (`maps/IMG_1674–1681`) with `maps/stitch_tps.py`.

## Source photos → periods

| Sheet | Period | Notes |
|---|---|---|
| `merged_80_81` (`IMG_1680`/`1681`) | 1901–1911 | red dates = year of arrival/filing |
| `merged_78_79` (`IMG_1678`/`1679`) | 1905–1911 | |
| `merged_74_75` (`IMG_1674`/`1675`) | 1917 **and** 1927 | black/blue ink = 1917, red ink = 1927 |
| `merged_76_77` (`IMG_1676`/`1677`) | 1917 **and** 1927 | second copy of the same map |

## The transcription — `cottonwood-data.js`

The **starting point** the app loads first (and what *Reset to original* restores).
Keys: `T35R{rge}S{sec}`. Names transcribed from the handwritten sheets — **will
contain errors**. Verify against the overlay and fix in the editor. The seed
quarter assignments are a best-effort first pass; many names whose exact quarter
was unclear were placed in reading order.

Areas least certain (worth checking against the sheets first):

- **Rge 3 bottom row (Secs 1–4) in 1917/1927** — overlapping black and red entries.
- **Rge 2 Secs 4–6 in 1905–1911** (Watson / Getty / Webb cluster).
- **"Deduc"** could be *Leduc*; **"A. Wanton"** could be *A. Norton*.

## Grid accuracy

The DLS grid is computed mathematically (township ≈ 6 mi + road allowances). Its
absolute position is calibrated to the real survey grid via `latNudge` / `lonNudge`
in `CFG` (`cottonwood-core.js`, shared by the poster + both maps):
`maps/calib.py` measures the median offset of the Range Roads (N-S) and Township
Roads (E-W) from the drawn section lines — currently **lon −138 m, lat −382 m**,
bringing the grid onto the road grid to within **0–4 m**. Re-run after
`maps/fetch_roads.py` if road data is refreshed. Residual error (correction-line
jogs past Twp 36, convergence within a township is only a few metres) is well
under the raw math's ~±200 m.

## Expanding to neighbouring areas

The canvas (`CFG.canvas` in `cottonwood-core.js`) currently covers **Twp 35–36,
Rge 1–3**. Blank sections in Twp 36 / Rge 1 are editable (click + add names).
To widen further, add townships/ranges to the `canvas` array. River/road data
should be regenerated with a wider bbox in `fetch_river.py` / `fetch_roads.py`.
Correction lines (every 4 townships) mean the uniform grid is only exact within
the Twp 33–36 block; Twp 37+ would need jog modeling.

## Decorative artwork — `art/`

Generated with `art/generate_art.py` (OpenAI `gpt-image-2`, reads
`OPENAI_API_KEY` from `../../.env`). Ornaments are drawn as light line-art on a
dark backdrop and keyed to transparency (luminance → alpha). Run for everything
or one asset. The finished files are already in place (`art/_legacy/` has the
pre-image-2 originals).

## Educational video — `cottonwood-video/`

A separate Remotion project (`~/Documents/projects/cottonwood-video/`) produces
an animated educational video about the DLS: meridians drawing across a vintage
Alberta map → zoom into Cottonwood → the 6×6 grid assembling → the snaking
1–36 numbering → quarter-sections → settler names appearing. Continuous crossfade
transitions. 1920×1080, 24.8s. Render: `npx remotion render DLS out/cottonwood-dls-full.mp4`.

## Margin notes on the sheets (genealogy leads)

From `IMG_1678` margins: "Ancestry 1906 cen[sus]", "Webb Arthur — 4 35 2W",
"Hayes James — 10 35 1W(?)", "Hamilton Samuel — 14 35 2W", "Lamb Andrew —
2 W 35(?)". From `IMG_1681`: map signed **L.D.**. From `IMG_1680` margins:
"Fred Tingle NW 16 Township 35, 1905", "James Caldwell wife Anna, CPR(?) 1903".
