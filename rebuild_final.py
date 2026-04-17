# -*- coding: utf-8 -*-
"""
去背景最终版 v5
关键修复：BFS 种子从整个边缘一圈出发（而非只有四个角），
解决 JPEG 压缩导致角落像素偏色、BFS 无法启动的问题。
"""
from PIL import Image
import numpy as np
from collections import deque
import os

INPUT_DIR  = r'D:\working_dir\office-life'
OUTPUT_DIR = r'D:\working_dir\office-life\chars'
TARGET_H   = 80
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 每张图的容差配置
CONFIGS = {
    '11.jpeg':      22,
    'image_01.jpg': 22,
    'image_02.jpg': 22,
    'image_03.jpg': 22,   # 背景纯净，22 足够
    'image_04.jpg': 28,   # 粉红背景，稍大
    'image_05.jpg': 22,
    'image_06.jpg': 10,   # 背景极均匀，小容差精确匹配
    'image_08.jpg': 22,
    'image_09.jpg': 22,
    'image_10.jpg': 22,
    'image_11.jpg': 22,
    'image_12.jpg': 22,
    'image_13.jpg': 22,
    'image_14.jpg': 22,
    'image_15.jpg': 22,
    'image_16.jpg': 22,
    'image_17.jpg': 22,
}

def erase_watermark(arr, bg):
    """擦掉右下角水印区域"""
    h, w = arr.shape[:2]
    arr[int(h*0.82):, int(w*0.62):] = bg
    return arr

def bfs_from_border(mask, h, w):
    """
    从整个图像边缘一圈出发做 BFS，
    找出所有从边缘连通的背景区域。
    """
    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    # 上下边缘
    for c in range(w):
        for r in [0, h-1]:
            if mask[r, c] and not visited[r, c]:
                visited[r, c] = True
                q.append((r, c))
    # 左右边缘
    for r in range(h):
        for c in [0, w-1]:
            if mask[r, c] and not visited[r, c]:
                visited[r, c] = True
                q.append((r, c))

    while q:
        r, c = q.popleft()
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<h and 0<=nc<w and not visited[nr,nc] and mask[nr,nc]:
                visited[nr,nc] = True
                q.append((nr,nc))
    return visited

def process(fname, tol):
    src = os.path.join(INPUT_DIR, fname)
    name = os.path.splitext(fname)[0]
    dst = os.path.join(OUTPUT_DIR, name + '.png')

    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    # 背景色 = 四角均值
    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)

    # 擦水印
    arr = erase_watermark(arr.copy(), bg)

    # 背景色匹配 mask
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)
    is_bg = diff < tol

    # BFS 从整个边缘出发
    bg_mask = bfs_from_border(is_bg, h, w)

    # 构建 RGBA
    rgba = np.dstack([arr, np.full((h,w), 255, dtype=np.uint8)])
    rgba[bg_mask, 3] = 0

    # 裁剪透明边距
    alpha = rgba[:,:,3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any():
        print(f"  [SKIP] all transparent")
        return

    rmin, rmax = np.where(rows)[0][[0,-1]]
    cmin, cmax = np.where(cols)[0][[0,-1]]
    pad = 4
    rmin = max(0, rmin-pad); rmax = min(h-1, rmax+pad)
    cmin = max(0, cmin-pad); cmax = min(w-1, cmax+pad)

    cropped = Image.fromarray(rgba[rmin:rmax+1, cmin:cmax+1], 'RGBA')
    cw, ch = cropped.size
    new_w = max(1, int(cw * TARGET_H / ch))
    result = cropped.resize((new_w, TARGET_H), Image.NEAREST)
    result.save(dst, 'PNG')

    removed_pct = 100 * bg_mask.sum() / (h*w)
    print(f"  bg=RGB({bg[0]},{bg[1]},{bg[2]}) tol={tol}  removed={removed_pct:.1f}%  -> {new_w}x{TARGET_H}")

# 批量处理
files = sorted([f for f in os.listdir(INPUT_DIR)
                if f.lower().endswith('.jpg') or f.lower().endswith('.jpeg')])
print(f"Found {len(files)} images\n")

for fname in files:
    tol = CONFIGS.get(fname, 22)
    print(f">> {fname}")
    try:
        process(fname, tol)
    except Exception as e:
        import traceback
        print(f"  ERROR: {e}")
        traceback.print_exc()
    print()

print("Done!")
