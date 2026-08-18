"""보내주신 그림을 아이콘 파일 6개로 변환한다.

그림은 그대로 두고, 아이콘으로 쓰려면 필요한 것만 손본다.
  1) 바깥 흰 여백과 둥근 모서리 제거. OS가 어차피 다시 둥글게 자르므로
     미리 둥글린 모서리를 남기면 귀퉁이에 흰 자국이 생긴다.
  2) 크림 배경을 걷어낸 '내용물' 판 — 적응형 아이콘 전경에 필요하다.
  3) 흰색 실루엣 — 안드로이드 테마 아이콘에 필요하다.

배경을 색으로만 걸러내면 금색 동전(r-b가 크다)까지 배경으로 딸려간다.
그래서 배경색은 실제 그림에서 뽑아 쓰고, 판정은 채널별 오차로 좁게 잡는다.
"""

import os
from collections import deque

from PIL import Image, ImageFilter
import numpy as np

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'source.jpg')
TOL = 16  # 채널별 허용 오차. 흰색과 크림은 파랑이 19 차이라 이 아래면 둘이 갈린다.


def _warm_mask(a):
    """따뜻한 밝은 색(= 크림 후보). 자르기 범위를 잡을 때만 쓰는 대충의 마스크."""
    return (a[:, :, 0] - a[:, :, 2] >= 12) & (a[:, :, 0] > 215)


def _from_border(mask):
    """테두리에서 시작해 mask가 True인 칸으로만 번져 나간 영역.

    PIL의 floodfill은 색 거리로 번져서 크림과 흰색(차이 19)을 못 가른다.
    여기서는 '배경색이냐 아니냐'만 판정하고 번지기는 직접 한다.
    """
    h, w = mask.shape
    seen = np.zeros_like(mask)
    q = deque()
    edge = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] \
        + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    for y, x in edge:
        if mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def drop_specks(mask, min_area):
    """작은 얼룩을 지운다. JPEG 압축 자국이 점으로 남는 걸 걸러낸다."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    out = np.zeros_like(mask)
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            cells = []
            while q:
                y, x = q.popleft()
                cells.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(cells) >= min_area:
                for y, x in cells:
                    out[y, x] = True
    return out


def fill_big_holes(mask, min_area):
    """구멍 중 큰 것만 메운다.

    병 안쪽(유리)은 크게 뚫려 있어 메워야 실루엣이 매끈하다. 반면
    '모아' 글자의 속(ㅇ, ㅗ의 빈칸)은 작아서 그대로 둬야 글자로 읽힌다.
    """
    h, w = mask.shape
    holes = ~mask & ~_from_border(~mask)
    seen = np.zeros_like(mask)
    out = mask.copy()
    for y0 in range(h):
        for x0 in range(w):
            if not holes[y0, x0] or seen[y0, x0]:
                continue
            q = deque([(y0, x0)])
            seen[y0, x0] = True
            cells = []
            while q:
                y, x = q.popleft()
                cells.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and holes[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(cells) >= min_area:
                for y, x in cells:
                    out[y, x] = True
    return out


def load():
    """그림에서 크림 사각형만 잘라내고, (crop, 크림색, 마스크들)을 돌려준다."""
    src = Image.open(SRC).convert('RGB')
    a = np.asarray(src).astype(int)
    ys, xs = np.where(_warm_mask(a))
    L, R, T, B = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    crop = src.crop((L, T, R + 1, B + 1))

    c = np.asarray(crop).astype(int)
    cx = crop.width // 2
    # 배경색은 사각형 위쪽 가운데(새싹보다 위)에서 뽑는다. 모서리는 둥글어서 바깥이 잡힌다.
    cream = np.median(c[30:70, cx - 60:cx + 60].reshape(-1, 3), axis=0).astype(int)

    is_cream = (np.abs(c - cream) <= TOL).all(axis=2)
    outside = _from_border(~is_cream)
    return crop, tuple(int(v) for v in cream), is_cream, outside


def square():
    """크림 사각형. 바깥은 같은 크림색으로 메우고 정사각형으로 맞춘다."""
    crop, cream, _, outside = load()
    a = np.asarray(crop).copy()
    a[outside] = cream
    filled = Image.fromarray(a.astype('uint8'), 'RGB')

    side = max(filled.size)
    out = Image.new('RGB', (side, side), cream)
    out.paste(filled, ((side - filled.width) // 2, (side - filled.height) // 2))
    return out, cream


def content(trim_text=False):
    """배경을 지우고 그림만 남긴 RGBA."""
    crop, _, is_cream, outside = load()
    keep = ~is_cream & ~outside

    alpha = Image.fromarray(np.where(keep, 255, 0).astype('uint8'), 'L')
    # JPEG 잡티가 배경 곳곳에 점으로 남는다. 한 번 깎았다 부풀려서 지운다.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    keep = np.asarray(alpha) > 127
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    out = crop.convert('RGBA')
    out.putalpha(alpha)

    if trim_text:
        # 병과 글자 사이에 완전히 빈 줄은 없다(병 그림자와 잎이 걸친다).
        # 그래서 아래쪽 절반에서 픽셀이 가장 적은 줄을 경계로 삼는다.
        per_row = keep.sum(axis=1)
        lo, hi = int(keep.shape[0] * 0.55), int(keep.shape[0] * 0.85)
        cut = lo + int(np.argmin(per_row[lo:hi]))
        out = out.crop((0, 0, out.width, cut))
    return out.crop(out.getbbox())


def place(art, size, bg, ratio):
    """긴 변이 캔버스의 ratio가 되게 맞춰 가운데 놓는다."""
    k = size * ratio / max(art.size)
    art = art.resize((max(1, round(art.width * k)), max(1, round(art.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), bg)
    out.alpha_composite(art.convert('RGBA'), ((size - art.width) // 2, (size - art.height) // 2))
    return out


if __name__ == '__main__':
    sq, cream = square()
    print('크림색:', cream, '정사각형:', sq.size)
    sq.save('u-square.png')
    content().save('u-content.png')
    content(trim_text=True).save('u-content-notext.png')
    print('저장 완료')
