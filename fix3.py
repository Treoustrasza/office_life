# -*- coding: utf-8 -*-
"""
对背景色与角色色极度接近的图片，使用"中心保护+边缘剥离"策略：
1. 只去掉从四边BFS扩散、且与背景色完全相同（diff<4）的像素
2. 从图像中心出发，BFS标记所有与中心连通的不透明像素为"角色"
3. 不做任何残留清理
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

INPUT_DIR  = r'M:\下载\images_pack'
OUTPUT_DIR = r'D:\working_dir\office-life\chars'
TARGET_H   = 80

def erase_watermark(arr, bg):
    h, w = arr.shape[:2]
    arr[int(h*0.82):, int(w*0.62):] = bg
    return arr

def bfs_from_border(mask, h, w):
    """从四边BFS扩散，标记连通的True区域"""
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

def bfs_from_center(opaque_mask, h, w):
    """从图像中心出发，BFS标记所有连通的不透明像素（即角色主体）"""
    visited = np.zeros((h, w), dtype=bool)
    # 从中心附近找一个不透明像素作为起点
    start = None
    for dr in range(0, h//2, 5):
        for dc in range(0, w//2, 5):
            for r, c in [(h//2+dr, w//2+dc), (h//2-dr, w//2-dc),
                         (h//2+dr, w//2-dc), (h//2-dr, w//2+dc)]:
                if 0<=r<h and 0<=c<w and opaque_mask[r, c]:
                    start = (r, c)
                    break
        if start: break
    if start is None:
        # fallback：找任意不透明像素
        pts = np.argwhere(opaque_mask)
        if len(pts) == 0: return visited
        start = tuple(pts[len(pts)//2])

    q = deque([start])
    visited[start] = True
    while q:
        r, c = q.popleft()
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r+dr, c+dc
            if 0<=nr<h and 0<=nc<w and not visited[nr,nc] and opaque_mask[nr,nc]:
                visited[nr,nc] = True; q.append((nr,nc))
    return visited

def process_center_protect(src_name, slug, tol=4):
    """
    策略：
    1. 用极小容差(tol)从边缘BFS去掉纯背景
    2. 剩余像素中，从中心BFS找最大连通体作为角色
    3. 不做残留清理
    """
    src = os.path.join(INPUT_DIR, src_name)
    dst = os.path.join(OUTPUT_DIR, slug + '.png')

    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)

    arr = erase_watermark(arr.copy(), bg)
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)

    # 步骤1：从边缘BFS去掉与背景色几乎完全相同的像素
    border_bg = bfs_from_border(diff < tol, h, w)

    # 步骤2：初始alpha（去掉边缘背景后的剩余）
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[border_bg] = 0

    # 步骤3：从中心BFS，只保留与中心连通的不透明像素
    opaque = alpha > 0
    char_mask = bfs_from_center(opaque, h, w)

    # 最终alpha：只保留角色连通体
    final_alpha = np.zeros((h, w), dtype=np.uint8)
    final_alpha[char_mask] = 255

    rgba = np.dstack([arr, final_alpha])

    # 裁剪
    rows = np.any(final_alpha > 0, axis=1)
    cols = np.any(final_alpha > 0, axis=0)
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

    kept = 100 * char_mask.sum() / (h*w)
    removed = 100 * border_bg.sum() / (h*w)
    print(f"  {src_name:25s} -> {slug}.png  {new_w}x{TARGET_H}  bg_removed={removed:.1f}%  char_kept={kept:.1f}%")

# shogun 背景去得不够，用稍大容差
def process_shogun():
    """
    shogun 特殊处理：背景是纯灰(197,197,197)，角色有大量浅灰色。
    用 tol=4 去边缘，然后用形态学腐蚀去掉角色外围残留背景。
    """
    src = os.path.join(INPUT_DIR, '将军超人.jpg')
    dst = os.path.join(OUTPUT_DIR, 'shogun.png')

    img = Image.open(src).convert('RGB')
    arr = np.array(img, dtype=np.uint8)
    h, w = arr.shape[:2]

    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=np.float32).mean(axis=0).astype(np.uint8)
    arr = erase_watermark(arr.copy(), bg)
    diff = np.max(np.abs(arr.astype(np.int32) - bg.astype(np.int32)), axis=2)

    # 用 tol=4 去边缘纯背景
    border_bg = bfs_from_border(diff < 4, h, w)
    alpha = np.ones((h, w), dtype=np.uint8) * 255
    alpha[border_bg] = 0

    # 从中心BFS找角色连通体
    opaque = alpha > 0
    char_mask = bfs_from_center(opaque, h, w)

    # 对 shogun 额外处理：去掉角色外围的浅灰残留
    # 用形态学腐蚀：把角色mask向内收缩一点，再用原始diff>20重新扩展
    from PIL import ImageFilter as IF
    char_img = Image.fromarray(char_mask.astype(np.uint8)*255, 'L')
    # 先腐蚀去掉边缘薄层
    char_eroded = char_img.filter(IF.MinFilter(size=5))
    char_eroded_arr = np.array(char_eroded) > 127
    # 再用 diff>18 的像素重新扩展（保留真正的角色像素）
    strong_fg = diff > 18
    # 合并：腐蚀后的核心 + 与核心连通的强前景
    seed = char_eroded_arr & strong_fg
    # 从seed出发BFS扩展到所有 diff>8 的连通像素
    expandable = diff > 8
    final_mask = bfs_from_center(seed | (char_mask & expandable), h, w)

    final_alpha = np.zeros((h, w), dtype=np.uint8)
    final_alpha[final_mask] = 255
    rgba = np.dstack([arr, final_alpha])

    rows = np.any(final_alpha > 0, axis=1)
    cols = np.any(final_alpha > 0, axis=0)
    if not rows.any(): print("  [SKIP] shogun"); return
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
    print(f"  将军超人.jpg              -> shogun.png  {new_w}x{TARGET_H}")

print("修复 lawyer2 / chihiro / shogun ...\n")
process_center_protect('法务（？）.jpeg', 'lawyer2', tol=4)
process_center_protect('千寻.jpg',        'chihiro', tol=4)
process_shogun()
print("\n完成！")
