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
TOL = 22  # 배경으로 볼 색의 허용 오차(채널별). 아이콘 배경에 은은한 명암이
          # 깔려 있어 넉넉해야 한다. 종이 여백은 따로 걸러내므로 안전하다.


def _largest_blob(mask):
    """mask에서 가장 큰 덩어리만 남긴 마스크."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = None
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
            if best is None or len(cells) > len(best):
                best = cells
    out = np.zeros_like(mask)
    for y, x in best:
        out[y, x] = True
    return out


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
    """그림에서 아이콘 사각형만 잘라내고, (crop, 배경색, 배경마스크, 사각형바깥)을 준다.

    보내주신 이미지는 아이콘이 흰 종이 위에 놓인 형태다(아래에 제목·설명이
    붙기도 한다). 종이와 아이콘 배경은 색이 아주 가까워서 색만으로는 못 가른다.
    그래서 두 단계로 나눈다.

      1) 따뜻한 밝은 색 중 '가장 큰 덩어리'를 찾아 아이콘 배경으로 본다.
         종이의 JPEG 잡티도 따뜻하게 잡히지만, 흩어진 점이라 덩어리가 못 된다.
      2) 그 덩어리의 구멍(=그림)을 메워 사각형 전체를 얻는다.

    사각형 안쪽만 남으면 종이와 헷갈릴 일이 없으므로, 배경 판정은
    넉넉하게 잡아도 된다. 아이콘 배경에 은은한 명암이 깔려 있어서 필요하다.
    """
    src = Image.open(SRC).convert('RGB')
    a = np.asarray(src).astype(int)

    warm = (a[:, :, 0] - a[:, :, 2] >= 6) & (a[:, :, 0] > 215)
    blob = _largest_blob(warm)
    plate = fill_big_holes(blob, min_area=int(blob.sum() * 0.02))

    ys, xs = np.where(plate)
    T, L, B, R = int(ys.min()), int(xs.min()), int(ys.max()), int(xs.max())
    crop = src.crop((L, T, R + 1, B + 1))
    outside = ~plate[T:B + 1, L:R + 1]

    c = np.asarray(crop).astype(int)
    cx = crop.width // 2
    y0 = max(2, int(crop.height * 0.05))
    cream = np.median(c[y0:y0 + 30, cx - 40:cx + 40].reshape(-1, 3), axis=0).astype(int)
    is_cream = (np.abs(c - cream) <= TOL).all(axis=2) | outside
    return crop, tuple(int(v) for v in cream), is_cream, outside


def square():
    """아이콘 사각형. 바깥은 같은 배경색으로 메우고 정사각형으로 맞춘다."""
    crop, cream, _, outside = load()
    a = np.asarray(crop).copy()
    a[outside] = cream
    filled = Image.fromarray(a.astype('uint8'), 'RGB')

    side = max(filled.size)
    out = Image.new('RGB', (side, side), cream)
    out.paste(filled, ((side - filled.width) // 2, (side - filled.height) // 2))
    return out, cream


def content(trim_text=False, bg_tol=34):
    """배경을 지우고 그림만 남긴 RGBA.

    bg_tol이 load()의 TOL보다 넉넉하다. 그림 둘레의 옅은 그림자까지 배경으로
    넘겨야 투명 배경에 얹었을 때 네모난 자국이 남지 않는다.
    """
    crop, cream, _, outside = load()
    c = np.asarray(crop).astype(int)
    keep = ~((np.abs(c - np.array(cream)) <= bg_tol).all(axis=2) | outside)

    alpha = Image.fromarray(np.where(keep, 255, 0).astype('uint8'), 'L')
    # JPEG 잡티가 배경 곳곳에 점으로 남는다. 한 번 깎았다 부풀려서 지운다.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    keep = np.asarray(alpha) > 127
    keep = drop_specks(keep, min_area=int(keep.size * 0.0008))
    alpha = Image.fromarray(np.where(keep, 255, 0).astype('uint8'), 'L') \
        .filter(ImageFilter.GaussianBlur(0.7))

    out = crop.convert('RGBA')
    out.putalpha(alpha)

    if trim_text:
        # 그림과 글자 사이에 완전히 빈 줄은 없다(그림자와 잎이 걸친다).
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
