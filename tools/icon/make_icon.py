"""'모아' 아이콘 후보 — 차곡차곡 쌓이고, 자라난다.

이름이 '모아'니까 아이콘도 '모으는 중'이 보여야 한다.
그래서 동전을 쌓고, 그 위에서 새싹이 자라는 모양으로 간다.

귀엽게 = 도형을 통통하게, 모서리를 전부 둥글게, 선 굵기 하나로.
깔끔하게 = 요소는 세 개까지만(동전 / 새싹 / 반짝임).
"""

from PIL import Image, ImageDraw, ImageFont
import sys

SS = 4
S = 1024

CREAM = (250, 244, 232, 255)
DARK = (11, 14, 20, 255)
GREEN_DARK = (45, 90, 61, 255)
LEAF = (109, 190, 74, 255)
LEAF_DARK = (86, 163, 58, 255)
GOLD = (250, 205, 74, 255)
GOLD_SIDE = (232, 174, 44, 255)
GOLD_EDGE = (172, 118, 26, 255)
GOLD_RIM = GOLD_EDGE  # 옆면 세로선. 모노크롬에서만 따로 바꾼다
SHADOW = (45, 90, 61, 28)
# 모노크롬(테마 아이콘)에서만 쓴다. 층 사이에 홈을 파 '쌓인 동전'으로 보이게 한다.
GROOVE = None


def px(v):
    return int(round(v * SS))


def font_at(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def ellipse(d, cx, cy, rx, ry, fill=None, outline=None, width=0):
    d.ellipse([px(cx - rx), px(cy - ry), px(cx + rx), px(cy + ry)],
              fill=fill, outline=outline, width=px(width))


def coin(img, d, cx, cy, rx, ry, thick, stroke, mark=False):
    """옆에서 살짝 내려다본 동전 하나. 윗면 타원 + 옆면 띠."""
    # 옆면: 아래쪽 타원 → 사각형 → 좌우 선 순서로 그려야 실루엣이 매끈하다.
    ellipse(d, cx, cy + thick, rx, ry, fill=GOLD_SIDE, outline=GOLD_EDGE, width=stroke)
    d.rectangle([px(cx - rx), px(cy), px(cx + rx), px(cy + thick)], fill=GOLD_SIDE)
    for sx in (cx - rx + stroke / 2, cx + rx - stroke / 2):
        d.line([px(sx), px(cy), px(sx), px(cy + thick)], fill=GOLD_RIM, width=px(stroke))
    ellipse(d, cx, cy, rx, ry, fill=GOLD, outline=GOLD_EDGE, width=stroke)

    if GROOVE is not None:
        # 홈을 실루엣 끝까지 파면 옆구리가 뜯겨 보인다. 그래서 각도를 좁혀
        # 앞쪽 호만 판다.
        d.arc([px(cx - rx), px(cy - ry), px(cx + rx), px(cy + ry)],
              27, 153, fill=GROOVE, width=px(stroke))

    if mark:
        # ₩를 윗면에 얹는다. 위에서 내려다보는 각도라 세로로 눌러 붙여야 자연스럽다.
        h = int(px(ry * 1.7))
        layer = Image.new('RGBA', (h, h), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        f = font_at(int(h * 0.88))
        l, t, r, b = ld.textbbox((0, 0), '₩', font=f)
        ld.text(((h - (r + l)) / 2, (h - (b + t)) / 2), '₩', font=f, fill=GOLD_EDGE)
        squashed = layer.resize((h, max(2, int(h * 0.66))), Image.LANCZOS)
        img.alpha_composite(squashed, (px(cx) - squashed.width // 2,
                                       px(cy + ry * 0.34) - squashed.height // 2))


def leaf_at(cx, cy, w, h, angle, fill):
    layer = Image.new('RGBA', (max(2, px(w)), max(2, px(h))), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([0, 0, px(w) - 1, px(h) - 1], fill=fill)
    layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC)
    return layer, (int(px(cx) - layer.width / 2), int(px(cy) - layer.height / 2))


def sprout(img, d, cx, base_y, height, spread, stroke):
    """새싹. base_y에서 시작해 위로 자란다."""
    top = base_y - height
    d.rounded_rectangle(
        [px(cx - stroke / 2), px(top), px(cx + stroke / 2), px(base_y)],
        radius=px(stroke / 2), fill=LEAF_DARK)
    for layer, pos in (
        leaf_at(cx - spread * 0.42, top + spread * 0.24, spread * 0.74, spread * 0.40, 26, LEAF_DARK),
        leaf_at(cx + spread * 0.46, top + spread * 0.13, spread * 0.84, spread * 0.44, -30, LEAF),
    ):
        img.alpha_composite(layer, pos)


def sparkle(d, cx, cy, r, fill):
    """네 갈래 반짝임. 마름모 두 개를 겹쳐 만든다."""
    d.polygon([(px(cx), px(cy - r)), (px(cx + r * 0.30), px(cy - r * 0.30)),
               (px(cx + r), px(cy)), (px(cx + r * 0.30), px(cy + r * 0.30)),
               (px(cx), px(cy + r)), (px(cx - r * 0.30), px(cy + r * 0.30)),
               (px(cx - r), px(cy)), (px(cx - r * 0.30), px(cy - r * 0.30))], fill=fill)


def canvas(bg=None):
    """그림은 항상 투명 위에 그린다. 배경은 마지막에 깔아야 가운데 맞추기가 쉽다."""
    img = Image.new('RGBA', (px(S), px(S)), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def finish(art, bg, fit=None):
    """그려진 내용을 캔버스 정중앙에 맞추고 배경을 깐다.

    좌표를 눈대중으로 잡으면 아이콘이 미묘하게 아래로 쏠린다.
    실제로 칠해진 영역(bbox)을 재서 옮기는 편이 확실하다.
    """
    box = art.getbbox()
    if box:
        content = art.crop(box)
        if fit:
            # 긴 변이 캔버스의 fit 비율이 되게 맞춘다. 적응형 아이콘 안전영역(66%)을
            # 지킬 때 이 값만 바꾸면 된다.
            k = px(S) * fit / max(content.width, content.height)
            content = content.resize((max(1, int(content.width * k)),
                                      max(1, int(content.height * k))), Image.LANCZOS)
        art = Image.new('RGBA', (px(S), px(S)), (0, 0, 0, 0))
        art.alpha_composite(content, ((px(S) - content.width) // 2,
                                      (px(S) - content.height) // 2))
    out = Image.new('RGBA', (px(S), px(S)), bg)
    out.alpha_composite(art)
    return out


def stack(coins=3, sparkles=True, mark=True):
    """후보 A: 동전 한 무더기 위에 새싹. 제일 단순하고 작아져도 안 뭉갠다."""
    img, d = canvas()
    cx = S / 2
    rx, ry, thick, stroke, gap = 210, 84, 58, 14, 78

    bottom_top_y = 686  # 맨 아래 동전의 윗면 y
    ellipse(d, cx, bottom_top_y + thick + ry * 0.55, rx * 0.94, ry * 0.42, fill=SHADOW)

    for i in range(coins):
        y = bottom_top_y - i * gap
        coin(img, d, cx, y, rx, ry, thick, stroke, mark=(mark and i == coins - 1))
        img_d = ImageDraw.Draw(img)
        d = img_d  # alpha_composite 후에는 Draw를 다시 잡아야 한다

    top_y = bottom_top_y - (coins - 1) * gap
    sprout(img, d, cx, top_y - ry * 0.4, 165, 250, 27)
    if sparkles:
        sparkle(d, cx - 282, top_y - 168, 36, GOLD)
        sparkle(d, cx + 292, top_y - 60, 26, GOLD)
    return img


def steps(sparkles=True):
    """후보 B: 1·2·3단으로 올라가는 동전 계단. '늘어난다'가 가장 세게 보인다."""
    img, d = canvas()
    cx = S / 2
    rx, ry, thick, stroke, gap = 132, 54, 38, 14, 50
    cols = ((cx - 296, 1), (cx, 2), (cx + 296, 3))
    base = 720

    for x, n in cols:
        ellipse(d, x, base + thick + ry * 0.5, rx * 0.94, ry * 0.42, fill=SHADOW)
        for i in range(n):
            coin(img, d, x, base - i * gap, rx, ry, thick, stroke,
                 mark=(n == 2 and i == n - 1))
            d = ImageDraw.Draw(img)

    top_y = base - 2 * gap
    sprout(img, d, cx + 296, top_y - ry * 0.45, 150, 210, 20)
    if sparkles:
        sparkle(d, cx - 300, base - 190, 32, GOLD)
    return img


VARIANTS = {
    'stack': lambda: finish(stack(), CREAM, fit=0.70),
    'stack-nomark': lambda: finish(stack(mark=False), CREAM, fit=0.70),
    'stack-dark': lambda: finish(stack(), DARK, fit=0.70),
    'steps': lambda: finish(steps(), CREAM, fit=0.74),
}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    for name, fn in VARIANTS.items():
        fn().resize((512, 512), Image.LANCZOS).save(f'{out}/cute-{name}.png')
        print('생성:', f'cute-{name}.png')
