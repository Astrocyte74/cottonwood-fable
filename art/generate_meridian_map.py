"""Create an accurate antique-style Dominion Land Survey meridian schematic.

The plate is deterministic by design: no generated geography is used because
AI map bases can hallucinate coastlines, mountains, and province relationships.
Only parchment texture and decorative survey-map marks are illustrative; all
meridian positions and the Cottonwood marker are placed from DLS coordinates.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
W, H = 1536, 1024
MAP = {
    "lon_w": -119.5,
    "lon_e": -96.0,
    "lat_s": 49.0,
    "lat_n": 56.9,
}
MERIDIANS = [
    ("6TH MERIDIAN", -118.0),
    ("5TH MERIDIAN", -114.0),
    ("4TH MERIDIAN", -110.0),
    ("3RD MERIDIAN", -106.0),
    ("2ND MERIDIAN", -102.0),
    ("1ST MERIDIAN", -97.4579),
]
# Cottonwood is Township 35, Ranges 2 & 3 west of the 5th Meridian.
# For the broad schematic, place the star in the second range block west of the
# 5th so it reads as close to the meridian, not halfway to the 6th.
# Same DLS constants as cottonwood-core.js: 5th meridian at 114 W, range width
# ~= 0.142654 degrees, with a tiny calibrated longitude nudge.
COTTONWOOD = (-114.2160, 52.02)


def font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf" if bold else "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


F_TITLE = font(46, bold=True)
F_LABEL = font(24, bold=True)
F_SMALL = font(18, bold=True)
F_BASE = font(34, bold=True)
INK = (48, 35, 20)
INK_SOFT = (82, 61, 39)
BLUE = (68, 93, 105)
WATER = (116, 139, 126)
MOUNTAIN = (83, 73, 53)


def x_for_lon(lon: float) -> float:
    return 58 + (lon - MAP["lon_w"]) / (MAP["lon_e"] - MAP["lon_w"]) * (W - 116)


def y_for_lat(lat: float) -> float:
    return 900 - (lat - MAP["lat_s"]) / (MAP["lat_n"] - MAP["lat_s"]) * 780


def text_center(draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, fnt, fill=INK) -> None:
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)


def draw_rotated_label(base: Image.Image, center: tuple[float, float], text: str) -> None:
    label = Image.new("RGBA", (260, 42), (0, 0, 0, 0))
    d = ImageDraw.Draw(label)
    text_center(d, (130, 20), text, F_LABEL, INK)
    label = label.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    base.alpha_composite(label, (int(center[0] - label.width / 2), int(center[1] - label.height / 2)))


def draw_star(draw: ImageDraw.ImageDraw, cx: float, cy: float, r1: float = 16, r2: float = 6) -> None:
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    draw.polygon(pts, fill=INK)


def draw_squiggle(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], color, width=2) -> None:
    draw.line(points, fill=color, width=width, joint="curve")
    draw.line([(x + 2, y) for x, y in points], fill=(180, 155, 105), width=1)


def make_background() -> Image.Image:
    parchment = Image.open(ROOT / "parchment.jpg").convert("RGB").resize((W, H))
    parchment = ImageEnhance.Color(parchment).enhance(0.72)
    parchment = ImageEnhance.Contrast(parchment).enhance(1.08)
    img = parchment.convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (236, 219, 179, 88))
    img.alpha_composite(overlay)
    random.seed(35)
    d = ImageDraw.Draw(img)
    for _ in range(1700):
        x, y = random.randrange(W), random.randrange(H)
        a = random.randrange(9, 34)
        c = random.choice([(92, 61, 31, a), (255, 244, 213, a), (46, 34, 22, a)])
        d.ellipse((x, y, x + random.randrange(1, 4), y + random.randrange(1, 3)), fill=c)
    return img


def draw_border(draw: ImageDraw.ImageDraw) -> None:
    for inset, width in [(12, 3), (23, 2), (31, 1)]:
        draw.rectangle((inset, inset, W - inset, H - inset), outline=INK, width=width)
    for x in range(48, W - 48, 32):
        draw.line((x, 26, x + 18, 26), fill=(96, 72, 45), width=1)
        draw.line((x, H - 26, x + 18, H - 26), fill=(96, 72, 45), width=1)
    for sx in [46, W - 46]:
        for sy in [46, H - 46]:
            r = 28
            draw.arc((sx - r, sy - r, sx + r, sy + r), 0, 360, fill=INK, width=2)
            draw.line((sx, sy, sx + (18 if sx < W / 2 else -18), sy), fill=INK, width=2)
            draw.line((sx, sy, sx, sy + (18 if sy < H / 2 else -18)), fill=INK, width=2)


def draw_region_texture(draw: ImageDraw.ImageDraw) -> None:
    # Rockies, intentionally decorative but west of Alberta.
    for i in range(18):
        bx = 70 + i * 13
        by = 170 + i * 25
        for j in range(5):
            x = bx + j * 20 + (i % 3) * 7
            y = by + j * 13
            draw.polygon([(x, y), (x - 16, y + 50), (x + 22, y + 50)], outline=MOUNTAIN, fill=None)
            draw.line((x, y, x + 3, y + 48), fill=MOUNTAIN, width=1)

    # Simplified prairie rivers and lakes as antique texture.
    rivers = [
        [(-116.3, 55.6), (-116.0, 54.8), (-115.4, 54.1), (-114.9, 53.4), (-114.5, 52.7), (-114.1, 52.0), (-113.8, 51.3), (-113.6, 50.4)],
        [(-111.4, 55.4), (-111.1, 54.5), (-110.6, 53.7), (-110.3, 52.8), (-109.9, 51.9), (-109.6, 50.9)],
        [(-104.6, 55.9), (-104.2, 54.8), (-103.7, 53.5), (-103.2, 52.3), (-102.8, 51.3), (-102.5, 50.2)],
    ]
    for river in rivers:
        pts = []
        for idx, (lon, lat) in enumerate(river):
            x, y = x_for_lon(lon), y_for_lat(lat)
            pts.append((x + math.sin(idx * 1.7) * 18, y))
        draw_squiggle(draw, pts, BLUE, width=2)

    lakes = [
        (-101.0, 53.8, 140, 330),
        (-100.0, 52.6, 62, 42),
        (-105.4, 53.2, 76, 45),
        (-106.5, 50.9, 58, 36),
    ]
    for lon, lat, ww, hh in lakes:
        cx, cy = x_for_lon(lon), y_for_lat(lat)
        draw.ellipse((cx - ww / 2, cy - hh / 2, cx + ww / 2, cy + hh / 2), outline=INK_SOFT, fill=(*WATER, 70), width=2)
        for yy in range(int(cy - hh / 2) + 6, int(cy + hh / 2), 8):
            draw.line((cx - ww / 2 + 10, yy, cx + ww / 2 - 10, yy), fill=(82, 61, 39, 75), width=1)

    # Light township/range framework.
    for lon in [x / 2 for x in range(-238, -191)]:
        x = x_for_lon(lon)
        if 55 <= x <= W - 55:
            draw.line((x, 126, x, 900), fill=(92, 68, 41, 30), width=1)
    for lat in [49 + i * 0.35 for i in range(1, 22)]:
        y = y_for_lat(lat)
        draw.line((58, y, W - 58, y), fill=(92, 68, 41, 26), width=1)


def main() -> None:
    img = make_background()
    draw = ImageDraw.Draw(img, "RGBA")
    draw_border(draw)
    draw_region_texture(draw)

    # Province boundaries align with DLS meridians here.
    x4 = x_for_lon(-110)
    x2 = x_for_lon(-102)
    draw.line((x4, 82, x4, 908), fill=(36, 27, 18, 145), width=2)
    draw.line((x2, 82, x2, 908), fill=(36, 27, 18, 145), width=2)
    text_center(draw, ((58 + x4) / 2, 84), "ALBERTA", F_TITLE)
    text_center(draw, ((x4 + x2) / 2, 84), "SASKATCHEWAN", F_TITLE)
    text_center(draw, ((x2 + W - 58) / 2, 84), "MANITOBA", F_TITLE)

    # 49th-parallel base line.
    baseline_y = y_for_lat(49.0)
    draw.line((58, baseline_y, W - 58, baseline_y), fill=INK, width=3)
    text_center(draw, (W / 2, baseline_y + 38), "49TH PARALLEL  (BASE LINE)", F_BASE)

    # Principal meridians, placed by longitude.
    for label, lon in MERIDIANS:
        x = x_for_lon(lon)
        draw.line((x, 122, x, baseline_y), fill=INK, width=2)
        draw.ellipse((x - 4, baseline_y - 4, x + 4, baseline_y + 4), outline=INK, width=2)
        draw_rotated_label(img, (x - 10, 518), label)

    # Cottonwood: just west of 5th meridian.
    cx, cy = x_for_lon(COTTONWOOD[0]), y_for_lat(COTTONWOOD[1])
    draw_star(draw, cx, cy)
    draw.line((cx + 14, cy + 3, cx + 76, cy + 20), fill=INK, width=1)
    draw.rounded_rectangle((cx + 72, cy + 2, cx + 284, cy + 50), radius=5, fill=(238, 224, 190, 205), outline=(126, 91, 55), width=1)
    draw.text((cx + 84, cy + 8), "COTTONWOOD", font=F_SMALL, fill=INK)
    draw.text((cx + 84, cy + 31), "RANGES 2-3 WEST OF 5TH", font=font(15, bold=True), fill=INK_SOFT)

    # Compass rose.
    cc = (142, 814)
    for i in range(16):
        ang = -math.pi / 2 + i * math.pi / 8
        r = 78 if i % 2 == 0 else 43
        p1 = (cc[0] + math.cos(ang) * r, cc[1] + math.sin(ang) * r)
        p2 = (cc[0] + math.cos(ang + 0.14) * 12, cc[1] + math.sin(ang + 0.14) * 12)
        p3 = (cc[0] + math.cos(ang - 0.14) * 12, cc[1] + math.sin(ang - 0.14) * 12)
        draw.polygon([p1, p2, p3], fill=INK if i % 2 == 0 else (238, 224, 190, 165), outline=INK)
    draw.ellipse((cc[0] - 84, cc[1] - 84, cc[0] + 84, cc[1] + 84), outline=INK, width=2)
    text_center(draw, (cc[0], cc[1] - 108), "N", F_LABEL)
    text_center(draw, (cc[0], cc[1] + 108), "S", F_LABEL)
    text_center(draw, (cc[0] - 108, cc[1]), "W", F_LABEL)
    text_center(draw, (cc[0] + 108, cc[1]), "E", F_LABEL)

    out = img.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=3))
    for path in [ROOT / "pres-meridian-map.jpg", ROOT / "full" / "pres-meridian-map.jpg"]:
        path.parent.mkdir(parents=True, exist_ok=True)
        out.save(path, quality=92, subsampling=0)
        print(path)


if __name__ == "__main__":
    main()
