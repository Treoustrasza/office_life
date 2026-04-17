# -*- coding: utf-8 -*-
"""
从原始文件夹按文件名直接处理，生成正确命名的PNG。
每个文件名就是角色名，直接用拼音/英文slug作为输出文件名。
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

INPUT_DIR  = r'M:\下载\images_pack'
OUTPUT_DIR = r'D:\working_dir\office-life\chars'
TARGET_H   = 80
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 原始文件名 -> 输出slug（用于HTML引用）
FILE_MAP = {
    '成步堂.jpg':      'naruhodou',
    '真宵.jpg':        'mayoi',
    '千寻.jpg':        'chihiro',
    '御剑.jpg':        'mitsurugi',
    '糸锯.jpg':        'itonokogiri',
    '矢张.jpg':        'yahari',
    '粉色小姐.jpg':    'pink_lady',
    '大场香.jpg':      'ooba',
    '姬神樱.jpg':      'himegami',
    '将军超人.jpg':    'shogun',
    '宝月巴.jpg':      'houtsuki',
    '小百合.jpg':      'sayuri',
    '要买盒饭吗.jpg':  'bentou',
    '牛仔（？）.jpg':  'cowboy',
    '保安.jpg':        'guard',
    '神秘摇晃立牌.jpg':'mystery',
    '法务（？）.jpeg': 'lawyer2',
}

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

def process(src_name, slug, tol=22, protect_thresh=40, protect_radius=15):
    src = os.path.join(INPUT_DIR, src_name)
    dst = os.path.join(OUTPUT_DIR, slug + '.png')

    ext = os.path.splitext(src_name)[1].lower()
    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)

    arr = erase_watermark(arr.copy(), bg)
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)

    # 大容差BFS
    bg_large = bfs_from_border(diff < tol, h, w)

    # 核心前景保护
    core_fg = diff >= protect_thresh
    if core_fg.sum() > 0:
        from PIL import ImageFilter as IF
        prot_img = Image.fromarray(core_fg.astype(np.uint8)*255, 'L')
        prot_img = prot_img.filter(IF.MaxFilter(size=protect_radius*2+1))
        protected = np.array(prot_img) > 127
        final_bg = bg_large & ~protected
    else:
        final_bg = bg_large

    rgba = np.dstack([arr, np.full((h,w), 255, dtype=np.uint8)])
    rgba[final_bg, 3] = 0

    # 清理背景色残留（对不透明像素中颜色接近背景色的做透明化）
    opaque_mask = rgba[:,:,3] > 10
    rgb = rgba[:,:,:3].astype(np.int32)
    close_to_bg = np.max(np.abs(rgb - bg.astype(np.int32)), axis=2) < 18
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
    print(f"  {src_name:20s} -> {slug}.png  {new_w}x{TARGET_H}  bg={removed:.1f}%")

# 特殊配置：背景色接近角色色的图片用保护策略
SPECIAL = {
    '千寻.jpg':     dict(tol=22, protect_thresh=40, protect_radius=15),
    '神秘摇晃立牌.jpg': dict(tol=15, protect_thresh=30, protect_radius=10),
}

print(f"Processing {len(FILE_MAP)} characters...\n")
for src_name, slug in FILE_MAP.items():
    kwargs = SPECIAL.get(src_name, dict(tol=22, protect_thresh=40, protect_radius=15))
    try:
        process(src_name, slug, **kwargs)
    except Exception as e:
        import traceback
        print(f"  ERROR {src_name}: {e}")
        traceback.print_exc()

print("\nDone!")
