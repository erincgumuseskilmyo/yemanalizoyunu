// main.js — Giriş noktası: giriş ekranı, klavye ve dokunmatik kontroller
import { UI } from './ui.js';
import { Game } from './game.js';
import { Intro } from './intro.js';
import { setJoystick } from './player.js';
import { Audio } from './audio.js';
import { verifyFeedPhotos } from './feeds.js';

// Yem fotoğrafları önden yüklenir; dosyası bulunmayan yemler soru
// havuzundan düşer. İş giriş ekranı ve anlatı sürerken bittiği için
// oyunun başlamasını geciktirmez.
const fotograflarHazir = verifyFeedPhotos();

// Giriş → açılış anlatısı → oyun. Süre sayacı anlatı bittikten sonra
// başlar; hikâye öğrencinin 30 dakikasından yemez.
UI.initLogin(data => Intro.show(async () => {
  await fotograflarHazir;
  Game.start(data);
}));

/* ----------------------------------------------------- Mobil yön çubuğu */
const joyArea = document.getElementById('joystick-area');
const joyKnob = document.getElementById('joystick-knob');
const MAX_R = 38;                       // knob'un merkeze uzaklık sınırı (px)

let joyId = null;
let joyOrigin = { x: 0, y: 0 };

joyArea.addEventListener('pointerdown', e => {
  joyId = e.pointerId;
  joyOrigin = { x: e.clientX, y: e.clientY };
  joyArea.setPointerCapture(e.pointerId);
  e.preventDefault();
});

joyArea.addEventListener('pointermove', e => {
  if (e.pointerId !== joyId) return;
  let dx = e.clientX - joyOrigin.x;
  let dy = e.clientY - joyOrigin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > MAX_R) { dx = dx / dist * MAX_R; dy = dy / dist * MAX_R; }

  setJoystick(dx / MAX_R, dy / MAX_R);
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});

function releaseJoystick(e) {
  if (joyId === null || (e && e.pointerId !== joyId)) return;
  joyId = null;
  setJoystick(0, 0);
  joyKnob.style.transform = 'translate(-50%, -50%)';
}

joyArea.addEventListener('pointerup', releaseJoystick);
joyArea.addEventListener('pointercancel', releaseJoystick);
window.addEventListener('blur', () => releaseJoystick());

/* ----------------------------------------------------- Etkileşim */
document.getElementById('btn-action').addEventListener('click', () => {
  Audio.play('click');
  Game.interactNearest();
});

window.addEventListener('keydown', e => {
  // Metin alanına yazarken kısayollar tetiklenmemeli.
  const el = document.activeElement;
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

  if (e.code === 'KeyE' && !e.repeat && !typing) {
    e.preventDefault();
    Game.interactNearest();
  }

  if (e.code === 'Escape') {
    UI.closeEquipment();
    UI.closeNotebook();
    UI.closeGuide();
  }
});
