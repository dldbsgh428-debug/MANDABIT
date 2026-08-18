"""MOA 저금통 아이콘.

보내주신 이미지를 같은 컨셉으로 다시 그리되, 아이콘으로 쓰기 좋게 다듬는다.

원본에서 고친 점
  - 글자('모아')를 빼고 저금통을 키웠다. 홈화면에서는 아이콘 아래에 이미
    앱 이름이 나오고, 48px로 줄면 글자가 뭉개져 읽히지 않는다.
  - 선 굵기를 통일했다. 원본은 뚜껑·병·글자의 굵기가 제각각이었다.
  - 동전을 키우고 병을 절반 넘게 채웠다. 작게 봐도 '돈'으로 읽힌다.
  - 뚜껑을 몸통 위에 덮어 그려 이음새를 없앴다.
  - 여백을 정리해 안전영역(가운데 66%) 안에 들어오게 했다.
"""

from PIL import Image, ImageDraw, ImageFont
import sys

SS = 4  # 안티앨리어싱 배율
S = 1024

# 원본 이미지의 색을 그대로 가져왔다.
CREAM = (250, 244, 232, 255)
GREEN_DARK = (45, 90, 61, 255)      # 외곽선
GREEN_LID = (74, 124, 89, 255)      # 뚜껑
GREEN_LID_HI = (99, 150, 112, 255)  # 뚜껑 밝은 면
LEAF = (109, 190, 74, 255)
LEAF_DARK = (86, 163, 58, 255)
GLASS = (240, 248, 243, 255)
GLASS_HI = (253, 254, 253, 255)
GOLD = (247, 200, 62, 255)
GOLD_DARK = (226, 172, 45, 255)
GOLD_EDGE = (176, 124, 26, 255)
SHADOW = (45, 90, 61, 30)

KOREAN_FONTS = [
    '/usr/share/fonts/truetype/nanum/NanumSquareRoundEB.ttf',
    '/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf',
    '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf',
    '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
]
LATIN_FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']


def font_at(size, korean=False):
    for p in (KOREAN_FONTS if korean else LATIN_FONTS):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def px(v):
    """논리 좌표를 실제 픽셀로. PIL이 정수만 받는 자리가 있어 여기서 맞춘다."""
    return int(round(v * SS))


def rrect(d, box, radius, fill=None, outline=None, width=0):
    d.rounded_rectangle(
        [px(box[0]), px(box[1]), px(box[2]), px(box[3])],
        radius=max(1, px(radius)), fill=fill, outline=outline, width=px(width),
    )


def ellipse(d, box, fill=None, outline=None, width=0):
    d.ellipse(
        [px(box[0]), px(box[1]), px(box[2]), px(box[3])],
        fill=fill, outline=outline, width=px(width),
    )


def leaf(cx, cy, w, h, angle_left, fill):
    """잎 하나. 타원을 그린 뒤 회전해 붙인다."""
    layer = Image.new('RGBA', (max(2, px(w)), max(2, px(h))), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([0, 0, px(w) - 1, px(h) - 1], fill=fill)
    layer = layer.rotate(angle_left, expand=True, resample=Image.BICUBIC)
    return layer, (int(px(cx) - layer.width / 2), int(px(cy) - layer.height / 2))


def draw_jar(img, d, cx, cy, scale=1.0):
    """저금통 하나. cx, cy는 새싹 끝부터 병 바닥까지의 중심."""
    stroke = 14 * scale
    body_w = 424 * scale
    body_h = 430 * scale
    lid_h = 96 * scale
    sprout_h = 130 * scale

    # 전체 높이(새싹 + 뚜껑 + 몸통)를 기준으로 위에서부터 쌓아 내려간다.
    total_h = sprout_h + lid_h + body_h
    top = cy - total_h / 2
    lid_top = top + sprout_h
    body_top = lid_top + lid_h * 0.72   # 뚜껑이 몸통 위를 덮는다
    body_bottom = body_top + body_h
    left = cx - body_w / 2
    right = cx + body_w / 2

    # 바닥 그림자. 병 바닥선 바로 아래에 얇게 깐다.
    if SHADOW[3] > 0:
        shade = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ellipse(ImageDraw.Draw(shade),
                [left + 26 * scale, body_bottom - 6 * scale,
                 right - 26 * scale, body_bottom + 34 * scale], fill=SHADOW)
        img.alpha_composite(shade)

    # ---- 병 몸통
    rrect(d, [left, body_top, right, body_bottom], 56 * scale,
          fill=GLASS, outline=GREEN_DARK, width=stroke)

    # ---- 동전. 병의 절반 조금 넘게 채운다.
    coin_w = 188 * scale
    coin_h = 56 * scale
    stack_cx = cx - 86 * scale
    base_y = body_bottom - 84 * scale
    for i in range(3):
        y = base_y - i * 44 * scale
        ellipse(d, [stack_cx - coin_w / 2, y - coin_h / 2,
                    stack_cx + coin_w / 2, y + coin_h / 2],
                fill=GOLD if i % 2 == 0 else GOLD_DARK,
                outline=GOLD_EDGE, width=6 * scale)

    front_r = 112 * scale
    front_cx = cx + 74 * scale
    front_cy = body_bottom - 152 * scale
    ellipse(d, [front_cx - front_r, front_cy - front_r,
                front_cx + front_r, front_cy + front_r],
            fill=GOLD, outline=GOLD_EDGE, width=8 * scale)
    ellipse(d, [front_cx - front_r * 0.74, front_cy - front_r * 0.74,
                front_cx + front_r * 0.74, front_cy + front_r * 0.74],
            outline=GOLD_EDGE, width=5 * scale)

    f = font_at(int(px(front_r * 1.15)))
    l, t, r_, b = d.textbbox((0, 0), '₩', font=f)
    d.text((px(front_cx) - (r_ + l) / 2, px(front_cy) - (b + t) / 2),
           '₩', font=f, fill=GOLD_EDGE)

    # 유리 하이라이트. 동전 위에 얹어야 '유리 너머'로 보인다.
    rrect(d, [left + 44 * scale, body_top + 40 * scale,
              left + 88 * scale, body_top + 168 * scale], 22 * scale, fill=GLASS_HI)

    # 몸통 테두리를 한 번 더 덧그려 동전이 선 밖으로 새어 보이지 않게 한다.
    rrect(d, [left, body_top, right, body_bottom], 56 * scale,
          outline=GREEN_DARK, width=stroke)

    # ---- 뚜껑
    lid_left = left - 18 * scale
    lid_right = right + 18 * scale
    rrect(d, [lid_left, lid_top, lid_right, lid_top + lid_h], 36 * scale,
          fill=GREEN_LID, outline=GREEN_DARK, width=stroke)
    rrect(d, [lid_left + stroke, lid_top + stroke,
              lid_right - stroke, lid_top + lid_h * 0.44], 24 * scale, fill=GREEN_LID_HI)
    # 동전 투입구
    rrect(d, [cx - 84 * scale, lid_top + lid_h * 0.46,
              cx + 84 * scale, lid_top + lid_h * 0.72], 14 * scale, fill=GREEN_DARK)

    # ---- 새싹
    stem_w = 20 * scale
    stem_top = top + 22 * scale
    rrect(d, [cx - stem_w / 2, stem_top, cx + stem_w / 2, lid_top + 14 * scale],
          stem_w / 2, fill=LEAF_DARK)

    for layer, pos in (
        leaf(cx - 72 * scale, stem_top + 22 * scale, 124 * scale, 66 * scale, 28, LEAF_DARK),
        leaf(cx + 76 * scale, stem_top + 8 * scale, 138 * scale, 72 * scale, -32, LEAF),
    ):
        img.alpha_composite(layer, pos)


DARK = (11, 14, 20, 255)  # 앱 테마 배경(colors.bg)


def build(with_text=False, bg=CREAM, scale=1.0, jar_cy=None, text_fill=None):
    img = Image.new('RGBA', (px(S), px(S)), bg)
    d = ImageDraw.Draw(img)

    cy = jar_cy if jar_cy is not None else (S / 2 - (76 if with_text else 0))
    draw_jar(img, d, S / 2, cy, scale)

    if with_text:
        f = font_at(int(px(180 * scale)), korean=True)
        l, t, r, b = d.textbbox((0, 0), '모아', font=f)
        d.text((px(S / 2) - (r + l) / 2, px(S * 0.845) - (b + t) / 2),
               '모아', font=f, fill=text_fill or GREEN_DARK)
    return img


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    build(with_text=False).resize((512, 512), Image.LANCZOS).save(f'{out}/jar-clean.png')
    build(with_text=True, scale=0.78).resize((512, 512), Image.LANCZOS).save(f'{out}/jar-text.png')
    build(with_text=False, bg=DARK).resize((512, 512), Image.LANCZOS).save(f'{out}/jar-dark.png')
    print('생성 완료')
