"""OSM draws the Red Deer River as a line everywhere EXCEPT through the Gleniffer
Lake reservoir (which it maps as a water polygon), leaving a gap in the channel.

For that drowned reach we DON'T guess a generic meander -- we trace the course
**L.D. drew by hand** on the original plat maps, section by section. These maps
record the pre-dam river, which is exactly what we want under the reservoir.

The traced course (downstream, SW -> NE), per L.D.'s sheets + the quarter-by-
quarter description:
  Sec 15/14 -- river runs along the NORTH EDGE of the (present-day) lake's narrow
  channel (cliffs to the north), descending fy0.67 -> ~fy0.13 ->
  Sec 13 -- enters the SW quarter, crosses diagonally to the NE quarter ->
  Sec 24 -- passes in at the SE quarter (mid), undulates WEST to the SW quarter,
  up into the NW quarter (mid), then turns to the NE quarter right along the top ->
  Sec 19 -- passes in at the NW quarter (top), undulates down to the middle at the
  NE quarter -> then NE toward the lake's exit (course beyond Sec 19 not specified,
  so a gentle continuation to the OSM stub).

Waypoints are given as (range, section, fx, fy) where fx is the fraction W->E and
fy is the fraction S->N within that DLS section -- the SAME grid the app uses
(CFG in cottonwood-map.html), replicated below. The first/last points are snapped
to the real OSM Red Deer River stubs so the channel ties in seamlessly. Stored
under COTTONWOOD_WATER.bridge. Re-runnable; run after fetch_river.py.
"""
import json
import numpy as np

PATH = "../cottonwood-river.js"

# --- DLS grid, mirroring CFG in cottonwood-map.html ----------------------------
MERIDIAN_LON, TWP_W, TWP_H, TWP = -114.0, 0.142654, 0.087447, 35
TWP_S = 49 + (TWP - 1) * TWP_H
SEC_H, SEC_W = TWP_H / 6, TWP_W / 6


def sec_rowcol(sec):
    row = (sec - 1) // 6
    i = (sec - 1) % 6
    colE = i if row % 2 == 0 else 5 - i          # columns counted from the EAST
    return row, colE


def sec_latlon(rge, sec, fx, fy):
    row, colE = sec_rowcol(sec)
    rge_east_lon = MERIDIAN_LON - (rge - 1) * TWP_W
    sw_lon = rge_east_lon - (colE + 1) * SEC_W
    sw_lat = TWP_S + row * SEC_H
    return [round(sw_lat + fy * SEC_H, 6), round(sw_lon + fx * SEC_W, 6)]


# --- hand-traced course through the lake reach (downstream, SW -> NE) -----------
# (range, section, fx W->E, fy S->N)
WAYPOINTS = [
    (3, 15, 0.55, 0.66),   # ~SW stub, on the lake's north shore
    (3, 15, 0.85, 0.46),   # along the lake's north edge, descending
    (3, 14, 0.15, 0.40),   # north edge of lake, Sec 14 west
    (3, 14, 0.48, 0.13),   # north edge of lake, Sec 14 mid (cliffs to the north)
    (3, 13, 0.25, 0.25),   # enters Sec 13 SW quarter
    (3, 13, 0.74, 0.74),   # crosses to Sec 13 NE quarter
    (3, 24, 0.70, 0.18),   # into Sec 24 SE quarter (mid)
    (3, 24, 0.25, 0.28),   # undulates WEST into Sec 24 SW quarter
    (3, 24, 0.31, 0.62),   # up into Sec 24 NW quarter (mid)
    (3, 24, 0.76, 0.92),   # turns into Sec 24 NE quarter, right along the top
    (2, 19, 0.20, 0.90),   # into Sec 19 NW quarter, at the top
    (2, 19, 0.72, 0.55),   # undulates to the middle at Sec 19 NE quarter
    (2, 20, 0.55, 0.62),   # NE continuation (not specified) -> toward exit
    (2, 29, 0.55, 0.55),
    (2, 34, 0.12, 0.97),   # ~NE stub: lake's NE exit
]
trace = np.array([sec_latlon(*w) for w in WAYPOINTS])   # [lat, lon]

# --- snap the ends to the real OSM Red Deer River stubs ------------------------
raw = open(PATH, encoding="utf-8").read()
head = raw[: raw.index("const COTTONWOOD_WATER")]
data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
data.pop("bridge", None)

rd_ends = []
for r, n in zip(data["rivers"], data["names"]):
    if n == "Red Deer River":
        rd_ends += [np.array(r[0]), np.array(r[-1])]
rd_ends = np.array(rd_ends)


def nearest(pt):
    return rd_ends[np.linalg.norm(rd_ends - pt, axis=1).argmin()]


stubA, stubB = nearest(trace[0]), nearest(trace[-1])
trace[0], trace[-1] = stubA, stubB

# --- densify (Catmull-Rom, matching the poster's smoothing) --------------------
def catmull(P, seg=10):
    out = []
    for i in range(len(P) - 1):
        p0 = P[i - 1] if i > 0 else P[i]
        p1, p2 = P[i], P[i + 1]
        p3 = P[i + 2] if i + 2 < len(P) else P[i + 1]
        for t in np.linspace(0, 1, seg, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t
                              + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-1])
    return np.array(out)


dense = catmull(trace)

# --- clip the lake reach to stay INSIDE the Gleniffer Lake outline -------------
# (the river ran through the valley now flooded; keep it within the shoreline,
#  but leave the two endpoints where they tie into the real OSM river)
poly = [(p[1], p[0]) for p in data["gleniffer"][0]]          # (lon, lat)
P = np.array(poly)


def inside(lon, lat):
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            c = not c
    return c


def pull_inside(lon, lat, margin=0.0011):
    """Nearest point on the shoreline, then step inward by `margin` (~85 m)."""
    pt = np.array([lon, lat])
    best_q, best_n, bd = None, None, 1e18
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        ab = b - a
        t = np.clip(np.dot(pt - a, ab) / (np.dot(ab, ab) + 1e-15), 0, 1)
        q = a + t * ab
        dd = np.dot(pt - q, pt - q)
        if dd < bd:
            bd = dd
            best_q = q
            best_n = np.array([-ab[1], ab[0]])
    best_n = best_n / (np.linalg.norm(best_n) + 1e-15)
    for s in (1, -1):                       # pick the inward side of the edge
        cand = best_q + s * best_n * margin
        if inside(cand[0], cand[1]):
            return cand[1], cand[0]          # back to (lat, lon)
    return best_q[1], best_q[0]


clipped = [dense[0]]
for la, lo in dense[1:-1]:
    if inside(lo, la):
        clipped.append([la, lo])
    else:
        nla, nlo = pull_inside(lo, la)
        clipped.append([nla, nlo])
clipped.append(dense[-1])

bridge_ll = [[round(float(la), 6), round(float(lo), 6)] for la, lo in clipped]
data["bridge"] = [bridge_ll]
out = head + "const COTTONWOOD_WATER = " + json.dumps(data) + ";\n"
open(PATH, "w", encoding="utf-8").write(out)
n_out = sum(1 for la, lo in dense[1:-1] if not inside(lo, la))
print(f"bridge: {len(bridge_ll)} pts (L.D.'s course, densified + clipped to lake)")
print(f"  pulled {n_out} pts back inside the shoreline")
print(f"  SW stub {bridge_ll[0]}  NE stub {bridge_ll[-1]}")
