"""Fetch present-day roads from OpenStreetMap for the Cottonwood townships and
bake them into ../cottonwood-roads.js so the printable poster can overlay them
as a faint, toggleable orientation layer — the present-day road grid (range
roads, highways, etc.) on top of the historical map — without needing a network
connection at view/print time.

Vehicular roads only (pedestrian / service / track clutter dropped). Each way
keeps its highway class so the poster can filter "major" vs "all" client-side.

Stdlib only (urllib). Run once:  python maps/fetch_roads.py
"""
import json
import os
import urllib.parse
import urllib.request

# Township 35-36, Rge 1-3 W5 extent (matches CFG.canvas / fetch_river.py) + margin
SOUTH, NORTH = 51.9732 - 0.02, 52.0606 + 0.087447 + 0.02
WEST, EAST = -114.4280 - 0.03, -114.1427 + 0.142654 + 0.03
BBOX = f"{SOUTH},{WEST},{NORTH},{EAST}"

# Vehicular highways; drop pedestrian/service/track clutter
EXCLUDE = ("footway|path|cycleway|bridleway|steps|corridor|service|track|"
           "construction|proposed|raceway|rest_area|bus_stop|elevator")
QUERY = f"""
[out:json][timeout:60];
( way["highway"]["highway"!~"{EXCLUDE}"]({BBOX}); );
out geom;
"""

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cottonwood-roads.js")


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
        if (p[1] - out[-1][1]) ** 2 + (p[0] - out[-1][0]) ** 2 >= tol * tol:
            out.append(p)
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def main():
    res = fetch()
    roads, classes, names = [], [], []
    for el in res.get("elements", []):
        if el.get("type") == "way" and "geometry" in el:
            pts = [[round(g["lat"], 6), round(g["lon"], 6)] for g in el["geometry"]]
            if len(pts) < 2:
                continue
            roads.append(simplify(pts))
            classes.append(el.get("tags", {}).get("highway", ""))
            names.append(el.get("tags", {}).get("name", ""))
    from collections import Counter
    print(f"roads={len(roads)}")
    print("classes:", dict(Counter(classes)))
    payload = {"roads": roads, "classes": classes, "names": names}
    js = ("// Present-day roads for the Cottonwood townships, from OpenStreetMap\n"
          "// (c) OSM contributors, ODbL. Coordinates are [lat, lon].\n"
          "// Regenerate with maps/fetch_roads.py\n"
          "const COTTONWOOD_ROADS = " + json.dumps(payload) + ";\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"wrote {os.path.normpath(OUT)} ({len(js):,} bytes)")


if __name__ == "__main__":
    main()
