// lab.js — Laboratuvar analiz mantığı
// Üç Weende analizi eksiksiz bir iş akışı olarak yürütülür:
//   Kuru Madde  → 105 °C etüv, desikatörde soğutma, tartım
//   Ham Kül     → 550 °C kül fırını, desikatörde soğutma, tartım
//   Ham Yağ     → Soxhlet düzeneği, hekzan, balon ısıtıcı, tartım
// Terazi gerçekçi tartım değerleri üretir; öğrenci sonucu kendisi hesaplar.
import { UI } from './ui.js';
import { ErrorLogger, Scoring } from './system.js';
import { Audio } from './audio.js';
import { setEquipmentTexture } from './world.js';

const rand = (min, max) => Math.random() * (max - min) + min;
/** Analitik terazi 0,0001 g duyarlıdır; ekranda Türkçe ondalık ayracıyla gösterilir. */
const g4 = v => Number(v.toFixed(4));
const fmt = v => v.toFixed(4).replace('.', ',');
const fmt2 = v => v.toFixed(2).replace('.', ',');

const REQUIRED_ITEMS = [
  ['Yem Numunesi', 'sample'],
  ['Nem Tayini Kabı', 'moisture-dish'],
  ['Porselen Kroze', 'crucible'],
  ['Kroze Maşası', 'crucible-tongs'],
  ['Soxhlet Cam Seti', 'soxhlet-glass'],
  ['Ekstraksiyon Kartuşu', 'extraction-thimble'],
  ['Ekstraksiyon Balonu', 'extraction-flask'],
  ['Hekzan', 'hexane']
];

const DISTRACTOR_ITEMS = [
  ['Erlenmayer', 'erlenmeyer'],
  ['Beher', 'beaker'],
  ['Büchner Hunisi', 'buchner'],
  ['Cam Baget', 'glass-rod'],
  ['Pipet', 'pipette'],
  ['Kjeldahl Balonu', 'kjeldahl-flask'],
  ['pH Metre Probu', 'ph-probe'],
  ['Mezür', 'graduated-cylinder'],
  ['Filtre Kağıdı', 'filter-paper']
];

const MAX_ITEM_PENALTY = 10;
/** İşlem sırasındaki her hata 1 puan düşürür; toplam kesinti bu değerle sınırlıdır. */
const MAX_MISTAKE_PENALTY = 10;

/** Fisher-Yates karıştırma. */
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cihaz pencerelerinde gösterilen açıklayıcı fotoğraflar.
 * Dosya bulunamazsa `onerror` ile kendi çerçevesini kaldırır; böylece
 * görsel eklenmemişse pencere bozulmadan çalışmaya devam eder.
 */
const EQUIP_IMG_PATH = 'assets/equipment/';

function illus(file, caption) {
  return `
    <figure class="eq-figure">
      <img src="${EQUIP_IMG_PATH}${file}" alt="${caption}" loading="lazy"
           onerror="this.closest('.eq-figure').remove()">
      <figcaption>${caption}</figcaption>
    </figure>`;
}

/** Birden çok fotoğrafı yan yana dizer. */
function gallery(...figures) {
  return `<div class="eq-gallery">${figures.join('')}</div>`;
}

const ANALYSES = {
  dm: {
    key: 'dm',
    name: 'Kuru Madde',
    resultLabel: 'Kuru Madde (%)',
    vessel: 'Nem Tayini Kabı',
    device: 'kurutma',
    deviceName: 'Kurutma Dolabı',
    temp: 105, tempTol: 0,
    hours: 4, hoursTol: 0,
    points: { temp: 3, time: 3, cool: 2, result: 12 },
    max: 20,
    formula: 'Kuru Madde (%) = (m<sub>3</sub> − m<sub>1</sub>) / (m<sub>2</sub> − m<sub>1</sub>) × 100',
    legend: 'm<sub>1</sub>: boş kap · m<sub>2</sub>: kap + numune · m<sub>3</sub>: kurutma sonrası kap + numune'
  },
  ash: {
    key: 'ash',
    name: 'Ham Kül',
    resultLabel: 'Ham Kül (%, kuru maddede)',
    vessel: 'Porselen Kroze',
    device: 'kulFirini',
    deviceName: 'Kül Fırını',
    temp: 550, tempTol: 25,
    hours: 4, hoursTol: 0,
    needsDried: true,
    points: { temp: 2, time: 2, cool: 2, result: 9 },
    max: 15,
    formula: 'Ham Kül (%) = (m<sub>3</sub> − m<sub>1</sub>) / (m<sub>2</sub> − m<sub>1</sub>) × 100',
    legend: 'm<sub>1</sub>: boş kroze · m<sub>2</sub>: kroze + kuru numune · m<sub>3</sub>: yakma sonrası kroze + kül'
  },
  fat: {
    key: 'fat',
    name: 'Ham Yağ',
    resultLabel: 'Ham Yağ (%, kuru maddede)',
    vessel: 'Ekstraksiyon Balonu',
    device: 'balonIsitici',
    deviceName: 'Balon Isıtıcı',
    temp: 60, tempTol: 5,
    hours: 6, hoursTol: 0,
    needsDried: true,
    soxhlet: true,
    points: { temp: 2, time: 2, setup: 2, result: 9 },
    max: 15,
    formula: 'Ham Yağ (%) = (m<sub>3</sub> − m<sub>1</sub>) / m<sub>n</sub> × 100',
    legend: 'm<sub>1</sub>: boş balon · m<sub>n</sub>: kartuşa tartılan kuru numune · m<sub>3</sub>: ekstraksiyon sonrası balon + yağ'
  }
};

function newAnalysisState() {
  return {
    m1: null, m2: null, sampleMass: null, m3: null,
    processed: false, procTemp: null, procHours: null,
    cooled: false, setupOk: false,
    submitted: false, value: null, expected: null,
    scored: false, earned: 0
  };
}

export const Lab = {
  currentFeed: null,
  state: null,
  onChange: null,

  setup(feed) {
    this.currentFeed = feed;
    this.state = {
      ground: false,
      sieve: null,
      dried: false,
      itemPenalty: 0,
      mistakePenalty: 0,
      // Dolap içeriği oyun başında bir kez karıştırılır: gerekli malzemeler
      // hep başta listelenseydi doğru seçim kendiliğinden belli olurdu.
      // Sıra oyun boyunca sabit kalır ki dolap her açılışta değişmesin.
      cabinet: shuffled([
        ...REQUIRED_ITEMS.map(([n, id]) => [n, id, true]),
        ...DISTRACTOR_ITEMS.map(([n, id]) => [n, id, false])
      ]),
      dm: newAnalysisState(),
      ash: newAnalysisState(),
      fat: newAnalysisState()
    };
    // Soxhlet düzeneği artık envanterden değil, balon ısıtıcının başında kurulur.
    this.refresh();
  },

  refresh() {
    UI.setNotebook(this.notebookHtml());
    if (this.onChange) this.onChange();
  },

  /**
   * Analiz sırasında yapılan bir işlem hatasını kaydeder ve 1 puan düşürür.
   * Basamak puanlarının (sıcaklık, süre, soğutma) kaybına ek olarak uygulanır.
   */
  mistake(phase, message) {
    ErrorLogger.log(phase, message);
    if (this.state.mistakePenalty >= MAX_MISTAKE_PENALTY) {
      UI.toast(message, 'error', 3400);
      return;
    }
    this.state.mistakePenalty += 1;
    Scoring.add('İşlem hatası — ' + phase, -1, 0);
    UI.toast(message + ' (−1 puan)', 'error', 3600);
    Audio.play('wrong');
  },

  interact(type) {
    switch (type) {
      case 'dolap':        this.openCabinet(); break;
      case 'ogutucu':      this.useGrinder(); break;
      case 'terazi':       this.useScale(); break;
      case 'kurutma':      this.useOven(); break;
      case 'desikator':    this.useDesiccator(); break;
      case 'kulFirini':    this.useAshFurnace(); break;
      case 'balonIsitici': this.useHeater(); break;
    }
  },

  // =================================================== MALZEME DOLABI
  openCabinet() {
    const items = this.state.cabinet;

    const html = items.map(([name, id, required]) => {
      const owned = UI.hasItem(name);
      // Sinif adi gerekli/gereksiz ayrimini icermez; aksi hâlde ogrenci
      // sayfa kaynagindan dogru secimi okuyabilirdi.
      return `
      <div class="cabinet-item">
        <div class="cabinet-info"><strong>${name}</strong></div>
        <button class="cabinet-take" data-id="${id}" ${owned ? 'disabled' : ''}>
          ${owned ? 'ENVANTERDE' : 'AL'}
        </button>
      </div>`;
    }).join('');

    UI.showEquipment('Malzeme Dolabı', `
      <p class="cabinet-instruction"><strong>Analiz için gerekli malzemeleri seçin.</strong><br>
      Dolapta bu analizlerde kullanılmayan malzemeler de vardır. Gereksiz malzeme
      almak her seferinde <b>2 puan</b> kaybettirir (en çok ${MAX_ITEM_PENALTY} puan).</p>
      <div class="cabinet-list">${html}</div>
    `);

    document.querySelectorAll('.cabinet-take').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(x => x[1] === btn.dataset.id);
        if (!item) return;
        const [name, id, required] = item;
        if (UI.hasItem(name)) return;

        let penalty = 0;
        if (!required) {
          penalty = Math.min(2, MAX_ITEM_PENALTY - this.state.itemPenalty);
          this.state.itemPenalty += penalty;
          ErrorLogger.log('Malzeme Seçimi',
            `${name} bu analizler için gerekli değil.${penalty ? ` -${penalty} puan.` : ''}`);
          if (penalty) Scoring.add('Gereksiz malzeme: ' + name, -penalty, 0);
          Audio.play('wrong');
          UI.toast(`${name} bu analizlerde kullanılmaz.`, 'error');
        } else {
          Audio.play('pickup');
        }

        UI.addItem(name, { type: 'cabinet-item', cabinetId: id, required, penalty });
        btn.disabled = true;
        btn.textContent = 'ENVANTERDE';
        this.refresh();
      });
    });
  },

  // =================================================== ÖĞÜTÜCÜ
  useGrinder() {
    if (!UI.hasItem('Yem Numunesi')) {
      return UI.showEquipment('Öğütücü', `
        ${illus('ogutucu_bos.png', 'Öğütücü boş: kapak açık, öğütme haznesi görünüyor')}
        <p>Önce <strong>Malzeme Dolabı</strong>ndan <em>Yem Numunesi</em> almalısınız.</p>`);
    }
    if (this.state.ground) {
      return UI.showEquipment('Öğütücü', `
        ${illus('ogutucu_ogutulmus.png', 'Öğütme tamamlandı: un hâline gelen numune toplama kabında')}
        <p>Numune zaten öğütüldü. Elek çapı: <strong>${this.state.sieve} mm</strong>.</p>`);
    }

    UI.showEquipment('Öğütücü', `
      ${illus('ogutucu_dolu.png', 'Hazneye doldurulan yem numunesi')}
      <p>Numune, analiz öncesi homojen hâle gelecek şekilde öğütülür.
      Weende analizleri için uygun elek çapını seçin.</p>
      <div class="eq-row">
        <label for="grind-sieve">Elek çapı:</label>
        <select id="grind-sieve">
          <option value="1">1 mm</option>
          <option value="3">3 mm</option>
          <option value="5">5 mm</option>
        </select>
      </div>
      <button id="btn-grind" class="btn-primary">ÖĞÜT</button>
    `);

    document.getElementById('btn-grind').onclick = () => {
      const sieve = parseFloat(document.getElementById('grind-sieve').value);
      Audio.play('grind');
      Audio.runMachine(1400);
      this.state.sieve = sieve;
      this.state.ground = true;
      UI.removeItem('Yem Numunesi');
      UI.addItem('Öğütülmüş Numune', { ground: true, sieve });
      if (sieve !== 1) {
        this.mistake('Öğütme',
          `Elek çapı ${sieve} mm seçildi; yem analizlerinde 1 mm kullanılır.`);
      } else {
        UI.toast('Numune 1 mm elekten öğütüldü.', 'ok');
      }
      UI.closeEquipment();
      this.refresh();
    };
  },

  // =================================================== ANALİTİK TERAZİ
  /** Terazide o an yapılabilecek tartımları listeler. */
  scaleActions() {
    const st = this.state;
    const out = [];

    for (const key of ['dm', 'ash', 'fat']) {
      const def = ANALYSES[key];
      const a = st[key];
      const vesselOwned = UI.hasItem(def.vessel);
      const needDried = def.needsDried && !st.dried;

      if (a.m1 === null) {
        out.push({
          key, step: 'm1',
          label: `${def.name}: boş ${def.vessel.toLowerCase()} darası (m₁)`,
          disabled: !vesselOwned || needDried,
          reason: !vesselOwned
            ? `${def.vessel} envanterde yok.`
            : (needDried ? 'Önce kuru madde tayinini tamamlayıp kurutulmuş numune elde edin.' : '')
        });
        continue;
      }

      if (a.m2 === null && a.sampleMass === null) {
        const sampleItem = def.needsDried ? 'Kurutulmuş Numune' : 'Öğütülmüş Numune';
        const target = def.soxhlet ? 'Ekstraksiyon Kartuşu' : def.vessel.toLowerCase();
        out.push({
          key, step: 'm2',
          label: def.soxhlet
            ? `${def.name}: kartuşa numune tart (mₙ)`
            : `${def.name}: ${target} + numune (m₂)`,
          disabled: !UI.hasItem(sampleItem) || (def.soxhlet && !UI.hasItem('Ekstraksiyon Kartuşu')),
          reason: !UI.hasItem(sampleItem)
            ? `${sampleItem} envanterde yok.`
            : 'Ekstraksiyon Kartuşu envanterde yok.'
        });
        continue;
      }

      if (a.m3 === null) {
        out.push({
          key, step: 'm3',
          label: `${def.name}: işlem sonrası tartım (m₃)`,
          disabled: !a.processed,
          reason: `${def.deviceName} işlemi henüz yapılmadı.`
        });
        continue;
      }

      if (!a.submitted) {
        out.push({
          key, step: 'calc',
          label: `${def.name}: sonucu hesapla ve gir`,
          disabled: false, reason: ''
        });
      }
    }
    return out;
  },

  useScale() {
    const actions = this.scaleActions();

    const rows = actions.length ? actions.map((a, i) => `
      <div class="scale-action ${a.disabled ? 'off' : ''}">
        <div>
          <strong>${a.label}</strong>
          ${a.disabled ? `<span>${a.reason}</span>` : ''}
        </div>
        <button class="scale-run" data-i="${i}" ${a.disabled ? 'disabled' : ''}>
          ${a.step === 'calc' ? 'HESAPLA' : 'TART'}
        </button>
      </div>`).join('')
      : '<p>Tartılacak bir şey kalmadı. Tüm analizler tamamlandı.</p>';

    UI.showEquipment('Analitik Terazi (0,0001 g)', `
      <div class="eq-display" id="scale-display">0,0000 g</div>
      <p class="hint">Terazi her tartımda otomatik dara alır ve değeri
      <strong>Laboratuvar Defteri</strong>ne yazar.</p>
      <div class="scale-list">${rows}</div>
    `);

    document.querySelectorAll('.scale-run').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = actions[Number(btn.dataset.i)];
        if (a.step === 'calc') { UI.closeEquipment(); this.askResult(a.key); return; }
        this.weigh(a.key, a.step, btn);
      });
    });
  },

  weigh(key, step, btn) {
    const def = ANALYSES[key];
    const a = this.state[key];
    const ref = this.currentFeed.ref;
    let value;

    if (step === 'm1') {
      value = g4(key === 'fat' ? rand(95, 118) : (key === 'ash' ? rand(18, 27) : rand(24, 36)));
      a.m1 = value;
    } else if (step === 'm2') {
      const sample = g4(rand(1.9, 2.7));
      if (def.soxhlet) {
        a.sampleMass = sample;
        value = sample;
      } else {
        a.sampleMass = sample;
        a.m2 = g4(a.m1 + sample);
        value = a.m2;
      }
    } else {                                     // m3
      // Sıcak kap doğrudan tartılırsa tartım hatalı olur; desikatörde
      // soğutmayı atlamak bir işlem hatasıdır.
      if (def.points.cool && !a.cooled) {
        this.mistake(def.name,
          'Numune desikatörde soğutulmadan tartıldı.');
      }
      const net = def.soxhlet ? a.sampleMass : g4(a.m2 - a.m1);
      const pct = key === 'dm' ? ref.dryMatter : (key === 'ash' ? ref.ash : ref.fat);
      const residue = net * (pct / 100) * rand(0.985, 1.015);
      a.m3 = g4(a.m1 + residue);
      value = a.m3;
      // Beklenen cevap ekranda görünen (yuvarlanmış) değerlerden hesaplanır,
      // böylece doğru işlem yapan öğrencinin sonucu birebir tutar.
      a.expected = def.soxhlet
        ? (a.m3 - a.m1) / a.sampleMass * 100
        : (a.m3 - a.m1) / (a.m2 - a.m1) * 100;
    }

    Audio.play('beep');
    const disp = document.getElementById('scale-display');
    if (disp) disp.textContent = fmt(value) + ' g';
    if (btn) { btn.disabled = true; btn.textContent = 'TARTILDI'; }
    UI.toast(`${def.name}: ${fmt(value)} g deftere yazıldı.`, 'ok');
    this.refresh();

    if (step === 'm3') {
      setTimeout(() => { UI.closeEquipment(); this.askResult(key); }, 700);
    }
  },

  // =================================================== KURUTMA DOLABI
  useOven() {
    const a = this.state.dm;
    if (a.m2 === null) {
      return UI.showEquipment('Kurutma Dolabı',
        `<p>Etüve koymadan önce <strong>Analitik Terazi</strong>de nem tayini kabının
         darasını (m₁) ve kap + numune ağırlığını (m₂) belirleyin.</p>`);
    }
    if (a.processed) {
      // Sonraki adım söylenmez; sırayı öğrencinin bilmesi gerekir.
      return UI.showEquipment('Kurutma Dolabı',
        `<p>Numune ${a.procTemp} °C'de ${a.procHours} saat kurutuldu ve
         etüvden çıkarıldı.</p>`);
    }

    UI.showEquipment('Kurutma Dolabı', `
      <p>Kuru madde tayini için numune sabit ağırlığa gelene kadar etüvde kurutulur.
      <strong>Uygun sıcaklığı ve süreyi kendiniz belirleyip girin.</strong></p>
      <div class="eq-row"><label for="oven-temp">Sıcaklık (°C):</label>
        <input type="number" id="oven-temp" placeholder="?" autocomplete="off"></div>
      <div class="eq-row"><label for="oven-time">Süre (saat):</label>
        <input type="number" id="oven-time" placeholder="?" autocomplete="off"></div>
      <button id="btn-oven-start" class="btn-primary">BAŞLAT</button>
    `);

    document.getElementById('btn-oven-start').onclick = () => {
      const t = parseFloat(document.getElementById('oven-temp').value);
      const h = parseFloat(document.getElementById('oven-time').value);
      if (!isFinite(t) || !isFinite(h)) { UI.toast('Sıcaklık ve süre girin.', 'error'); return; }
      this.runProcess('dm', t, h);
    };
  },

  // =================================================== KÜL FIRINI
  useAshFurnace() {
    const a = this.state.ash;
    if (a.m2 === null) {
      return UI.showEquipment('Kül Fırını',
        `<p>Fırına koymadan önce <strong>Analitik Terazi</strong>de porselen krozenin
         darasını (m₁) ve kroze + kuru numune ağırlığını (m₂) belirleyin.</p>`);
    }
    if (a.processed) {
      return UI.showEquipment('Kül Fırını',
        `<p>Numune ${a.procTemp} °C'de ${a.procHours} saat yakıldı ve kroze
         maşasıyla fırından alındı.</p>`);
    }
    if (!UI.hasItem('Kroze Maşası')) {
      return UI.showEquipment('Kül Fırını',
        '<p>Sıcak krozeyi taşımak için <strong>Kroze Maşası</strong> gerekir. Malzeme Dolabı\'ndan alın.</p>');
    }

    UI.showEquipment('Kül Fırını', `
      ${gallery(
        illus('kul_firini_ic.png', 'Krozeler fırın içindeki refrakter rafa dizilir'),
        illus('porselen_kroze.png', 'Porselen kroze ve kapağı')
      )}
      <p>Ham kül tayininde organik madde yakılarak uzaklaştırılır; geriye
      mineral maddeler (kül) kalır.
      <strong>Uygun sıcaklığı ve süreyi kendiniz belirleyip girin.</strong></p>
      <div class="eq-row"><label for="ash-temp">Sıcaklık (°C):</label>
        <input type="number" id="ash-temp" placeholder="?" autocomplete="off"></div>
      <div class="eq-row"><label for="ash-time">Süre (saat):</label>
        <input type="number" id="ash-time" placeholder="?" autocomplete="off"></div>
      <button id="btn-ash-start" class="btn-primary">BAŞLAT</button>
    `);

    document.getElementById('btn-ash-start').onclick = () => {
      const t = parseFloat(document.getElementById('ash-temp').value);
      const h = parseFloat(document.getElementById('ash-time').value);
      if (!isFinite(t) || !isFinite(h)) { UI.toast('Sıcaklık ve süre girin.', 'error'); return; }
      this.runProcess('ash', t, h);
    };
  },

  // =================================================== SOXHLET + BALON ISITICI
  /**
   * Düzeneğin kurulmasına engel olan eksik varsa açıklamasını döndürür.
   * Kurulum yalnızca balon ısıtıcının başında yapılabildiği için bu kontrol
   * de oraya bağlıdır.
   */
  soxhletBlocker() {
    const a = this.state.fat;
    if (!UI.hasItem('Soxhlet Cam Seti')) {
      return `<p>Düzeneği kurmak için <strong>Soxhlet Cam Seti</strong> gerekir;
              Malzeme Dolabı'ndan alın.</p>`;
    }
    const missing = ['Ekstraksiyon Kartuşu', 'Ekstraksiyon Balonu', 'Hekzan']
      .filter(x => !UI.hasItem(x));
    if (missing.length) {
      return `<p>Düzeneği kurmak için şu malzemeler eksik:</p>
              <ul>${missing.map(x => `<li>${x}</li>`).join('')}</ul>`;
    }
    if (a.m1 === null || a.sampleMass === null) {
      return `<p>Düzeneği kurmadan önce <strong>Analitik Terazi</strong>de
              boş ekstraksiyon balonunun darası (m₁) ve kartuşa tartılan kuru
              numune (mₙ) belirlenmelidir.</p>`;
    }
    return null;
  },

  assembleSoxhlet() {
    UI.removeItem('Soxhlet Cam Seti');
    UI.addItem('Kurulu Soxhlet Düzeneği', { type: 'soxhlet-assembled' });
    this.state.fat.setupOk = true;
    // Sahnedeki balon ısıtıcı, kurulu düzenek görseliyle değişir.
    setEquipmentTexture('balonIsitici', 'soxhlet_duzenek.png', 2.1);
    Audio.play('glass');
    UI.toast('Soxhlet düzeneği balon ısıtıcının üzerine kuruldu.', 'ok', 3600);
    UI.closeEquipment();
    this.refresh();
  },

  useHeater() {
    const a = this.state.fat;

    // --- Düzenek henüz kurulmadıysa: kurulum burada yapılır ---
    if (!a.setupOk) {
      const blocker = this.soxhletBlocker();
      if (blocker) return UI.showEquipment('Balon Isıtıcı', blocker);

      UI.showEquipment('Balon Isıtıcı — Soxhlet Düzeneği', `
        ${gallery(
          illus('soxhlet_seti.png', 'Soxhlet cam seti: balon, ekstraksiyon haznesi, geri soğutucu'),
          illus('ekstraksiyon_kartusu.png', 'Selülozdan ekstraksiyon kartuşu')
        )}
        <p>Balon, ekstraksiyon haznesi ve geri soğutucu sırayla birleştirilip
        balon ısıtıcının üzerine oturtulur; çözücü olarak hekzan kullanılır.</p>
        <button id="btn-soxhlet-ok" class="btn-primary">DÜZENEĞİ KUR</button>
      `);
      document.getElementById('btn-soxhlet-ok').onclick = () => this.assembleSoxhlet();
      return;
    }

    if (a.processed) {
      return UI.showEquipment('Balon Isıtıcı',
        `<p>Ekstraksiyon ${a.procTemp} °C'de ${a.procHours} saat sürdü.
         Çözücü uçurulduktan sonra balonu terazide tartın (m₃).</p>`);
    }

    UI.showEquipment('Balon Isıtıcı', `
      <p><strong>Kurulu Soxhlet düzeneği</strong> balon ısıtıcıya bağlandı.
      Hekzanın kaynama noktası 69 °C'dir; ısıtma bunun biraz altında yapılır.</p>
      <div class="eq-row"><label for="heat-temp">Sıcaklık (°C):</label>
        <input type="number" id="heat-temp" value="60"></div>
      <div class="eq-row"><label for="heat-time">Süre (saat):</label>
        <input type="number" id="heat-time" value="6"></div>
      <button id="btn-heat-start" class="btn-primary">EKSTRAKSİYONU BAŞLAT</button>
    `);

    document.getElementById('btn-heat-start').onclick = () => {
      const t = parseFloat(document.getElementById('heat-temp').value);
      const h = parseFloat(document.getElementById('heat-time').value);
      if (!isFinite(t) || !isFinite(h)) { UI.toast('Sıcaklık ve süre girin.', 'error'); return; }
      this.runProcess('fat', t, h);
    };
  },

  // =================================================== DESİKATÖR
  useDesiccator() {
    const pending = ['dm', 'ash', 'fat']
      .filter(k => this.state[k].processed && !this.state[k].cooled && this.state[k].m3 === null);

    if (!pending.length) {
      return UI.showEquipment('Desikatör',
        `<p>Desikatörde soğutulmayı bekleyen numune yok.</p>
         <p>Sıcak kap doğrudan tartılırsa hava akımı ve nem alımı nedeniyle
         tartım hatalı olur; bu yüzden her yakma/kurutma sonrası desikatör kullanılır.</p>`);
    }

    const rows = pending.map(k => `
      <div class="scale-action">
        <div><strong>${ANALYSES[k].name} — ${ANALYSES[k].vessel}</strong></div>
        <button class="cool-run" data-k="${k}">30 dk SOĞUT</button>
      </div>`).join('');

    UI.showEquipment('Desikatör', `
      <p>Kurutulan ya da yakılan kaplar, tartımdan önce nem çekici madde içeren
      desikatörde oda sıcaklığına kadar soğutulur.</p>
      ${rows}
    `);

    document.querySelectorAll('.cool-run').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.k;
        this.state[k].cooled = true;
        Audio.play('glass');
        UI.toast(`${ANALYSES[k].name}: numune desikatörde soğutuldu.`, 'ok');
        UI.closeEquipment();
        this.refresh();
      });
    });
  },

  // =================================================== ORTAK İŞLEM
  runProcess(key, temp, hours) {
    const def = ANALYSES[key];
    const a = this.state[key];

    a.processed = true;
    a.procTemp = temp;
    a.procHours = hours;

    const tempOk = Math.abs(temp - def.temp) <= def.tempTol;
    const timeOk = Math.abs(hours - def.hours) <= def.hoursTol;

    Audio.runMachine(2000);
    UI.closeEquipment();
    UI.toast(`${def.deviceName}: ${temp} °C / ${hours} saat işlem tamamlandı.`,
      tempOk && timeOk ? 'ok' : 'error');

    if (!tempOk) this.mistake(def.name,
      `Yanlış sıcaklık: ${temp} °C (olması gereken ${def.temp} °C).`);
    if (!timeOk) this.mistake(def.name,
      `Yanlış süre: ${hours} saat (olması gereken ${def.hours} saat).`);

    // Kuru madde tayini biten numune, kül ve yağ analizlerinin başlangıç maddesidir.
    if (key === 'dm' && !this.state.dried) {
      this.state.dried = true;
      UI.addItem('Kurutulmuş Numune', { dried: true });
      UI.toast('Kurutulmuş numune elde edildi; ham kül ve ham yağ analizleri açıldı.', 'ok');
    }
    this.refresh();
  },

  // =================================================== SONUÇ GİRİŞİ
  askResult(key) {
    const def = ANALYSES[key];
    const a = this.state[key];
    if (a.m3 === null) {
      UI.toast('Önce işlem sonrası tartımı (m₃) yapın.', 'error');
      return;
    }

    const rows = def.soxhlet
      ? [['m₁ — boş ekstraksiyon balonu', a.m1],
         ['mₙ — kartuştaki kuru numune', a.sampleMass],
         ['m₃ — ekstraksiyon sonrası balon + yağ', a.m3]]
      : [['m₁ — boş ' + def.vessel.toLowerCase(), a.m1],
         ['m₂ — ' + def.vessel.toLowerCase() + ' + numune', a.m2],
         ['m₃ — işlem sonrası', a.m3]];

    UI.askResult({
      label: `${def.name} tayini — ${def.resultLabel} değerini hesaplayıp girin.`,
      formula: `<div class="f-main">${def.formula}</div><div class="f-legend">${def.legend}</div>`,
      dataHtml: `<table>${rows.map(([l, v]) =>
        `<tr><td>${l}</td><td>${fmt(v)} g</td></tr>`).join('')}</table>`,
      onSubmit: val => this.checkResult(key, val)
    });
  },

  checkResult(key, studentVal) {
    const def = ANALYSES[key];
    const a = this.state[key];
    if (a.submitted) return;

    a.submitted = true;
    a.value = studentVal;

    const tolerance = Math.max(0.25, a.expected * 0.02);
    const ok = Math.abs(studentVal - a.expected) <= tolerance;

    let earned = this.procedurePoints(key);
    if (ok) {
      earned += def.points.result;
      UI.toast(`${def.name}: sonuç doğru (${fmt2(a.expected)}%).`, 'ok');
      Audio.play('correct');
    } else {
      ErrorLogger.log(def.name,
        `Girilen ${fmt2(studentVal)}%, hesaplanması gereken ${fmt2(a.expected)}%.`);
      UI.toast(`${def.name}: sonuç hatalı. Doğrusu ${fmt2(a.expected)}%.`, 'error');
      Audio.play('wrong');
    }

    a.scored = true;
    a.earned = earned;
    Scoring.add(def.name + ' Analizi', earned, def.max);
    this.refresh();
  },

  /** Sıcaklık / süre / soğutma / düzenek puanları. */
  procedurePoints(key) {
    const def = ANALYSES[key];
    const a = this.state[key];
    let p = 0;
    if (a.processed && Math.abs(a.procTemp - def.temp) <= def.tempTol) p += def.points.temp;
    if (a.processed && Math.abs(a.procHours - def.hours) <= def.hoursTol) p += def.points.time;
    if (def.points.cool && a.cooled) p += def.points.cool;
    if (def.points.setup && a.setupOk) p += def.points.setup;
    return p;
  },

  /**
   * Süre dolduğunda tamamlanmamış analizlerin doğru yapılmış
   * basamakları için kısmi puan verir.
   */
  collectPartialScores() {
    for (const key of ['dm', 'ash', 'fat']) {
      const a = this.state?.[key];
      if (!a || a.scored) continue;
      const p = this.procedurePoints(key);
      if (p > 0) {
        a.scored = true;
        a.earned = p;
        Scoring.add(ANALYSES[key].name + ' Analizi (yarım)', p, ANALYSES[key].max);
      }
    }
  },

  // =================================================== DURUM / DEFTER
  isComplete() {
    return ['dm', 'ash', 'fat'].every(k => this.state?.[k]?.submitted);
  },

  tasks() {
    const st = this.state;
    if (!st) return [];
    const t = [];
    const need = REQUIRED_ITEMS.every(([n]) => UI.hasItem(n) ||
      (n === 'Yem Numunesi' && st.ground) || (n === 'Soxhlet Cam Seti' && st.fat.setupOk));

    t.push({ label: 'Malzeme dolabından gerekli malzemeleri al', done: need });
    t.push({ label: 'Numuneyi öğüt (1 mm elek)', done: st.ground });

    for (const key of ['dm', 'ash', 'fat']) {
      const def = ANALYSES[key];
      const a = st[key];
      const steps = a.submitted ? 5
        : (a.m3 !== null ? 4 : (a.cooled ? 3 : (a.processed ? 2 : (a.m2 !== null || a.sampleMass !== null ? 1 : 0))));
      t.push({
        label: `${def.name} tayini (${steps}/5)`,
        done: a.submitted,
        active: !a.submitted && steps > 0
      });
    }
    return t;
  },

  notebookHtml() {
    const st = this.state;
    if (!st) return '<p>Defter henüz boş.</p>';

    const blocks = ['dm', 'ash', 'fat'].map(key => {
      const def = ANALYSES[key];
      const a = st[key];
      const rows = [];
      const push = (l, v, unit = 'g') =>
        rows.push(`<tr><td>${l}</td><td>${v === null || v === undefined ? '—' : fmt(v) + ' ' + unit}</td></tr>`);

      push('m₁ — boş kap', a.m1);
      if (def.soxhlet) push('mₙ — kartuştaki numune', a.sampleMass);
      else push('m₂ — kap + numune', a.m2);
      push('m₃ — işlem sonrası', a.m3);

      rows.push(`<tr><td>İşlem</td><td>${a.processed
        ? `${a.procTemp} °C / ${a.procHours} sa` : '—'}</td></tr>`);
      rows.push(`<tr><td>Desikatörde soğutma</td><td>${a.cooled ? 'evet' : 'hayır'}</td></tr>`);
      rows.push(`<tr><td>Girilen sonuç</td><td>${a.submitted ? fmt2(a.value) + ' %' : '—'}</td></tr>`);

      return `
        <div class="nb-block">
          <h4>${def.name}</h4>
          <div class="f-main">${def.formula}</div>
          <table class="notebook-table">${rows.join('')}</table>
        </div>`;
    }).join('');

    return `
      <p class="hint">Numune: <strong>${this.currentFeed?.name || '—'}</strong>
      ${st.ground ? ` · ${st.sieve} mm elekten öğütülmüş` : ''}</p>
      ${blocks}`;
  }
};

export { ANALYSES };
