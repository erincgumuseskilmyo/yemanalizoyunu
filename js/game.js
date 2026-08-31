// game.js — Yem Laboratuvarı oyun akışı
import {
  getFeedPhoto, getRandomPhotoFeeds, getRandomImageFeeds,
  getGroupingSet, getFeatureDistractors, shuffle
} from './feeds.js';
import { UI } from './ui.js';
import { Timer, Scoring, Storage, ErrorLogger, GoogleSheets } from './system.js';
import { Lab } from './lab.js';
import { initWorld, setInteractCallback, setUpdateCallback, setRenderingActive,
         getScene, getCamera, getInteractables } from './world.js';
import { createPlayer, updatePlayer, getPlayerPosition, setInputEnabled, playInteractAnimation } from './player.js';
import { Audio } from './audio.js';

const PHASE_LABELS = {
  IDENTIFICATION: 'YEM TANIMA',
  FEATURE: 'YEM ÖZELLİĞİ',
  IMAGE_MATCHING: 'GÖRSEL EŞLEŞTİRME',
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
    this.imageMatchingFeeds = getRandomImageFeeds(5, this.feed);

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
      { src: getFeedPhoto(this.feed), photo: true }
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
      }
    );
  },

  // ------------------------------------------------------- 3. Görsel eşleştirme
  runImageMatching() {
    UI.showImageMatching(this.imageMatchingFeeds, (correct, wrongTries) => {
      const raw = correct * POINTS.matchingPerItem;
      const penalty = Math.min(wrongTries, 4, raw);
      Scoring.add('Görsel Eşleştirme', raw - penalty, POINTS.matchingMax);
      if (wrongTries) ErrorLogger.log('Görsel Eşleştirme', `${wrongTries} yanlış deneme.`);
      this.setPhase('GROUPING');
    });
  },

  // ------------------------------------------------------- 4. Gruplandırma
  runGrouping() {
    UI.showGrouping(this.groupingFeeds, (correct, wrongTries) => {
      const raw = correct * POINTS.groupingPerItem;
      const penalty = Math.min(wrongTries, 5, raw);
      Scoring.add('Gruplandırma', raw - penalty, POINTS.groupingMax);
      if (wrongTries) ErrorLogger.log('Gruplandırma', `${wrongTries} yanlış deneme.`);
      this.setPhase('LAB');
    });
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
    UI.toast('Laboratuvardasınız. W A S D ile hareket, E ile cihazı kullanın.', 'info', 5000);
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

    const errors = ErrorLogger.errors.length
      ? `<details class="err-list"><summary>${ErrorLogger.errors.length} hata kaydı</summary>
         <ul>${ErrorLogger.errors.map(e =>
           `<li><b>${e.phase}:</b> ${e.message}</li>`).join('')}</ul></details>`
      : '<p class="ok">Hata kaydı yok.</p>';

    const html = `
      <p class="final-meta">
        <b>${this.student.ad} ${this.student.soyad}</b> — ${this.student.ogr}<br>
        Numune: <b>${this.feed.name}</b> (${this.feed.mainGroup})<br>
        Süre: ${Timer.format(elapsed)} · Bitiş: ${reason}
      </p>
      <div class="score-rows">${rows}</div>
      <h4>TOPLAM PUAN: ${total} / 100</h4>
      ${errors}`;

    const payload = {
      ad: this.student.ad,
      soyad: this.student.soyad,
      ogrenciNo: this.student.ogr,
      yem: this.feed.name,
      grup: this.feed.mainGroup,
      puan: total,
      detay: Scoring.details,
      hatalar: ErrorLogger.errors,
      sureSaniye: elapsed,
      bitis: reason,
      tarih: new Date().toISOString()
    };

    const copyText =
      `${this.student.ad} ${this.student.soyad} (${this.student.ogr})\n` +
      `Numune: ${this.feed.name}\n` +
      Scoring.details.map(d => `${d.label}: ${d.points}/${d.max}`).join('\n') +
      `\nTOPLAM: ${total}/100\nSüre: ${Timer.format(elapsed)}`;

    Audio.stopLoop('music');
    UI.showFinal(html, copyText);
    Storage.save({ sonuc: payload });
    GoogleSheets.send(payload);
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
