// ui.js — Arayüz katmanı: sorular, sürükle-bırak, envanter, cihaz pencereleri
import { getFeedPhoto, shuffle } from './feeds.js';
import { TEST_MODE } from './system.js';
import { Audio } from './audio.js';

const $ = id => document.getElementById(id);

/* ------------------------------------------------------------------ *
 * Sürükle-bırak yardımcısı
 * HTML5 drag&drop dokunmatik cihazlarda çalışmadığı için Pointer Events
 * kullanılır. Hem sürükleme hem "önce kaynağa, sonra hedefe dokun"
 * yöntemi desteklenir; böylece telefon ve masaüstü aynı kodu paylaşır.
 * ------------------------------------------------------------------ */
const DnD = {
  ghost: null,
  active: null,      // sürüklenen kaynak
  selected: null,    // dokunarak seçilmiş kaynak
  moved: false,
  targets: [],

  reset() {
    this._removeGhost();
    this.active = null;
    this.moved = false;
    if (this.selected) this.selected.el.classList.remove('picked');
    this.selected = null;
    this.targets.forEach(t => t.el.classList.remove('drag-over'));
    this.targets = [];
  },

  _removeGhost() {
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
  },

  makeSource(el, payload) {
    el.classList.add('dnd-source');
    el.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      this.active = { el, payload, startX: e.clientX, startY: e.clientY };
      this.moved = false;
    });
  },

  makeTarget(el, accept) {
    el.classList.add('dnd-target');
    this.targets.push({ el, accept });
    el.addEventListener('pointerup', () => {
      // Dokunarak seçim yöntemi: seçili kart varsa buraya bırak.
      if (this.selected && !this.moved) {
        const sel = this.selected;
        sel.el.classList.remove('picked');
        this.selected = null;
        accept(sel.payload, sel.el);
      }
    });
  },

  init() {
    if (this._bound) return;
    this._bound = true;

    window.addEventListener('pointermove', e => {
      if (!this.active) return;
      const dx = e.clientX - this.active.startX;
      const dy = e.clientY - this.active.startY;
      if (!this.moved && Math.hypot(dx, dy) < 7) return;

      if (!this.moved) {
        this.moved = true;
        this.active.el.classList.add('dragging');
        this.ghost = this.active.el.cloneNode(true);
        this.ghost.classList.add('dnd-ghost');
        this.ghost.classList.remove('dragging', 'picked');
        this.ghost.style.width = this.active.el.offsetWidth + 'px';
        document.body.appendChild(this.ghost);
      }
      this.ghost.style.left = e.clientX + 'px';
      this.ghost.style.top = e.clientY + 'px';

      const over = this._targetAt(e.clientX, e.clientY);
      this.targets.forEach(t => t.el.classList.toggle('drag-over', t === over));
    });

    window.addEventListener('pointerup', e => {
      if (!this.active) return;
      const src = this.active;
      const moved = this.moved;
      this._removeGhost();
      src.el.classList.remove('dragging');
      this.active = null;
      this.moved = false;
      this.targets.forEach(t => t.el.classList.remove('drag-over'));

      if (moved) {
        const t = this._targetAt(e.clientX, e.clientY);
        if (t) t.accept(src.payload, src.el);
      } else {
        // Tıklama/dokunma: kartı seç ya da seçimi kaldır.
        if (this.selected === src || (this.selected && this.selected.el === src.el)) {
          src.el.classList.remove('picked');
          this.selected = null;
        } else {
          if (this.selected) this.selected.el.classList.remove('picked');
          src.el.classList.add('picked');
          this.selected = src;
          Audio.play('select');
        }
      }
    });

    window.addEventListener('pointercancel', () => {
      this._removeGhost();
      if (this.active) this.active.el.classList.remove('dragging');
      this.active = null;
      this.moved = false;
    });
  },

  _targetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return this.targets.find(t => t.el === el || t.el.contains(el)) || null;
  }
};

/* ------------------------------------------------------------------ */

export const UI = {
  inventory: [],
  inventoryActions: {},
  _tasks: [],

  // ---------------------------------------------------------- Giriş
  initLogin(onStart) {
    DnD.init();
    const btn = $('btn-start');
    const chk = $('chk-consent');
    const err = $('login-error');

    chk.addEventListener('change', () => { btn.disabled = !chk.checked; });

    $('btn-eq-close').addEventListener('click', () => this.closeEquipment());
    $('btn-notebook-close').addEventListener('click', () => this.closeNotebook());
    $('btn-notebook').addEventListener('click', () => this.showNotebook());
    $('btn-guide').addEventListener('click', () => this.showGuide());
    $('btn-guide-close').addEventListener('click', () => this.closeGuide());
    $('btn-cancel-result').addEventListener('click', () => this._closeResult());
    $('btn-restart').addEventListener('click', () => location.reload());

    const sndBtn = $('btn-sound');
    sndBtn.addEventListener('click', () => {
      const muted = Audio.toggleMute();
      sndBtn.textContent = muted ? '♪̸' : '♪';
      sndBtn.classList.toggle('muted', muted);
      sndBtn.setAttribute('aria-pressed', String(!muted));
    });

    $('btn-task-toggle').addEventListener('click', () => {
      const p = $('task-panel');
      p.classList.toggle('collapsed');
      $('btn-task-toggle').textContent = p.classList.contains('collapsed') ? '+' : '−';
    });

    // Enter ile giriş
    ['inp-ad', 'inp-soyad', 'inp-ogrno'].forEach(id => {
      $(id).addEventListener('keydown', e => {
        if (e.key === 'Enter' && !btn.disabled) btn.click();
      });
    });

    btn.addEventListener('click', async () => {
      const ad = $('inp-ad').value.trim();
      const soyad = $('inp-soyad').value.trim();
      const ogr = $('inp-ogrno').value.trim();
      if (!ad || !soyad) { err.textContent = 'Ad ve soyad zorunludur.'; return; }
      if (!/^\d{9}$/.test(ogr) || ogr.slice(2, 7) !== '14030') {
        err.textContent = 'Öğrenci numarası 9 haneli olmalı ve 3–7. karakterleri 14030 olmalıdır.';
        return;
      }
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'YÜKLENİYOR…';
      await Audio.init();                       // sesler ilk tıklamada açılır
      Audio.play('success');
      onStart({ ad, soyad, ogr });
    });
  },

  showGameUI() {
    $('screen-login').classList.remove('active');
    $('game-ui').classList.add('active');
  },

  setHUD(phaseLabel, score) {
    $('hud-phase').textContent = 'AŞAMA: ' + phaseLabel;
    $('hud-score').textContent = 'PUAN: ' + score;
  },

  setTimer(text, warn = false, danger = false) {
    const el = $('hud-timer');
    el.textContent = text;
    el.classList.toggle('warn', warn && !danger);
    el.classList.toggle('danger', danger);
  },

  /** Herhangi bir pencere açık mı? Açıksa karakter hareketi durdurulur. */
  isModalOpen() {
    return !!document.querySelector('#game-ui .modal.active, #screen-grouping.active');
  },

  // ---------------------------------------------------------- Bildirim
  toast(message, kind = 'info', ms = 2600) {
    const el = document.createElement('div');
    el.className = 'toast toast-' + kind;
    el.textContent = message;
    $('toast-area').appendChild(el);
    setTimeout(() => el.classList.add('out'), ms - 400);
    setTimeout(() => el.remove(), ms);
  },

  // ------------------------------------------------------- Test modu
  /**
   * Test modunda soruların altına "GEÇ" düğmelerini ekler.
   * `onSkip` tek soruyu, `onSkipAll` kalan bütün soruları atlar.
   * TEST_MODE kapalıyken hiçbir şey eklemez.
   */
  addSkipButtons(container, onSkip, onSkipAll) {
    if (!TEST_MODE || !onSkip) return;

    const bar = document.createElement('div');
    bar.className = 'skip-bar';
    bar.innerHTML = '<span>test modu</span>';

    const tek = document.createElement('button');
    tek.className = 'btn-skip';
    tek.textContent = 'BU SORUYU GEÇ';
    tek.onclick = () => onSkip();
    bar.appendChild(tek);

    if (onSkipAll) {
      const hepsi = document.createElement('button');
      hepsi.className = 'btn-skip';
      hepsi.textContent = 'TÜM SORULARI GEÇ';
      hepsi.onclick = () => onSkipAll();
      bar.appendChild(hepsi);
    }
    container.appendChild(bar);
  },

  // ---------------------------------------------------------- Sorular
  /**
   * `image` = { src, photo } — photo:true ise gerçek fotoğraf olarak
   * (pikselleştirmeden) gösterilir.
   */
  showQuestion(title, text, options, onAnswer, image = null, skip = null) {
    $('q-title').textContent = title;
    $('q-text').textContent = text;

    const old = $('q-feed-image');
    if (old) old.remove();

    if (image && image.src) {
      const img = document.createElement('img');
      img.id = 'q-feed-image';
      img.className = 'question-feed-image';
      img.alt = 'Yem numunesi';
      img.src = image.src;
      img.onerror = () => {
        img.classList.add('image-error');
        img.alt = 'Yem görseli bulunamadı: ' + image.src;
      };
      $('q-text').before(img);
    }

    const box = $('q-options');
    box.className = 'options';
    box.innerHTML = '';
    let answered = false;
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.textContent = opt;
      b.onclick = () => {
        if (answered) return;                 // çift tıklamada iki kez puanlama olmasın
        answered = true;
        Audio.play('click');
        this.closeQuestion();
        onAnswer(i);
      };
      box.appendChild(b);
    });

    if (skip) {
      this.addSkipButtons(box,
        () => { if (answered) return; answered = true; this.closeQuestion(); skip.one(); },
        skip.all && (() => { if (answered) return; answered = true; this.closeQuestion(); skip.all(); }));
    }

    $('modal-question').classList.remove('hidden');
    $('modal-question').classList.add('active');
    Audio.play('question');
  },

  /** Görsel eşleştirme: PNG kartlarını doğru yem adına taşı. */
  showImageMatching(feeds, onDone, skip = null) {
    DnD.reset();
    const modal = $('modal-question');
    $('q-title').textContent = '3. YEM FOTOĞRAFI EŞLEŞTİRME';
    $('q-text').textContent =
      'Yem fotoğraflarını doğru yem adına taşıyın. Kartı sürükleyebilir ya da ' +
      'önce karta, sonra ada dokunabilirsiniz. Her doğru eşleşme 2 puandır.';

    const old = $('q-feed-image');
    if (old) old.remove();

    const box = $('q-options');
    box.className = 'image-match-game';
    box.innerHTML = '';

    const images = document.createElement('div');
    images.className = 'match-images';
    const names = document.createElement('div');
    names.className = 'match-names';

    let correct = 0;
    let wrongTries = 0;

    shuffle(feeds).forEach(feed => {
      const card = document.createElement('div');
      card.className = 'match-image-card';
      card.dataset.feedId = feed.id;
      card.innerHTML = `<img src="${getFeedPhoto(feed)}" alt="Yem fotoğrafı"><span>Taşı</span>`;
      DnD.makeSource(card, feed.id);
      images.appendChild(card);
    });

    shuffle(feeds).forEach(feed => {
      const zone = document.createElement('div');
      zone.className = 'match-name-zone';
      zone.dataset.feedId = feed.id;
      zone.innerHTML = `<span>${feed.name}</span><small>fotoğrafı buraya bırak</small>`;
      DnD.makeTarget(zone, (feedId, cardEl) => {
        if (zone.dataset.locked === 'true') return;
        if (String(feedId) === zone.dataset.feedId) {
          zone.dataset.locked = 'true';
          zone.classList.add('correct');
          zone.innerHTML =
            `<img src="${getFeedPhoto(feed)}" alt=""><span>${feed.name} ✓</span>`;
          cardEl.remove();
          correct++;
          Audio.play('correct');
        } else {
          wrongTries++;
          zone.classList.add('wrong');
          setTimeout(() => zone.classList.remove('wrong'), 380);
          Audio.play('wrong');
        }
      });
      names.appendChild(zone);
    });

    box.appendChild(images);
    box.appendChild(names);

    const done = document.createElement('button');
    done.className = 'btn-primary match-done';
    done.textContent = 'EŞLEŞTİRMEYİ BİTİR';
    done.onclick = () => {
      Audio.play('click');
      DnD.reset();
      this.closeQuestion();
      box.className = 'options';
      onDone(correct, wrongTries);
    };
    box.appendChild(done);

    if (skip) {
      // innerHTML de temizlenir; yoksa atlanan eşleştirmenin "GEÇ" çubuğu
      // gizli pencerede asılı kalır.
      const bitir = () => {
        DnD.reset();
        this.closeQuestion();
        box.className = 'options';
        box.innerHTML = '';
      };
      this.addSkipButtons(box,
        () => { bitir(); skip.one(); },
        skip.all && (() => { bitir(); skip.all(); }));
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
    Audio.play('question');
  },

  closeQuestion() {
    $('modal-question').classList.remove('active');
    $('modal-question').classList.add('hidden');
  },

  // ---------------------------------------------------------- Gruplandırma
  showGrouping(feeds, onDone, skip = null) {
    DnD.reset();
    const source = $('feed-cards');
    source.innerHTML = '';

    let correct = 0;
    let wrongTries = 0;

    feeds.forEach(f => {
      const card = document.createElement('div');
      card.className = 'feed-card';
      card.textContent = f.name;
      card.dataset.group = f.mainGroup;
      DnD.makeSource(card, f.mainGroup);
      source.appendChild(card);
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.innerHTML = '<span>' + zone.dataset.group + '</span>';
      zone.classList.remove('correct', 'wrong');
      DnD.makeTarget(zone, (group, cardEl) => {
        if (cardEl.classList.contains('placed')) return;
        if (zone.dataset.group === group) {
          cardEl.classList.add('placed');
          zone.appendChild(cardEl);
          correct++;
          Audio.play('correct');
        } else {
          wrongTries++;
          zone.classList.add('wrong');
          setTimeout(() => zone.classList.remove('wrong'), 380);
          Audio.play('wrong');
        }
      });
    });

    $('screen-grouping').classList.remove('hidden');
    $('screen-grouping').classList.add('active');

    const kapat = () => {
      DnD.reset();
      $('screen-grouping').classList.remove('active');
      $('screen-grouping').classList.add('hidden');
    };

    $('btn-group-done').onclick = () => {
      Audio.play('click');
      kapat();
      onDone(correct, wrongTries);
    };

    const eskiBar = document.querySelector('#screen-grouping .skip-bar');
    if (eskiBar) eskiBar.remove();
    if (skip) {
      this.addSkipButtons($('btn-group-done').parentElement,
        () => { kapat(); skip.one(); },
        skip.all && (() => { kapat(); skip.all(); }));
    }
  },

  // ---------------------------------------------------------- Cihaz penceresi
  showEquipment(title, htmlContent, onClose) {
    $('eq-title').textContent = title;
    $('eq-body').innerHTML = htmlContent;
    $('modal-equipment').classList.remove('hidden');
    $('modal-equipment').classList.add('active');
    this._eqClose = onClose;
    Audio.play('open');
  },

  /**
   * Oyun içi onay penceresi. Yerleşik window.confirm bazı mobil
   * tarayıcılarda engellendiği ve tam ekran oyunla uyumsuz durduğu için
   * cihaz penceresi yeniden kullanılır.
   */
  confirm(title, message, onYes, yesLabel = 'EVET, BİTİR') {
    this.showEquipment(title, `
      <p>${message}</p>
      <button id="btn-confirm-yes" class="btn-primary">${yesLabel}</button>
      <button id="btn-confirm-no" class="btn-secondary">VAZGEÇ</button>
    `);
    $('btn-confirm-yes').onclick = () => {
      this._eqClose = null;
      this.closeEquipment();
      onYes();
    };
    $('btn-confirm-no').onclick = () => this.closeEquipment();
  },

  closeEquipment() {
    if (!$('modal-equipment').classList.contains('active')) return;
    $('modal-equipment').classList.remove('active');
    $('modal-equipment').classList.add('hidden');
    Audio.play('close');
    const cb = this._eqClose;
    this._eqClose = null;
    if (cb) cb();
  },

  // ---------------------------------------------------------- Envanter
  setInventoryAction(name, handler) {
    this.inventoryActions[name] = handler;
    this.renderInventory();
  },

  addItem(name, meta = {}) {
    if (this.hasItem(name)) return false;
    this.inventory.push({ name, meta });
    this.renderInventory();
    return true;
  },

  removeItem(name) {
    this.inventory = this.inventory.filter(i => i.name !== name);
    this.renderInventory();
  },

  hasItem(name) {
    return this.inventory.some(i => i.name === name);
  },

  getItem(name) {
    return this.inventory.find(i => i.name === name) || null;
  },

  renderInventory() {
    const box = $('inv-slots');
    box.innerHTML = '';
    if (!this.inventory.length) {
      const d = document.createElement('div');
      d.className = 'inv-empty';
      d.textContent = 'Boş — Malzeme Dolabı\'ndan malzeme alın';
      box.appendChild(d);
      return;
    }
    this.inventory.forEach(it => {
      const d = document.createElement('div');
      d.className = 'inv-item';
      d.textContent = it.name;
      d.title = it.name;

      if (it.meta?.required === false) {
        d.classList.add('wrong-item');
        d.title = `${it.name} — bu analiz için gereksiz (-${it.meta.penalty || 0} puan)`;
      }

      const action = this.inventoryActions[it.name];
      if (action) {
        d.classList.add('usable');
        d.title = `${it.name} — kullanmak için tıklayın`;
        d.addEventListener('click', () => { Audio.play('click'); action(); });
      }
      box.appendChild(d);
    });
  },

  // ---------------------------------------------------------- Görev listesi
  setTasks(tasks) {
    this._tasks = tasks;
    $('task-panel').classList.remove('hidden');
    this.renderTasks();
  },

  renderTasks() {
    const list = $('task-list');
    list.innerHTML = '';
    this._tasks.forEach(t => {
      const li = document.createElement('li');
      li.className = t.done ? 'task done' : (t.active ? 'task active' : 'task');
      li.innerHTML = `<span class="tick">${t.done ? '✓' : '○'}</span><span>${t.label}</span>`;
      list.appendChild(li);
    });
  },

  showFinishButton(show) {
    $('btn-finish').classList.toggle('hidden', !show);
  },

  /** Laboratuvar aşamasına girildiğini işaretler (dokunmatik kontroller vb.). */
  setLabMode(on) {
    $('game-ui').classList.toggle('in-lab', on);
    // Envanter çubuğu yalnızca laboratuvarda anlamlı; soru aşamalarında
    // ekranın altını boşuna kaplamasın.
    $('inventory-bar').classList.toggle('hidden', !on);
  },

  setInteractPrompt(text) {
    const el = $('interact-prompt');
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.classList.remove('hidden');
  },

  // ---------------------------------------------------------- Rehber
  /**
   * Laboratuvar sorumlusunun tanıtım penceresi. Kontrolleri ve kabaca ne
   * yapılacağını söyler; **nasıl yapılacağını** bilerek anlatmaz — sıcaklık,
   * süre, elek çapı ve işlem sırası öğrencinin bilmesi gereken şeylerdir.
   * Laboratuvara girilince bir kez kendiliğinden açılır, sonra HUD'daki
   * REHBER düğmesiyle istenildiği kadar tekrar açılabilir.
   */
  showGuide() {
    $('btn-guide').classList.remove('hidden');
    $('modal-guide').classList.remove('hidden');
    $('modal-guide').classList.add('active');
    Audio.play('open');
  },

  closeGuide() {
    const m = $('modal-guide');
    if (!m.classList.contains('active')) return;
    m.classList.remove('active');
    m.classList.add('hidden');
    Audio.play('close');
  },

  // ---------------------------------------------------------- Defter
  showNotebook(html) {
    if (html !== undefined) this._notebookHtml = html;
    $('notebook-body').innerHTML = this._notebookHtml || '<p>Defter henüz boş.</p>';
    $('modal-notebook').classList.remove('hidden');
    $('modal-notebook').classList.add('active');
    Audio.play('open');
  },

  closeNotebook() {
    const m = $('modal-notebook');
    if (!m.classList.contains('active')) return;
    m.classList.remove('active');
    m.classList.add('hidden');
    Audio.play('close');
  },

  setNotebook(html) {
    this._notebookHtml = html;
    $('btn-notebook').classList.remove('hidden');
    if ($('modal-notebook').classList.contains('active')) {
      $('notebook-body').innerHTML = html;
    }
  },

  // ---------------------------------------------------------- Sonuç girişi
  askResult({ label, formula, dataHtml, onSubmit }) {
    $('res-label').textContent = label;
    $('res-formula').innerHTML = formula || '';
    $('res-data').innerHTML = dataHtml || '';
    $('res-error').textContent = '';
    $('inp-result').value = '';
    $('modal-result').classList.remove('hidden');
    $('modal-result').classList.add('active');
    setTimeout(() => $('inp-result').focus(), 50);

    const submit = () => {
      const raw = $('inp-result').value.replace(',', '.');
      const val = parseFloat(raw);
      if (!isFinite(val)) {
        $('res-error').textContent = 'Geçerli bir sayı girin.';
        Audio.play('wrong');
        return;
      }
      this._closeResult();
      onSubmit(val);
    };

    $('btn-submit-result').onclick = submit;
    $('inp-result').onkeydown = e => { if (e.key === 'Enter') submit(); };
  },

  _closeResult() {
    $('modal-result').classList.remove('active');
    $('modal-result').classList.add('hidden');
    $('inp-result').onkeydown = null;
  },

  /**
   * Yem tanıma sorusundaki fotoğrafların künyesi. CC BY / CC BY-SA
   * lisansları eser sahibinin belirtilmesini gerektirir; künye sonuç
   * ekranında gösterilir (soru sırasında gösterilseydi cevabı ele verirdi).
   */
  async renderPhotoCredits() {
    const box = $('photo-credits');
    if (!box || box.dataset.loaded) return;
    try {
      const res = await fetch('assets/feeds_photo/kunye.json');
      const data = await res.json();
      const rows = Object.values(data).map(c =>
        `<li><a href="${c.page}" target="_blank" rel="noopener">${c.title}</a>
         — ${c.author} (${c.license})</li>`).join('');
      box.innerHTML = `
        <details class="err-list">
          <summary>Fotoğraf kaynakları (${Object.keys(data).length} görsel)</summary>
          <p class="hint">Yem tanıma sorusundaki fotoğraflar Wikimedia Commons'tan
          alınmıştır. Ses efektleri: Kenney — Interface Sounds (CC0 1.0).</p>
          <ul>${rows}</ul>
        </details>`;
      box.dataset.loaded = '1';
    } catch (e) {
      box.innerHTML = '';
    }
  },

  // ---------------------------------------------------------- Sonuç ekranı
  showFinal(html, copyText) {
    $('game-ui').classList.remove('active');
    $('screen-final').classList.add('active');
    $('final-details').innerHTML = html;

    const btn = $('btn-copy-result');
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        btn.textContent = 'KOPYALANDI ✓';
      } catch (e) {
        btn.textContent = 'KOPYALANAMADI';
      }
      setTimeout(() => { btn.textContent = 'SONUÇ ÖZETİNİ KOPYALA'; }, 2200);
    };
    this.setSendStatus({ state: 'idle' });
    this.renderPhotoCredits();
    Audio.stopLoop('ambience');
    Audio.play('success');
  },

  /**
   * Sonuç ekranındaki "öğretmene iletim" satırı.
   * Durum dürüstçe yazılır: doğrulanamayan gönderim başarılı gibi
   * gösterilmez, başarısızlıkta tekrar deneme düğmesi çıkar.
   */
  setSendStatus({ state, detail = '', onRetry = null }) {
    const box = $('send-status');
    if (!box) return;
    const texts = {
      idle:       ['', ''],
      sending:    ['wait', 'Sonuç öğretim elemanına gönderiliyor…'],
      sent:       ['ok', '✓ Sonucunuz öğretim elemanına iletildi.'],
      unverified: ['warn', '⚠ Sonuç gönderildi, ancak tarayıcı iletimi doğrulayamadı. ' +
                           'Özeti kopyalayıp öğretim elemanınıza da iletin.'],
      off:        ['warn', 'Otomatik iletim tanımlı değil. Sonuç özetini kopyalayıp ' +
                           'öğretim elemanınıza gönderin.'],
      fail:       ['err', 'Sonuç gönderilemedi. İnternet bağlantınızı kontrol edip ' +
                          'tekrar deneyin veya özeti kopyalayıp iletin.']
    };
    const [cls, msg] = texts[state] || texts.idle;
    box.className = 'send-status ' + cls;
    if (!msg) { box.innerHTML = ''; return; }
    box.innerHTML = `<span>${msg}${detail ? ` <i class="dim">(${detail})</i>` : ''}</span>`;
    if (onRetry) {
      const btn = document.createElement('button');
      btn.className = 'btn-secondary btn-retry';
      btn.textContent = 'TEKRAR GÖNDER';
      btn.onclick = () => onRetry();
      box.appendChild(btn);
    }
  }
};
