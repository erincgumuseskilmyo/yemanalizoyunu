# -*- coding: utf-8 -*-
"""Ilk soru icin gercek yem fotograflarini indirir, kirpar ve kunye dosyasi uretir.

Kaynak: Wikimedia Commons (serbest lisansli). Her fotograf 4:3 orana kirpilip
800x600 JPEG olarak assets/feeds_photo/ altina yazilir; lisans/yazar bilgisi
assets/feeds_photo/kunye.json dosyasinda toplanir.
"""
import io, json, os, re, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "YemLabOyunu/1.0 (egitim amacli ders materyali; erincgumus@protonmail.com)"
OUT = "assets/feeds_photo"
W, H = 800, 600

# yem anahtari -> Commons dosya adi (File: oneki olmadan)
PICKS = {
    # --- kaba yemler: bitki / yigin fotograflari ---
    "yonca":            "Medicago sativa (4656243403).jpg",
    "korunga":          "Onobrychis viciifolia Inflorescence 11April2009 CampoCalatrava.jpg",
    "ucgul":            "Trifolium pratense - Keila.jpg",
    "fig":              "Vicia sativa kz01.jpg",
    "cayir_mera_otu":   "Sweet Vernal-grass flowering in a hay meadow - geograph.org.uk - 1869558.jpg",
    "misir_hasili":     "Forage maize - geograph.org.uk - 4211168.jpg",
    "cavdar_hasili":    "LPCC-583-Camp de sègol.jpg",
    "yulaf_hasili":     "LPCC-529-Camp de civada.jpg",
    "misir_silaji":     "LPCC-908-Ensitjant blat de moro.jpg",
    "saman":            "LPCC-588-Palla de sègol.jpg",
    # --- tane yemler: laboratuvar numunesi fotograflari ---
    "bugday":           "Tarwe korrels Triticum aestivum.jpg",
    "arpa":             "LPCC-464-Barley grains.jpg",
    "yulaf":            "LPCC-511-Grans de civada.jpg",
    "misir":            "LPCC-802-Grans de blat de moro.jpg",
    "cavdar":           "LPCC-561-Grans de Secale cereale L.jpg",
    "tritikale":        "LPCC-606-Grans de triticale.jpg",
    "soya_fasulyesi":   "A bag full of Soybean.jpg",
    # --- endustri yan urunleri ---
    "bugday_kepegi":    "WheatBran.jpg",
    "misir_kepegi":     "LPCC-896-Fibra de blat de moro.jpg",
    "soya_kuspesi":     "Soybean Meal (10059014026).jpg",
    "kuru_seker_pancari_posasi": "Zuckerrübenschnitzel.jpg",
    "misir_gluten_unu": "LPCC-897-Proteïna de blat de moro.jpg",
    # --- hayvansal ---
    "balik_unu":        "Fishmeal powder.jpg",
}


# Bazi fotograflarda numunenin adi yazili; soru cevabi ele vermesin diye
# oncesinde bu bolge kirpilir. Deger: kaynak gorselin oranli (sol, ust, sag, alt) kutusu.
CROP = {
    "misir_gluten_unu": (0.0, 0.0, 1.0, 0.74),
    "misir_kepegi":     (0.0, 0.0, 0.80, 0.84),
    "yulaf":            (0.0, 0.0, 1.0, 0.90),
}


def api(params):
    req = urllib.request.Request(
        API + "?" + urllib.parse.urlencode({**params, "action": "query", "format": "json"}),
        headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def clean(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def info(title):
    d = api({"titles": "File:" + title, "prop": "imageinfo",
             "iiprop": "url|extmetadata|size", "iiurlwidth": "1400"})
    pages = d.get("query", {}).get("pages", {})
    pg = next(iter(pages.values()))
    if "imageinfo" not in pg:
        return None
    ii = pg["imageinfo"][0]
    em = ii.get("extmetadata", {})
    return {
        "title": pg["title"][5:],
        "url": ii.get("thumburl") or ii["url"],
        "page": ii.get("descriptionurl", ""),
        "license": em.get("LicenseShortName", {}).get("value", "?"),
        "author": clean(em.get("Artist", {}).get("value", "")) or "bilinmiyor",
    }


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


if __name__ == "__main__":
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    credits, missing = {}, []

    for key, title in PICKS.items():
        meta = info(title)
        if not meta:
            print(f"  !! bulunamadi: {key} <- {title}")
            missing.append(key)
            continue
        try:
            raw = fetch(meta["url"])
            im = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception as e:
            print(f"  !! indirilemedi: {key} ({e})")
            missing.append(key)
            continue

        box = CROP.get(key)
        if box:
            im = im.crop((int(box[0] * im.width), int(box[1] * im.height),
                          int(box[2] * im.width), int(box[3] * im.height)))

        # Merkezden 4:3 kirpma, sonra 800x600'e olcekleme
        tw = W / H
        if im.width / im.height > tw:
            nw = int(im.height * tw)
            im = im.crop(((im.width - nw) // 2, 0, (im.width + nw) // 2, im.height))
        else:
            nh = int(im.width / tw)
            im = im.crop((0, (im.height - nh) // 2, im.width, (im.height + nh) // 2))
        im = im.resize((W, H), Image.LANCZOS)
        path = os.path.join(OUT, key + ".jpg")
        im.save(path, "JPEG", quality=82, optimize=True, progressive=True)

        credits[key] = {k: meta[k] for k in ("title", "author", "license", "page")}
        print(f"  {key:28s} {os.path.getsize(path)//1024:4d} KB  {meta['license']}")

    json.dump(credits, open(os.path.join(OUT, "kunye.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n{len(credits)} fotograf hazir, {len(missing)} eksik: {missing}")
