# -*- coding: utf-8 -*-
"""Wikimedia Commons'tan yem numunesi fotografi adaylarini toplar.

Yalnizca serbest lisansli (PD / CC0 / CC BY / CC BY-SA) dosyalar alinir.
Adaylar .work_photos/ altina indirilir, secim gorsel olarak yapilir.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "YemLabOyunu/1.0 (egitim amacli ders materyali; erincgumus@protonmail.com)"
OUT = ".work_photos"

# Kabul edilen lisanslar — Commons'ta olmamasi gereken kisitli dosyalari eler.
OK_LICENSE = re.compile(
    r"(public domain|^pd|cc0|cc[ -]by(?![ -]nc)|attribution)", re.I)

# Her yem icin arama terimleri: en iyi tahmin basta.
QUERIES = {
    "yonca":                    ["alfalfa hay", "lucerne hay bale", "Medicago sativa forage", "alfalfa field crop"],
    "korunga":                  ["Onobrychis viciifolia", "sainfoin plant", "esparsette pflanze", "sainfoin field"],
    "ucgul":                    ["Trifolium pratense plant", "red clover field", "clover forage crop", "Trifolium repens meadow"],
    "fig":                      ["Vicia sativa plant", "common vetch crop", "vetch forage field", "Vicia sativa seeds"],
    "cayir_mera_otu":           ["hay meadow grass", "pasture grassland", "meadow hay field", "grazing pasture grass"],
    "misir_hasili":             ["maize forage field", "green maize fodder", "corn plants field green", "Zea mays field crop"],
    "cavdar_hasili":            ["Roggenfeld gruen", "green rye cover crop", "rye field spring green plants", "seigle champ vert"],
    "yulaf_hasili":             ["Avena sativa field", "green oat crop field", "oat field green", "oat fodder"],
    "misir_silaji":             ["maize silage", "corn silage", "silage clamp maize", "chopped maize silage"],
    "saman":                    ["straw bale field", "wheat straw", "straw stack", "baled straw"],
    "bugday":                   ["Weizenkoerner", "wheat berries grain", "Triticum aestivum caryopsis seeds", "wheat grain heap bowl", "wheat kernels macro"],
    "arpa":                     ["barley grains", "barley kernels", "Hordeum vulgare grain", "barley seeds pile"],
    "yulaf":                    ["Haferkoerner", "Avena sativa caryopsis", "naked oat grain seeds", "oat seeds spoon", "Hafer Samen"],
    "misir":                    ["maize kernels dried", "corn kernels grain", "Zea mays kernels", "dent corn grain"],
    "cavdar":                   ["rye grains", "rye kernels", "Secale cereale seeds", "rye grain pile"],
    "tritikale":                ["triticale grain", "triticale seeds", "triticale kernels", "Triticosecale grain"],
    "soya_fasulyesi":           ["Sojabohnen Samen", "dried soybeans bowl", "Glycine max dry seeds", "soybeans heap food"],
    "bugday_kepegi":            ["Weizenkleie", "son de ble", "wheat bran heap", "salvado de trigo", "crusca di grano"],
    "misir_kepegi":             ["Maiskleie", "son de mais", "corn bran powder food", "maize bran ingredient"],
    "aycicegi_kuspesi":         ["Sonnenblumenkuchen Futtermittel", "tourteau de tournesol", "sunflower press cake feed", "Sonnenblumenextraktionsschrot"],
    "pamuk_tohumu_kuspesi":     ["Baumwollsaatkuchen", "tourteau de coton", "cottonseed cake animal feed", "cotton seed cake fodder", "cottonseed hulls feed"],
    "soya_kuspesi":             ["soybean meal", "soybean cake feed", "soymeal animal feed", "soybean expeller"],
    "kuru_seker_pancari_posasi":["sugar beet pulp", "dried beet pulp pellets", "beet pulp animal feed", "sugarbeet pulp"],
    "misir_gluten_unu":         ["Maiskleber", "corn gluten feed pellets", "gluten de mais", "maize gluten animal feed"],
    "balik_unu":                ["fish meal", "fishmeal animal feed", "fish meal powder", "dried fish meal"],
}


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def search(query, limit=6):
    try:
        d = api({"action": "query", "format": "json", "generator": "search",
                 "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": str(limit),
                 "prop": "imageinfo", "iiprop": "url|extmetadata|size",
                 "iiurlwidth": "480"})
    except Exception as e:
        print("   arama hatasi:", e)
        return []
    out = []
    for pg in d.get("query", {}).get("pages", {}).values():
        ii = (pg.get("imageinfo") or [{}])[0]
        em = ii.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "")
        if not OK_LICENSE.search(lic):
            continue
        if not ii.get("thumburl"):
            continue
        if ii.get("width", 0) < 640:                    # cok kucuk kaynaklari ele
            continue
        out.append({
            "title": pg["title"],
            "thumb": ii["thumburl"],
            "full": ii["url"],
            "page": ii.get("descriptionurl", ""),
            "license": lic,
            "author": re.sub(r"<[^>]+>", "", em.get("Artist", {}).get("value", "")).strip(),
            "width": ii.get("width"), "height": ii.get("height"),
        })
    return out


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())


if __name__ == "__main__":
    only = sys.argv[1:] or list(QUERIES)
    os.makedirs(OUT, exist_ok=True)
    index = {}
    idx_path = os.path.join(OUT, "index.json")
    if os.path.exists(idx_path):
        index = json.load(open(idx_path, encoding="utf-8"))

    for key in only:
        print(f"\n=== {key} ===")
        seen, cands = set(), []
        for q in QUERIES[key]:
            for c in search(q):
                if c["title"] in seen:
                    continue
                seen.add(c["title"])
                cands.append(c)
            if len(cands) >= 8:
                break
            time.sleep(0.3)

        cands = cands[:8]
        for i, c in enumerate(cands):
            c["local"] = f"{key}_{i}.jpg"
            p = os.path.join(OUT, c["local"])
            if not os.path.exists(p):
                try:
                    download(c["thumb"], p)
                except Exception as e:
                    print("   indirilemedi:", e)
                    c["local"] = None
            # Windows konsolu cp1254; baslikta gecen ozel karakterler kirdirmasin.
            safe = c["title"][5:70].encode("ascii", "replace").decode("ascii")
            print(f"   [{i}] {c['license']:14s} {safe}")
        index[key] = [c for c in cands if c.get("local")]
        json.dump(index, open(idx_path, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

    json.dump(index, open(idx_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n{sum(len(v) for v in index.values())} aday {OUT}/ altina indirildi.")
