// game.js — Yem Laboratuvarı oyun akışı
import {
  getFeedPhoto, getRandomPhotoFeeds,
  getGroupingSet, getFeatureDistractors, shuffle
} from './feeds.js';
import { UI } from './ui.js';
import { Timer, Scoring, Storage, ErrorLogger, GoogleSheets, TEST_MODE } from './system.js';
import { Lab } from './lab.js';
import { initWorld, setInteractCallback, setUpdateCallback, setRenderingActive,
         getScene, getCamera, getInteractables } from './world.js';
import { createPlayer, updatePlayer, getPlayerPosition, setInputEnabled, playInteractAnimation } from './player.js';
import { Audio } from './audio.js';

const PHASE_LABELS = {
  IDENTIFICATION: 'YEM TANIMA',
  FEATURE: 'YEM ÖZELLİĞİ',
  IMAGE_MATCHING: 'FOTOĞRAF EŞLEŞTİRME',
  GROUPING: 'GRUPLANDIRMA',
  LAB: 'LABORATUVAR',
  RESULT: 'SONUÇ'
};

const POINTS = {
  identification: 15,
  feature: 10,
  matchingPerItem: 2,
  matchingMax: 10,
  groupingPerItem: 3,
  groupingMax: 15
};

const INTERACT_RANGE = 4.6;

export const Game = {
  phase: 'LOGIN',
  student: {},
  feed: null,
  groupingFeeds: [],
  imageMatchingFeeds: [],
  started: null,
  _promptText: null,
  _ended: false,

  start(data) {
    this.student = data;
    this.started = new Date();
    this._ended = false;

    // Birinci soru gerçek numune fotoğrafı üzerinden sorulduğu için,
    // numune fotoğrafı bulunan yemler arasından seçilir.
    this.feed = getRandomPhotoFeeds(1)[0];

    this.groupingFeeds = getGroupingSet(5, this.feed.id);
    this.imageMatchingFeeds = getRandomPhotoFeeds(5, this.feed);

    Scoring.reset();
    ErrorLogger.clear();

    Timer.onTick = s => this.onTick(s);
    Timer.onEnd = () => this.endGame('süre doldu');
    Timer.start();

    UI.showGameUI();
    this.setPhase('IDENTIFICATION');
  },

  onTick(sec) {
    // Eşikler toplam süreye orantılı: son 5 dakika sarı, son dakika kırmızı.
    const danger = sec <= 60;
    const warn = sec <= 300;
    UI.setTimer(Timer.format(sec), warn, danger);
    if (sec === 300) UI.toast('Son 5 dakika!', 'error', 3500);
    if (sec === 180) UI.toast('Son 3 dakika!', 'error', 3500);
    if (sec === 60) UI.toast('Son 1 dakika!', 'error', 3500);
    if (sec <= 10 && sec > 0) Audio.play('tick');
  },

  setPhase(p) {
    this.phase = p;
    UI.setHUD(PHASE_LABELS[p] || p, Scoring.total);
    this.saveState();

    if (p === 'IDENTIFICATION') this.runIdentification();
    else if (p === 'FEATURE') this.runFeature();
    else if (p === 'IMAGE_MATCHING') this.runImageMatching();
    else if (p === 'GROUPING') this.runGrouping();
    else if (p === 'LAB') this.runLab();
  },

  refreshHUD() {
    UI.setHUD(PHASE_LABELS[this.phase] || this.phase, Scoring.total);
  },

  // ------------------------------------------------------- Test modu

  // Soru aşamaları: [aşama, puan etiketi, üst sınır, sonraki aşama]
  QUIZ_PHASES: [
    ['IDENTIFICATION', 'Yem Tanıma',           POINTS.identification, 'FEATURE'],
    ['FEATURE',        'Yem Özelliği',         POINTS.feature,        'IMAGE_MATCHING'],
    ['IMAGE_MATCHING', 'Fotoğraf Eşleştirme',  POINTS.matchingMax,    'GROUPING'],
    ['GROUPING',       'Gruplandırma',         POINTS.groupingMax,    'LAB']
  ],

  /**
   * Test modunda sorulara takılan "GEÇ" düğmelerinin kancaları.
   * TEST_MODE kapalıyken null döner, arayüz de düğme çizmez.
   */
  skipHooks(phase) {
    if (!TEST_MODE) return null;
    return {
      one: () => this.skipPhase(phase),
      all: () => this.skipAllQuizzes(phase)
    };
  },

  /** Tek soruyu atlar: 0 puan yazılır ve kayda geçer. */
  skipPhase(phase) {
    const row = this.QUIZ_PHASES.find(r => r[0] === phase);
    if (!row) return;
    const [, label, max, next] = row;
    Scoring.add(label, 0, max);
    ErrorLogger.log(label, 'Soru atlandı (test modu).');
    UI.toast(`${label} atlandı — 0 puan.`, 'error');
    this.setPhase(next);
  },

  /** Bu sorudan itibaren kalan bütün soruları atlar ve laboratuvara geçer. */
  skipAllQuizzes(phase) {
    const i = this.QUIZ_PHASES.findIndex(r => r[0] === phase);
    for (const [, label, max] of this.QUIZ_PHASES.slice(i < 0 ? 0 : i)) {
      Scoring.add(label, 0, max);
      ErrorLogger.log(label, 'Soru atlandı (test modu).');
    }
    UI.toast('Kalan sorular atlandı — laboratuvara geçiliyor.', 'error', 3200);
    this.setPhase('LAB');
  },

  // ------------------------------------------------------- 1. Yem tanıma
  runIdentification() {
    // Çeldiriciler de fotoğraf havuzundan gelir; böylece seçenekler
    // birbirine benzer nitelikte kalır.
    const distractors = getRandomPhotoFeeds(5, this.feed)
      .filter(f => f.id !== this.feed.id)
      .slice(0, 4);

    const candidates = shuffle([this.feed, ...distractors]);
    const correctIndex = candidates.findIndex(f => f.id === this.feed.id);

    UI.showQuestion(
      '1. YEM TANIMA',
      'Resimdeki yem kaynağı aşağıdakilerden hangisidir?',
      candidates.map(f => f.name),
      idx => {
        const ok = idx === correctIndex;
        if (!ok) {
          ErrorLogger.log('Yem Tanıma',
            `Seçilen: ${candidates[idx].name}, doğrusu: ${this.feed.name}.`);
          UI.toast(`Yanlış. Doğru cevap: ${this.feed.name}`, 'error', 3200);
        } else {
          UI.toast('Doğru!', 'ok');
        }
        Audio.play(ok ? 'correct' : 'wrong');
        Scoring.add('Yem Tanıma', ok ? POINTS.identification : 0, POINTS.identification);
        this.setPhase('FEATURE');
      },
      { src: getFeedPhoto(this.feed), photo: true },
      this.skipHooks('IDENTIFICATION')
    );
  },

  // ------------------------------------------------------- 2. Öne çıkan özellik
  runFeature() {
    // Çeldiriciler doğru cevabı içermemeli; getFeatureDistractors bunu garanti eder.
    const options = shuffle([
      this.feed.distinctiveFeature,
      ...getFeatureDistractors(this.feed, 4)
    ]);
    const correctIndex = options.indexOf(this.feed.distinctiveFeature);

    UI.showQuestion(
      '2. ÖNE ÇIKAN ÖZELLİK',
      `${this.feed.name} yeminin öne çıkan özelliği aşağıdakilerden hangisidir?`,
      options,
      idx => {
        const ok = idx === correctIndex;
        if (!ok) {
          ErrorLogger.log('Yem Özelliği', `${this.feed.name} için yanlış özellik seçildi.`);
          UI.toast('Yanlış özellik seçildi.', 'error');
        } else {
          UI.toast('Doğru!', 'ok');
        }
        Audio.play(ok ? 'correct' : 'wrong');
        Scoring.add('Yem Özelliği', ok ? POINTS.feature : 0, POINTS.feature);
        this.setPhase('IMAGE_MATCHING');
      },
      null,
      this.skipHooks('FEATURE')
    );
  },

  // ------------------------------------------------------- 3. Görsel eşleştirme
  runImageMatching() {
    UI.showImageMatching(this.imageMatchingFeeds, (correct, wrongTries) => {
      const raw = correct * POINTS.matchingPerItem;
      const penalty = Math.min(wrongTries, 4, raw);
      Scoring.add('Fotoğraf Eşleştirme', raw - penalty, POINTS.matchingMax);
      if (wrongTries) ErrorLogger.log('Fotoğraf Eşleştirme', `${wrongTries} yanlış deneme.`);
      this.setPhase('GROUPING');
    }, this.skipHooks('IMAGE_MATCHING'));
  },

  // ------------------------------------------------------- 4. Gruplandırma
  runGrouping() {
    UI.showGrouping(this.groupingFeeds, (correct, wrongTries) => {
      const raw = correct * POINTS.groupingPerItem;
      const penalty = Math.min(wrongTries, 5, raw);
      Scoring.add('Gruplandırma', raw - penalty, POINTS.groupingMax);
      if (wrongTries) ErrorLogger.log('Gruplandırma', `${wrongTries} yanlış deneme.`);
      this.setPhase('LAB');
    }, this.skipHooks('GROUPING'));
  },

  // ------------------------------------------------------- 5. Laboratuvar
  async runLab() {
    Lab.setup(this.feed);
    Lab.onChange = () => {
      UI.setTasks(Lab.tasks());
      this.refreshHUD();
      this.saveState();
      if (Lab.isComplete()) {
        UI.toast('Üç analiz de tamamlandı. Oyunu bitirebilirsiniz.', 'ok', 4000);
      }
    };

    UI.setLabMode(true);
    UI.setTasks(Lab.tasks());
    UI.showFinishButton(true);
    document.getElementById('btn-finish').onclick = () => {
      const done = Lab.isComplete();
      UI.confirm(
        'Oyunu Bitir',
        done
          ? 'Üç analiz de tamamlandı. Oyunu bitirip sonuç ekranına geçmek istiyor musunuz?'
          : 'Tüm analizler tamamlanmadı; tamamlanmayanlardan yalnızca doğru yaptığınız ' +
            'basamakların puanını alırsınız. Yine de bitirmek istiyor musunuz?',
        () => this.endGame('öğrenci bitirdi')
      );
    };

    initWorld(document.getElementById('canvas-container'));
    await createPlayer(getScene(), getCamera());

    setInteractCallback(data => this.interactWith(data.type));
    setUpdateCallback(() => this.labFrame());

    // Laboratuvarda müzik yerini ortam uğultusuna bırakır.
    Audio.stopLoop('music');
    Audio.startLoop('ambience', 0.22);
    // Kontrolleri ve görevleri laboratuvar sorumlusu anlatır; kısa toast
    // yerine bir kez açılan rehber penceresi kullanılır.
    UI.showGuide();
  },

  /** Sahne döngüsünün her karesinde çalışır. */
  labFrame() {
    const modalOpen = UI.isModalOpen();
    setInputEnabled(!modalOpen);
    updatePlayer();

    const near = modalOpen ? null : this.nearestInteractable();
    const text = near ? `E — ${near.userData.label}` : null;
    if (text !== this._promptText) {
      this._promptText = text;
      UI.setInteractPrompt(text);
    }
  },

  nearestInteractable(range = INTERACT_RANGE) {
    const p = getPlayerPosition();
    let best = null, bestDist = Infinity;
    for (const obj of getInteractables()) {
      const d = Math.hypot(obj.position.x - p.x, obj.position.z - p.z);
      if (d < bestDist && d <= range) { bestDist = d; best = obj; }
    }
    return best;
  },

  /** E tuşu / dokunma düğmesi. */
  interactNearest() {
    if (this.phase !== 'LAB' || UI.isModalOpen()) return false;
    const near = this.nearestInteractable();
    if (!near) {
      UI.toast('Yakında kullanılabilir bir cihaz yok.', 'info', 1500);
      return false;
    }
    this.interactWith(near.userData.type);
    return true;
  },

  interactWith(type) {
    if (this.phase !== 'LAB' || UI.isModalOpen()) return;
    playInteractAnimation();
    Lab.interact(type);
  },

  // ------------------------------------------------------- Bitiş

  /**
   * Puan kesintilerini tek listede toplar.
   * İki kaynak vardır: doğrudan ceza satırları (negatif puanlı, örn. işlem
   * hatası veya gereksiz malzeme) ve tam puan alınamayan bölümler
   * (kazanılan < üst sınır).
   */
  buildDeductions() {
    const list = [];
    for (const d of Scoring.details) {
      if (d.points < 0) {
        list.push({ yer: d.label, kayip: -d.points, tur: 'ceza' });
      } else if (d.max && d.points < d.max) {
        list.push({ yer: d.label, kayip: d.max - d.points, tur: 'eksik',
                    alinan: d.points, ustSinir: d.max });
      }
    }
    return list;
  },

  /** Hata kaydının oyun başından itibaren geçen süresi (dd:ss). */
  errorClock(iso) {
    if (!this.started) return '';
    const sec = Math.max(0, Math.round((new Date(iso) - this.started) / 1000));
    return Timer.format(sec);
  },

  endGame(reason = '') {
    if (this._ended) return;
    this._ended = true;

    Timer.stop();
    setUpdateCallback(null);
    setInteractCallback(null);
    setRenderingActive(false);      // sahne son karesiyle donar
    setInputEnabled(false);
    Lab.collectPartialScores();
    this.phase = 'RESULT';

    const elapsed = Timer.totalSeconds - Timer.remaining;
    const total = Math.max(0, Math.min(100, Scoring.total));

    const rows = Scoring.details.map(d => `
      <div class="row">
        <span>${d.label}</span>
        <span class="${d.points > 0 ? 'ok' : (d.points < 0 ? 'err' : 'zero')}">
          ${d.points}${d.max ? ' / ' + d.max : ''}
        </span>
      </div>`).join('');

    // --- Puan kırılan yerler (açık liste, katlanmaz) ---
    const kesintiler = this.buildDeductions();
    const toplamKesinti = kesintiler.reduce((s, k) => s + k.kayip, 0);
    const kesintiHtml = kesintiler.length
      ? `<div class="score-rows deduction-rows">
           ${kesintiler.map(k => `
             <div class="row">
               <span>${k.yer}${k.tur === 'eksik'
                 ? ` <i class="dim">(${k.alinan}/${k.ustSinir} puan alındı)</i>` : ''}</span>
               <span class="err">−${k.kayip} puan</span>
             </div>`).join('')}
           <div class="row total">
             <span>Toplam kesinti</span><span class="err">−${toplamKesinti} puan</span>
           </div>
         </div>`
      : '<p class="ok">Hiçbir yerden puan kırılmadı.</p>';

    // --- Yapılan hataların tamamı (açık liste, katlanmaz) ---
    const hataHtml = ErrorLogger.errors.length
      ? `<ol class="err-list-open">
           ${ErrorLogger.errors.map(e => `
             <li>
               <span class="err-time">${this.errorClock(e.time)}</span>
               <b>${e.phase}:</b> ${e.message}
             </li>`).join('')}
         </ol>`
      : '<p class="ok">Hata kaydı yok.</p>';

    const html = `
      <p class="final-meta">
        <b>${this.student.ad} ${this.student.soyad}</b> — ${this.student.ogr}<br>
        Numune: <b>${this.feed.name}</b> (${this.feed.mainGroup})<br>
        Süre: ${Timer.format(elapsed)} · Bitiş: ${reason}
      </p>
      <div class="score-rows">${rows}</div>
      <h4>TOPLAM PUAN: ${total} / 100</h4>

      <h4 class="final-sec">PUAN KIRILAN YERLER</h4>
      ${kesintiHtml}

      <h4 class="final-sec">YAPILAN HATALAR (${ErrorLogger.errors.length})</h4>
      ${hataHtml}`;

    const payload = {
      gonderimId: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
      ad: this.student.ad,
      soyad: this.student.soyad,
      ogrenciNo: this.student.ogr,
      yem: this.feed.name,
      grup: this.feed.mainGroup,
      puan: total,
      detay: Scoring.details,
      kesintiler,
      toplamKesinti,
      hataSayisi: ErrorLogger.errors.length,
      hatalar: ErrorLogger.errors.map(e => ({
        dakika: this.errorClock(e.time), asama: e.phase, aciklama: e.message
      })),
      sureSaniye: elapsed,
      bitis: reason,
      tarih: new Date().toISOString()
    };

    const copyText =
      `${this.student.ad} ${this.student.soyad} (${this.student.ogr})\n` +
      `Numune: ${this.feed.name}\n` +
      Scoring.details.map(d => `${d.label}: ${d.points}/${d.max}`).join('\n') +
      `\nTOPLAM: ${total}/100\nSüre: ${Timer.format(elapsed)}\n` +
      `\nPUAN KIRILAN YERLER:\n` +
      (kesintiler.length
        ? kesintiler.map(k => `- ${k.yer}: -${k.kayip}`).join('\n') +
          `\nToplam kesinti: -${toplamKesinti}`
        : '- yok') +
      `\n\nYAPILAN HATALAR (${ErrorLogger.errors.length}):\n` +
      (ErrorLogger.errors.length
        ? ErrorLogger.errors.map(e =>
            `- [${this.errorClock(e.time)}] ${e.phase}: ${e.message}`).join('\n')
        : '- yok');

    Audio.stopLoop('music');
    UI.showFinal(html, copyText);
    Storage.save({ sonuc: payload });
    this.deliver(payload);
  },

  /**
   * Sonucu öğretim elemanının Google E-Tablosuna gönderir ve sonuç ekranında
   * durumu gösterir. Başarısızlıkta öğrenci "TEKRAR GÖNDER" ile deneyebilir;
   * her hâlükârda kopyalanabilir özet yedek yol olarak durur.
   */
  async deliver(payload) {
    UI.setSendStatus({ state: 'sending' });
    const res = await GoogleSheets.send(payload);
    if (res.ok) {
      UI.setSendStatus({ state: res.reason === 'unverified' ? 'unverified' : 'sent' });
    } else if (res.reason === 'off') {
      UI.setSendStatus({ state: 'off' });
    } else {
      UI.setSendStatus({
        state: 'fail',
        detail: res.detail || '',
        onRetry: () => this.deliver(payload)
      });
    }
  },

  saveState() {
    Storage.save({
      student: this.student,
      phase: this.phase,
      feedId: this.feed?.id,
      score: Scoring.total,
      remaining: Timer.remaining
    });
  }
};
