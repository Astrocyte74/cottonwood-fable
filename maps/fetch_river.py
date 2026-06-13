"""Fetch the Red Deer River (and any water bodies) course from OpenStreetMap
for the Cottonwood townships and bake it into ../cottonwood-river.js so the
printable poster can draw the river the way L.D.'s maps show it — without
any modern roads or labels, and without needing a network connection later.

Stdlib only (urllib). Run once:  python fetch_river.py
"""
import json
import urllib.parse
import urllib.request

# Township 35, Rge 2 & 3 W5 extent (matches CFG in cottonwood-map.html) + margin
SOUTH, NORTH = 51.9732 - 0.02, 52.0606 + 0.02
WEST, EAST = -114.4280 - 0.03, -114.1427 + 0.03
BBOX = f"{SOUTH},{WEST},{NORTH},{EAST}"

# Wider box for the named reservoir (it extends east/south of the townships)
LBBOX = f"{51.88},{-114.36},{52.12},{-113.98}"

QUERY = f"""
[out:json][timeout:60];
(
  way["waterway"="river"]({BBOX});
  way["natural"="water"]["name"~"Gleniffer",i]({LBBOX});
  relation["natural"="water"]["name"~"Gleniffer",i]({LBBOX});
);
out geom;
"""

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def fetch():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    last = None
    for url in ENDPOINTS:
        try:
            print(f"querying {url} ...")
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "cottonwood-map/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa
            print(f"  failed: {e}")
            last = e
    raise SystemExit(f"all Overpass endpoints failed: {last}")


def simplify(points, tol=0.00025):
    """Drop points closer than ~25 m to the previous kept point."""
    out = [points[0]]
    for p in points[1:]:
        dx = p[1] - out[-1][1]
        dy = p[0] - out[-1][0]
        if dx * dx + dy * dy >= tol * tol:
            out.append(p)
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def arclen_km(pts):
    """Approximate length of a [lat, lon] polyline in km."""
    import math
    tot = 0.0
    for a, b in zip(pts, pts[1:]):
        dla = (b[0] - a[0]) * 111.0
        dlo = (b[1] - a[1]) * 111.0 * math.cos(math.radians(a[0]))
        tot += math.hypot(dla, dlo)
    return tot


def main():
    res = fetch()
    rivers, names, gleniffer = [], [], []
    for el in res.get("elements", []):
        tags = el.get("tags", {})
        if el["type"] == "way" and "geometry" in el:
            pts = [[round(g["lat"], 6), round(g["lon"], 6)] for g in el["geometry"]]
            if len(pts) < 2:
                continue
            pts = simplify(pts)
            if tags.get("waterway") == "river":
                name = tags.get("name", "")
                # Drop tiny UNNAMED fragments (braided-channel / island artifacts,
                # e.g. the clutter at the reservoir inlet) — keep all named rivers.
                if not name and arclen_km(pts) < 0.9:
                    continue
                rivers.append(pts)
                names.append(name)
            elif tags.get("natural") == "water":      # Gleniffer Lake as a single way
                gleniffer.append(pts)
        elif el["type"] == "relation":                # Gleniffer Lake as a multipolygon
            for m in el.get("members", []):
                if m.get("type") == "way" and "geometry" in m and m.get("role") == "outer":
                    pts = [[round(g["lat"], 6), round(g["lon"], 6)] for g in m["geometry"]]
                    if len(pts) >= 3:
                        gleniffer.append(simplify(pts))

    from collections import Counter
    print(f"rivers={len(rivers)} gleniffer rings={len(gleniffer)}")
    print("river names:", dict(Counter(n or "(unnamed)" for n in names)))
    payload = {"rivers": rivers, "names": names, "gleniffer": gleniffer}
    js = ("// Red Deer River (historical course) + present-day Gleniffer Lake reservoir\n"
          "// for the Cottonwood townships, from OpenStreetMap (c) OSM contributors, ODbL.\n"
          "// Coordinates are [lat, lon]. Regenerate with maps/fetch_river.py\n"
          "const COTTONWOOD_WATER = " + json.dumps(payload) + ";\n")
    with open("../cottonwood-river.js", "w", encoding="utf-8") as f:
        f.write(js)
    print(f"wrote ../cottonwood-river.js ({len(js):,} bytes)")


if __name__ == "__main__":
    main()
