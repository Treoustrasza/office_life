# -*- coding: utf-8 -*-
"""
详细分析 lawyer2、chihiro、shogun 的颜色分布，
找出背景色和角色色的精确边界。
"""
from PIL import Image
import numpy as np

targets = [
    ('法务（？）.jpeg', 'lawyer2'),
    ('千寻.jpg',        'chihiro'),
    ('将军超人.jpg',    'shogun'),
]

for name, slug in targets:
    img = Image.open(r'M:\下载\images_pack\\' + name).convert('RGB')
    arr = np.array(img)
    h, w = arr.shape[:2]
    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=float).mean(axis=0).astype(int)
    diff = np.max(np.abs(arr.astype(int) - bg), axis=2)

    print(f'\n===== {slug} =====')
    print(f'背景色: RGB{tuple(bg)}, 图片尺寸: {w}x{h}')

    # 统计diff分布（直方图）
    print('diff分布:')
    for lo, hi in [(0,5),(5,10),(10,15),(15,20),(20,30),(30,50),(50,100),(100,256)]:
        cnt = ((diff >= lo) & (diff < hi)).sum()
        pct = 100*cnt/(h*w)
        print(f'  [{lo:3d}-{hi:3d}): {pct:5.1f}%  ({cnt}px)')

    # 看角色中心区域的颜色
    print('各区域采样:')
    for label, (r1,r2,c1,c2) in [
        ('左上角(背景)', (0,50,0,50)),
        ('右上角(背景)', (0,50,w-50,w)),
        ('中心区域',     (h//2-30,h//2+30,w//2-30,w//2+30)),
        ('上部1/4',      (h//4-20,h//4+20,w//2-20,w//2+20)),
    ]:
        region = arr[r1:r2, c1:c2]
        mean_c = region.mean(axis=(0,1)).astype(int)
        diff_r = np.max(np.abs(region.astype(int) - bg), axis=2)
        print(f'  {label}: RGB{tuple(mean_c)}, diff均值={diff_r.mean():.1f}')
