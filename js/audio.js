// audio.js — Ses motoru (Web Audio API)
// Tek seslik efektler + kesintisiz döngüler. Tarayıcı otomatik oynatma
// kısıtlaması nedeniyle ilk kullanıcı hareketinde açılır.

const PATH = 'assets/audio/';

const SFX = {
  click:    'click.wav',
  select:   'select.wav',
  correct:  'correct.wav',
  wrong:    'wrong.wav',
  pickup:   'pickup.wav',
  open:     'open.wav',
  close:    'close.wav',
  glass:    'glass.wav',
  success:  'success.wav',
  machine:  'machine_on.wav',
  tick:     'tick.wav',
  timeup:   'timeup.wav',
  question: 'question.wav',
  grind:    'grind.wav',
  beep:     'beep.wav',
  step1:    'step1.wav',
  step2:    'step2.wav'
};

const LOOPS = {
  ambience: 'ambience_loop.wav',
  machineLoop: 'machine_loop.wav',
  music: 'music_loop.wav'
};

// Efekt başına ses seviyesi — indirilen dosyaların gürlükleri eşit değil.
const GAIN = {
  click: 0.5, select: 0.4, correct: 0.7, wrong: 0.55, pickup: 0.55,
  open: 0.5, close: 0.5, glass: 0.5, success: 0.75, machine: 0.45,
  tick: 0.35, timeup: 0.8, question: 0.6, grind: 0.5, beep: 0.3,
  step1: 0.22, step2: 0.22
};

export const Audio = {
  ctx: null,
  master: null,
  buffers: {},
  loopNodes: {},
  ready: false,
  muted: false,
  _lastStep: 0,
  _stepToggle: false,

  /**
   * İlk kullanıcı hareketinde çağrılır; AudioContext'i açar.
   * Ses dosyaları arka planda yüklenir — oyunun başlaması beklemez, ilk
   * saniyelerde henüz gelmemiş bir efekt sessizce atlanır.
   */
  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return this.whenReady;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    const all = { ...SFX, ...LOOPS };
    this.whenReady = Promise.all(
      Object.entries(all).map(([key, file]) => this._load(key, file))
    ).then(() => { this.ready = true; });

    // Kısa efektler hızlı gelir; bunları beklemek arayüzü geciktirmez.
    await Promise.race([this.whenReady, new Promise(r => setTimeout(r, 400))]);
  },

  async _load(key, file, retries = 1) {
    try {
      const res = await fetch(PATH + file, { cache: 'force-cache' });
      if (!res.ok) throw new Error(res.status);
      this.buffers[key] = await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        return this._load(key, file, retries - 1);
      }
      // Ses dosyası olmadan da oyun eksiksiz oynanabilmeli.
      console.warn(`Ses yüklenemedi: ${file}`, e.message);
    }
  },

  play(name, { volume = 1, rate = 1 } = {}) {
    if (!this.ctx || this.muted) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = (GAIN[name] ?? 0.6) * volume;
    src.connect(g).connect(this.master);
    src.start();
  },

  /** Ayak sesi — adım aralığı kadar seyrek çalar. */
  step() {
    const now = performance.now();
    if (now - this._lastStep < 340) return;
    this._lastStep = now;
    this._stepToggle = !this._stepToggle;
    this.play(this._stepToggle ? 'step1' : 'step2', { rate: 0.95 + Math.random() * 0.12 });
  },

  startLoop(name, volume = 0.35) {
    if (!this.ctx || this.loopNodes[name]) return;
    const buf = this.buffers[name];
    if (!buf) {
      // Döngü dosyaları en büyükleri; henüz gelmediyse yükleme bitince başlat.
      this._pending = this._pending || {};
      if (this.whenReady && !this._pending[name]) {
        this._pending[name] = true;
        this.whenReady.then(() => {
          delete this._pending[name];
          this.startLoop(name, volume);
        });
      }
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(this.master);
    src.start();
    g.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.6);
    this.loopNodes[name] = { src, g };
  },

  stopLoop(name) {
    const node = this.loopNodes[name];
    if (!node) return;
    delete this.loopNodes[name];
    try {
      node.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      node.src.stop(this.ctx.currentTime + 0.45);
    } catch (e) { /* zaten durmuş */ }
  },

  /** Cihaz çalışırken kısa süreli motor uğultusu. */
  runMachine(ms = 1600) {
    this.play('machine');
    this.startLoop('machineLoop', 0.30);
    clearTimeout(this._machineTimer);
    this._machineTimer = setTimeout(() => this.stopLoop('machineLoop'), ms);
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.value = m ? 0 : 0.9;
    }
    return this.muted;
  },

  toggleMute() {
    return this.setMuted(!this.muted);
  }
};
