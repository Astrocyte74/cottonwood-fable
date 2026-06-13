import cv2
import numpy as np
import sys

FLANN_INDEX_KDTREE = 1


def match_points(img1, img2, scale=0.25):
    """Return matched full-res point arrays (pts1 in img1, pts2 in img2)."""
    g1 = cv2.cvtColor(cv2.resize(img1, None, fx=scale, fy=scale), cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(cv2.resize(img2, None, fx=scale, fy=scale), cv2.COLOR_BGR2GRAY)

    sift = cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.02, edgeThreshold=8)
    kp1, des1 = sift.detectAndCompute(g1, None)
    kp2, des2 = sift.detectAndCompute(g2, None)
    print(f"  Keypoints: left={len(kp1)}, right={len(kp2)}")

    flann = cv2.FlannBasedMatcher(
        dict(algorithm=FLANN_INDEX_KDTREE, trees=5), dict(checks=100)
    )
    matches = flann.knnMatch(des1, des2, k=2)
    good = [m for m, n in matches if m.distance < 0.7 * n.distance]
    print(f"  Good matches: {len(good)}")

    pts1 = np.float32([kp1[m.queryIdx].pt for m in good]) / scale
    pts2 = np.float32([kp2[m.trainIdx].pt for m in good]) / scale
    return pts1, pts2


def stitch(left_path, right_path, out_path, num_bands=14, seam_blend=False, seam_width=80):
    img1 = cv2.imread(left_path)   # left
    img2 = cv2.imread(right_path)  # right
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]
    print(f"  Left: {w1}x{h1}, Right: {w2}x{h2}")

    pts1, pts2 = match_points(img1, img2)
    if len(pts1) < 20:
        print("  ERROR: too few matches")
        return

    # Global homography: map img2 -> img1 frame. Filter to inliers.
    H_global, mask = cv2.findHomography(pts2, pts1, cv2.RANSAC, 4.0)
    inliers = mask.ravel() == 1
    pts1, pts2 = pts1[inliers], pts2[inliers]
    print(f"  Inliers: {inliers.sum()}")

    # Canvas geometry from img1 corners + warped img2 corners.
    corners2 = np.float32([[0, 0], [w2, 0], [w2, h2], [0, h2]]).reshape(-1, 1, 2)
    wc = cv2.perspectiveTransform(corners2, H_global).reshape(-1, 2)
    xs = [0, w1] + list(wc[:, 0])
    ys = [0, h1] + list(wc[:, 1])
    min_x, max_x = int(min(xs)), int(max(xs))
    min_y, max_y = int(min(ys)), int(max(ys))
    cw, ch = max_x - min_x, max_y - min_y
    T = np.float64([[1, 0, -min_x], [0, 1, -min_y], [0, 0, 1]])
    print(f"  Canvas: {cw}x{ch}")

    # --- Build warped right image via horizontal bands (in img1 y-space) ---
    # Each band gets a local homography from nearby inlier matches, fixing
    # non-planar (wrinkled paper / perspective) misalignment top-to-bottom.
    warped2 = np.zeros((ch, cw, 3), dtype=np.uint8)
    y1_min, y1_max = pts1[:, 1].min(), pts1[:, 1].max()
    band_edges = np.linspace(y1_min, y1_max, num_bands + 1)
    pad = (y1_max - y1_min) / num_bands  # generous overlap for stability

    used_local = 0
    for i in range(num_bands):
        b0, b1 = band_edges[i], band_edges[i + 1]
        sel = (pts1[:, 1] >= b0 - pad) & (pts1[:, 1] <= b1 + pad)
        if sel.sum() >= 12:
            Hb, _ = cv2.findHomography(pts2[sel], pts1[sel], cv2.RANSAC, 4.0)
            if Hb is None:
                Hb = H_global
            else:
                used_local += 1
        else:
            Hb = H_global

        # Warp the FULL right image with this band's homography, then copy
        # only the canvas rows belonging to this band.
        full = cv2.warpPerspective(img2, T @ Hb, (cw, ch))
        cy0 = int(round(b0 - min_y)) if i > 0 else 0
        cy1 = int(round(b1 - min_y)) if i < num_bands - 1 else ch
        cy0 = max(0, min(ch, cy0))
        cy1 = max(0, min(ch, cy1))
        warped2[cy0:cy1] = full[cy0:cy1]

    print(f"  Bands using local homography: {used_local}/{num_bands}")
    print(f"  Right-image coverage on canvas: {int((warped2.any(axis=2)).sum()):,} px")

    # Place left image on its own canvas.
    img1_c = np.zeros((ch, cw, 3), dtype=np.uint8)
    img1_c[-min_y:-min_y + h1, -min_x:-min_x + w1] = img1

    m1 = (img1_c.any(axis=2)).astype(np.uint8)
    m2 = (warped2.any(axis=2)).astype(np.uint8)
    only1 = (m1 == 1) & (m2 == 0)
    only2 = (m2 == 1) & (m1 == 0)
    both = (m1 == 1) & (m2 == 1)

    if seam_blend:
        # --- Hard seam at the overlap midline, feathered over seam_width ---
        # For each row, the seam x = midpoint of the overlap; left of it use
        # img1, right of it use img2. Only ONE copy shows except in a narrow
        # band around the seam, so misalignment can't ghost the whole overlap.
        out = np.where(only1[..., None], img1_c,
                       np.where(only2[..., None], warped2, img1_c)).astype(np.uint8)
        for y in range(ch):
            cols = np.where(both[y])[0]
            if cols.size == 0:
                continue
            seam = (cols.min() + cols.max()) // 2
            lo, hi = seam - seam_width, seam + seam_width
            # Right of the feathered seam -> take img2.
            rr = np.arange(cols.min(), cols.max() + 1)
            right = rr[rr >= hi]
            out[y, right] = warped2[y, right]
            # Feather zone -> linear ramp.
            feat = rr[(rr >= lo) & (rr < hi)]
            if feat.size:
                a = ((feat - lo) / (hi - lo))[:, None]
                out[y, feat] = (img1_c[y, feat] * (1 - a) + warped2[y, feat] * a).astype(np.uint8)
    else:
        # --- Distance-transform feather blend (good for well-aligned pairs) ---
        d1 = cv2.distanceTransform(m1, cv2.DIST_L2, 5)
        d2 = cv2.distanceTransform(m2, cv2.DIST_L2, 5)
        s = d1 + d2
        s[s == 0] = 1
        out = (img1_c * (d1 / s)[..., None] + warped2 * (d2 / s)[..., None]).astype(np.uint8)
        out[only1] = img1_c[only1]
        out[only2] = warped2[only2]

    cv2.imwrite(out_path, out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"  Saved: {out_path} ({cw}x{ch})")


if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "7475"):
        print("=== 74 + 75 ===")
        stitch("IMG_1674.jpeg", "IMG_1675.jpeg", "merged_74_75.jpeg")
        print()
    if which in ("all", "7677"):
        print("=== 76 + 77 ===")
        # Fewer bands keeps grid lines rigid; seam blend kills the ghosting.
        stitch("IMG_1676.jpeg", "IMG_1677.jpeg", "merged_76_77.jpeg",
               num_bands=4, seam_blend=True, seam_width=100)
    if which in ("all", "7879"):
        print("=== 78 + 79 ===")
        stitch("IMG_1678.jpeg", "IMG_1679.jpeg", "merged_78_79.jpeg",
               num_bands=4, seam_blend=True, seam_width=100)
    if which in ("all", "8081"):
        print("=== 80 + 81 ===")
        stitch("IMG_1680.jpeg", "IMG_1681.jpeg", "merged_80_81.jpeg",
               num_bands=4, seam_blend=True, seam_width=100)
