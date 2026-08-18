"""저금통 아이콘을 앱이 요구하는 6개 파일로 뽑아낸다.

크기마다 필요한 게 다르다.
  - 아이콘(1024/48): 크림색 배경까지 포함한 완성본.
  - 안드로이드 적응형: 배경(단색)과 전경(투명)을 나눠야 한다.
    전경은 기기마다 원/사각형으로 잘리므로 가운데 66% 안에 넣는다.
  - 모노크롬: 테마 아이콘용 실루엣. 색을 다 지우고 흰색 한 겹으로 만든다.
"""

import sys
import make_jar as J
from PIL import Image

TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)


def save(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path)
    print('생성:', path, f'{size}x{size}')


def mono():
    """테마 아이콘용 실루엣.

    통짜 흰 덩어리로 만들면 선물상자처럼 보인다. 그래서 컬러 원본에서
    '선'에 해당하는 색(초록 외곽선, 동전 테두리)만 골라 흰색으로 남기고
    나머지는 비운다. 병 모양과 동전이 선으로 남아 저금통으로 읽힌다.
    """
    src = J.build(bg=(0, 0, 0, 0)).convert('RGBA')
    line_colors = (J.GREEN_DARK, J.GREEN_LID, J.GREEN_LID_HI,
                   J.LEAF, J.LEAF_DARK, J.GOLD_EDGE)
    px = src.load()
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    op = out.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            # 가장 가까운 원본 색을 찾아, 그게 '선' 색이면 남긴다.
            near = min(line_colors + (J.GLASS, J.GOLD, J.GOLD_DARK),
                       key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2)
            if near in line_colors:
                op[x, y] = (255, 255, 255, a)
    return out


if __name__ == '__main__':
    out = sys.argv[1]

    save(J.build(scale=1.15).convert('RGB'), f'{out}/icon.png', 1024)
    save(J.build(scale=1.30), f'{out}/favicon.png', 48)

    # 적응형 아이콘: 전경은 투명 배경 + 안전영역, 배경은 단색
    save(J.build(bg=TRANSPARENT), f'{out}/android-icon-foreground.png', 512)
    save(Image.new('RGBA', (512, 512), J.CREAM), f'{out}/android-icon-background.png', 512)
    save(mono(), f'{out}/android-icon-monochrome.png', 432)

    save(J.build(bg=TRANSPARENT), f'{out}/splash-icon.png', 1024)
