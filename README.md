# Yem Laboratuvarı: Son Numune

LVS2005 **Yem Bilgisi ve Hayvan Besleme** dersi için hazırlanmış, tarayıcıda
çalışan izometrik laboratuvar simülasyonu. Öğrenci bir yem numunesini tanır,
sınıflandırır ve laboratuvarda **kuru madde**, **ham kül** ve **ham yağ**
analizlerini baştan sona yürütür. Toplam süre 30 dakikadır.

## Çalıştırma

Oyun ES modülleri kullandığı için **bir HTTP sunucusu üzerinden** açılmalıdır;
`index.html` dosyasına çift tıklamak (`file://`) çalışmaz.

### Windows'ta: çift tıkla

Klasördeki iki toplu iş dosyasından birine çift tıklamak yeter:

| Dosya | Ne yapar |
|---|---|
| `Oyunu Baslat.bat` | Sunucuyu başlatır, oyunu normal (öğrenci) hâliyle açar |
| `Test Modu.bat` | Aynısını `?test=1` ile açar — sorularda **GEÇ** düğmeleri çıkar |

Her ikisi de Python'u bulur, sunucu zaten çalışıyorsa yeniden başlatmaz ve
tarayıcıyı doğru adrese yollar. Sunucu ayrı bir **"Yem Lab Sunucusu"**
penceresinde çalışır; işiniz bitince o pencereyi kapatmanız yeterlidir.

> `Test Modu.bat` dosyasını öğrencilere dağıtmayın; öğrencinin açtığı normal
> adreste GEÇ düğmeleri hiç oluşturulmaz.

### Elle

```bash
python tools/devserver.py 8124
```

Ardından tarayıcıdan `http://localhost:8124` adresini açın. Yayına almak için
klasörü herhangi bir statik sunucuya (GitHub Pages, Netlify, üniversite web
sunucusu) olduğu gibi kopyalamak yeterlidir — `.bat` dosyaları yalnızca yerel
kolaylıktır, yayında bir işe yaramaz.

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
| 3 | Fotoğraf eşleştirme (5 × 2) | 10 |
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

> Oyun, kurutma/yakma sonrası "şimdi desikatöre koy" gibi bir yönlendirme
> **yapmaz**; işlem sırasını öğrencinin bilmesi gerekir. Atlanan basamak hem
> puan kaybı hem işlem hatası olarak kaydedilir.

Her analizde puan **prosedür + sonuç** olarak ikiye ayrılır; örneğin kuru
maddede doğru sıcaklık 3, doğru süre 3, desikatörde soğutma 2 ve doğru hesap
12 puandır. Süre dolduğunda tamamlanmamış analizlerin doğru yapılmış
basamakları için kısmi puan verilir.

## Test modu — soruları geçme

Laboratuvar bölümünü denerken her seferinde dört soruyu yanıtlamak zorunda
kalmamak için adrese `?test=1` eklenir:

```
index.html?test=1
```

Bu modda her sorunun altında sarı **TEST MODU** rozetiyle iki düğme çıkar:

| Düğme | Ne yapar |
|---|---|
| **BU SORUYU GEÇ** | O soruyu 0 puanla geçer, sıradaki soruya atlar |
| **TÜM SORULARI GEÇ** | Kalan bütün soruları 0 puanla geçip doğrudan laboratuvara girer |

Atlanan her soru puan dökümüne **0** olarak yazılır, "puan kırılan yerler"
listesinde görünür ve hata kaydına `Soru atlandı (test modu).` satırı düşer —
yani atlanmış bir oturum sonuç ekranında ve öğretmene giden kayıtta açıkça
belli olur, gerçek bir sınav sonucuyla karıştırılamaz.

> **Öğrencinin oynadığı normal adreste (`index.html`) bu düğmeler hiç
> oluşturulmaz.** Anahtar `TEST_MODE` (`js/system.js`) yalnızca adres
> satırında `?test=1` (ya da `?atla=1`) varken açılır.

## Yem veritabanı (`js/feeds.js`)

Oyunda **26 yem** vardır; hepsinin ayırt edici özelliği ve referans besin
madde değerleri Anadolu Üniversitesi **"Temel Yem Bilgisi ve Hayvan Besleme"**
(2012, ISBN 978-975-06-0963-3) ders kitabından alınmıştır.

| Ana grup | Sayı | Yemler |
|---|---|---|
| Kaba Yemler | 9 | yonca, korunga, üçgül, fiğ otu, çayır ve mera otu, sorgum (Sudan otu), şeker pancarı, mısır silajı, saman |
| Buğdaygil Tane Yemleri | 5 | buğday, arpa, yulaf, mısır, çavdar |
| Baklagil Tane Yemleri | 1 | soya fasulyesi |
| Endüstri Yan Ürünleri | 8 | buğday kepeği, mısır kepeği, ayçiçeği tohumu küspesi, pamuk tohumu küspesi, soya küspesi, kuru şeker pancarı posası, melas, mısır gluten unu |
| Hayvansal Kökenli Yemler | 3 | balık unu, et-kemik unu, tüy unu |

**Et-kemik unu** bilerek fotoğrafsız bırakılmıştır: birinci ve üçüncü soruda
çıkmaz, yalnızca **dördüncü soruda (gruplandırma)** ek bir kart ve çeldirici
seçenek olarak görünür. Böylece hayvansal kökenli yemler grubu tek karta
bağlı kalmaz.

### Fotoğrafı olmayan yem ne olur?

`js/main.js`, oyun başlamadan önce `verifyFeedPhotos()` (bkz. `js/feeds.js`)
ile haritadaki bütün fotoğrafları **önden yükler**; yüklenemeyen dosyanın yemi
fotoğraf havuzundan düşer ve konsola tek bir uyarı yazılır. Sonuç:

- kırık görsel hiçbir soruda çıkmaz,
- fotoğrafsız yem otomatik olarak yalnızca 4. soruda ve çeldiricilerde kalır,
- dosya `assets/feeds_photo/` altına doğru adla konduğunda **kod değişikliği
  gerekmeden** 1. ve 3. soruda çıkmaya başlar.

Şu an eksik fotoğraf yok; tek fotoğrafsız yem, öyle olması istenen
et-kemik unudur.

`ref` alanındaki **ham kül ve ham yağ değerleri kuru madde bazındadır**, çünkü
laboratuvar bölümünde bu iki analiz kurutulmuş numune üzerinden yapılır.
Kitabın kaba yem tablosu (Tablo 2.1) zaten kuru madde bazında olduğu için
doğrudan alınmış; konsantre yem tablosu (Tablo 3.2) doğal halde verildiğinden
`değer ÷ (KM ⁄ 100)` ile çevrilmiştir. Ayrıntı ve tablo dışı kalan dört yem
için bkz. `KAYNAKLAR.md`.

## Laboratuvar rehberi

Öğrenci laboratuvara girdiğinde **laboratuvar sorumlusu** karakteri bir kez
açılır (`assets/ui/rehber.png`) ve iki şey anlatır:

1. **Kontroller** — yürüme, `E` ile cihaz kullanma, DEFTER, `Esc`
2. **Kabaca ne yapılacağı** — malzemeleri al, numuneyi öğüt, üç analizi
   tamamla, sonucu kendin hesaplayıp gir, bitince ANALİZLERİ BİTİR

Pencere HUD'daki **REHBER** düğmesiyle istenildiği kadar tekrar açılabilir;
`Esc` ya da "ANLADIM, BAŞLAYALIM" kapatır. Açıkken karakter hareket etmez.

> Rehber **nasıl yapılacağını söylemez**: sıcaklık, süre, elek çapı ve işlem
> sırası bilerek dışarıda bırakılmıştır ve pencere bunu öğrenciye açıkça
> söyler. Prosedürü bilmek öğrencinin sorumluluğundadır; ölçülen şey de budur.

Görsel yüklenemezse `onerror` ile kendini kaldırır, metin tek sütuna oturur ve
pencere normal çalışmaya devam eder.

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

## Sonuç ekranı

Oyun bittiğinde (süre dolduğunda ya da öğrenci bitirdiğinde) sonuç ekranı üç
bölüm gösterir:

1. **Puan dökümü** — her aşamanın aldığı puan / üst sınırı.
2. **PUAN KIRILAN YERLER** — puan kaybedilen her satır tek tek, kaç puan
   kırıldığıyla birlikte ve en altta toplam kesinti. İki kaynak birleştirilir:
   doğrudan ceza satırları (işlem hatası, gereksiz malzeme) ve tam puan
   alınamayan bölümler (`alınan < üst sınır`).
3. **YAPILAN HATALAR** — oyun boyunca tutulan bütün hata kayıtları, oyun
   başından itibaren geçen süre damgasıyla ve sıra numarasıyla. Liste
   **katlanmaz**, doğrudan açık gelir.

Aynı bilgilerin tamamı **SONUÇ ÖZETİNİ KOPYALA** ile düz metin olarak panoya
alınabilir.

## Sonuçların öğretim elemanına iletilmesi

Oyun bittiğinde öğrenci bilgileri, toplam puan, puan dökümü, kesintiler ve kaydedilen hatalar Google Drive klasörüne her deneme için ayrı bir **Word (.docx)** dosyası olarak gönderilir. Tekrar gönderilen aynı deneme ikinci dosya oluşturmaz. Rapor, oyun tarafından kaydedilen puan ve hataları içerir; bütün doğru seçimlerin ayrıntılı bir işlem günlüğü değildir.

### Kurulum

1. [Google Apps Script](https://script.google.com/) üzerinde yeni proje oluşturun. `tools/google_sheets_kod.gs` dosyasının tamamını proje koduna yapıştırıp kaydedin.
2. Mevcut bir Drive klasörü kullanacaksanız betiğin başındaki `KLASOR_ID` alanına klasör adresindeki kimliği yazın. Boş bırakırsanız `Yem Laboratuvari Sonuclari` adlı klasör bulunur veya oluşturulur.
3. **Dağıt → Yeni dağıtım → Web uygulaması** seçin. Yürütülecek kullanıcıyı **Ben**, erişimi **Herkes** olarak ayarlayın. İstenen Google Dokümanlar, Drive ve dış bağlantı izinlerini onaylayın. Kurumsal hesap bu erişimi engelliyorsa yöneticinizin ayarları gerekebilir.
4. Dağıtımın `https://script.google.com/macros/s/.../exec` adresini `js/system.js` içindeki `GoogleSheets.url` alanına yapıştırın ve öğrencilere bu yapılandırılmış oyun dosyalarını dağıtın. Betik değişirse dağıtımı yeni sürümle güncelleyin.
5. Önce gerçek bir deneme yapıp Drive klasöründe `.docx` dosyasının oluştuğunu ve açıldığını kontrol edin. Tarayıcı Google'ın yanıtını okuyamazsa sonuç ekranında iletimin doğrulanamadığı belirtilir; klasörden kontrol edin ve gerekirse yeniden gönderin.

Servis adresi boşken otomatik gönderim çalışmaz. Sonuç ayrıca tarayıcının yerel depolamasına kaydedilir ve sonuç ekranından kopyalanabilir. Servis herkese açık olduğundan gönderilen kimlik ve puanlar doğrulanmış değildir; bu düzenek tek başına sınav güvenliği veya öğrenci kimlik doğrulaması sağlamaz.

## Klasör yapısı

```
index.html
Oyunu Baslat.bat   Windows'ta sunucuyu baslatip oyunu acar
Test Modu.bat      aynisi, ?test=1 ile (GEC dugmeleri gorunur)
css/style.css
js/    audio.js  feeds.js  game.js  lab.js  main.js  player.js  system.js  ui.js  world.js
assets/
  character/   8 yönlü karakter: 8 kareli yürüyüş şeritleri (walk_*.png,
               512×64) ve birer duruş pozu (idle_*.png, 64×64)
  feeds_photo/ 25 gerçek yem fotoğrafı (1. ve 3. soru, 800×600 JPEG)
  laboratory/  izometrik sahnedeki cihaz, duvar ve zemin görselleri
               (tezgâhlar 3B geometriyle kurulur, görsel kullanmaz)
  equipment/   cihaz pencerelerindeki açıklayıcı fotoğraflar
  intro/       açılış anlatısının 7 paneli (1280×714 JPEG)
  ui/          arayüz görselleri (rehber karakteri)
  audio/       ses efektleri, ortam ve müzik döngüleri
tools/   devserver.py (yerel sunucu),
         harvest_photos.py (fotoğraf adayı arama), build_photos.py (fotoğraf indirme),
         make_music.py (arka plan müziği üretici),
         google_sheets_kod.gs (Word raporları için Apps Script betiği)
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

**Görseller** — Yem görsellerinin tamamı **gerçek fotoğraftır**
(`assets/feeds_photo/`, Wikimedia Commons, serbest lisans). Daha önce
kullanılan piksel-sanat yem görselleri ve bunları üreten `tools/gen_feeds.py`
betiği, tanımayı yanıltıcı hâle getirdikleri için **tümüyle kaldırılmıştır**.

Laboratuvar cihazları, duvar/zemin kaplamaları, açılış anlatısı panelleri ve
karakter sprite'ları pakette hazır gelen görsellerdir; küçültülüp yeniden
sıkıştırılmıştır. Küçültülmemiş özgün sürümler (`assets/_kaynak/`) yer
kaplamamaları için silinmiştir.

> Yem listesi ders kitabına göre düzenlenmiştir: mısır/çavdar/yulaf
> **hasılları**, **İtalyan çimi**, **taş yoncası** ve **tritikale**
> çıkarılmış; yerlerine **sorgum (Sudan otu)**, **şeker pancarı**, **melas**,
> **et-kemik unu** ve **tüy unu** eklenmiştir. "Fiğ" adı, kitabın tane yem
> olarak listelediği fiğden ayrılsın diye **fiğ otu**, "ayçiçeği küspesi" ise
> kitaptaki adıyla **ayçiçeği tohumu küspesi** olmuştur.

Paketin toplam boyutu **35 MB → 6,3 MB**'a inmiştir.

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

**Birinci soru** (yem tanıma) ve **üçüncü soru** (görsel eşleştirme) gerçek
numune fotoğrafları üzerinden sorulur. Piksel-sanat görseller hem tanımayı
gereğinden kolay hâle getiriyor hem de gerçek numuneyle örtüşmediği için kafa
karıştırıyordu; bu yüzden oyundan tümüyle kaldırıldılar.

Fotoğraflar Wikimedia Commons'tan serbest lisansla alınmış, 4:3 oranında
kırpılıp 800×600 JPEG'e küçültülmüştür. Künye `KAYNAKLAR.md` dosyasında ve
oyunun sonuç ekranında yer alır (soru sırasında gösterilseydi cevabı ele
verirdi).

**26 yemin 25'inin fotoğrafı hazırdır.** Yalnızca et-kemik unu bilerek
fotoğrafsız bırakılmıştır (bkz. yukarıdaki yem veritabanı bölümü).
`tuy_unu.jpg` ile `pamuk_tohumu_kuspesi.jpg` öğretim elemanı tarafından
sağlanmıştır, geri kalanı Wikimedia Commons'tandır.
Sonradan fotoğraf eklemek için dosyayı `assets/feeds_photo/` altına koyup
`js/feeds.js` içindeki `FEED_PHOTO_FILES` eşlemesine bir satır ekleyin:

```js
"Ayçiçeği tohumu küspesi": "aycicegi_tohumu_kuspesi.jpg",
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

`js/feeds.js` içindeki `FEEDS` dizisine kayıt ekleyin; yemin birinci ve
üçüncü soruda çıkabilmesi için `FEED_PHOTO_FILES` eşlemesine de fotoğraf
dosyasının adını yazın (fotoğrafsız yem yalnızca gruplandırmada ve çeldirici
seçeneklerde görünür):

```js
{
  id: 27, name: "Kanola küspesi", mainGroup: "Endüstri Yan Ürünleri",
  distinctiveFeature: "Yağ endüstrisi yan ürünü olup ...",
  ref: { dryMatter: 90.0, ash: 7.2, fat: 2.8 }   // ash ve fat: kuru maddede %
}
```

`ref` değerleri laboratuvar bölümünde tartım üretmek için kullanılır; kuru
madde havada kuru materyaldeki %, ham kül ve ham yağ ise kuru maddedeki
% olarak girilmelidir.

