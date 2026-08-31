# Yem Laboratuvarı: Son Numune

LVS2005 **Yem Bilgisi ve Hayvan Besleme** dersi için hazırlanmış, tarayıcıda
çalışan izometrik laboratuvar simülasyonu. Öğrenci bir yem numunesini tanır,
sınıflandırır ve laboratuvarda **kuru madde**, **ham kül** ve **ham yağ**
analizlerini baştan sona yürütür. Toplam süre 30 dakikadır.

## Çalıştırma

Oyun ES modülleri kullandığı için **bir HTTP sunucusu üzerinden** açılmalıdır;
`index.html` dosyasına çift tıklamak (`file://`) çalışmaz.

```bash
python tools/devserver.py 8124
```

Ardından tarayıcıdan `http://localhost:8124` adresini açın. Yayına almak için
klasörü herhangi bir statik sunucuya (GitHub Pages, Netlify, üniversite web
sunucusu) olduğu gibi kopyalamak yeterlidir.

## Açılış anlatısı

Giriş bilgileri girildikten sonra yedi panellik bir çizgi roman açılır ve
oyunun kurgusunu anlatır: mesai biterken gelen bir yem numunesi, aynı gün
istenen sonuçlar. Son panelde oyunun nasıl oynanacağı özetlenir.

Paneller 7 saniyede bir kendiliğinden ilerler; ekrana tıklayarak, `→` / `←`
tuşlarıyla ya da alttaki noktalarla gezinilebilir. **ANLATIYI ATLA** düğmesi
(veya `Esc`) doğrudan oyuna geçirir.

**Süre sayacı anlatı bittikten sonra başlar** — hikâye öğrencinin
30 dakikasından yemez.

## Oyun akışı ve puanlama (toplam 100)

| Aşama | Konu | Puan |
|---|---|---|
| 1 | Yem tanıma (görselden) | 15 |
| 2 | Öne çıkan özellik | 10 |
| 3 | Görsel eşleştirme (5 × 2) | 10 |
| 4 | Gruplandırma (5 × 3) | 15 |
| 5 | Kuru madde tayini | 20 |
| 6 | Ham kül tayini | 15 |
| 7 | Ham yağ tayini (Soxhlet) | 15 |

Ceza puanları:

- gereksiz malzeme alma: **−2** (en çok −10)
- eşleştirme / gruplandırma yanlış denemesi: **−1** (bölüm puanının altına düşmez)
- laboratuvarda işlem hatası: **−1** (en çok −10) — yanlış elek çapı, yanlış
  sıcaklık, yanlış süre ve desikatörde soğutmayı atlayıp tartma. Bu kesinti,
  ilgili basamağın puanını kaybetmenin **üstüne** uygulanır.

Her analizde puan **prosedür + sonuç** olarak ikiye ayrılır; örneğin kuru
maddede doğru sıcaklık 3, doğru süre 3, desikatörde soğutma 2 ve doğru hesap
12 puandır. Süre dolduğunda tamamlanmamış analizlerin doğru yapılmış
basamakları için kısmi puan verilir.

## Laboratuvar iş akışı

1. **Malzeme Dolabı** — analiz için gereken 8 malzemeyi seç (dolapta 9 adet
   çeldirici de var; hangisinin gerekli olduğu ipucu verilmez). Liste her
   oyunda karıştırılır, ama oyun içinde sabit kalır.
2. **Öğütücü** — numuneyi 1 mm elekten öğüt.
3. **Analitik Terazi** — o an yapılabilecek tartımları listeler, değerleri
   0,0001 g duyarlıkla verir ve **Laboratuvar Defteri**ne yazar.
4. **Kurutma Dolabı** → **Desikatör** → tartım → kuru madde.
5. **Kül Fırını** → **Desikatör** → tartım → ham kül.

> Kurutma dolabı ve kül fırınında **sıcaklık ve süre alanları boş gelir**;
> doğru değerleri öğrencinin bilmesi gerekir. (Doğru değerler `ANALYSES`
> tablosundadır: 105 °C / 4 sa ve 550 °C / 4 sa.) Yanlış değer hem ilgili
> basamak puanını kaybettirir hem de 1 puanlık işlem hatası yazar.
6. **Balon Isıtıcı**nın başında Soxhlet düzeneğini kur → ısıtmayı başlat
   (60 °C / 6 sa) → tartım → ham yağ.

Soxhlet düzeneği yalnızca **balon ısıtıcının önündeyken** kurulabilir;
envanterden kurulamaz. Kurulum için cam takım, kartuş, balon ve hekzan
envanterde olmalı, balonun darası (m₁) ile kartuşa tartılan numune (mₙ)
önceden belirlenmiş olmalıdır. Düzenek kurulunca sahnedeki balon ısıtıcı
görseli, kurulu Soxhlet düzeneği görseliyle değişir.

Ham kül ve ham yağ analizleri, kuru madde tayininden çıkan **kurutulmuş
numune** üzerinden yapılır; bu yüzden önce kuru madde tayini tamamlanmalıdır.

Terazi değerleri her oyunda yeniden üretilir ve yemin referans bileşimine
±%1,5 dağılımla oturur. Beklenen cevap ekranda görünen yuvarlanmış
ağırlıklardan hesaplandığı için, doğru işlemi yapan öğrencinin sonucu birebir
tutar. Kabul aralığı: ±0,25 puan ya da ±%2 (hangisi büyükse).

## Kontroller

| | Masaüstü | Dokunmatik |
|---|---|---|
| Hareket | `W A S D` / yön tuşları | sol alttaki yön çubuğu |
| Cihaz kullan | `E` ya da cihaza tıkla | `E` düğmesi ya da cihaza dokun |
| Pencereyi kapat | `Esc` | KAPAT düğmesi |

Sürükle-bırak soruları hem fare hem dokunmayla çalışır; sürüklemek yerine
**önce karta, sonra hedefe dokunmak** da kabul edilir.

## Sonuçların toplanması

Sonuç her durumda tarayıcının `localStorage` alanına yazılır ve bitiş
ekranındaki **SONUÇ ÖZETİNİ KOPYALA** düğmesiyle panoya alınabilir.

Sonuçları merkezî olarak toplamak için `js/system.js` içindeki
`GoogleSheets.url` alanına bir Google Apps Script Web App adresi yazın:

```js
export const GoogleSheets = {
  url: 'https://script.google.com/macros/s/AKfycb.../exec',
```

Apps Script tarafında:

```js
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const d = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), d.ad, d.soyad, d.ogrenciNo, d.yem, d.puan, d.sureSaniye]);
  return ContentService.createTextOutput('ok');
}
```

Web App'i **"Erişim: Herkes"** olarak yayımlayın. İstek `text/plain` olarak
gönderilir; böylece tarayıcı CORS ön kontrol isteği atmaz.

## Klasör yapısı

```
index.html
css/style.css
js/    audio.js  feeds.js  game.js  lab.js  main.js  player.js  system.js  ui.js  world.js
assets/
  character/   8 yönlü karakter: 8 kareli yürüyüş şeritleri (walk_*.png,
               512×64) ve birer duruş pozu (idle_*.png, 64×64)
  feeds/       25 piksel-sanat yem görseli (eşleştirme sorusu, 384×256)
  feeds_photo/ 23 gerçek yem fotoğrafı (tanıma sorusu, 800×600)
  laboratory/  izometrik sahnedeki cihaz, duvar ve zemin görselleri
               (tezgâhlar 3B geometriyle kurulur, görsel kullanmaz)
  equipment/   cihaz pencerelerindeki açıklayıcı fotoğraflar
  intro/       açılış anlatısının 7 paneli (1280×714 JPEG)
  audio/       ses efektleri, ortam ve müzik döngüleri
  _kaynak/     görsellerin küçültülmemiş özgün sürümleri (oyun kullanmaz)
tools/   devserver.py (yerel sunucu), gen_feeds.py (piksel-sanat üretici),
         harvest_photos.py (fotoğraf adayı arama), build_photos.py (fotoğraf indirme),
         make_music.py (arka plan müziği üretici)
KAYNAKLAR.md   üçüncü taraf görsel/ses künyeleri
```

## Varlıklar (assets)

**Ses** — `assets/audio/` içindeki arayüz sesleri Kenney'in
[Interface Sounds](https://kenney.nl/assets/interface-sounds) paketinden
alınmıştır (**CC0 1.0**, lisans metni `assets/audio/LICENSE.txt`).
`machine_loop.wav`, `ambience_loop.wav`, `step1/2.wav`, `beep.wav` ve arka
plan müziği `music_loop.wav` bu proje için sentezlenmiştir
(`tools/make_music.py`). Müzik 16 saniyelik dikişsiz bir döngüdür; açılış
anlatısı ve soru aşamalarında çalar, laboratuvara girilince yerini ortam
uğultusuna bırakır. Öğrenci HUD'daki **♪** düğmesiyle tüm sesi kapatabilir.

**Görseller** — Yonca, korunga, üçgül, fiğ, çayır–mera otu, mısır hasılı,
çavdar hasılı, soya fasulyesi, ayçiçeği küspesi, pamuk tohumu küspesi, kuru
şeker pancarı posası, mısır gluten unu ve balık unu görselleri ile bütün
laboratuvar cihazları pakette hazır gelmişti. Eksik olan 12 yem görseli
(yulaf hasılı, mısır silajı, saman, buğday, arpa, yulaf, mısır, çavdar,
tritikale, buğday kepeği, mısır kepeği, soya küspesi) `tools/gen_feeds.py`
ile aynı piksel-sanat diliyle üretilmiştir; dosyayı çalıştırarak yeniden
oluşturulabilir veya tarifleri değiştirilebilir.

Tüm görseller 1/4 oranında küçültülüp yeniden sıkıştırılmıştır
(**26 MB → 2,3 MB**); özgün sürümler `assets/_kaynak/` altında durur ve yer
açmak isterseniz silinebilir.

## Laboratuvar yerleşimi

Oda 30×30 birimlik kare bir mekândır. **Dört tezgâh** arka duvarların önüne
dayanır — her duvarda ikişer tane, her tezgâhta **en çok iki cihaz**:

| Tezgâh | Konum | Cihazlar |
|---|---|---|
| 1 | sol duvar, arka yarı | Analitik Terazi, Kurutma Dolabı |
| 2 | sol duvar, ön yarı | Desikatör, Öğütücü |
| 3 | arka duvar, sol yarı | Kül Fırını |
| 4 | arka duvar, sağ yarı | Balon Isıtıcı |

**Malzeme Dolabı** zemine oturur, sağ tarafta durur.

### Tezgâhlar neden 3B geometri?

Tezgâhlar önce hazır bir izometrik tezgâh çizimiyle (billboard sprite)
kurulmuştu; cihazlar tezgâh boyunca ilerledikçe çizili tabladan kayıyordu.
Nedeni ölçülebilir: sahne kamerası yatay yüzeyleri **30°** eğimle çizerken
elimizdeki çizim **~10°** eğimle hazırlanmıştı. Hazır çizimlerin çoğu 2:1
(26,57°) olduğundan, indirilecek başka bir görsel de tam oturmayacaktı.

Bu yüzden tezgâhlar `BoxGeometry` ile kurulur: gövde, süpürgelik boşluğu,
tabla ve arka bordür. Tabla gerçek bir düzlem olduğu için cihazlar
`COUNTER_Y` yüksekliğinde her (x, z) noktasında doğru hizalanır; ışık ve
gölge de doğru düşer. Dolap kapak/çekmece deseni düz (izometrik olmayan) bir
canvas dokusu olarak üretilir ve kutunun odaya bakan yüzüne uygulanır —
eğimi projeksiyon verir.

Tezgâhlar birer billboard sprite'tır; `depthWrite` kapalıdır, çünkü uzun bir
billboard'un tek bir derinlik değeri vardır ve yazsaydı üstündeki cihazları
keserdi. Karakterin tezgâhın arkasına geçmesi çarpışma kutularıyla engellenir.

Duvarlar `assets/laboratory/duvar.png` fayans dokusuyla kaplanır. Doku
yalnızca **yatayda** tekrar eder (`wrapT = ClampToEdge`); görselin altındaki
süpürgelik şeridi duvarın ortasında tekrarlanmamalıdır.

`ROOM_SIZE`, `LEFT_BENCH_X`, `BACK_BENCH_Z` ve `COUNTER_Y` sabitleri
`js/world.js` başındadır; yerleşim bunlar üzerinden ayarlanır.

## Piksel-hassas kamera

Sahne piksel-sanat sprite'larla çizildiği için kamera ve karakter, ekranın
piksel ızgarasına oturtulur (`snapToPixelGrid`, `js/player.js`). Kamera
kesirli konumlarda dursaydı en-yakın-komşu örnekleme her karede farklı
teksellere denk gelir ve hareket sırasında görüntü titrerdi.

Karakterin mantıksal (kesirli) konumu çarpışma hesabı için ayrı tutulur;
yalnızca çizim konumu yuvarlanır. Sonuç: karakter ekranda hep aynı piksele
denk gelir, sahne de tam piksel adımlarıyla kayar.

Ölçü **CSS pikseli değil, çizim arabelleğinin aygıt pikseli** üzerinden
alınır (`getPixelsPerUnit`). Windows'ta %125/%150 ekran ölçeklemesi yaygındır;
`devicePixelRatio` kesirli olduğunda CSS pikseline yuvarlamak aygıt pikselinde
yarım piksel kaymalar bırakır ve titreme sürer. (Ölçüldü: %150 ölçeklemede
CSS tabanlı yuvarlama her iki karede bir −0,5 aygıt pikseli kayma üretiyordu;
aygıt tabanlı yuvarlamada sapma tam sıfır.)

Doku süzgeci de buna eşlik eder: **karakter** sprite'ları gerçek piksel sanat
olduğu için `NearestFilter` kullanır, ama **sahne dokuları** (zemin, duvar,
tezgâh dokusu, cihazlar) ayrıntılı çizimlerdir ve `LinearFilter` + mipmap ile
süzülür. Bunlar da Nearest olduğunda, kamera tam piksel adımlarıyla kaysa
bile zemin derzleri ve cihaz kenarları kare kare titriyordu.

Tuval ölçüsü sıfır olduğunda (gizli sekme, henüz oturmamış düzen) kamera
bozulmasın diye ölçü pozitife sabitlenir ve `ResizeObserver` gerçek ölçü
gelince kamerayı düzeltir.

## Soru şıkları

Şıklar her oyunda yeniden üretilir ve Fisher-Yates ile karıştırılır; doğru
cevabın yeri sabit değildir (20.000 denemede beş konuma da ~%20 dağılım).
Yem özelliği sorusunun çeldiricileri diğer yemlerin `distinctiveFeature`
alanlarından gelir ve doğru cevapla çakışmaz.

## Yem tanıma fotoğrafları (`assets/feeds_photo/`)

**Birinci soru** (yem tanıma) gerçek numune fotoğrafları üzerinden sorulur;
piksel-sanat görseller tanımayı gereğinden kolay hâle getiriyordu. Üçüncü
soru (görsel eşleştirme), gruplandırma ve laboratuvar bölümü piksel-sanat
görselleri kullanmaya devam eder.

Fotoğraflar Wikimedia Commons'tan serbest lisansla alınmış, 4:3 oranında
kırpılıp 800×600 JPEG'e küçültülmüştür. Künye `KAYNAKLAR.md` dosyasında ve
oyunun sonuç ekranında yer alır (soru sırasında gösterilseydi cevabı ele
verirdi).

**23 yemin fotoğrafı vardır.** Ayçiçeği küspesi ve pamuk tohumu küspesi için
Commons'ta uygun serbest fotoğraf bulunamadı; bu iki yem tanıma sorusunda
çıkmaz ama eşleştirme, gruplandırma ve çeldirici seçeneklerde yer alır.
Sonradan fotoğraf eklemek için dosyayı `assets/feeds_photo/` altına koyup
`js/feeds.js` içindeki `FEED_PHOTO_FILES` eşlemesine bir satır ekleyin:

```js
"Ayçiçeği küspesi": "aycicegi_kuspesi.jpg",
```

Fotoğrafları yeniden indirmek/değiştirmek için `tools/build_photos.py`
betiğindeki `PICKS` sözlüğü düzenlenip betik çalıştırılır.

## Cihaz fotoğrafları (`assets/equipment/`)

Cihaz pencerelerinde, öğrencinin gerçek laboratuvar donanımını tanıması için
açıklayıcı fotoğraflar gösterilir. Beklenen dosya adları:

| Dosya | Nerede görünür |
|---|---|
| `ogutucu_bos.png` | Öğütücü — henüz numune alınmamışken |
| `ogutucu_dolu.png` | Öğütücü — hazne numuneyle doluyken |
| `ogutucu_ogutulmus.png` | Öğütücü — öğütme tamamlandıktan sonra |
| `kul_firini_ic.png` | Kül Fırını penceresi |
| `porselen_kroze.png` | Kül Fırını penceresi |
| `soxhlet_seti.png` | Soxhlet Düzeneği penceresi |
| `ekstraksiyon_kartusu.png` | Soxhlet Düzeneği penceresi |

Bu dosyalar **isteğe bağlıdır**: bulunmayan bir görselin çerçevesi kendini
sayfadan kaldırır, pencere metin ve kontrolleriyle normal çalışmaya devam
eder. Böylece bazı fotoğraflar eksik olsa da oyun bozulmaz.

Fotoğraflar kasıtlı olarak **malzeme dolabında gösterilmez**; yalnızca gerekli
malzemelerin resmi olsaydı, hangisinin doğru seçim olduğu ele verilirdi.

## Yeni yem eklemek

`js/feeds.js` içindeki `FEEDS` dizisine kayıt ekleyin ve `FEED_IMAGE_FILES`
eşlemesine dosya adını yazın:

```js
{
  id: 26, name: "Kanola küspesi", mainGroup: "Endüstri Yan Ürünleri",
  distinctiveFeature: "Yağ endüstrisi yan ürünü olup ...",
  ref: { dryMatter: 90.0, ash: 7.2, fat: 2.8 }   // ash ve fat: kuru maddede %
}
```

`ref` değerleri laboratuvar bölümünde tartım üretmek için kullanılır; kuru
madde havada kuru materyaldeki %, ham kül ve ham yağ ise kuru maddedeki
% olarak girilmelidir.
