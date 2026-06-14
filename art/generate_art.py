"""Generate vintage-survey art for the Cottonwood poster + land-divisions page.

Stdlib (urllib) for the API call, Pillow/numpy for the transparency keyout.
Reads OPENAI_API_KEY from ../../.env (the projects/.env). Calls the OpenAI
Images API (gpt-image-2) and writes PNG/JPG files into this folder.

gpt-image-2 note: it does NOT support transparent backgrounds (the API rejects
background="transparent"). So for ornaments that must float on parchment we
generate LIGHT pen-and-ink line-art on a near-black background and key the dark
out to alpha afterwards (set keyout=True). Full-bleed illustration "plates"
(hero, homestead, etc.) stay opaque and are shown inside framed boxes on the
page, so they need no keyout.

Run:  python generate_art.py                 # every asset
      python generate_art.py compass-rose    # one asset by name
      python generate_art.py presentation    # just the land-divisions set
"""
import base64
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.abspath(os.path.join(HERE, "..", "..", ".env"))
ENDPOINT = "https://api.openai.com/v1/images/generations"
MODEL = "gpt-image-2"

# Shared style language so the presentation plates read as one set.
PLATE_STYLE = (
    "Late-1800s / early-1900s sepia-toned steel-engraving illustration in the "
    "spirit of the Dominion Land Survey era on the Canadian prairies. Warm "
    "brown and cream ink tones, fine cross-hatching, soft aged look. No text, "
    "no lettering, no words, no signatures, no borders."
)


def load_key():
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        return key.strip()
    with open(ENV_PATH, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(f"OPENAI_API_KEY not found in env or {ENV_PATH}")


def keyout_image(path, crop=True):
    """Light line-art on a dark backdrop -> transparent, warm-gold ornament.

    Alpha follows luminance (bright engraving -> opaque, dark backdrop ->
    clear); strokes are warmed toward aged gold so they read on parchment.
    Same approach as the original keyout.py, generalized to any file.

    crop=True trims to the ornament's alpha bounding box (right for wide, short
    divider rules). Leave crop=False for ornaments shown in a fixed SQUARE box
    (corner flourishes, compass) so their aspect ratio is preserved.
    """
    import numpy as np
    from PIL import Image

    src = Image.open(path).convert("RGB")
    a = np.asarray(src).astype(np.float32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

    lo, hi = 70.0, 175.0
    alpha = np.clip((lum - lo) / (hi - lo), 0, 1) ** 1.15      # smooth cut of the halo

    gold = np.array([202, 162, 79], dtype=np.float32)
    shade = np.clip(lum / 255.0, 0, 1)[..., None]
    rgb = gold * (0.55 + 0.45 * shade)

    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    # crop to the ornament's alpha bounding box (+ small margin) so a square
    # canvas holding a wide, short ornament doesn't get squished by CSS sizing.
    bbox = img.getbbox() if crop else None
    if bbox:
        mx = int(0.01 * img.width)
        bbox = (max(0, bbox[0] - mx), max(0, bbox[1] - mx),
                min(img.width, bbox[2] + mx), min(img.height, bbox[3] + mx))
        img = img.crop(bbox)
    png_path = os.path.splitext(path)[0] + ".png"
    img.save(png_path)
    print(f"      keyed -> {os.path.basename(png_path)} (transparent, {img.width}x{img.height})")


def generate(name, prompt, size="1024x1024", background="opaque",
             quality="medium", out_ext="png", keyout=False, crop=True):
    key = load_key()
    body = {
        "model": MODEL,
        "prompt": prompt,
        "size": size,
        "n": 1,
        "quality": quality,
    }
    if background:
        body["background"] = background      # gpt-image-2: "opaque" only
    out_path = os.path.join(HERE, f"{name}.{out_ext}")
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    print(f"[{name}] requesting ({size}, q={quality}, bg={background})...")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"[{name}] HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:600]}")
        return False
    b64 = data["data"][0]["b64_json"]
    with open(out_path, "wb") as fh:
        fh.write(base64.b64decode(b64))
    print(f"[{name}] saved -> {out_path}")
    if keyout:
        keyout_image(out_path, crop=crop)
    return True


# Decorative poster ornaments. Under gpt-image-2 these are generated opaque
# (light line-art on a dark backdrop) and keyed to transparency afterwards.
ASSETS = {
    "compass-rose": dict(
        size="1024x1024", background="opaque", keyout=True, crop=False,
        prompt=(
            "A vintage cartographer's compass rose / north arrow drawn in the style "
            "of an early-1900s hand-inked Dominion Land Survey map. Light sepia ink "
            "line-work CENTERED on a solid near-black background. Eight-point star "
            "with a slender ornamental fleur-de-lis pointing north and a small "
            "letter N. Delicate, slightly imperfect hand-drawn lines, antique "
            "engraving feel. Isolated object, no border, no extra text."
        ),
    ),
    "cartouche": dict(
        size="1536x1024", background="opaque", keyout=True, crop=False,
        prompt=(
            "An elegant antique map title cartouche: a horizontal oval banner frame "
            "of curling acanthus scrolls with small surveyor's-chain motifs at left "
            "and right, drawn as LIGHT pen-and-ink line-art on a solid near-black "
            "background, early-1900s engraved cartography style. The interior of the "
            "oval is empty so text can be overlaid. Symmetrical. No lettering, no words."
        ),
    ),
    "corner-flourish": dict(
        size="1024x1024", background="opaque", keyout=True, crop=False,
        prompt=(
            "A single ornamental corner flourish for an antique map border: curling "
            "pen-and-ink scrollwork with a small wheat sheaf and surveyor's chain "
            "motif, LIGHT sepia line-art on a solid near-black background, early-1900s "
            "engraving style, hand-drawn. Sized to sit in the TOP-LEFT corner (the "
            "ornament occupies the upper-left, opening toward the lower-right). No text."
        ),
    ),
    "parchment": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A seamless aged paper / parchment texture in warm cream and pale tan, "
            "the surface of an old 1900s hand-drawn survey map sheet: soft mottling, "
            "faint foxing spots, a gentle vignette darkening toward the edges, a "
            "barely-visible horizontal and vertical fold crease. No text, no drawings, "
            "no border lines. Subtle, light, suitable as a background behind black ink."
        ),
    ),

    # ---- land-divisions.html presentation set ----------------------------
    # Full-bleed illustration "plates" (opaque; framed on the page).
    "pres-hero": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="high",
        prompt=(
            "A Dominion Land Survey crew at work on the open Canadian prairie around "
            "1885: a surveyor sighting through a brass transit theodolite on a wooden "
            "tripod, an assistant stretching a long Gunter's surveying chain across "
            "tall grass, wooden survey stakes driven into the ground, a distant "
            "ox-drawn cart and an immense flat horizon under a wide sky. " + PLATE_STYLE
        ),
    ),
    "pres-hero-portrait": dict(
        size="1024x1536", background="opaque", out_ext="jpg", quality="high",
        prompt=(
            "A TALL VERTICAL composition for a phone screen: a Dominion Land Survey "
            "scene on the open Canadian prairie around 1885. In the lower third a "
            "surveyor sights through a brass transit theodolite on a wooden tripod "
            "with an assistant holding a survey stake; above them an immense towering "
            "prairie sky filling the upper two-thirds with soft layered clouds and a "
            "low flat horizon. Plenty of open sky at the top for a title overlay. "
            + PLATE_STYLE
        ),
    ),
    "pres-transit": dict(
        size="1024x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A still-life study of antique surveying instruments: a brass transit "
            "theodolite on a folding wooden tripod, a coiled Gunter's measuring "
            "chain with brass tally tags, a leather-bound field notebook and a "
            "pencil, arranged as a museum plate. " + PLATE_STYLE
        ),
    ),
    "pres-homestead": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A lone prairie homestead on a newly surveyed quarter-section around "
            "1900: a small log-and-sod settler's cabin, a patch of freshly broken "
            "black soil and young wheat, a straight post-and-wire fence line running "
            "dead straight to the horizon along a section road allowance, vast empty "
            "grassland beyond. " + PLATE_STYLE
        ),
    ),
    "pres-riverlot": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "An oblique bird's-eye view contrasting two ways of dividing land: in the "
            "foreground, narrow Metis river-lot farms as long thin ribbons of field "
            "reaching back from the bends of a winding prairie river, each with a "
            "small farmstead at the water; behind them, the rigid square grid of the "
            "government township survey advancing across the plain in equal blocks. "
            + PLATE_STYLE
        ),
    ),
    # Section-divider ornaments (light line-art -> keyed transparent).
    "pres-div-wheat": dict(
        size="1024x1024", background="opaque", keyout=True,
        prompt=(
            "A symmetrical ornamental horizontal divider rule: a central wheat sheaf "
            "flanked on both sides by curling surveyor's-chain scrollwork that tapers "
            "to fine points, drawn as LIGHT sepia pen-and-ink line-art on a solid "
            "near-black background, early-1900s engraving style. A slim horizontal "
            "ornament, wider than it is tall, centered. No text, no words."
        ),
    ),
    "pres-div-transit": dict(
        size="1024x1024", background="opaque", keyout=True,
        prompt=(
            "A symmetrical ornamental horizontal divider rule: a small surveyor's "
            "transit on a tripod at the center, flanked by mirror-image scroll "
            "flourishes and a draped measuring chain tapering to fine points, drawn "
            "as LIGHT sepia pen-and-ink line-art on a solid near-black background, "
            "early-1900s engraving style. A slim horizontal ornament, wider than it "
            "is tall, centered. No text, no words."
        ),
    ),

    # ---- dls-history.html ("The Making of the Grid") set -----------------
    "hist-hero": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="high",
        prompt=(
            "A sweeping panorama of the Canadian North-West in transition around 1880: "
            "in the foreground a Dominion Land Survey crew with a brass transit on a "
            "tripod and a freshly driven survey stake; in the middle distance a Red "
            "River ox-cart trail and a few breaking ploughs turning the sod; far off, a "
            "thin railway line and a tiny new settlement under an immense prairie sky. "
            + PLATE_STYLE
        ),
    ),
    "hist-hero-portrait": dict(
        size="1024x1536", background="opaque", out_ext="jpg", quality="high",
        prompt=(
            "A TALL VERTICAL composition for a phone screen: the Canadian prairie being "
            "settled around 1880. In the lower third, a Dominion Land Survey crew with "
            "a brass transit on a tripod and a driven survey stake, a distant ox-cart "
            "trail and a faint railway line and tiny settlement; above, an immense "
            "towering prairie sky filling the upper two-thirds with layered clouds. "
            "Plenty of open sky at the top for a title overlay. " + PLATE_STYLE
        ),
    ),
    "hist-hbc-post": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A Hudson's Bay Company fur-trade fort on the bank of a northern river in "
            "the early 1800s: a timber stockade with a bastion and a flag, log "
            "warehouses, birch-bark canoes and York boats drawn up on the shore, bales "
            "of furs on the landing, wooded far shore. A quiet pre-survey wilderness, no "
            "farms, no fences. " + PLATE_STYLE
        ),
    ),
    "hist-transfer": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A still-life of the 1869-70 transfer of Rupert's Land: a large old map of "
            "the Canadian North-West unrolled on a dark wooden desk, a quill pen in an "
            "inkwell, a folded parchment deed tied with ribbon and a red wax seal, a "
            "brass candlestick and a magnifying glass. A solemn diplomatic study. "
            + PLATE_STYLE
        ),
    ),
    "hist-dennis": dict(
        size="1024x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A dignified 1870s Surveyor-General vignette (a generic figure, not a real "
            "person): a bearded gentleman in a dark frock coat standing beside a brass "
            "transit on a tripod, one hand resting on a rolled township survey plan on "
            "a table, a globe and inkstand nearby, a window onto open prairie behind. "
            "A formal studio-portrait feel, vignetted oval edges. " + PLATE_STYLE
        ),
    ),
    "hist-redriver": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "Autumn 1869 on the open plain near the Red River: a group of Metis horsemen "
            "in capotes and sashes calmly but firmly halting a government survey party, "
            "whose surveyor stands by a transit and a measuring chain laid across the "
            "grass. Tension without violence, low golden prairie light, a distant "
            "river-lot farmstead. Dignified and respectful. " + PLATE_STYLE
        ),
    ),
    "hist-firstpost": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "July 1871: a surveyor driving the very first wooden survey post into the "
            "prairie sod with a maul, an iron survey monument beside it, a transit on a "
            "tripod and a coiled chain nearby, an assistant steadying the post, a dead-"
            "flat grassland horizon under a big sky. A historic 'first stake' moment. "
            + PLATE_STYLE
        ),
    ),
    "hist-act": dict(
        size="1024x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A still-life of an 1872 Dominion Lands homestead grant: an official "
            "government land patent document with an embossed seal and ribbon lying on "
            "a desk, a quill and inkwell, a small brass land-office hand stamp, a ten-"
            "dollar coin, and a folded township plan. Warm lamplight. " + PLATE_STYLE
        ),
    ),
    "hist-camp": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A Dominion Land Survey party's field camp at dusk on the open prairie, "
            "around 1882: two canvas wall tents, hobbled horses grazing, a campfire with "
            "a cook pot, a surveyor writing field notes by lantern at a folding table "
            "with a transit and solar compass, the last light along a vast flat horizon. "
            + PLATE_STYLE
        ),
    ),
    "hist-lastbestwest": dict(
        size="1024x1536", background="opaque", out_ext="jpg", quality="high",
        prompt=(
            "A vintage early-1900s Canadian immigration travel poster (the 'Last Best "
            "West' campaign), portrait orientation, warm lithograph style in rich sepia, "
            "gold and harvest tones. An ornate gilded Art-Nouveau border with red maple "
            "leaves in the upper corners and a sheaf of wheat at the lower left. On the "
            "right, an illustrated scene: a golden sunrise over rolling prairie wheat "
            "fields, a prosperous white farmhouse and red barn, a farmer on a horse-drawn "
            "binder, and a settler family (a father in hat and coat, a mother, a boy and "
            "a girl) standing in the wheat looking toward the farm.\n\n"
            "The poster carries this text, cleanly and correctly lettered in an antique "
            "serif typeface, spelled EXACTLY as written:\n"
            "- across the TOP ribbon banner, large: THE LAST BEST WEST\n"
            "- in the large left panel, stacked and centered: a big headline CANADA WEST; "
            "below it HOMES FOR MILLIONS; then 160-ACRE FARMS; then the word FREE in deep "
            "red; then a thin rule; then in small italics: Apply for a homestead - only $10\n"
            "- across the BOTTOM ribbon banner: DOMINION OF CANADA\n\n"
            "Crisp, legible, correctly spelled lettering that sits neatly within each "
            "banner and panel. Symmetrical, balanced, professional vintage poster design."
        ),
    ),
    "hist-immigrants": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "Around 1903: a hopeful immigrant settler family newly arrived on the "
            "Canadian prairie, standing by a wagon piled with trunks and a plough beside "
            "a small railway siding and a colonist railcar, the open grassland and a "
            "grain elevator in the distance. Warm, aspirational. " + PLATE_STYLE
        ),
    ),
    "hist-metesbounds": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "Late-1700s eastern American frontier: a colonial surveyor in tricorn-era "
            "dress blazing a mark into a large oak 'witness tree' with a hatchet at the "
            "edge of irregular fields that follow a winding creek and a rail fence along "
            "a ridge; a chainman holds a Gunter's chain. The old metes-and-bounds way of "
            "describing land by trees and streams. " + PLATE_STYLE
        ),
    ),
    "hist-grid-aerial": dict(
        size="1536x1024", background="opaque", out_ext="jpg", quality="medium",
        prompt=(
            "A high aerial bird's-eye view of the modern Canadian prairies as a vast, "
            "near-perfect checkerboard of square farm fields and dead-straight section "
            "roads stretching to a far flat horizon, a tiny grid town and grain "
            "elevators, long shadows. The pure rectangular survey realized. " + PLATE_STYLE
        ),
    ),
    "hist-div-maple": dict(
        size="1024x1024", background="opaque", keyout=True,
        prompt=(
            "A symmetrical ornamental horizontal divider rule: a central spray of maple "
            "leaves flanked on both sides by a draped surveyor's chain and curling "
            "scrollwork tapering to fine points, drawn as LIGHT sepia pen-and-ink line-"
            "art on a solid near-black background, early-1900s engraving style. A slim "
            "horizontal ornament, wider than it is tall, centered. No text, no words."
        ),
    ),
}

# Convenience group: just the new history assets.
HISTORY = [k for k in ASSETS if k.startswith("hist-")]

# Convenience group: just the new presentation assets.
PRESENTATION = [k for k in ASSETS if k.startswith("pres-")]


def main():
    args = sys.argv[1:]
    if args == ["presentation"]:
        which = PRESENTATION
    elif args == ["history"]:
        which = HISTORY
    else:
        which = args or list(ASSETS.keys())
    ok = True
    for name in which:
        if name not in ASSETS:
            print(f"unknown asset '{name}'; known: {', '.join(ASSETS)} (or 'presentation')")
            continue
        cfg = dict(ASSETS[name])
        out_ext = cfg.pop("out_ext", "png")
        ok = generate(name, cfg.pop("prompt"), out_ext=out_ext, **cfg) and ok
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
