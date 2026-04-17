# -*- coding: utf-8 -*-
"""
用 rembg（深度学习）处理背景色与角色色极度接近的图片。
处理完后缩放到 80px 高度。
"""
from rembg import remove
from PIL import Image
import numpy as np
import os

INPUT_DIR  = r'M:\下载\images_pack'
OUTPUT_DIR = r'D:\working_dir\office-life\chars'
TARGET_H   = 80

# 需要用 rembg 处理的图片
TARGETS = [
    ('法务（？）.jpeg', 'lawyer2'),
    ('千寻.jpg',        'chihiro'),
    ('将军超人.jpg',    'shogun'),
]

print("使用 rembg 深度学习去背景...\n")
for src_name, slug in TARGETS:
    src = os.path.join(INPUT_DIR, src_name)
    dst = os.path.join(OUTPUT_DIR, slug + '.png')
    print(f"  处理 {src_name} ...", end=' ', flush=True)

    img = Image.open(src).convert('RGB')

    # rembg 去背景
    result = remove(img)  # 返回 RGBA

    # 裁剪掉透明边缘
    arr = np.array(result)
    alpha = arr[:,:,3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any():
        print("SKIP（全透明）"); continue
    rmin, rmax = np.where(rows)[0][[0,-1]]
    cmin, cmax = np.where(cols)[0][[0,-1]]
    pad = 3
    h, w = arr.shape[:2]
    rmin = max(0, rmin-pad); rmax = min(h-1, rmax+pad)
    cmin = max(0, cmin-pad); cmax = min(w-1, cmax+pad)
    cropped = Image.fromarray(arr[rmin:rmax+1, cmin:cmax+1], 'RGBA')

    # 缩放到 TARGET_H 高度
    cw, ch = cropped.size
    new_w = max(1, int(cw * TARGET_H / ch))
    final = cropped.resize((new_w, TARGET_H), Image.NEAREST)
    final.save(dst, 'PNG')
    print(f"-> {slug}.png  {new_w}x{TARGET_H}")

print("\n完成！")
