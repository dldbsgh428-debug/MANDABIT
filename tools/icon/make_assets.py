"""아이콘 하나를 앱이 요구하는 6개 파일로 뽑아낸다.

크기마다 필요한 게 다르다.
  - icon/favicon: 배경까지 포함한 완성본.
  - 안드로이드 적응형: 배경(단색)과 전경(투명)을 나눠야 하고,
    전경은 기기마다 원/사각형으로 잘리므로 가운데 66% 안에 넣는다.
  - 모노크롬: 테마 아이콘용. 색을 지우고 흰 선만 남긴다.
"""

import sys
from PIL import Image
import make_icon as C

TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)
SAFE = 0.62  # 적응형 아이콘 안전영역(66%)보다 조금 더 여유를 둔다


def save(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)
    print('생성:', path, f'{size}x{size}')


def art():
    return C.stack()


def mono(fit=SAFE):
    """테마 아이콘용 실루엣.

    색을 한 겹으로 눌러야 하는데, 통짜로 칠하면 케이크처럼 보인다.
    그래서 동전은 흰색으로 채우고 테두리 자리는 '지워서' 홈을 만든다.
    층이 남아 쌓인 동전으로 읽히고, ₩ 자국도 그대로 파인다.
    """
    keep = {n: getattr(C, n) for n in
            ('GOLD', 'GOLD_SIDE', 'GOLD_EDGE', 'GOLD_RIM', 'LEAF', 'LEAF_DARK',
             'SHADOW', 'GROOVE')}
    C.GOLD = C.GOLD_SIDE = C.GOLD_RIM = C.GOLD_EDGE = WHITE
    C.LEAF = C.LEAF_DARK = WHITE
    C.SHADOW = TRANSPARENT
    C.GROOVE = TRANSPARENT
    try:
        return C.finish(C.stack(sparkles=False), TRANSPARENT, fit=fit)
    finally:
        for n, v in keep.items():
            setattr(C, n, v)


if __name__ == '__main__':
    out = sys.argv[1]

    save(C.finish(art(), C.CREAM, fit=0.70).convert('RGB'), f'{out}/icon.png', 1024)
    save(C.finish(art(), C.CREAM, fit=0.78), f'{out}/favicon.png', 48)

    save(C.finish(art(), TRANSPARENT, fit=SAFE), f'{out}/android-icon-foreground.png', 512)
    save(Image.new('RGBA', (512, 512), C.CREAM), f'{out}/android-icon-background.png', 512)
    save(mono(), f'{out}/android-icon-monochrome.png', 432)

    save(C.finish(art(), TRANSPARENT, fit=SAFE), f'{out}/splash-icon.png', 1024)
