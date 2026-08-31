# -*- coding: utf-8 -*-
"""Eksik yem gorsellerini mevcut piksel-sanat stiliyle uretir.
192x128 net piksel sanat -> NEAREST ile 2x buyutulup 384x256 PNG olarak kaydedilir.
"""
import math, random, os
from PIL import Image

W, H = 192, 128
SCALE = 2                 # 192x128 -> 384x256 (oyunun kullandigi boyut)
OUT = "assets/feeds"

# ---------------------------------------------------------------- yardimcilar
def clamp(v, a=0, b=255):
    return int(max(a, min(b, v)))

def shade(c, f):
    return (clamp(c[0] * f), clamp(c[1] * f), clamp(c[2] * f))

def ramp(base):
    """koyu kontur -> golge -> ana -> acik -> parlak"""
    return [shade(base, 0.16), shade(base, 0.48), base,
            shade(base, 1.16), shade(base, 1.30)]


class Canvas:
    def __init__(self, glow):
        self.px = [[(0, 0, 0)] * W for _ in range(H)]
        self.glow(glow)

    def glow(self, c):
        """merkezden disa dogru sonen renkli isik — mevcut gorsellerdeki fon"""
        cx, cy = W / 2, H / 2
        rmax = math.hypot(cx, cy)
        for y in range(H):
            for x in range(W):
                d = math.hypot(x - cx, y - cy) / rmax
                k = max(0.0, 1.0 - d) ** 2.4 * 0.50
                self.px[y][x] = (clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k))

    def set(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[int(y)][int(x)] = c

    def image(self):
        im = Image.new("RGB", (W, H))
        im.putdata([self.px[y][x] for y in range(H) for x in range(W)])
        return im


def blob(cv, cx, cy, rx, ry, ang, cols, squareness=2.0, light=(-0.55, -0.83),
         crease=0, wrinkle=0.0, seed=0):
    """Dondurulmus (super)elips: konturlu, iki kademe golgeli piksel lekesi."""
    rnd = random.Random(seed)
    ca, sa = math.cos(-ang), math.sin(-ang)
    rr = int(max(rx, ry)) + 3
    n = 2.0 / squareness
    for y in range(int(cy - rr), int(cy + rr) + 1):
        for x in range(int(cx - rr), int(cx + rr) + 1):
            dx, dy = x - cx, y - cy
            u = dx * ca - dy * sa
            v = dx * sa + dy * ca
            if wrinkle:
                u += math.sin((v + seed) * 1.1) * wrinkle
            a = abs(u / rx) ** squareness + abs(v / ry) ** squareness
            if a > (1.0 + 2.6 / max(rx, ry)) ** squareness:
                continue
            if a > 1.0:
                cv.set(x, y, cols[0])                    # kontur
                continue
            # isik: normalize edilmis yuzey normali ile basit lambert
            nx, ny = u / rx, v / ry
            l = nx * light[0] + ny * light[1]
            if crease and abs(u) < 0.9 and abs(v) < ry * 0.72:
                cv.set(x, y, cols[0])                    # tane yarigi
                continue
            if l > 0.62:
                i = 4
            elif l > 0.18:
                i = 3
            elif l > -0.38:
                i = 2
            else:
                i = 1
            if rnd.random() < 0.12:                      # hafif doku grenlemesi
                i = max(1, min(4, i + rnd.choice((-1, 1))))
            cv.set(x, y, cols[i])


def stalk(cv, x0, y0, x1, y1, w, cols, bend=0.0, seed=0):
    """Egimli sap/saman teli."""
    steps = int(math.hypot(x1 - x0, y1 - y0)) * 2 + 1
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    nx, ny = -(y1 - y0), (x1 - x0)
    ln = math.hypot(nx, ny) or 1
    mx += nx / ln * bend
    my += ny / ln * bend
    pts = []
    for i in range(steps + 1):
        t = i / steps
        bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
        by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
        pts.append((bx, by, t))
    for bx, by, t in pts:                                 # once kontur
        r = w + 1
        for oy in range(-int(r), int(r) + 1):
            for ox in range(-int(r), int(r) + 1):
                if ox * ox + oy * oy <= r * r:
                    cv.set(bx + ox, by + oy, cols[0])
    for bx, by, t in pts:                                 # sonra govde
        for oy in range(-int(w), int(w) + 1):
            for ox in range(-int(w), int(w) + 1):
                if ox * ox + oy * oy <= w * w:
                    c = cols[3] if (ox + oy) < -w * 0.2 else (
                        cols[2] if (ox + oy) < w * 0.6 else cols[1])
                    cv.set(bx + ox, by + oy, c)


def pile(cv, items):
    """arkadan one dogru siralayip cizer — yigin derinligi verir"""
    for it in sorted(items, key=lambda i: i[0]):
        it[1]()


def scatter(rnd, count, rx=62, ry=40, cx=W / 2, cy=H / 2 + 4):
    """eliptik yigin icinde rastgele nokta uretir (merkeze yogun)"""
    out = []
    for _ in range(count):
        a = rnd.uniform(0, math.tau)
        r = math.sqrt(rnd.random())
        out.append((cx + math.cos(a) * r * rx, cy + math.sin(a) * r * ry))
    return out


# ---------------------------------------------------------------- yem tarifleri
def grains(base, count, rx, ry, sq=2.0, crease=0, wrinkle=0.0, awn=None,
           spread=(62, 40), glow=None, seed=1, second=None):
    """Tane yemler icin ortak uretici."""
    def build():
        rnd = random.Random(seed)
        cv = Canvas(glow or base)
        items = []
        for (x, y) in scatter(rnd, count, *spread):
            ang = rnd.uniform(0, math.pi)
            b = second if (second and rnd.random() < 0.30) else base
            cols = ramp(shade(b, rnd.uniform(0.86, 1.10)))
            srx = rx * rnd.uniform(0.82, 1.18)
            sry = ry * rnd.uniform(0.82, 1.18)
            s = rnd.randint(0, 9999)
            if awn:
                def mk(x=x, y=y, ang=ang, cols=cols, srx=srx, sry=sry, s=s):
                    ex = x + math.cos(ang + math.pi / 2) * sry * 1.1
                    ey = y + math.sin(ang + math.pi / 2) * sry * 1.1
                    stalk(cv, ex, ey,
                          ex + math.cos(ang + math.pi / 2) * awn,
                          ey + math.sin(ang + math.pi / 2) * awn, 0, cols)
                    blob(cv, x, y, srx, sry, ang, cols, sq, crease=crease,
                         wrinkle=wrinkle, seed=s)
            else:
                def mk(x=x, y=y, ang=ang, cols=cols, srx=srx, sry=sry, s=s):
                    blob(cv, x, y, srx, sry, ang, cols, sq, crease=crease,
                         wrinkle=wrinkle, seed=s)
            items.append((y, mk))
        pile(cv, items)
        return cv
    return build


def flakes(base, second, count, glow=None, seed=2, w=(5, 11), h=(2, 4)):
    """Kepek / posa: yassi duzensiz pullar."""
    def build():
        rnd = random.Random(seed)
        cv = Canvas(glow or base)
        items = []
        for (x, y) in scatter(rnd, count, 64, 42):
            b = second if rnd.random() < 0.38 else base
            cols = ramp(shade(b, rnd.uniform(0.80, 1.12)))
            ang = rnd.uniform(0, math.pi)
            rx = rnd.uniform(*w)
            ry = rnd.uniform(*h)
            s = rnd.randint(0, 9999)

            def mk(x=x, y=y, ang=ang, cols=cols, rx=rx, ry=ry, s=s):
                blob(cv, x, y, rx, ry, ang, cols, squareness=rnd.uniform(2.4, 3.4),
                     wrinkle=0.7, seed=s)
            items.append((y, mk))
        pile(cv, items)
        return cv
    return build


def forage(base, base2, glow, seed=3, blades=26, panicle=False, chopped=False):
    """Yesil kaba yem: saplar + yapraklar (+ istege bagli basak/dogranmis)."""
    def build():
        rnd = random.Random(seed)
        cv = Canvas(glow)
        items = []
        if chopped:
            for (x, y) in scatter(rnd, 150, 66, 42):
                b = base2 if rnd.random() < 0.42 else base
                cols = ramp(shade(b, rnd.uniform(0.82, 1.12)))
                ang = rnd.uniform(0, math.pi)
                rx = rnd.uniform(3.5, 7.5)
                ry = rnd.uniform(1.6, 3.0)
                s = rnd.randint(0, 9999)

                def mk(x=x, y=y, ang=ang, cols=cols, rx=rx, ry=ry, s=s):
                    blob(cv, x, y, rx, ry, ang, cols, squareness=2.8, seed=s)
                items.append((y, mk))
            pile(cv, items)
            return cv

        for _ in range(blades):
            b = base2 if rnd.random() < 0.35 else base
            cols = ramp(shade(b, rnd.uniform(0.84, 1.10)))
            x0 = rnd.uniform(46, 146)
            y0 = rnd.uniform(96, 118)
            ang = rnd.uniform(-1.35, 1.35) - math.pi / 2
            ln = rnd.uniform(46, 84)
            x1 = x0 + math.cos(ang) * ln
            y1 = y0 + math.sin(ang) * ln
            wdt = rnd.choice((1, 1, 2))
            bend = rnd.uniform(-14, 14)
            s = rnd.randint(0, 9999)

            def mk(x0=x0, y0=y0, x1=x1, y1=y1, wdt=wdt, cols=cols, bend=bend,
                   ang=ang, s=s):
                stalk(cv, x0, y0, x1, y1, wdt, cols, bend=bend, seed=s)
                if panicle:                     # sapin ucunda sarkan taneler
                    pc = ramp((222, 208, 128))
                    for k in range(rnd.randint(3, 6)):
                        px = x1 + rnd.uniform(-7, 7)
                        py = y1 + rnd.uniform(-2, 12)
                        blob(cv, px, py, 1.9, 3.4, rnd.uniform(-0.5, 0.5), pc,
                             2.0, seed=s + k)
                else:                           # yaprak agzi
                    lx = x0 + (x1 - x0) * rnd.uniform(0.45, 0.8)
                    ly = y0 + (y1 - y0) * rnd.uniform(0.45, 0.8)
                    blob(cv, lx, ly, rnd.uniform(7, 12), rnd.uniform(2, 3.4),
                         ang + rnd.choice((-0.7, 0.7)), cols, 2.2, seed=s)
            items.append((y0, mk))
        pile(cv, items)
        return cv
    return build


RECIPES = {
    # --- kaba yemler ---
    "yulaf_hasili": forage((104, 174, 52), (150, 198, 74), (96, 188, 40),
                           seed=11, blades=30, panicle=True),
    "misir_silaji": forage((142, 152, 58), (196, 186, 104), (168, 176, 52),
                           seed=12, chopped=True),
    "saman":        forage((214, 186, 108), (236, 214, 150), (228, 196, 96),
                           seed=13, blades=34),
    # --- bugdaygil tane yemleri ---
    "bugday":    grains((202, 148, 62), 78, 4.6, 7.0, sq=2.1, crease=1,
                        glow=(226, 158, 48), seed=21),
    "arpa":      grains((220, 194, 130), 70, 3.8, 8.4, sq=2.1, crease=1,
                        awn=13, glow=(232, 202, 120), seed=22),
    "yulaf":     grains((214, 191, 133), 74, 3.0, 9.2, sq=1.7,
                        glow=(230, 210, 140), seed=23,
                        second=(186, 162, 108)),
    "misir":     grains((246, 190, 44), 66, 6.4, 7.4, sq=2.6,
                        glow=(252, 190, 20), seed=24,
                        second=(236, 158, 40)),
    "cavdar":    grains((139, 130, 92), 78, 3.2, 8.6, sq=1.9, crease=1,
                        glow=(150, 148, 100), seed=25,
                        second=(112, 116, 86)),
    "tritikale": grains((176, 142, 84), 76, 4.2, 8.0, sq=2.0, crease=1,
                        wrinkle=0.8, glow=(206, 168, 84), seed=26,
                        second=(150, 120, 74)),
    # --- endustri yan urunleri ---
    "bugday_kepegi": flakes((152, 96, 52), (188, 132, 76), 120,
                            glow=(178, 106, 48), seed=31),
    "misir_kepegi":  flakes((226, 200, 120), (242, 224, 162), 120,
                            glow=(236, 208, 108), seed=32),
    "soya_kuspesi":  grains((200, 166, 116), 130, 3.4, 4.2, sq=2.6,
                            wrinkle=0.6, glow=(220, 186, 122), seed=33,
                            second=(170, 134, 88)),
}


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, build in RECIPES.items():
        path = os.path.join(OUT, name + ".png")
        im = build().image().resize((W * SCALE, H * SCALE), Image.NEAREST)
        im.save(path, optimize=True)
        print(f"{path:44s} {os.path.getsize(path)//1024:5d} KB")
