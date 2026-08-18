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

SAFE = 0.66  # 적응형 아이콘 전경이 잘리지 않는 범위
TRANSPARENT = (0, 0, 0, 0)


def save(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)
    print('생성:', path, f'{size}x{size}')


def mono(art, size):
    """실루엣. 알파를 흰색 한 겹으로 세운다.

    유리 안쪽은 이미 비어 있어서 병이 선으로 남는다. 통짜 덩어리보다 낫다.
    원본이 JPEG이라 얇은 병 테두리가 점선처럼 끊긴다. 그래서 한 번
    부풀렸다 깎아(닫힘 연산) 선을 잇고, 남은 점은 크기로 걸러낸 뒤,
    큰 구멍(병 안쪽)만 메워 매끈한 덩어리로 만든다.
    """
    placed = U.place(art, size, TRANSPARENT, SAFE)
    alpha = placed.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    alpha = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))

    mask = np.asarray(alpha) > 127
    mask = U.drop_specks(mask, min_area=int(size * size * 0.0004))
    # 병 안쪽은 메워서 통짜 실루엣으로. 얇은 유리 선은 JPEG 자국 때문에
    # 점선처럼 끊겨서, 선으로 남기면 지저분하다.
    mask = U.fill_big_holes(mask, min_area=int(size * size * 0.004))

    white = Image.new('RGBA', placed.size, (255, 255, 255, 0))
    white.putalpha(Image.fromarray(np.where(mask, 255, 0).astype('uint8'), 'L')
                   .filter(ImageFilter.GaussianBlur(0.6)))
    return white


if __name__ == '__main__':
    out = sys.argv[1]
    square, cream = U.square()
    art = U.content()

    save(square.convert('RGB'), f'{out}/icon.png', 1024)
    save(square.convert('RGB'), f'{out}/favicon.png', 48)

    save(U.place(art, 1024, TRANSPARENT, SAFE), f'{out}/android-icon-foreground.png', 512)
    save(Image.new('RGBA', (512, 512), cream), f'{out}/android-icon-background.png', 512)
    save(mono(art, 1024), f'{out}/android-icon-monochrome.png', 432)

    save(U.place(art, 1024, TRANSPARENT, SAFE), f'{out}/splash-icon.png', 1024)
