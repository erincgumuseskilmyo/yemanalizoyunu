// world.js — Three.js izometrik laboratuvar sahnesi
// Cihaz görselleri assets/laboratory klasöründeki PNG dosyalarından yüklenir.
import * as THREE from 'three';

let scene, camera, renderer, raycaster, pointer, container;
let interactables = [];
let resizeObserver = null;
let onInteract = null;
let updateCallback = null;
let frameId = null;

const LAB_ASSET_PATH = 'assets/laboratory/';

/**
 * Ortografik kamera ölçeği. Sabit bir dikey açıklık kullanılsaydı, telefonun
 * dar-uzun ekranında yatay görüş alanı çok daralır ve tezgâhtaki cihazlar
 * ekran dışında kalırdı. Bu yüzden ölçek en-boy oranına göre belirlenir:
 * yatayda her zaman en az ~12,5 birim görünür.
 */
function computeFrustum(aspect) {
  return Math.max(15, Math.min(28, 12.5 / aspect));
}

/** Karakterin giremeyeceği eksen hizalı dikdörtgenler (tezgâhlar, dolap). */
export const COLLIDERS = [];
/** Oda sınırları — karakterin duvarların dışına çıkmasını engeller. */
export const ROOM = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };

/* ---------------------------------------------------------------------
 * Yerleşim: iki laboratuvar tezgâhı arka duvarların önüne dayanır.
 * Sol duvar tezgâhı Z ekseni boyunca uzanır, ön yüzü +X'e bakar;
 * arka duvar tezgâhı (yatay aynası) X ekseni boyunca uzanır, ön yüzü +Z'ye.
 * ------------------------------------------------------------------- */
// Oda, tezgâhların boyuna göre ölçülendirildi: daha büyük bir zemin
// her şeyin tek köşede toplanmasına ve ortada boş alan kalmasına yol açıyordu.
const ROOM_SIZE = 30;                    // zemin kenarı (dünya birimi)
const WALL_AT = ROOM_SIZE / 2;           // duvarların merkeze uzaklığı
const WALL_LENGTH = ROOM_SIZE;
const WALL_HEIGHT = 7.5;

/* Tezgâhlar 3B geometriyle kurulur. Hazır bir tezgâh çizimi kullanmak
 * yerine bunun tercih edilmesinin nedeni: sahne 30° izometrik çizilirken
 * hazır çizimler genellikle 2:1 (26,57°) ya da daha yatık açıyla hazırlanır.
 * Açı tutmayınca cihazlar tezgâh boyunca ilerledikçe çizili tabladan
 * kayıyordu. Geometriyle tabla gerçek bir düzlem olduğu için her noktada
 * doğru hizalanır ve ışık/gölge de doğru düşer. */
const BENCH_LEN = 11;                    // tezgâh uzunluğu
const BENCH_DEPTH = 2.0;                 // tezgâh derinliği
const KICK_H = 0.25;                     // süpürgelik boşluğu
const BODY_H = 1.75;                     // gövde yüksekliği
const TOP_H = 0.22;                      // tabla kalınlığı
const COUNTER_Y = KICK_H + BODY_H + TOP_H;   // tabla üst yüzeyi (2,22)
const LEFT_BENCH_X = -13.5;              // sol duvar tezgâhlarının merkez çizgisi
const BACK_BENCH_Z = -13.5;              // arka duvar tezgâhlarının merkez çizgisi
// Cihazlar tabla merkezinden odaya doğru kaydırılır: tam merkezde
// dururken uzun cihazların üst kısmı duvarla üst üste biniyordu.
const DEVICE_FWD = 0.6;
const DEV_X = LEFT_BENCH_X + DEVICE_FWD;
const DEV_Z = BACK_BENCH_Z + DEVICE_FWD;
const BENCH_OFF = 6.6;                   // aynı duvardaki iki tezgâhın merkezleri

// Dört tezgâh: her duvarda ikişer tane, her birinde en çok iki cihaz.
const BENCHES = [
  { x: LEFT_BENCH_X, z: -BENCH_OFF, axis: 'z' },
  { x: LEFT_BENCH_X, z:  BENCH_OFF, axis: 'z' },
  { x: -BENCH_OFF, z: BACK_BENCH_Z, axis: 'x' },
  { x:  BENCH_OFF, z: BACK_BENCH_Z, axis: 'x' }
];

const EQUIPMENT = [
  // 1. tezgâh — sol duvar, arka yarı
  { type: 'terazi',       file: 'terazi.png',         label: 'Analitik Terazi', x: DEV_X, z: -9.2, scale: 2.9 },
  { type: 'kurutma',      file: 'kurutma_dolabi.png', label: 'Kurutma Dolabı',  x: DEV_X, z: -4.0, scale: 3.2 },
  // 2. tezgâh — sol duvar, ön yarı
  { type: 'desikator',    file: 'desikator.png',      label: 'Desikatör',       x: DEV_X, z:  4.0, scale: 2.9 },
  { type: 'ogutucu',      file: 'ogutucu.png',        label: 'Öğütücü',         x: DEV_X, z:  9.2, scale: 3.0 },
  // 3. tezgâh — arka duvar, sol yarı
  { type: 'kulFirini',    file: 'kul_firini.png',     label: 'Kül Fırını',      x: -BENCH_OFF, z: DEV_Z, scale: 3.2 },
  // 4. tezgâh — arka duvar, sağ yarı (Soxhlet burada kurulur)
  { type: 'balonIsitici', file: 'balon_isitici.png',  label: 'Balon Isıtıcı',   x:  BENCH_OFF, z: DEV_Z, scale: 3.0 },
  // malzeme dolabı zemine oturur
  { type: 'dolap',        file: 'dolap.png',          label: 'Malzeme Dolabı',  x: 11.5, z: -5, scale: 4.8, onFloor: true }
];

/**
 * Dolap ön yüzü için düz (izometrik olmayan) doku: kapak ve çekmece
 * panelleri, kulplar. Kutu geometrisi bu dokuyu kendi projeksiyonuna göre
 * eğdiği için doku düz çizilir.
 */
function makeCabinetTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 200;
  const g = c.getContext('2d');

  g.fillStyle = '#eceae3';
  g.fillRect(0, 0, 256, 200);

  const panel = (x, y, w, h) => {
    g.fillStyle = '#f4f2ec';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#c3c0b6';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1;
    g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  };
  const handle = (x, y, w) => {
    g.fillStyle = '#9aa3ad';
    g.fillRect(x, y, w, 5);
    g.fillStyle = '#d7dde3';
    g.fillRect(x, y, w, 2);
  };

  // sol: çift kapak
  panel(6, 6, 58, 188);
  panel(68, 6, 58, 188);
  handle(52, 92, 8);
  handle(72, 92, 8);
  // sağ: çekmece kolonu
  for (let i = 0; i < 4; i++) {
    panel(132, 6 + i * 47, 118, 43);
    handle(170, 24 + i * 47, 42);
  }
  // panel araları
  g.strokeStyle = '#d5d2c8';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(129, 0); g.lineTo(129, 200); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  return t;
}

let cabinetTexture = null;

/** Duvara dayalı 3B laboratuvar tezgâhı. */
function addBench(def) {
  const alongX = def.axis === 'x';
  const len = BENCH_LEN, dep = BENCH_DEPTH;
  const sx = alongX ? len : dep;
  const sz = alongX ? dep : len;

  if (!cabinetTexture) cabinetTexture = makeCabinetTexture();
  const front = cabinetTexture.clone();
  front.needsUpdate = true;
  front.repeat.set(len / 2.75, 1);        // uzunluk boyunca modül tekrarı

  const bodyPlain = new THREE.MeshStandardMaterial({ color: 0xe7e5de, roughness: 0.75 });
  const bodyFront = new THREE.MeshStandardMaterial({ map: front, roughness: 0.7 });
  const topMat = new THREE.MeshStandardMaterial({ color: 0x545d6d, roughness: 0.4, metalness: 0.12 });
  const kickMat = new THREE.MeshStandardMaterial({ color: 0x2c3342, roughness: 0.85 });

  // Kutu yüzey sırası: +X, -X, +Y, -Y, +Z, -Z. Odaya bakan yüze
  // dolap dokusu, diğerlerine düz renk verilir.
  const faces = [bodyPlain, bodyPlain, bodyPlain, bodyPlain, bodyPlain, bodyPlain];
  faces[alongX ? 4 : 0] = bodyFront;      // arka duvarda +Z, sol duvarda +X

  const body = new THREE.Mesh(new THREE.BoxGeometry(sx, BODY_H, sz), faces);
  body.position.set(def.x, KICK_H + BODY_H / 2, def.z);
  body.castShadow = body.receiveShadow = true;
  scene.add(body);

  const kick = new THREE.Mesh(
    new THREE.BoxGeometry(sx - 0.3, KICK_H, sz - 0.3), kickMat);
  kick.position.set(def.x, KICK_H / 2, def.z);
  kick.receiveShadow = true;
  scene.add(kick);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(sx + 0.16, TOP_H, sz + 0.16), topMat);
  top.position.set(def.x, KICK_H + BODY_H + TOP_H / 2, def.z);
  top.castShadow = top.receiveShadow = true;
  scene.add(top);

  // Duvara dayanan arka bordür
  const splashDep = 0.16, splashH = 0.5;
  const splash = new THREE.Mesh(
    new THREE.BoxGeometry(alongX ? sx : splashDep, splashH, alongX ? splashDep : sz),
    topMat);
  splash.position.set(
    def.x - (alongX ? 0 : dep / 2 - splashDep / 2),
    COUNTER_Y + splashH / 2,
    def.z - (alongX ? dep / 2 - splashDep / 2 : 0));
  splash.castShadow = true;
  scene.add(splash);
}

function assetUrl(file) {
  return new URL(`${LAB_ASSET_PATH}${file}`, document.baseURI).href;
}

/**
 * Dokuyu yükler. Ağ hatalarında (zayıf bağlantı, kopan istek) birkaç kez
 * yeniden dener; yine olmazsa null döner ve çağıran yedek görsel üretir.
 */
function loadTexture(file, retries = 2) {
  return new Promise(resolve => {
    const attempt = left => {
      const url = assetUrl(file) + (left === retries ? '' : `?r=${retries - left}`);
      new THREE.TextureLoader().load(
        url,
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          // Sahne dokuları (zemin, duvar, tezgâh, cihazlar) ayrıntılı
          // çizimlerdir, piksel sanat değil. NearestFilter ile büyütülünce
          // kamera kaydıkça kenarları titriyordu; doğrusal süzgeç + mipmap
          // hareketi pürüzsüz kılar. Karakter sprite'ları kendi
          // yükleyicisinde NearestFilter kullanmaya devam eder.
          tex.magFilter = THREE.LinearFilter;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          resolve(tex);
        },
        undefined,
        () => {
          if (left > 0) {
            console.warn(`Görsel yüklenemedi, yeniden deneniyor: ${file}`);
            setTimeout(() => attempt(left - 1), 600);
          } else {
            console.warn(`Görsel yüklenemedi, yedek çizim kullanılıyor: ${file}`);
            resolve(null);
          }
        }
      );
    };
    attempt(retries);
  });
}

/** Görsel yüklenemezse cihazın yerini tutan, yine de kullanılabilir bir kutu. */
function makePlaceholderTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#25324f';
  c.fillRect(8, 24, 112, 96);
  c.strokeStyle = '#4ecca3';
  c.lineWidth = 4;
  c.strokeRect(10, 26, 108, 92);
  c.fillStyle = '#e8f3ff';
  c.font = 'bold 15px Inter, sans-serif';
  c.textAlign = 'center';
  label.split(' ').forEach((word, i) => c.fillText(word, 64, 62 + i * 18));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cihaz adını sahnede gösteren küçük yazı levhası. */
function makeLabel(text) {
  const pad = 10;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 28px Inter, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.width = w;
  canvas.height = 46;

  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(10,14,32,0.82)';
  c.strokeStyle = '#4ecca3';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 8);
  c.fill();
  c.stroke();
  c.font = 'bold 28px Inter, sans-serif';
  c.fillStyle = '#e8f3ff';
  c.textBaseline = 'middle';
  c.fillText(text, pad, canvas.height / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false
  }));
  sprite.scale.set(canvas.width / 46 * 1.15, 1.15, 1);
  sprite.renderOrder = 80;
  return sprite;
}

function addEquipment(def, baseY) {
  return loadTexture(def.file).then(rawTexture => {
    // Görsel gelmezse cihaz yine de sahnede ve kullanılabilir olmalı;
    // aksi hâlde öğrenci analizi tamamlayamaz.
    const texture = rawTexture || makePlaceholderTexture(def.label);
    const ratio = texture.image ? texture.image.height / texture.image.width : 1;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, alphaTest: 0.06,
      depthWrite: true, depthTest: true
    }));

    sprite.center.set(0.5, 0);                       // taban zemine/tezgâha otursun
    sprite.scale.set(def.scale, def.scale * ratio, 1);
    sprite.position.set(def.x, baseY, def.z);
    sprite.renderOrder = 5;
    sprite.userData = { type: def.type, label: def.label, interactable: true };
    scene.add(sprite);
    interactables.push(sprite);

    const label = makeLabel(def.label);
    label.position.set(def.x, baseY + def.scale * ratio + 0.7, def.z);
    scene.add(label);
    // Doku sonradan değişebildiği için etiket sprite'ı saklanır.
    sprite.userData.labelSprite = label;
    sprite.userData.baseY = baseY;
  });
}

function buildLab() {
  // ---------------------------------------------------------- ZEMİN
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x8d97ab, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  loadTexture('zemin.png').then(texture => {
    if (!texture) return;                       // düz renkli zemin yedek kalır
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(ROOM_SIZE / 6, ROOM_SIZE / 6);
    floor.material.map = texture;
    floor.material.color.set(0xffffff);
    floor.material.needsUpdate = true;
  });

  // ---------------------------------------------------------- DUVARLAR
  // Fayans kaplaması yalnızca yatayda tekrar eder: görselin altındaki
  // süpürgelik şeridi duvarın ortasında tekrarlanmamalı.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xdde4ef, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2c3b63, roughness: 0.7 });

  loadTexture('duvar.png').then(texture => {
    if (!texture) return;                      // düz renkli duvar yedek kalır
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(WALL_LENGTH / WALL_HEIGHT, 1);   // fayanslar kare kalsın
    wallMat.map = texture;
    wallMat.color.set(0xffffff);
    wallMat.needsUpdate = true;
  });

  // Kameraya arkada kalan iki duvar tam yükseklikte, öndeki ikisi alçak
  // tutulur; böylece izometrik görüşte oda içi kapanmaz.
  const walls = [
    { w: WALL_LENGTH, h: WALL_HEIGHT, d: 0.8, x: 0, y: WALL_HEIGHT / 2, z: -WALL_AT },
    { w: 0.8, h: WALL_HEIGHT, d: WALL_LENGTH, x: -WALL_AT, y: WALL_HEIGHT / 2, z: 0 },
    { w: WALL_LENGTH, h: 1.2, d: 0.8, x: 0, y: 0.6, z: WALL_AT },
    { w: 0.8, h: 1.2, d: WALL_LENGTH, x: WALL_AT, y: 0.6, z: 0 }
  ];
  walls.forEach(s => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), wallMat);
    m.position.set(s.x, s.y, s.z);
    m.receiveShadow = true;
    scene.add(m);
  });

  // Süpürgelik şeridi — odanın köşelerini belirginleştirir
  [[0, -WALL_AT + 0.5, WALL_LENGTH, 0.6],
   [-WALL_AT + 0.5, 0, 0.6, WALL_LENGTH]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), trimMat);
    m.position.set(x, 0.25, z);
    scene.add(m);
  });

  // ---------------------------------------------------------- TEZGÂHLAR
  BENCHES.forEach(addBench);

  // Çarpışma kutuları: tezgâhların zemindeki ayak izleri ve dolap.
  const halfBench = BENCH_OFF + BENCH_LEN / 2;              // tezgâh şeridinin yarı boyu
  const benchFront = BENCH_DEPTH / 2;
  COLLIDERS.push({ minX: -WALL_AT, maxX: LEFT_BENCH_X + benchFront, minZ: -halfBench, maxZ: halfBench });
  COLLIDERS.push({ minX: -halfBench, maxX: halfBench, minZ: -WALL_AT, maxZ: BACK_BENCH_Z + benchFront });
  COLLIDERS.push({ minX: 9.4, maxX: 13.6, minZ: -7.1, maxZ: -2.9 });

  EQUIPMENT.forEach(def => addEquipment(def, def.onFloor ? 0 : COUNTER_Y));
}

/**
 * Kapsayıcının kullanılabilir ölçüsü. Sekme gizliyken ya da düzen henüz
 * oturmamışken tüm ölçüler 0 dönebilir; bu durumda en/boy oranı NaN olur ve
 * kamera bir daha düzelmemek üzere bozulur. Bu yüzden ölçü hep pozitife
 * sabitlenir, gerçek ölçü gelince ResizeObserver kamerayı düzeltir.
 */
function viewportSize() {
  const w = container?.clientWidth || window.innerWidth || 960;
  const h = container?.clientHeight || window.innerHeight || 540;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export function initWorld(el) {
  container = el;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11172c);
  scene.fog = new THREE.Fog(0x11172c, 46, 78);

  const { w, h } = viewportSize();
  const aspect = w / h;
  const frustum = computeFrustum(aspect);

  camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 400);
  camera.position.set(24, 24, 24);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  scene.add(new THREE.AmbientLight(0xdfe8ff, 0.85));
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1b2340, 0.55));

  const dir = new THREE.DirectionalLight(0xfff4e0, 0.9);
  dir.position.set(16, 30, 14);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -ROOM_SIZE / 2 - 4;
  dir.shadow.camera.right = ROOM_SIZE / 2 + 4;
  dir.shadow.camera.top = ROOM_SIZE / 2 + 4;
  dir.shadow.camera.bottom = -ROOM_SIZE / 2 - 4;
  scene.add(dir);

  buildLab();

  window.addEventListener('resize', onResize);
  // Pencere 'resize' olayı, gizli bir sekme görünür olduğunda tetiklenmez;
  // kapsayıcıyı doğrudan izlemek kamerayı her durumda toparlar.
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  animate();
  return { scene, camera, renderer };
}

function onResize() {
  if (!renderer || !container) return;
  const { w, h } = viewportSize();
  const a = w / h;
  const f = computeFrustum(a);
  camera.left = -f * a;
  camera.right = f * a;
  camera.top = f;
  camera.bottom = -f;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function onPointerDown(e) {
  if (!onInteract) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactables, true);
  if (!hits.length) return;

  let object = hits[0].object;
  while (object && !object.userData?.type && object.parent) object = object.parent;
  if (object?.userData?.type) onInteract(object.userData);
}

function animate() {
  frameId = requestAnimationFrame(animate);
  if (updateCallback) updateCallback();
  renderer.render(scene, camera);
}

/**
 * Bir dünya biriminin ekranda kaç piksele denk geldiği.
 * Karakter ve kamera bu ölçüye göre piksel ızgarasına oturtulur; aksi hâlde
 * hareket sırasında sprite'ların pikselleri her karede farklı yere düşer ve
 * görüntü titreşir ("piksel sürünmesi").
 */
export function getPixelsPerUnit() {
  if (!renderer || !camera) return 0;
  // Ölçü, CSS pikseli değil **çizim arabelleğinin aygıt pikseli** üzerinden
  // alınır. Windows'ta %125/%150 ekran ölçeklemesi yaygındır; o durumda
  // devicePixelRatio kesirli olur ve CSS pikseline yuvarlamak aygıt
  // pikselinde yarım piksel kayma bırakarak titremeyi sürdürür.
  const el = renderer.domElement;
  const h = el.height || el.clientHeight;
  const span = camera.top - camera.bottom;
  return h > 0 && span > 0 ? h / span : 0;
}

/**
 * Bir cihazın görselini çalışma sırasında değiştirir (ör. Soxhlet düzeneği
 * kurulunca balon ısıtıcının yerine kurulu düzenek görseli gelir).
 * Yeni görselin en-boy oranına göre ölçek ve etiket yüksekliği güncellenir.
 */
export function setEquipmentTexture(type, file, scale) {
  const sprite = interactables.find(o => o.userData.type === type);
  if (!sprite) return Promise.resolve(false);
  return loadTexture(file).then(tex => {
    if (!tex) return false;
    const ratio = tex.image ? tex.image.height / tex.image.width : 1;
    const s = scale ?? sprite.scale.x;
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
    sprite.scale.set(s, s * ratio, 1);
    const label = sprite.userData.labelSprite;
    if (label) label.position.y = (sprite.userData.baseY ?? 0) + s * ratio + 0.7;
    return true;
  });
}

/** Sahne döngüsüne her karede çağrılacak bir güncelleyici bağlar. */
export function setUpdateCallback(cb) { updateCallback = cb; }

/**
 * Çizim döngüsünü durdurur/başlatır. Oyun bittiğinde sahne son karesiyle
 * ekranda kalır ama GPU ve pil boşuna harcanmaz.
 */
export function setRenderingActive(active) {
  if (active) {
    if (!frameId && renderer) animate();
  } else if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}
export function setInteractCallback(cb) { onInteract = cb; }
export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getInteractables() { return interactables; }

export function disposeWorld() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = null;
  updateCallback = null;
  window.removeEventListener('resize', onResize);
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.dispose();
    renderer.domElement.remove();
  }
  interactables = [];
  COLLIDERS.length = 0;
}
