# -*- coding: utf-8 -*-
from PIL import Image
import numpy as np

targets = [
    ('法务（？）.jpeg', 'lawyer2'),
    ('千寻.jpg',        'chihiro'),
    ('将军超人.jpg',    'shogun'),
    ('姬神樱.jpg',      'himegami'),
    ('御剑.jpg',        'mitsurugi'),
]

for name, slug in targets:
    img = Image.open(r'M:\下载\images_pack\\' + name).convert('RGB')
    arr = np.array(img)
    h, w = arr.shape[:2]
    corners = [arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]]
    bg = np.array(corners, dtype=float).mean(axis=0).astype(int)
    print(f'\n{slug}: bg=RGB{tuple(bg)}, size={w}x{h}')
    diff = np.max(np.abs(arr.astype(int) - bg), axis=2)
    for thresh in [8, 12, 15, 20, 25, 30]:
        pct = 100*(diff < thresh).sum()/(h*w)
        print(f'  diff<{thresh}: {pct:.1f}% 像素接近背景色')
    # 看看中心区域（角色主体）的颜色范围
    cy, cx = h//2, w//2
    center = arr[cy-10:cy+10, cx-10:cx+10]
    print(f'  中心区域颜色均值: RGB{tuple(center.mean(axis=(0,1)).astype(int))}')
    # 看边缘一圈的颜色
    border_pixels = np.concatenate([arr[0,:], arr[-1,:], arr[:,0], arr[:,-1]])
    print(f'  边缘颜色均值: RGB{tuple(border_pixels.mean(axis=0).astype(int))}')
    print(f'  边缘颜色std: {border_pixels.std(axis=0).astype(int)}')
