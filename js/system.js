// system.js — Süre, puanlama, kayıt, hata günlüğü ve Google Sheets aktarımı

export const Timer = {
  totalSeconds: 1800,         // 30 dakika
  remaining: 1800,
  interval: null,
  onTick: null,
  onEnd: null,

  start(seconds = this.totalSeconds) {
    this.stop();
    this.totalSeconds = seconds;
    this.remaining = seconds;
    // setInterval kayması saatlerce süren oyunlarda birikir; bitiş anı
    // gerçek zamandan hesaplanır.
    const endsAt = Date.now() + seconds * 1000;
    this.interval = setInterval(() => {
      this.remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      if (this.onTick) this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        if (this.onEnd) this.onEnd();
      }
    }, 1000);
  },

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  },

  format(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }
};

/**
 * Test modu. Adres satırına `?test=1` (ya da `?atla=1`) eklendiğinde açılır.
 * Sorulara "GEÇ" düğmeleri koyar; öğrencinin oynadığı normal adreste
 * kapalıdır, yani sınavda kimse soruları atlayamaz.
 */
export const TEST_MODE = (() => {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('test') === '1' || q.get('atla') === '1';
  } catch (e) { return false; }
})();

export const Scoring = {
  total: 0,
  details: [],

  add(label, points, max) {
    const p = Math.round(points);
    this.total += p;
    this.details.push({ label, points: p, max });
  },

  reset() {
    this.total = 0;
    this.details = [];
  }
};

export const Storage = {
  key: 'yemLabOyunu',

  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify({ ...state, kayitZamani: Date.now() }));
    } catch (e) { /* özel sekmede localStorage kapalı olabilir */ }
  },

  load() {
    try { return JSON.parse(localStorage.getItem(this.key)); } catch (e) { return null; }
  },

  clear() {
    try { localStorage.removeItem(this.key); } catch (e) { /* yoksay */ }
  }
};

export const ErrorLogger = {
  errors: [],
  log(phase, message) {
    this.errors.push({ time: new Date().toISOString(), phase, message });
  },
  clear() { this.errors = []; }
};

export const GoogleSheets = {
  // Öğretim elemanı kendi Google Apps Script Web App URL'sini buraya yapıştırır.
  // Kurulum adımları README.md dosyasındadır.
  url: 'https://script.google.com/macros/s/AKfycbz_3qyzPLx_QvES22pE2eIh5hLreEjPv_6N9rqAUGq-Y6NEu_u3z5YSw3DBtLhBrwPKpw/exec',

  /**
   * Sonucu öğretmenin Google E-Tablosuna gönderir.
   * `{ ok, reason }` döner; arayüz buna göre durum gösterir ve tekrar
   * deneme sunar.
   *
   * Önce normal (cors) istek denenir ki gerçekten ulaştığı doğrulanabilsin.
   * Tarayıcı CORS nedeniyle engellerse `no-cors` ile ikinci bir deneme
   * yapılır: veri Apps Script'e ulaşır ama yanıt okunamaz, bu yüzden sonuç
   * "doğrulanamadı" olarak bildirilir — sessizce başarılı sayılmaz.
   */
  async send(data) {
    if (!this.url) return { ok: false, reason: 'off' };

    const body = JSON.stringify(data);
    // text/plain, tarayıcının CORS ön kontrol (preflight) isteği göndermesini
    // engeller; Apps Script gövdeyi e.postData.contents içinden okur.
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow'
    };

    try {
      const res = await fetch(this.url, opts);
      if (res.ok) {
        const result = await res.json();
        return result.ok ? { ok: true, reason: 'sent' } : { ok: false, reason: 'server', detail: result.hata || 'Sunucu kaydı oluşturamadı.' };
      }
      return { ok: false, reason: 'http', detail: String(res.status) };
    } catch (e) {
      try {
        await fetch(this.url, { ...opts, mode: 'no-cors' });
        return { ok: true, reason: 'unverified' };
      } catch (e2) {
        return { ok: false, reason: 'network', detail: e2.message };
      }
    }
  }
};
