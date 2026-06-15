"""Calibrate the DLS grid (latNudge/lonNudge in cottonwood-core.js CFG) from the
OSM road grid. The plain-numbered Range Roads (N-S) and Township Roads (E-W) are
the survey grid roads by definition; they should sit on the drawn section lines.
Their median offset IS the systematic positioning error -> set the nudges to it.

Letter-suffixed roads (Range Road 24A, Township Road 354A, …) are OSM realigned /
spur segments that don't sit on the canonical line, so they're excluded as
outliers by the |offset| < 500 m filter.

Stdlib only. Run after maps/fetch_roads.py:  python maps/calib.py
"""
import json
import math
import re
import statistics as st
from collections import defaultdict

SRC = r"C:\Users\markc\Documents\projects\cottonwood_fable\cottonwood-roads.js"
MER, TWPDeg, HDeg = -114.0, 0.142654, 0.087447
SEC_W, SEC_H = TWPDeg / 6, HDeg / 6
TWP_S = 49 + 34 * HDeg
WEST = (MER - 2 * TWPDeg) - 6 * SEC_W
NS = [WEST + k * SEC_W for k in range(13)]      # N-S section boundaries (lon)
EW = [TWP_S + r * SEC_H for r in range(7)]       # E-W section boundaries (lat)
mE = lambda d: d * 111000 * math.cos(math.radians(52.03))
mN = lambda d: d * 111000
nearest = lambda v, L: min(L, key=lambda g: abs(g - v))


def main():
    src = open(SRC).read()
    d = json.loads(src[src.index("{"):src.rindex("}") + 1])
    roads, names = d["roads"], d["names"]
    rr, tr = defaultdict(list), defaultdict(list)
    for pts, nm in zip(roads, names):
        if not nm:
            continue
        if re.match(r"Range Road \d+$", nm) and max(p[1] for p in pts) - min(p[1] for p in pts) < 0.006:
            rr[nm].append(st.median(p[1] for p in pts))
        elif re.match(r"Township Road \d+$", nm) and max(p[0] for p in pts) - min(p[0] for p in pts) < 0.006:
            tr[nm].append(st.median(p[0] for p in pts))
    lo = [st.median(v) - nearest(st.median(v), NS) for v in rr.values()]
    la = [st.median(v) - nearest(st.median(v), EW) for v in tr.values()]
    lof = [o for o in lo if abs(mE(o)) < 500]
    laf = [o for o in la if abs(mN(o)) < 500]
    ln, lt = st.median(lof), st.median(laf)
    print(f"Range Roads (filtered {len(lof)}/{len(lo)}): lon offset median {mE(ln):+.0f} m")
    print(f"Township Roads (filtered {len(laf)}/{len(la)}): lat offset median {mN(lt):+.0f} m")
    print(f"\n>>> CFG.latNudge = {lt:.6f}   (= {mN(lt):+.0f} m, + = grid north)")
    print(f">>> CFG.lonNudge = {ln:.6f}   (= {mE(ln):+.0f} m, + = grid east)")


if __name__ == "__main__":
    main()
