# -*- coding: utf-8 -*-
"""
针对背景色与角色色极度接近的图片，使用精确BFS策略：
- 极小容差（只去掉几乎完全等于背景色的像素）
- 超大保护半径（把角色内部所有像素都保护住）
- 不做残留清理（close_thresh=0）
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

INPUT_DIR  = r'M:\下载\images_pack'
OUTPUT_DIR = r'D:\working_dir\office-life\chars'
TARGET_H   = 80

def bfs_from_border(mask, h, w):
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for c in range(w):
        for r in [0, h-1]:
            if mask[r, c] and not visited[r, c]:
                visited[r, c] = True; q.append((r, c))
    for r in range(h):
        for c in [0, w-1]:
            if mask[r, c] and not visited[r, c]:
                visited[r, c] = True; q.append((r, c))
    while q:
        r, c = q.popleft()
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<h and 0<=nc<w and not visited[nr,nc] and mask[nr,nc]:
                visited[nr,nc] = True; q.append((nr,nc))
    return visited

def keep_largest(rgba):
    h, w = rgba.shape[:2]
    alpha = rgba[:,:,3]
    opaque = alpha > 10
    labeled = np.zeros((h, w), dtype=np.int32)
    sizes = {}
    label = 0
    for sr in range(h):
        for sc in range(w):
            if opaque[sr, sc] and labeled[sr, sc] == 0:
                label += 1
                q = deque([(sr, sc)])
                labeled[sr, sc] = label
                cnt = 1
                while q:
                    r, c = q.popleft()
                    for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
                        nr, nc = r+dr, c+dc
                        if 0<=nr<h and 0<=nc<w and opaque[nr,nc] and labeled[nr,nc]==0:
                            labeled[nr,nc] = label; q.append((nr,nc)); cnt+=1
                sizes[label] = cnt
    if not sizes: return rgba
    largest = max(sizes, key=sizes.get)
    result = rgba.copy()
    result[labeled != largest, 3] = 0
    return result

def erase_watermark(arr, bg):
    h, w = arr.shape[:2]
    arr[int(h*0.82):, int(w*0.62):] = bg
    return arr

def process_tight(src_name, slug, tol=5, protect_thresh=15, protect_radius=40):
    """
    极保守策略：
    - tol极小：只去掉与背景色几乎完全相同的像素
    - protect_radius极大：把角色内部所有像素都保护住
    - 不做残留清理
    """
    src = os.path.join(INPUT_DIR, src_name)
    dst = os.path.join(OUTPUT_DIR, slug + '.png')

    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    # 用四角均值作为背景色
    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)

    arr = erase_watermark(arr.copy(), bg)
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)

    # 极小容差BFS：只从边缘扩散去掉几乎等于背景色的像素
    bg_mask = bfs_from_border(diff < tol, h, w)

    # 超大保护半径：把任何与背景色有一点差异的像素都保护住
    core_fg = diff >= protect_thresh
    if core_fg.sum() > 0:
        prot_img = Image.fromarray(core_fg.astype(np.uint8)*255, 'L')
        prot_img = prot_img.filter(ImageFilter.MaxFilter(size=protect_radius*2+1))
        protected = np.array(prot_img) > 127
        final_bg = bg_mask & ~protected
    else:
        final_bg = bg_mask

    rgba = np.dstack([arr, np.full((h,w), 255, dtype=np.uint8)])
    rgba[final_bg, 3] = 0

    # 不做残留清理，完全保留角色内部颜色

    # 保留最大连通分量
    rgba = keep_largest(rgba)

    # 裁剪
    alpha = rgba[:,:,3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any():
        print(f"  [SKIP] {src_name}"); return
    rmin, rmax = np.where(rows)[0][[0,-1]]
    cmin, cmax = np.where(cols)[0][[0,-1]]
    pad = 3
    rmin = max(0, rmin-pad); rmax = min(h-1, rmax+pad)
    cmin = max(0, cmin-pad); cmax = min(w-1, cmax+pad)
    cropped = Image.fromarray(rgba[rmin:rmax+1, cmin:cmax+1], 'RGBA')
    cw, ch = cropped.size
    new_w = max(1, int(cw * TARGET_H / ch))
    result = cropped.resize((new_w, TARGET_H), Image.NEAREST)
    result.save(dst, 'PNG')

    removed = 100 * final_bg.sum() / (h*w)
    print(f"  {src_name:25s} -> {slug}.png  {new_w}x{TARGET_H}  bg_removed={removed:.1f}%")

# 问题角色：背景色与角色色极度接近，用极保守参数
TIGHT_LIST = [
    # 背景纯灰197,197,197 - 角色有白色/米色脸部
    ('法务（？）.jpeg', 'lawyer2',   dict(tol=4,  protect_thresh=12, protect_radius=45)),
    ('姬神樱.jpg',      'himegami',  dict(tol=4,  protect_thresh=12, protect_radius=45)),
    ('将军超人.jpg',    'shogun',    dict(tol=4,  protect_thresh=10, protect_radius=45)),
    # 背景黄绿灰 - 角色肤色接近
    ('千寻.jpg',        'chihiro',   dict(tol=5,  protect_thresh=15, protect_radius=40)),
    # 背景粉红 - 御剑脸部肤色接近
    ('御剑.jpg',        'mitsurugi', dict(tol=5,  protect_thresh=15, protect_radius=40)),
]

print("修复问题角色...\n")
for src_name, slug, kwargs in TIGHT_LIST:
    try:
        process_tight(src_name, slug, **kwargs)
    except Exception as e:
        import traceback
        print(f"  ERROR {src_name}: {e}")
        traceback.print_exc()

print("\n完成！")
