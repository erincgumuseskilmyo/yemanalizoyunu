// Görseller assets/feeds klasöründen yüklenir.
// Dosya adı yem adıyla eşleştirilir. Mevcut PNG'ler için özel adlar aşağıdadır.
const FEED_IMAGE_FILES = {
  "Yonca": "yonca.png",
  "Korunga": "korunga.png",
  "Üçgül": "ucgul.png",
  "Fiğ": "fig.png",
  "Çayır ve mera otu": "cayir_mera_otu.png",
  "Mısır hasılı": "misir_hasili.png",
  "Çavdar hasılı": "cavdar_hasili.png",
  "Yulaf hasılı": "yulaf_hasili.png",
  "Mısır silajı": "misir_silaji.png",
  "Saman": "saman.png",
  "Buğday": "bugday.png",
  "Arpa": "arpa.png",
  "Yulaf": "yulaf.png",
  "Mısır": "misir.png",
  "Çavdar": "cavdar.png",
  "Tritikale": "tritikale.png",
  "Soya fasulyesi": "soya_fasulyesi.png",
  "Buğday kepeği": "bugday_kepegi.png",
  "Mısır kepeği": "misir_kepegi.png",
  "Ayçiçeği küspesi": "aycicegi_kuspesi.png",
  "Pamuk tohumu küspesi": "pamuk_tohumu_kuspesi.png",
  "Soya küspesi": "soya_kuspesi.png",
  "Kuru şeker pancarı posası": "kuru_seker_pancari_posasi.png",
  "Mısır gluten unu": "misir_gluten_unu.png",
  "Balık unu": "balik_unu.png"
};

function feedImagePath(feed) {
  const file = FEED_IMAGE_FILES[feed.name];
  return file ? `assets/feeds/${file}` : null;
}

// Ilk soru (yem tanima) icin gercek fotograflar. Piksel sanat gorseller
// tanimayi kolaylastirdigindan, tanima sorusu gercek numune fotograflari
// uzerinden sorulur. Kunye: assets/feeds_photo/kunye.json
const FEED_PHOTO_FILES = {
  "Yonca": "yonca.jpg",
  "Korunga": "korunga.jpg",
  "Üçgül": "ucgul.jpg",
  "Fiğ": "fig.jpg",
  "Çayır ve mera otu": "cayir_mera_otu.jpg",
  "Mısır hasılı": "misir_hasili.jpg",
  "Çavdar hasılı": "cavdar_hasili.jpg",
  "Yulaf hasılı": "yulaf_hasili.jpg",
  "Mısır silajı": "misir_silaji.jpg",
  "Saman": "saman.jpg",
  "Buğday": "bugday.jpg",
  "Arpa": "arpa.jpg",
  "Yulaf": "yulaf.jpg",
  "Mısır": "misir.jpg",
  "Çavdar": "cavdar.jpg",
  "Tritikale": "tritikale.jpg",
  "Soya fasulyesi": "soya_fasulyesi.jpg",
  "Buğday kepeği": "bugday_kepegi.jpg",
  "Mısır kepeği": "misir_kepegi.jpg",
  "Soya küspesi": "soya_kuspesi.jpg",
  "Kuru şeker pancarı posası": "kuru_seker_pancari_posasi.jpg",
  "Mısır gluten unu": "misir_gluten_unu.jpg",
  "Balık unu": "balik_unu.jpg"
};

function feedPhotoPath(feed) {
  const file = FEED_PHOTO_FILES[feed.name];
  return file ? `assets/feeds_photo/${file}` : null;
}

// feeds.js — 25 Yem Veritabanı (Kitap çerçevesine uygun)
// Not: Sorular ve şıklar burada saklanmaz. Seçenekler oyun sırasında
// diğer yemlerin `distinctiveFeature` alanlarından üretilip her defasında
// karıştırılır; böylece doğru cevabın yeri sabitlenmez.
export const FEEDS = [
  {
    id: 1, name: "Yonca", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Yeşil yapraklı kaba yem bitkisi olup protein ve kalsiyum bakımından zengindir; rumen mikrobiyal aktiviteyi destekler.",
    ref: { dryMatter: 18.50, ash: 8.20, fat: 2.80 }
  },
  {
    id: 2, name: "Korunga", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Çok yıllık baklagil kaba yem olup kondense tanen içerdiğinden ruminantlarda şişkinlik (timpani) yapmaz; kurağa ve kireçli topraklara dayanıklıdır.",
    ref: { dryMatter: 20.10, ash: 7.50, fat: 2.20 }
  },
  {
    id: 3, name: "Üçgül", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Baklagiller familyasından, yem değeri yüksek, çok yıllık bir kaba yem bitkisidir.",
    ref: { dryMatter: 19.80, ash: 7.80, fat: 3.10 }
  },
  {
    id: 4, name: "Fiğ", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Kışlık baklagil kaba yem olup tohum ve yeşil otuyla değerlendirilir; protein bakımından zengindir.",
    ref: { dryMatter: 17.50, ash: 8.50, fat: 2.50 }
  },
  {
    id: 5, name: "Çayır ve mera otu", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Doğal veya yapay olarak yetişen çok türlü bitki karışımından oluşan temel kaba yem kaynağıdır.",
    ref: { dryMatter: 20.50, ash: 9.20, fat: 3.00 }
  },
  {
    id: 6, name: "Mısır hasılı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Yeşil ot olarak hasat edilen mısır bitkisidir; nişasta ve enerji bakımından zengin kaba yemdir.",
    ref: { dryMatter: 18.00, ash: 6.50, fat: 2.80 }
  },
  {
    id: 7, name: "Çavdar hasılı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Yeşil ot olarak hasat edilen çavdar bitkisidir; kışlık tahıl hasılı olup kaba yem değeri yüksektir.",
    ref: { dryMatter: 19.20, ash: 8.00, fat: 3.20 }
  },
  {
    id: 8, name: "Yulaf hasılı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Yeşil ot olarak hasat edilen yulaf bitkisidir; sindirilebilirlik ve protein değeri orta düzeydedir.",
    ref: { dryMatter: 18.80, ash: 9.00, fat: 3.50 }
  },
  {
    id: 9, name: "Mısır silajı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Mısır bitkisinin silolanmasıyla elde edilen, enerji yoğunluğu yüksek, ruminantlarda temel kaba yemdir.",
    ref: { dryMatter: 30.00, ash: 4.50, fat: 2.80 }
  },
  {
    id: 10, name: "Saman", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Tahıl bitkilerinin sap ve yapraklarından oluşan, lif oranı yüksek, enerji değeri düşük kaba yemdir.",
    ref: { dryMatter: 88.00, ash: 6.50, fat: 1.80 }
  },
  {
    id: 11, name: "Buğday", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Buğdaygil tane yem olup nişasta bakımından zengindir; enerji kaynağı olarak kullanılır.",
    ref: { dryMatter: 88.50, ash: 2.00, fat: 1.90 }
  },
  {
    id: 12, name: "Arpa", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Buğdaygil tane yem olup sindirilebilirliği yüksek, beta-glukan içeriği dikkat edilmesi gereken enerji yemidir.",
    ref: { dryMatter: 88.00, ash: 2.50, fat: 2.10 }
  },
  {
    id: 13, name: "Yulaf", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Kabuğu kalın buğdaygil tane yem olup lif oranı diğer tahıllara göre yüksektir.",
    ref: { dryMatter: 89.00, ash: 3.20, fat: 4.50 }
  },
  {
    id: 14, name: "Mısır", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Nişasta oranı en yüksek buğdaygil tane yemdir; enerji konsantrasyonu bakımından öne çıkar.",
    ref: { dryMatter: 87.50, ash: 1.50, fat: 4.00 }
  },
  {
    id: 15, name: "Çavdar", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Soğuğa dayanıklı buğdaygil tane yem olup ergot kontaminasyonu riski taşıyabilir.",
    ref: { dryMatter: 88.00, ash: 2.20, fat: 1.80 }
  },
  {
    id: 16, name: "Tritikale", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Buğday ve çavdarın melezlenmesiyle elde edilen tane yemdir.",
    ref: { dryMatter: 88.20, ash: 2.10, fat: 1.90 }
  },
  {
    id: 17, name: "Soya fasulyesi", mainGroup: "Baklagil Tane Yemleri",
    distinctiveFeature: "Baklagil tane yem olup protein ve yağ oranı en yüksek olanlarındandır; urease aktivitesi vardır.",
    ref: { dryMatter: 90.00, ash: 5.20, fat: 19.50 }
  },
  {
    id: 18, name: "Buğday kepeği", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Un endüstrisi yan ürünü olup protein ve posa bakımından zengin, enerji değeri düşük konsantre yemdir.",
    ref: { dryMatter: 89.00, ash: 5.80, fat: 4.20 }
  },
  {
    id: 19, name: "Mısır kepeği", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Mısır unu endüstrisi yan ürünü olup protein ve posa içeren enerji kaynağıdır.",
    ref: { dryMatter: 88.50, ash: 4.50, fat: 3.80 }
  },
  {
    id: 20, name: "Ayçiçeği küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Yağ endüstrisi yan ürünü olup yağ çıkarıldıktan sonra protein kaynağı olarak kullanılır.",
    ref: { dryMatter: 91.00, ash: 6.50, fat: 1.50 }
  },
  {
    id: 21, name: "Pamuk tohumu küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Yağ endüstrisi yan ürünü olup protein bakımından zengindir; gossypol içerebilir.",
    ref: { dryMatter: 92.00, ash: 6.00, fat: 1.20 }
  },
  {
    id: 22, name: "Soya küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Yağ endüstrisi yan ürünü olup protein oranı yüksek, ruminant ve kanatlı beslemede yaygın kullanılan protein kaynağıdır.",
    ref: { dryMatter: 90.50, ash: 6.50, fat: 1.50 }
  },
  {
    id: 23, name: "Kuru şeker pancarı posası", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Şeker endüstrisi yan ürünü olup posa ve pektin bakımından zengin, enerji kaynağıdır.",
    ref: { dryMatter: 91.00, ash: 7.00, fat: 0.50 }
  },
  {
    id: 24, name: "Mısır gluten unu", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Nişasta endüstrisi yan ürünü olup protein konsantrasyonu çok yüksek değerli bir protein kaynağıdır.",
    ref: { dryMatter: 91.50, ash: 2.50, fat: 3.00 }
  },
  {
    id: 25, name: "Balık unu", mainGroup: "Hayvansal Kökenli Yemler",
    distinctiveFeature: "Hayvansal kökenli yem olup protein ve esansiyel amino asitler bakımından zengindir; B12 vitamini içerir.",
    ref: { dryMatter: 92.00, ash: 14.50, fat: 9.50 }
  }
];

export const GROUPS = [
  "Kaba Yemler",
  "Buğdaygil Tane Yemleri",
  "Baklagil Tane Yemleri",
  "Endüstri Yan Ürünleri",
  "Hayvansal Kökenli Yemler"
];

export function getRandomFeed() {
  return FEEDS[Math.floor(Math.random() * FEEDS.length)];
}

/** Diziyi kopyalayarak karıştırır (Fisher-Yates — sort tabanlı karıştırma yanlıdır). */
export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getRandomFeeds(count, excludeId = null) {
  return shuffle(FEEDS.filter(f => f.id !== excludeId)).slice(0, count);
}

export function getFeedImage(feed) {
  return feed ? feedImagePath(feed) : null;
}

export function getFeedsWithImages() {
  return FEEDS.filter(feed => !!feedImagePath(feed));
}

export function getRandomImageFeed(excludeId = null) {
  const pool = getFeedsWithImages().filter(f => f.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

/**
 * Görseli olan yemlerden rastgele `count` adet döndürür.
 * `includeFeed` verilirse sonuç mutlaka onu içerir ve bir kez yer alır.
 */
export function getRandomImageFeeds(count, includeFeed = null) {
  const others = shuffle(getFeedsWithImages().filter(f => !includeFeed || f.id !== includeFeed.id));
  const result = includeFeed ? [includeFeed, ...others] : others;
  return result.slice(0, count);
}

/**
 * Gruplandırma sorusu için, mümkün olduğunca farklı ana gruplardan yem seçer.
 * Böylece beş kart tek bir kutuya yığılmaz ve soru gerçekten ayırt edici olur.
 */
export function getGroupingSet(count = 5, excludeId = null) {
  const pool = FEEDS.filter(f => f.id !== excludeId);
  const picked = [];
  for (const group of shuffle(GROUPS)) {
    const inGroup = pool.filter(f => f.mainGroup === group && !picked.includes(f));
    if (inGroup.length) picked.push(shuffle(inGroup)[0]);
    if (picked.length === count) break;
  }
  for (const f of shuffle(pool)) {          // grup sayısı yetmezse tamamla
    if (picked.length >= count) break;
    if (!picked.includes(f)) picked.push(f);
  }
  return shuffle(picked).slice(0, count);
}

/** Bir yemin ayırt edici özelliği için, o yeme ait olmayan çeldiriciler. */
export function getFeatureDistractors(feed, count) {
  const seen = new Set([feed.distinctiveFeature]);
  const out = [];
  for (const f of shuffle(FEEDS)) {
    if (f.id === feed.id || !f.distinctiveFeature) continue;
    if (seen.has(f.distinctiveFeature)) continue;
    seen.add(f.distinctiveFeature);
    out.push(f.distinctiveFeature);
    if (out.length === count) break;
  }
  return out;
}

/** Yem tanıma sorusu için gerçek fotoğraf yolu (yoksa null). */
export function getFeedPhoto(feed) {
  return feed ? feedPhotoPath(feed) : null;
}

export function getFeedsWithPhotos() {
  return FEEDS.filter(f => !!feedPhotoPath(f));
}

/**
 * Fotoğrafı olan yemlerden rastgele `count` adet döndürür.
 * `includeFeed` verilirse sonuç mutlaka onu içerir.
 */
export function getRandomPhotoFeeds(count, includeFeed = null) {
  const others = shuffle(getFeedsWithPhotos().filter(f => !includeFeed || f.id !== includeFeed.id));
  const result = includeFeed ? [includeFeed, ...others] : others;
  return result.slice(0, count);
}
