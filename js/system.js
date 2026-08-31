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
  url: '',

  async send(data) {
    if (!this.url) {
      console.info('Google Sheets URL ayarlanmamış; sonuç yalnızca tarayıcıda saklandı.');
      return false;
    }
    try {
      // text/plain, tarayıcının CORS ön kontrol (preflight) isteği göndermesini
      // engeller; Apps Script gövdeyi e.postData.contents içinden okur.
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        redirect: 'follow'
      });
      return res.ok;
    } catch (e) {
      console.error('Sonuç gönderilemedi:', e);
      return false;
    }
  }
};
