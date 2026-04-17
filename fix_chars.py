# -*- coding: utf-8 -*-
"""
针对脸部/肤色被误删的角色，用更保守的参数重新处理去背景。
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

def process(src_name, slug, tol=15, protect_thresh=25, protect_radius=20, close_thresh=12):
    src = os.path.join(INPUT_DIR, src_name)
    dst = os.path.join(OUTPUT_DIR, slug + '.png')

    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)

    arr = erase_watermark(arr.copy(), bg)
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)

    # 小容差BFS（只去掉非常接近背景色的边缘）
    bg_large = bfs_from_border(diff < tol, h, w)

    # 大范围前景保护（protect_thresh低 = 保护更多像素）
    core_fg = diff >= protect_thresh
    if core_fg.sum() > 0:
        prot_img = Image.fromarray(core_fg.astype(np.uint8)*255, 'L')
        prot_img = prot_img.filter(ImageFilter.MaxFilter(size=protect_radius*2+1))
        protected = np.array(prot_img) > 127
        final_bg = bg_large & ~protected
    else:
        final_bg = bg_large

    rgba = np.dstack([arr, np.full((h,w), 255, dtype=np.uint8)])
    rgba[final_bg, 3] = 0

    # 只清理非常接近背景色的残留（阈值更低，更保守）
    opaque_mask = rgba[:,:,3] > 10
    rgb = rgba[:,:,:3].astype(np.int32)
    close_to_bg = np.max(np.abs(rgb - bg.astype(np.int32)), axis=2) < close_thresh
    rgba[opaque_mask & close_to_bg, 3] = 0

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
    print(f"  {src_name:25s} -> {slug}.png  {new_w}x{TARGET_H}  bg={removed:.1f}%")

# ===== 需要修复的角色及其专属参数 =====
# tol: BFS容差（越小越保守，越少去掉）
# protect_thresh: 前景保护阈值（越小保护越多）
# protect_radius: 保护扩散半径（越大保护范围越广）
# close_thresh: 残留清理阈值（越小越保守）

FIX_LIST = {
    # 脸部肤色被误删 - 用极保守参数
    '法务（？）.jpeg': ('lawyer2',  dict(tol=10, protect_thresh=18, protect_radius=25, close_thresh=10)),
    '姬神樱.jpg':      ('himegami', dict(tol=10, protect_thresh=18, protect_radius=25, close_thresh=10)),
    '千寻.jpg':        ('chihiro',  dict(tol=10, protect_thresh=18, protect_radius=25, close_thresh=10)),
    '御剑.jpg':        ('mitsurugi',dict(tol=10, protect_thresh=18, protect_radius=25, close_thresh=10)),
    '糸锯.jpg':        ('itonokogiri', dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '将军超人.jpg':    ('shogun',   dict(tol=10, protect_thresh=15, protect_radius=25, close_thresh=8)),
    # 其余角色也用保守参数重跑一遍，防止有遗漏
    '成步堂.jpg':      ('naruhodou',dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '真宵.jpg':        ('mayoi',    dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '矢张.jpg':        ('yahari',   dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '粉色小姐.jpg':    ('pink_lady',dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '大场香.jpg':      ('ooba',     dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '宝月巴.jpg':      ('houtsuki', dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '小百合.jpg':      ('sayuri',   dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '牛仔（？）.jpg':  ('cowboy',   dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '神秘摇晃立牌.jpg':('mystery',  dict(tol=10, protect_thresh=20, protect_radius=20, close_thresh=8)),
    '保安.jpg':        ('guard',    dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
    '要买盒饭吗.jpg':  ('bentou',   dict(tol=12, protect_thresh=20, protect_radius=22, close_thresh=10)),
}

print(f"修复 {len(FIX_LIST)} 个角色...\n")
for src_name, (slug, kwargs) in FIX_LIST.items():
    try:
        process(src_name, slug, **kwargs)
    except Exception as e:
        import traceback
        print(f"  ERROR {src_name}: {e}")
        traceback.print_exc()

print("\n完成！")
