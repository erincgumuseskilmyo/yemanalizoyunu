// intro.js — Giriş sonrası açılış anlatısı
// Yedi panel sırayla açılır, oyunun hikâyesini ve görevini anlatır.
// Süre sayacı bu ekran bittikten sonra başlar; anlatım öğrencinin
// sınav süresinden yemez.
import { Audio } from './audio.js';

const $ = id => document.getElementById(id);

const SLIDE_MS = 7000;      // otomatik geçiş süresi
const FADE_MS = 280;

const SLIDES = [
  {
    img: 'assets/intro/1.jpg',
    text: 'Aksaray Üniversitesi Yem Analiz Laboratuvarı. Mesainin son saati; ' +
          'masadaki işler bitmiş görünüyor.'
  },
  {
    img: 'assets/intro/2.jpg',
    text: 'Tam çıkmaya hazırlanırken masadaki telefon çalar.'
  },
  {
    img: 'assets/intro/3.jpg',
    text: 'Hattaki ses laboratuvar sorumlusudur: gün bitmeden analizi ' +
          'tamamlanması gereken yeni bir yem numunesi gelmiştir.'
  },
  {
    img: 'assets/intro/4.jpg',
    text: 'İtiraz etmeyi dener.'
  },
  {
    img: 'assets/intro/5.jpg',
    text: 'Ama cevap nettir: sonuçlar bugün teslim edilecektir.'
  },
  {
    img: 'assets/intro/6.jpg',
    text: 'Telefon kapanır. Numune tezgâhta beklemektedir.'
  },
  {
    img: 'assets/intro/7.jpg',
    text: 'Bundan sonrası size kalmıştır.',
    howto: [
      'Numuneyi <b>fotoğrafından tanıyın</b> ve öne çıkan özelliğini bilin.',
      'Yem görsellerini <b>eşleştirin</b>, yemleri doğru <b>gruplara</b> ayırın.',
      'Laboratuvarda <b>kuru madde</b>, <b>ham kül</b> ve <b>ham yağ</b> analizlerini yürütün.',
      '<b>W A S D</b> ile dolaşın, <b>E</b> ile cihazları kullanın.',
      'Süreniz <b>30 dakika</b>; değerlendirme <b>100 puan</b> üzerindendir.'
    ]
  }
];

export const Intro = {
  index: 0,
  timer: null,
  onDone: null,
  _keyHandler: null,

  /** Kalan panelleri arka planda yükler; geçişlerde boş kare görünmesin. */
  preload(from = 1) {
    SLIDES.slice(from).forEach(s => { new Image().src = s.img; });
  },

  show(onDone) {
    this.onDone = onDone;
    this.index = 0;

    $('screen-login').classList.remove('active');
    $('screen-intro').classList.add('active');

    // Müzik anlatı boyunca ve soru aşamalarında çalar.
    Audio.startLoop('music', 0.34);

    $('btn-intro-skip').onclick = () => this.finish();
    $('btn-intro-next').onclick = () => this.next();
    $('btn-intro-prev').onclick = () => this.prev();
    $('intro-stage').onclick = () => this.next();

    this._keyHandler = e => {
      if (e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); this.next();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault(); this.prev();
      } else if (e.code === 'Escape') {
        this.finish();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    // Noktalar
    $('intro-dots').innerHTML = SLIDES
      .map((_, i) => `<span class="intro-dot" data-i="${i}"></span>`).join('');
    $('intro-dots').querySelectorAll('.intro-dot').forEach(d => {
      d.addEventListener('click', e => {
        e.stopPropagation();
        this.go(Number(d.dataset.i));
      });
    });

    // İlk panel hemen gösterilir; kalanlar arka planda yüklenir ki
    // öğrenci boş bir çerçeveye bakmasın.
    this.render(true);
    this.preload();
  },

  render(first = false) {
    const s = SLIDES[this.index];
    const fig = $('intro-figure');
    const img = $('intro-img');
    const cap = $('intro-caption');

    const paint = () => {
      img.src = s.img;
      img.alt = `Açılış sahnesi ${this.index + 1}`;
      cap.innerHTML =
        `<p>${s.text}</p>` +
        (s.howto ? `<ul class="intro-howto">${
          s.howto.map(h => `<li>${h}</li>`).join('')}</ul>` : '');
      fig.classList.remove('fading');
    };

    if (first) {
      paint();
    } else {
      fig.classList.add('fading');
      setTimeout(paint, FADE_MS);
    }

    $('intro-dots').querySelectorAll('.intro-dot')
      .forEach((d, i) => d.classList.toggle('on', i === this.index));

    const last = this.index === SLIDES.length - 1;
    $('btn-intro-next').textContent = last ? 'LABORATUVARA GİR' : 'İLERİ ▸';
    $('btn-intro-next').classList.toggle('final', last);
    $('btn-intro-prev').disabled = this.index === 0;

    this.restartProgress(last);
  },

  /** Otomatik geçiş çubuğu; son panelde beklemez, öğrenci hazır olunca girer. */
  restartProgress(stop) {
    clearTimeout(this.timer);
    const bar = $('intro-progress');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;                       // yeniden akış zorla
    if (stop) return;
    bar.style.transition = `width ${SLIDE_MS}ms linear`;
    bar.style.width = '100%';
    this.timer = setTimeout(() => this.next(), SLIDE_MS);
  },

  go(i) {
    if (i < 0 || i >= SLIDES.length || i === this.index) return;
    this.index = i;
    Audio.play('select', { volume: 0.6 });
    this.render();
  },

  next() {
    if (this.index >= SLIDES.length - 1) return this.finish();
    this.index++;
    Audio.play('click', { volume: 0.5 });
    this.render();
  },

  prev() {
    if (this.index === 0) return;
    this.index--;
    Audio.play('click', { volume: 0.5 });
    this.render();
  },

  finish() {
    if (!this.onDone) return;
    clearTimeout(this.timer);
    window.removeEventListener('keydown', this._keyHandler);
    $('screen-intro').classList.remove('active');
    const cb = this.onDone;
    this.onDone = null;
    cb();
  }
};
