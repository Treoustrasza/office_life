# -*- coding: utf-8 -*-
"""找出 lawyer2 和 shogun 原图中角色的实际位置"""
from PIL import Image
import numpy as np

for name, slug in [('法务（？）.jpeg','lawyer2'), ('将军超人.jpg','shogun')]:
    img = Image.open(r'M:\下载\images_pack\\' + name).convert('RGB')
    arr = np.array(img)
    h, w = arr.shape[:2]
    bg = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]],
                  dtype=float).mean(axis=0).astype(int)
    diff = np.max(np.abs(arr.astype(int) - bg), axis=2)

    # 找diff>20的像素（角色主体）的边界框
    fg = diff > 20
    rows = np.any(fg, axis=1)
    cols = np.any(fg, axis=0)
    if rows.any():
        rmin, rmax = np.where(rows)[0][[0,-1]]
        cmin, cmax = np.where(cols)[0][[0,-1]]
        print(f'{slug}: 角色区域 rows={rmin}-{rmax}, cols={cmin}-{cmax}')
        print(f'  角色中心: ({(rmin+rmax)//2}, {(cmin+cmax)//2})')
        # 看角色中心的颜色
        cr, cc = (rmin+rmax)//2, (cmin+cmax)//2
        print(f'  角色中心颜色: RGB{tuple(arr[cr,cc])}  diff={diff[cr,cc]}')
        # 看角色区域内diff分布
        char_region = diff[rmin:rmax+1, cmin:cmax+1]
        print(f'  角色区域内 diff均值={char_region.mean():.1f}, 最小={char_region.min()}, 最大={char_region.max()}')
        for thresh in [4, 8, 12, 20]:
            pct = 100*(char_region < thresh).sum()/char_region.size
            print(f'  角色区域内 diff<{thresh}: {pct:.1f}%')
    else:
        print(f'{slug}: 找不到角色区域！')
