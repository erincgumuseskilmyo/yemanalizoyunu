// Yem gorselleri: 1. soru (tanima) ve 3. soru (gorsel eslestirme) icin
// gercek numune fotograflari kullanilir. Piksel-sanat gorseller kafa
// karistirdigi icin tumuyle kaldirilmistir.
// Kunye: assets/feeds_photo/kunye.json
const FEED_PHOTO_FILES = {
  "Yonca": "yonca.jpg",
  "Korunga": "korunga.jpg",
  "Üçgül": "ucgul.jpg",
  "Fiğ otu": "fig.jpg",
  "Çayır ve mera otu": "cayir_mera_otu.jpg",
  "Sorgum (Sudan otu)": "sorgum.jpg",
  "Şeker pancarı": "seker_pancari.jpg",
  "Mısır silajı": "misir_silaji.jpg",
  "Saman": "saman.jpg",
  "Buğday": "bugday.jpg",
  "Arpa": "arpa.jpg",
  "Yulaf": "yulaf.jpg",
  "Mısır": "misir.jpg",
  "Çavdar": "cavdar.jpg",
  "Soya fasulyesi": "soya_fasulyesi.jpg",
  "Buğday kepeği": "bugday_kepegi.jpg",
  "Mısır kepeği": "misir_kepegi.jpg",
  "Ayçiçeği tohumu küspesi": "aycicegi_tohumu_kuspesi.jpg",
  "Pamuk tohumu küspesi": "pamuk_tohumu_kuspesi.jpg",
  "Soya küspesi": "soya_kuspesi.jpg",
  "Kuru şeker pancarı posası": "kuru_seker_pancari_posasi.jpg",
  "Melas": "melas.jpg",
  "Mısır gluten unu": "misir_gluten_unu.jpg",
  "Balık unu": "balik_unu.jpg",
  "Tüy unu": "tuy_unu.jpg"
};

function feedPhotoPath(feed) {
  const file = FEED_PHOTO_FILES[feed.name];
  return file ? `assets/feeds_photo/${file}` : null;
}

/**
 * Haritadaki fotoğraf dosyalarının gerçekten var olup olmadığını bir kez
 * denetler; bulunamayanları haritadan düşürür ve bulunanları önden yükler.
 *
 * Böylece bir yemin fotoğrafı henüz eklenmemişse 1. ve 3. soruda kırık görsel
 * çıkmaz — o yem yalnızca gruplandırmada ve çeldiricilerde görünür. Dosya
 * `assets/feeds_photo/` altına doğru adla konduğunda kod değişikliğine gerek
 * kalmadan kendiliğinden devreye girer.
 */
export function verifyFeedPhotos() {
  // Tek bir denemede ağ hatası olursa yem havuzdan sessizce düşerdi; bu
  // yüzden başarısız yükleme bir kez daha denenir.
  const dene = (file, ilk) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(ilk ? dene(file, false) : false);
    // İlk deneme sade adresle yapılır ki tarayıcı önbelleği sorularda da
    // kullanılabilsin; yalnızca tekrar denemesi önbelleği atlar.
    img.src = `assets/feeds_photo/${file}` + (ilk ? '' : '?yeniden=1');
  });

  const jobs = Object.entries(FEED_PHOTO_FILES).map(([name, file]) =>
    dene(file, true).then(ok => (ok ? null : name)));

  return Promise.all(jobs).then(results => {
    const eksik = results.filter(Boolean);
    for (const name of eksik) delete FEED_PHOTO_FILES[name];
    if (eksik.length) {
      console.warn('Fotoğrafı bulunamayan yemler (1. ve 3. soruda çıkmaz): ' +
                   eksik.join(', '));
    }
    return Object.keys(FEED_PHOTO_FILES).length;
  });
}

// feeds.js — 26 Yem Veritabanı
// Besin madde değerleri ve ayırt edici özellikler, Anadolu Üniversitesi
// "Temel Yem Bilgisi ve Hayvan Besleme" (2012, ISBN 978-975-06-0963-3)
// ders kitabından alınmıştır; ayrıntı için KAYNAKLAR.md.
// Not: Sorular ve şıklar burada saklanmaz. Seçenekler oyun sırasında
// diğer yemlerin `distinctiveFeature` alanlarından üretilip her defasında
// karıştırılır; böylece doğru cevabın yeri sabitlenmez.
export const FEEDS = [
  {
    id: 1, name: "Yonca", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Yem bitkilerinin en önemlisi sayılan, yılda 3-4 kez biçilen çok yıllık baklagildir; protein, kalsiyum ve karoten bakımından zengindir.",
    ref: { dryMatter: 24.00, ash: 9.00, fat: 2.00 }
  },
  {
    id: 2, name: "Korunga", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Soğuğa ve kurağa dayanıklı, minerallerce zengin çok yıllık baklagildir; yoncanın aksine timpani (gaz şişkinliği) yapmaz.",
    ref: { dryMatter: 23.00, ash: 6.00, fat: 2.50 }
  },
  {
    id: 3, name: "Üçgül", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Ülkemiz çayır ve meralarında bol bulunan, protein, mineral ve vitaminlerce zengin, lezzetli bir baklagil yem bitkisidir.",
    ref: { dryMatter: 19.00, ash: 10.00, fat: 4.00 }
  },
  {
    id: 4, name: "Fiğ otu", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Ilıman iklimlerde yetişen, 150 kadar türü bulunan baklagildir; tanesindeki visin ve visianin acı lezzet verdiğinden aşırı tüketimi sütün tadını bozar.",
    ref: { dryMatter: 18.00, ash: 8.00, fat: 3.00 }
  },
  {
    id: 5, name: "Çayır ve mera otu", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Buğdaygil, baklagil ve diğer familyalardan bitkilerin karışımıdır; besin madde içeriği vejetasyon dönemi, bitki türü, iklim, otlatma ve gübrelemeye göre değişir.",
    ref: { dryMatter: 20.00, ash: 10.00, fat: 4.50 }
  },
  {
    id: 6, name: "Sorgum (Sudan otu)", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Sıcağa ve kurağa dayanıklı buğdaygil yem bitkisidir; silajı süt olum döneminde yapılır, genç bitkide ve don sonrasında prussik asit (HCN) birikebilir.",
    ref: { dryMatter: 22.00, ash: 8.60, fat: 2.30 }
  },
  {
    id: 7, name: "Şeker pancarı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Öncelikle şeker üretimi için yetiştirilen bir kök yemdir; kolay eriyebilir karbonhidratlarca zengin olduğundan ruminantlarda gaz yapar, kuru ot ve samanla karıştırılarak verilmelidir.",
    ref: { dryMatter: 23.00, ash: 5.80, fat: 0.70 }
  },
  {
    id: 8, name: "Mısır silajı", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Silolamaya en uygun bitki olan mısır hasılından yapılır; enerjice zengin, sulu bir kaba yemdir, ileri gebe hayvanlarda aşırı kullanımı doğum güçlüğüne yol açar.",
    ref: { dryMatter: 30.00, ash: 4.50, fat: 2.80 }
  },
  {
    id: 9, name: "Saman", mainGroup: "Kaba Yemler",
    distinctiveFeature: "Tohumu alınmış otların sap ve yapraklarıdır; besin maddelerince çok fakir, selülozca zengindir. Sodyum hidroksit veya amonyakla muamele edilerek sindirilebilirliği artırılır.",
    ref: { dryMatter: 86.00, ash: 7.10, fat: 1.50 }
  },
  {
    id: 10, name: "Buğday", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Her hayvan türü için sindirilme derecesi yüksek bir tane yemdir; içerdiği NOP nedeniyle kanatlı rasyonlarında kullanımı sınırlıdır, ince öğütülürse sindirim bozukluğu yapar.",
    ref: { dryMatter: 88.00, ash: 2.27, fat: 2.27 }
  },
  {
    id: 11, name: "Arpa", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Biracılık sanayisinin başlıca ham maddesidir; yem değeri kavuz miktarına bağlıdır, içerdiği beta-glukan kanatlılarda yapışkan ve sulu dışkıya yol açar.",
    ref: { dryMatter: 89.00, ash: 2.81, fat: 2.25 }
  },
  {
    id: 12, name: "Yulaf", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Tahıllar içinde ham selülozu en yüksek (%11), kavuz oranı %20-30 olan tane yemdir; yağı (%4-6) doymamış yağ asitlerince zengindir.",
    ref: { dryMatter: 89.00, ash: 3.37, fat: 4.49 }
  },
  {
    id: 13, name: "Mısır", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Ham selülozu düşük (%2), enerjisi çok yüksek bir enerji yemidir; buna karşılık proteini düşük (%8) ve lizin ile triptofan bakımından çok fakirdir.",
    ref: { dryMatter: 86.00, ash: 1.40, fat: 4.07 }
  },
  {
    id: 14, name: "Çavdar", mainGroup: "Buğdaygil Tane Yemleri",
    distinctiveFeature: "Besin madde bileşimi buğdaya benzer; tahıl taneleri arasında lezzeti en düşük olanıdır ve gebe ineklerde yavru atmaya yol açabilir.",
    ref: { dryMatter: 88.00, ash: 1.82, fat: 1.70 }
  },
  {
    id: 15, name: "Soya fasulyesi", mainGroup: "Baklagil Tane Yemleri",
    distinctiveFeature: "Baklagil taneleri içinde en yüksek yem değerine sahiptir (ortalama %38 ham protein, %20 ham yağ); çiğ hâlde tripsin inhibitörü içerdiğinden ısıl işlem görmeden kullanılmamalıdır.",
    ref: { dryMatter: 92.00, ash: 5.43, fat: 18.48 }
  },
  {
    id: 16, name: "Buğday kepeği", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Un endüstrisi yan ürünüdür; fosfor bakımından taneden zengindir, yoğun yemleri hafifletir, lezzeti artırır ve sindirimi kolaylaştırır.",
    ref: { dryMatter: 90.00, ash: 6.67, fat: 4.44 }
  },
  {
    id: 17, name: "Mısır kepeği", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Mısırın işlenmesinde embriyoların ayrılmasından sonra kalan iri öğütme artıklarının ikinci kez öğütülmesiyle elde edilir; sarı mısırdan elde edileni ksantofil ve karotence zengindir.",
    ref: { dryMatter: 88.50, ash: 3.80, fat: 4.50 }
  },
  {
    id: 18, name: "Ayçiçeği tohumu küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Yağ endüstrisi yan ürünüdür; kalitesi içerdiği kabuk miktarına bağlı olup ham selülozu %14-28 ile yüksektir.",
    ref: { dryMatter: 90.00, ash: 7.78, fat: 1.11 }
  },
  {
    id: 19, name: "Pamuk tohumu küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Yağı alınmış pamuk tohumundan elde edilir; kullanımını sınırlayan gosipol adlı polifenolik bileşiği içerir.",
    ref: { dryMatter: 90.00, ash: 7.78, fat: 1.11 }
  },
  {
    id: 20, name: "Soya küspesi", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Kanatlı ve domuz beslemede başlıca protein kaynağıdır; %44-50 ham protein içerir, lezzetli ve yüksek sindirilebilirliktedir.",
    ref: { dryMatter: 90.00, ash: 6.67, fat: 1.11 }
  },
  {
    id: 21, name: "Kuru şeker pancarı posası", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Şeker üretiminden kalan posanın kurutulmasıyla elde edilir; fazla su çektiğinden ağızda salyayı emerek yutmayı güçleştirir.",
    ref: { dryMatter: 90.00, ash: 5.56, fat: 0.44 }
  },
  {
    id: 22, name: "Melas", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Şeker endüstrisi yan ürünüdür; %50-55 şeker içerir, lezzeti sayesinde saman gibi lezzetsiz yemlerin tüketimini artırır ve silaj yapımında katkı olarak kullanılır.",
    ref: { dryMatter: 75.00, ash: 13.33, fat: 0.30 }
  },
  {
    id: 23, name: "Mısır gluten unu", mainGroup: "Endüstri Yan Ürünleri",
    distinctiveFeature: "Nişasta, embriyo ve kepeğin ayrılmasından sonra elde edilir ve %60 ham protein içerir; proteini lizin ve triptofan bakımından yetersizdir.",
    ref: { dryMatter: 90.00, ash: 2.22, fat: 2.22 }
  },
  {
    id: 24, name: "Balık unu", mainGroup: "Hayvansal Kökenli Yemler",
    distinctiveFeature: "Hayvansal protein kaynakları içinde en değerlisidir; proteini lizin, metiyonin, sistin ve triptofanca zengindir, doymamış yağ asitleri nedeniyle acılaşma riski en yüksek yemdir.",
    ref: { dryMatter: 91.00, ash: 16.48, fat: 10.99 }
  },
  {
    id: 25, name: "Et-kemik unu", mainGroup: "Hayvansal Kökenli Yemler",
    distinctiveFeature: "Mezbaha yan ürünlerinin rendering işlemiyle işlenmesinden elde edilir; ham külü çok yüksek (%37) olduğundan iyi bir kalsiyum ve fosfor kaynağıdır.",
    ref: { dryMatter: 92.00, ash: 40.22, fat: 9.24 }
  },
  {
    id: 26, name: "Tüy unu", mainGroup: "Hayvansal Kökenli Yemler",
    distinctiveFeature: "Kanatlı kesimhane yan ürünlerindendir; tüylerin basınç altında hidrolize edilmesiyle elde edilir, ham proteini çok yüksek olmasına karşın amino asit dengesi zayıftır.",
    ref: { dryMatter: 93.00, ash: 3.50, fat: 5.00 }
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
