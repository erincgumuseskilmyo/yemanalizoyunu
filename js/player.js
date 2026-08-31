// player.js — 8 yönlü sprite animasyonlu karakter
import * as THREE from 'three';
import { COLLIDERS, ROOM, getPixelsPerUnit } from './world.js';
import { Audio } from './audio.js';

const CHAR_PATH = 'assets/character/';
// Sprite hücresi 64x64; karakterin ayakları hücrenin altından 9 px yukarıda
// bittiği için sprite'ın çapası (center.y) buna göre ayarlanır.
const CELL = 64;
const FEET_FROM_BOTTOM = 9 / CELL;
const PLAYER_SCALE = 4.4;
const PLAYER_RADIUS = 0.75;
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const FRAME_COUNT = 8;
const FRAMES_PER_SEC = 10;
const SPEED = 7.2;                      // birim / saniye

// İzometrik kamera (24,24,24) konumundadır: ekranda sağ yön dünya (+X,−Z),
// yukarı yön dünya (−X,−Z) olur. Girdi bu iki eksene göre çözülür.
const HALF = Math.SQRT1_2;
const SCREEN_RIGHT = { x: HALF, z: -HALF };
const SCREEN_UP = { x: -HALF, z: -HALF };

const DIR_MAP = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

// İzometrik izdüşümde dikey eksenin sıkışma oranı (kamera 45°/35,26°).
const VERT = 1 / Math.sqrt(3);
const CAM_OFFSET = 24;

/**
 * Bir dünya noktasını ekranın piksel ızgarasına oturtur.
 * Konum önce ekran eksenlerine (yatay u, dikey v) ayrıştırılır, her biri tam
 * piksele yuvarlanır ve dünya koordinatına geri çevrilir. Karakter ile kamera
 * aynı yuvarlanmış konumu kullandığı için karakter ekranda hep aynı piksele
 * denk gelir, sahne de tam piksel adımlarıyla kayar.
 */
function snapToPixelGrid(x, z, ppu) {
  if (!ppu) return { x, z };
  const u = (x - z) * HALF;
  const v = (x + z) * HALF;
  const su = Math.round(u * ppu) / ppu;
  const sv = Math.round(v * VERT * ppu) / (VERT * ppu);
  return { x: (su + sv) / (2 * HALF), z: (sv - su) / (2 * HALF) };
}

let scene, camera, sprite, shadowSprite;
let walkTextures = {};      // yön -> 8 kareli yürüyüş şeridi
let idleTextures = {};      // yön -> tek kareli duruş pozu
let currentDir = 'S';
// Çizim konumu piksele yuvarlandığı için hareket/çarpışma hesabı ayrı
// tutulan kesirli konum üzerinden yürür; aksi hâlde yuvarlama geri beslenir.
let pos = { x: 5, z: 6 };
let frameIndex = 0;
let frameTimer = 0;
let inputEnabled = true;
let interactTimer = 0;
let lastTime = 0;

const keys = {};
let joystick = { x: 0, y: 0 };

function screenDirection(ix, iy) {
  const idx = Math.round(Math.atan2(-iy, ix) / (Math.PI / 4));
  return DIR_MAP[((idx % 8) + 8) % 8];
}

function makeFallbackTexture(frames) {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * frames;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d');
  for (let f = 0; f < frames; f++) {
    ctx.fillStyle = '#e6ebf5';
    ctx.fillRect(f * CELL + 22, 22, 20, 26);
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(f * CELL + 25, 12, 14, 12);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Sprite dokusunu yükler; hata durumunda yedek çizim döner. */
function loadSprite(loader, file, frames) {
  return new Promise(resolve => {
    const setup = tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(1 / frames, 1);
      resolve(tex);
    };
    loader.load(new URL(CHAR_PATH + file, document.baseURI).href, setup, undefined, () => {
      console.warn(`${file} yüklenemedi, yedek sprite kullanılıyor.`);
      setup(makeFallbackTexture(frames));
    });
  });
}

export async function createPlayer(sc, cam) {
  scene = sc;
  camera = cam;
  walkTextures = {};
  idleTextures = {};

  const loader = new THREE.TextureLoader();
  await Promise.all(DIRECTIONS.flatMap(dir => [
    loadSprite(loader, `walk_${dir}.png`, FRAME_COUNT).then(t => { walkTextures[dir] = t; }),
    loadSprite(loader, `idle_${dir}.png`, 1).then(t => { idleTextures[dir] = t; })
  ]));

  sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: idleTextures['S'], transparent: true, alphaTest: 0.06,
    depthWrite: true, depthTest: true
  }));
  sprite.center.set(0.5, FEET_FROM_BOTTOM);  // ayaklar zemine otursun
  sprite.scale.set(PLAYER_SCALE, PLAYER_SCALE, 1);
  pos = { x: 5, z: 6 };
  sprite.position.set(pos.x, 0.02, pos.z);
  sprite.renderOrder = 50;
  scene.add(sprite);

  // Zemin gölgesi
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);

  shadowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(shadowCanvas),
    transparent: true, depthWrite: false, depthTest: true
  }));
  shadowSprite.scale.set(2.2, 1.1, 1);
  shadowSprite.position.set(pos.x, 0.04, pos.z);
  scene.add(shadowSprite);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearKeys);

  lastTime = performance.now();
  return sprite;
}

function onKeyDown(e) { keys[e.code] = true; }
function onKeyUp(e) { keys[e.code] = false; }
function clearKeys() {
  for (const k of Object.keys(keys)) keys[k] = false;
  joystick.x = joystick.y = 0;
}

export function setJoystick(dx, dy) {
  joystick.x = dx;
  joystick.y = dy;
}

/** Pencere açıkken karakter hareket etmemeli. */
export function setInputEnabled(v) {
  inputEnabled = v;
  if (!v) clearKeys();
}

/** Etkileşimde kısa bir zıplama/ezilme animasyonu oynatır. */
export function playInteractAnimation() {
  interactTimer = 0.34;
}

function blocked(x, z) {
  if (x < ROOM.minX || x > ROOM.maxX || z < ROOM.minZ || z > ROOM.maxZ) return true;
  for (const c of COLLIDERS) {
    if (x > c.minX - PLAYER_RADIUS && x < c.maxX + PLAYER_RADIUS &&
        z > c.minZ - PLAYER_RADIUS && z < c.maxZ + PLAYER_RADIUS) return true;
  }
  return false;
}

export function updatePlayer() {
  if (!sprite) return;

  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);   // sekmelerde sıçramayı önler
  lastTime = now;

  let ix = 0, iy = 0;
  if (inputEnabled) {
    if (keys['KeyW'] || keys['ArrowUp']) iy += 1;
    if (keys['KeyS'] || keys['ArrowDown']) iy -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
    if (Math.abs(joystick.x) > 0.15) ix += joystick.x;
    if (Math.abs(joystick.y) > 0.15) iy -= joystick.y;   // ekranda aşağı = -iy
  }

  const mag = Math.hypot(ix, iy);
  const moving = mag > 0.05;

  if (moving) {
    ix /= mag; iy /= mag;

    const wx = ix * SCREEN_RIGHT.x + iy * SCREEN_UP.x;
    const wz = ix * SCREEN_RIGHT.z + iy * SCREEN_UP.z;

    // Eksenler ayrı test edilir; böylece engelin kenarında kayarak ilerlenir.
    const nextX = pos.x + wx * SPEED * dt;
    const nextZ = pos.z + wz * SPEED * dt;
    if (!blocked(nextX, pos.z)) pos.x = nextX;
    if (!blocked(pos.x, nextZ)) pos.z = nextZ;

    currentDir = screenDirection(ix, iy);
    Audio.step();
  }

  // Çizim: karakter ve kamera aynı piksel ızgarası noktasını kullanır.
  const snapped = snapToPixelGrid(pos.x, pos.z, getPixelsPerUnit());
  sprite.position.x = snapped.x;
  sprite.position.z = snapped.z;

  // Etkileşim animasyonu: kısa bir esneme
  let squash = 1;
  if (interactTimer > 0) {
    interactTimer = Math.max(0, interactTimer - dt);
    const t = 1 - interactTimer / 0.34;
    squash = 1 + Math.sin(t * Math.PI) * 0.16;
  }
  sprite.scale.set(PLAYER_SCALE * (2 - squash), PLAYER_SCALE * squash, 1);

  shadowSprite.position.set(snapped.x, 0.04, snapped.z);

  camera.position.set(snapped.x + CAM_OFFSET, CAM_OFFSET, snapped.z + CAM_OFFSET);
  camera.lookAt(snapped.x, 1.2, snapped.z);

  // Yürürken 8 kareli şerit, dururken tek kareli duruş pozu kullanılır.
  const tex = moving ? walkTextures[currentDir] : idleTextures[currentDir];
  if (tex && sprite.material.map !== tex) {
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
  }

  if (moving) {
    frameTimer += dt * FRAMES_PER_SEC;
    if (frameTimer >= 1) {
      frameTimer -= 1;
      frameIndex = (frameIndex + 1) % FRAME_COUNT;
    }
    if (tex) tex.offset.x = frameIndex / FRAME_COUNT;
  } else {
    frameIndex = 0;
    frameTimer = 0;
  }
}

export function getPlayerPosition() {
  return sprite ? sprite.position : new THREE.Vector3();
}

export function getPlayerObject() {
  return sprite;
}

export function disposePlayer() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', clearKeys);
  sprite = null;
}
