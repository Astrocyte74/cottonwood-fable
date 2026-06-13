"""Smooth (thin-plate-spline) stitcher.

The banded approach put a separate homography in each horizontal strip, so the
gridlines jumped at every band boundary. This warps the right image with ONE
continuous TPS transform fit through all inlier matches: no boundaries, no steps.
"""
import cv2
import numpy as np

FLANN_INDEX_KDTREE = 1


def match_points(img1, img2, scale=0.25):
    g1 = cv2.cvtColor(cv2.resize(img1, None, fx=scale, fy=scale), cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(cv2.resize(img2, None, fx=scale, fy=scale), cv2.COLOR_BGR2GRAY)
    sift = cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.02, edgeThreshold=8)
    kp1, des1 = sift.detectAndCompute(g1, None)
    kp2, des2 = sift.detectAndCompute(g2, None)
    print(f"  Keypoints: left={len(kp1)}, right={len(kp2)}")
    flann = cv2.FlannBasedMatcher(dict(algorithm=FLANN_INDEX_KDTREE, trees=5),
                                  dict(checks=100))
    matches = flann.knnMatch(des1, des2, k=2)
    good = [m for m, n in matches if m.distance < 0.7 * n.distance]
    print(f"  Good matches: {len(good)}")
    pts1 = np.float32([kp1[m.queryIdx].pt for m in good]) / scale
    pts2 = np.float32([kp2[m.trainIdx].pt for m in good]) / scale
    return pts1, pts2


def stitch_tps(left_path, right_path, out_path, tps_lambda=2.0, seam_width=120):
    img1 = cv2.imread(left_path)
    img2 = cv2.imread(right_path)
    h1, w1 = img1.shape[:2]
    h2, w2 = img2.shape[:2]
    print(f"  Left: {w1}x{h1}, Right: {w2}x{h2}")

    pts1, pts2 = match_points(img1, img2)
    if len(pts1) < 20:
        print("  ERROR: too few matches")
        return

    # Global homography (img2 -> img1) just to find inliers + canvas size.
    H, mask = cv2.findHomography(pts2, pts1, cv2.RANSAC, 4.0)
    inl = mask.ravel() == 1
    pts1, pts2 = pts1[inl], pts2[inl]
    print(f"  Inliers: {inl.sum()}")

    # Canvas from img1 corners + homography-warped img2 corners.
    corners2 = np.float32([[0, 0], [w2, 0], [w2, h2], [0, h2]]).reshape(-1, 1, 2)
    wc = cv2.perspectiveTransform(corners2, H).reshape(-1, 2)
    xs = [0, w1] + list(wc[:, 0]); ys = [0, h1] + list(wc[:, 1])
    min_x, max_x = int(min(xs)), int(max(xs))
    min_y, max_y = int(min(ys)), int(max(ys))
    cw, ch = max_x - min_x, max_y - min_y
    ox, oy = -min_x, -min_y
    print(f"  Canvas: {cw}x{ch}")

    # TPS maps points in the OUTPUT (canvas) frame back to img2 pixel coords.
    # Source = target canvas positions of matches (pts1 shifted by offset).
    # Target = original img2 coords (pts2). Then we remap.
    dst_canvas = (pts1 + [ox, oy]).astype(np.float32)   # where matches should land
    src_img2 = pts2.astype(np.float32)                  # corresponding img2 coords

    tps = cv2.createThinPlateSplineShapeTransformer(tps_lambda)
    matches = [cv2.DMatch(i, i, 0) for i in range(len(dst_canvas))]
    # estimateTransformation(target, source, matches): builds mapping source->target
    tps.estimateTransformation(src_img2.reshape(1, -1, 2),
                               dst_canvas.reshape(1, -1, 2), matches)

    # Build inverse map: for every canvas pixel, find its img2 coordinate.
    # We sample the canvas grid, push through TPS (canvas->img2), then remap.
    step = 1
    ys_g, xs_g = np.mgrid[0:ch:step, 0:cw:step]
    grid = np.stack([xs_g.ravel(), ys_g.ravel()], axis=1).astype(np.float32)
    mapped = tps.applyTransformation(grid.reshape(1, -1, 2))[1].reshape(-1, 2)
    map_x = mapped[:, 0].reshape(ch, cw).astype(np.float32)
    map_y = mapped[:, 1].reshape(ch, cw).astype(np.float32)

    warped2 = cv2.remap(img2, map_x, map_y, cv2.INTER_LINEAR,
                        borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    print(f"  Right coverage: {int(warped2.any(axis=2).sum()):,} px")

    # Place left image.
    img1_c = np.zeros((ch, cw, 3), dtype=np.uint8)
    img1_c[oy:oy + h1, ox:ox + w1] = img1

    m1 = img1_c.any(axis=2)
    m2 = warped2.any(axis=2)
    only1 = m1 & ~m2
    only2 = m2 & ~m1
    both = m1 & m2

    out = np.where(only2[..., None], warped2, img1_c).astype(np.uint8)
    # Narrow feathered seam at overlap midline so misalignment can't ghost.
    for y in range(ch):
        cols = np.where(both[y])[0]
        if cols.size == 0:
            continue
        seam = (cols.min() + cols.max()) // 2
        lo, hi = seam - seam_width, seam + seam_width
        rr = np.arange(cols.min(), cols.max() + 1)
        out[y, rr[rr >= hi]] = warped2[y, rr[rr >= hi]]
        feat = rr[(rr >= lo) & (rr < hi)]
        if feat.size:
            a = ((feat - lo) / (hi - lo))[:, None]
            out[y, feat] = (img1_c[y, feat] * (1 - a) + warped2[y, feat] * a).astype(np.uint8)

    cv2.imwrite(out_path, out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"  Saved: {out_path} ({cw}x{ch})")


if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    jobs = {
        "7475": ("IMG_1674.jpeg", "IMG_1675.jpeg", "merged_74_75.jpeg"),
        "7677": ("IMG_1676.jpeg", "IMG_1677.jpeg", "merged_76_77.jpeg"),
        "7879": ("IMG_1678.jpeg", "IMG_1679.jpeg", "merged_78_79.jpeg"),
        "8081": ("IMG_1680.jpeg", "IMG_1681.jpeg", "merged_80_81.jpeg"),
    }
    for key, (l, r, o) in jobs.items():
        if which in ("all", key):
            print(f"=== {key} ===")
            stitch_tps(l, r, o)
            print()
