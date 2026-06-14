# Cottonwood Historical Land Map

An interactive, editable map of historical land ownership in the **Cottonwood
district — Township 35, Ranges 2 & 3, West of the 5th Meridian** (central
Alberta), built from L.D.'s hand-drawn plat maps. The Dominion Land Survey
section grid is drawn over an OpenStreetMap base layer; settler names are shown
**by quarter-section**, switchable across four time periods, and the original
hand-drawn sheets can be overlaid and aligned on top of the grid. A one-click
**printable poster** produces a clean, framed sheet for any period.

## How to use

Open **`cottonwood-map.html`** in any browser (double-click it). An internet
connection is needed for the OpenStreetMap tiles and the Leaflet map library.

- **Period buttons** (top) switch between 1901–1911, 1905–1911, 1917, and 1927.
- The **layers control** (stacked-squares icon, top-left) switches the base map
  between OpenStreetMap, Topographic, Satellite (aerial), Light/minimal, and
  Voyager styles. (No historical Alberta tiles exist online — but the original
  plat-map overlays and the printable poster are the 1900s "layer".)
- The side panel's **⧉ Show original sheet** toggle overlays the matching
  hand-drawn map for the selected period; a **Sheet opacity** slider fades it,
  and a collapsed **Adjust sheet position** holds reposition/reset.
- **Click any section** to edit it (see *Editing* below).
- **Drag** a floating note or a landmark (school ★, house ⛪, ferry ⚓,
  bridge 🌉) to reposition it; positions are saved automatically.
- Section tints: **gold** = named settler, **red** = C.P.R. grant, **blue** =
  Hudson's Bay Co., **green** = school section, **purple** = Soldier Settlement
  Board.

### On a phone — `cottonwood-map-mobile.html`

Phones are automatically sent to **`cottonwood-map-mobile.html`**, a touch-first,
**view-only** version of the map (add `?desktop=1` to force the full map). It has a
full-screen map, a thumb-reachable **period selector** along the bottom, a
**☰ menu** (base-map switch · legend · links), and a **tap-a-section bottom sheet**
that shows that section's owners by quarter (NW / NE / SW / SE) for the chosen
period. Pinch to zoom; names appear as you zoom in. It reads the same data — the
same seed plus any edits saved in that browser — but **editing, overlays, and
printing stay on the full (desktop) map**. Deep-links: `#menu`, or `#s=3,22` to
open Sec 22 of Range 3.

## How the Survey Works — the illustrated guide

**`land-divisions.html`** is a companion page that explains *how the Dominion
Land Survey works* — meridians and baselines, the six-mile township, the
snaking section numbers, quarter-sections and LSDs, road allowances, correction
lines, and the reserved-land "checkerboard" (school, Hudson's Bay, railway) —
then narrows to the Cottonwood district. It's an illustrated scroll-through with
**interactive diagrams** built from the same DLS grid math the map uses, so the
lesson and the map agree. It's reachable from the **☰ menu** (top-right) on
every page.

There are two layouts, sharing one diagram engine (`dls-diagrams.js`):

- **`land-divisions.html`** — the desktop version (side-by-side text and
  diagrams). Phones are automatically sent to the mobile version; add
  `?desktop=1` to the URL to force the desktop layout.
- **`land-divisions-mobile.html`** — a full-screen, swipeable story tuned for
  iPhone, with the same interactive diagrams.

## The Story of the Survey — the history

**`dls-history.html`** is a second illustrated guide — the *history* behind the
survey rather than its geometry: Rupert's Land and the Hudson's Bay Company, the
Rupert's Land transfer, J.S. Dennis and the rejected 8-mile township, the Red
River resistance, the 1871 system and first survey post, the 1872 Dominion Lands
Act, the survey in practice, the long delay and Sifton's "Last Best West" boom,
and a Part Two comparing the Canadian DLS with the American PLSS (metes & bounds,
section-numbering, road allowances, clean grid vs patchwork). It adds five new
interactive pieces to `dls-diagrams.js`: an event **timeline**, an **8-mile vs
6-mile township** compare, a **DLS↔PLSS section-numbering** compare, a
**homestead-entries chart** (real 1874–1930 annual figures), and a **metes-&-
bounds vs grid** contrast — plus ~14 gpt-image-2 sepia plates.

- **`dls-history.html`** — desktop scrollytelling (phones auto-redirect;
  `?desktop=1` forces desktop).
- **`dls-history-mobile.html`** — the swipe-story version for phones.

The narrative and reference list are drawn from
`DLS_Historical_Background_and_US_Comparison.md` (in this repo).

## Editing — it all saves automatically

Click a section to open its editor. Each section is divided into the four real
DLS **quarter-sections** (NW / NE / SW / SE = 160 acres each):

- Type names into the quarter where they belong; click **+ name** to add more
  than one to a quarter. A name ending in **`?`** is treated as an uncertain
  reading and shown in a lighter italic tint — remove the `?` once verified.
- Use the **type buttons** to mark a whole section *C.P.R. / H.B.C. / School /
  S.S.B.* (this tints the entire section). Leave it on **Settlers** for ordinary
  homesteads.
- **Floating notes** are for anything that doesn't sit neatly in one quarter —
  add them here, then drag them into place on the map.
- Switch the **period tabs** inside the editor to fill in every year for that
  section in one sitting (your typing is saved as you switch).

Your edits live in the browser (localStorage), so they persist between visits on
the same computer. To back them up or move to another machine:

- **Export JSON** saves everything to a file.
- **Import JSON** loads such a file back.
- **Reset to original** restores the transcription shipped in
  `cottonwood-data.js` (export first if you want to keep your edits).

## Printing a poster

Click **🖨 Print poster (this period)**. This builds a clean, one-page sheet of
the selected period — the full township grid with names by quarter, owner tints,
landmarks, the **Red Deer River**, a legend, a compass rose, decorative borders,
and a title — **without** the web base map.

The poster toolbar has, left to right: a **date switcher** (1901–1911 … 1927) to
change the period without leaving the poster, a **🖨 Print ▾** button that opens a
submenu (the output sizes plus the **Print / Save PDF** action), and a **Gleniffer
Lake** toggle (on by default). Switch dates and repeat for a matching set of sheets.

The **🖨 Print ▾** submenu lists the output sizes:

| Size | Use |
|---|---|
| **Letter / one page** | quick home print (Letter or Tabloid, landscape) |
| **Tabloid 11×17″** | bigger home/office print |
| **Medium 18×24″** | small framed poster |
| **Poster 24×36″** | **recommended** — the design is 3∶2, so this fills the sheet edge-to-edge with no border |
| **Large 36×48″** | wall-sized print |
| **Tile on Letter pages** | print at home & tape together — see below |

Pick a size, then **Print / Save PDF** — Chrome/Edge produce a single PDF page at
exactly that physical size (everything scales together). For anything larger than
Tabloid, **Save as PDF and upload it to a print shop** (e.g. Staples) rather than
printing at home. Because the poster is laid out 3∶2, the **24×36″** option fills
the sheet perfectly; the other sizes fit-and-centre with a small margin. The whole
sheet is vector/text except the parchment and a few flourishes, so it stays crisp
when enlarged.

**Print &amp; tape at home.** The **Tile on Letter pages** option splits the poster
across **2×2 Letter sheets (landscape)** with a small overlap, making a finished
poster of roughly **21×14″**. Each sheet is labelled (*Row · Col*) and has a dashed
guide on its inner edges — print all four, trim along the dashed edges, and tape
them together. No print shop needed.

The river is drawn from its real OpenStreetMap course, mapped onto the section
grid (so it lines up with the sections the way L.D. drew it); the coordinates
are baked into `cottonwood-river.js` so no connection is needed at print time.
The river's channel didn't move when the Dickson Dam was built (1983) — the
reservoir just widened one reach — so this course also reflects the historical
river of 1901–1927.

The waterways are pulled with their OSM names, so they're labelled correctly:
the **Red Deer River** (main stem, drawn heavier) runs up the west side and
through the reservoir reach; the **Little Red Deer River** and **Raven River**
tributaries are drawn lighter and labelled where they cross the townships. Rivers
are rendered as smooth Catmull-Rom curves so they flow naturally.

OSM doesn't draw the river *through* the modern reservoir (it maps the lake as a
polygon instead), which would leave a gap in the channel. Rather than guess a
generic meander there, `maps/build_bridge.py` **traces the course L.D. drew by
hand** on the original plat maps, section by section — these maps record the pre-dam
river, which is exactly the reach now under the lake. The traced course (SW → NE):
along the **north edge** of the lake's narrow channel through Sec 15/14 (cliffs to
the north); into Sec 13 at the SW quarter, crossing diagonally to the NE quarter;
into Sec 24 at the SE quarter, undulating west to the SW quarter, up to the NW
quarter, then along the top to the NE quarter; into Sec 19 at the NW quarter (top),
down to the middle at the NE quarter; then NE to the lake's exit. The waypoints are
stored as `(range, section, fx, fy)` positions inside each DLS section (the same
grid the app uses) and converted to lat/lon; the two ends are snapped to the real
OSM Red Deer River stubs so the channel ties in seamlessly. The course is then
densified and **clipped to the Gleniffer Lake shoreline** (any point outside the
polygon is pulled just inside), so the drowned reach always sits within the
present-day lake. Edit the `WAYPOINTS` list to refine the trace, then re-run it
after `fetch_river.py`.

`fetch_river.py` drops tiny **unnamed** waterway fragments (< 0.9 km) — braided-
channel/island artifacts (e.g. the clutter that otherwise appears at the reservoir
inlet near Sec 34); all named rivers are kept regardless of length.

The poster's **Gleniffer Lake** toggle is **on by default**, overlaying a faint
dashed outline of today's reservoir for orientation — handy for comparing the old
map to the modern landscape. Uncheck it to show only the historical river.
Regenerate the river/lake geometry with `maps/fetch_river.py` (then
`maps/build_bridge.py`).

## Overlaying the original hand-drawn sheets

The sheets aren't drawn to scale, so each overlay can be pinned to the grid:

1. Turn an overlay on in **Original plat-map overlays** (or use *Show this
   period's sheet*).
2. Click **◎ Reposition** and follow the four prompts — click a section corner
   *as it appears on the sheet*, then *where it really belongs* on the grid, for
   the top-left and bottom-right. The sheet is stretched to fit. **Reset** puts
   it back. Positions are remembered.

The stitched overlays in `maps/merged_*c.JPG` were assembled from the original
photos (`maps/IMG_1674–1681`) with `maps/stitch_tps.py` (a thin-plate-spline
stitcher). Rotated/cleaned source copies are alongside them.

## Source photos → periods

| Sheet | Period | Notes |
|---|---|---|
| `merged_80_81` (`IMG_1680`/`1681`) | 1901–1911 | red dates = year of arrival/filing |
| `merged_78_79` (`IMG_1678`/`1679`) | 1905–1911 | |
| `merged_74_75` (`IMG_1674`/`1675`) | 1917 **and** 1927 | black/blue ink = 1917, red ink = 1927 |
| `merged_76_77` (`IMG_1676`/`1677`) | 1917 **and** 1927 | second copy of the same map |

## The transcription — `cottonwood-data.js`

This file is the **starting point** the app loads the first time (and what
*Reset to original* restores). Names were transcribed from the handwritten
sheets and **will contain errors** — verify each against the overlay and fix it
in the editor. The seed quarter assignments are a best-effort first pass; many
names whose exact quarter was unclear were placed in reading order, so expect to
move some.

Areas least certain (worth checking against the sheets first):

- **Rge 3 bottom row (Secs 1–4) in 1917/1927** — overlapping black and red
  entries (Pugh / Truman / Grundy / Ross / Cameron / Reinke / Legare).
- **Rge 2 Secs 4–6 in 1905–1911** (Watson / Getty / Webb cluster).
- **"Deduc"** could be *Leduc*; **"A. Wanton"** could be *A. Norton*;
  **"McLaughlin Motors"** (Sec 12, 1927) is an odd entry worth double-checking.
- School-site dates variously read 1904–1923, 1905–1923, 1923–1957, 1940–1947.

## Grid accuracy

The DLS grid is computed mathematically (township ≈ 6 mi + road allowances), so
it is accurate to roughly ±200 m. If the drawn grid sits visibly off the range
roads on the base map, adjust `latNudge` / `lonNudge` in the `CFG` block near the
top of the script in `cottonwood-map.html`.

## Decorative artwork — `art/`

The compass rose, corner flourishes, parchment texture, and title cartouche on
the printed poster — plus the illustration "plates" and divider ornaments on the
land-divisions guide (`pres-*`) — were generated with the OpenAI image API
(`art/generate_art.py`, reads `OPENAI_API_KEY` from the parent `.env`), using
**`gpt-image-2`**. That model has no transparent-background option, so ornaments
are drawn as light line-art on a dark backdrop and keyed to transparency in the
script (luminance → alpha, the approach `art/keyout.py` first used on the
cartouche). Run `python art/generate_art.py` for everything, a name for one asset
(e.g. `compass-rose`), or `presentation` for just the guide's set. Re-run only to
regenerate; the finished files are already in place (originals of the pre-image-2
ornaments are kept in `art/_legacy/`).

## Margin notes on the sheets (genealogy leads)

From `IMG_1678` margins: "Ancestry 1906 cen[sus]", "Webb Arthur — 4 35 2W",
"Hayes James — 10 35 1W(?)", "Hamilton Samuel — 14 35 2W", "Lamb Andrew —
2 W 35(?)". From `IMG_1681`: map signed **L.D.**. From `IMG_1680` margins:
"Fred Tingle NW 16 Township 35, 1905", "James Caldwell wife Anna, CPR(?) 1903".
