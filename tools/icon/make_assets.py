"""보내주신 그림에서 앱 아이콘 파일 6개를 만든다.

크기마다 필요한 게 다르다.
  - icon/favicon: 배경까지 포함한 완성본.
  - 안드로이드 적응형: 배경(단색)과 전경(투명)을 나눠야 하고,
    전경은 기기마다 원/사각형으로 잘리므로 가운데 66% 안에 넣는다.
  - 모노크롬: 테마 아이콘용 흰색 실루엣.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter
import from_source as U

# 그림이 캔버스에서 차지할 비율. 런처가 아이콘을 원/스퀘어클로 잘라내기 때문에
# 여백이 없으면 꽉 차 보이고 모서리가 잘린다.
#
# 적응형 아이콘은 108dp 캔버스 중 가운데 72dp(66%)만 보인다. 그래서 전경은
# 0.46으로 두면 보이는 원 안에서 약 70%를 차지한다.
ICON_FIT = 0.58
FOREGROUND_FIT = 0.46
FAVICON_FIT = 0.64  # 48px에서는 조금 커야 알아볼 수 있다
SPLASH_FIT = 0.44

SAFE = FOREGROUND_FIT
TRANSPARENT = (0, 0, 0, 0)


def save(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)
    print('생성:', path, f'{size}x{size}')


def mono(size):
    """테마 아이콘용 흰 실루엣.

    알파(=배경이 아닌 곳)로 만들면 손잡이 구멍까지 메워져 뭉친 덩어리가 된다.
    구멍 안에는 옅은 그림자가 깔려 있어 '배경'으로 안 걸러지기 때문이다.
    그래서 밝기로 자른다. 바구니·카드·동전은 배경보다 뚜렷이 어둡고,
    구멍 안쪽과 테두리 광택은 배경만큼 밝다.
    """
    crop, cream, _, outside = U.load()
    a = np.asarray(crop).astype(float)
    lum = a @ np.array([0.299, 0.587, 0.114])
    bg_lum = float(np.array(cream) @ np.array([0.299, 0.587, 0.114]))
    # 사각형 테두리의 광택선이 남아 그림 옆에 얇은 활 모양으로 붙는다.
    # 판을 안쪽으로 조금 깎아 테두리를 아예 제외한다.
    inner = Image.fromarray(np.where(outside, 0, 255).astype('uint8'), 'L')
    k = max(3, int(min(crop.size) * 0.045) | 1)
    inner = np.asarray(inner.filter(ImageFilter.MinFilter(k))) > 127
    mask = (lum < bg_lum * 0.91) & inner

    alpha = Image.fromarray(np.where(mask, 255, 0).astype('uint8'), 'L')
    # JPEG 경계가 톱니처럼 남는다. 부풀렸다 깎아 매끈하게.
    alpha = alpha.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    mask = U.drop_specks(np.asarray(alpha) > 127,
                         min_area=int(alpha.size[0] * alpha.size[1] * 0.001))

    art = Image.fromarray(np.zeros((*mask.shape, 4), dtype='uint8'), 'RGBA')
    art.putalpha(Image.fromarray(np.where(mask, 255, 0).astype('uint8'), 'L'))
    art = art.crop(art.getbbox())

    placed = U.place(art, size, TRANSPARENT, SAFE)
    white = Image.new('RGBA', placed.size, (255, 255, 255, 0))
    white.putalpha(placed.getchannel('A').filter(ImageFilter.GaussianBlur(0.6)))
    return white


if __name__ == '__main__':
    out = sys.argv[1]
    _, cream = U.square()
    art = U.content()

    # 원본 그림의 판(둥근 모서리 + 도톰한 테두리)은 쓰지 않는다. 런처가 다시
    # 잘라내면 그 테두리가 어중간하게 남는다. 배경은 같은 크림 단색으로 깔고
    # 그림만 얹으면 적응형 아이콘과 모양이 정확히 같아진다.
    save(U.place(art, 1024, cream, ICON_FIT).convert('RGB'), f'{out}/icon.png', 1024)
    save(U.place(art, 1024, cream, FAVICON_FIT).convert('RGB'), f'{out}/favicon.png', 48)

    save(U.place(art, 1024, TRANSPARENT, FOREGROUND_FIT),
         f'{out}/android-icon-foreground.png', 512)
    save(Image.new('RGBA', (512, 512), cream), f'{out}/android-icon-background.png', 512)
    save(mono(1024), f'{out}/android-icon-monochrome.png', 432)

    save(U.place(art, 1024, TRANSPARENT, SPLASH_FIT), f'{out}/splash-icon.png', 1024)
