// Kana Michi: drag and drop hiragana and katakana matching game.
// Loaded with `defer`, so the DOM is ready by the time this runs.

(function(){
'use strict';

/* ---------------- kana data ---------------- */
const DATA = [
  ['a','あ','a'],['i','い','a'],['u','う','a'],['e','え','a'],['o','お','a'],
  ['ka','か','k'],['ki','き','k'],['ku','く','k'],['ke','け','k'],['ko','こ','k'],
  ['sa','さ','s'],['shi','し','s'],['su','す','s'],['se','せ','s'],['so','そ','s'],
  ['ta','た','t'],['chi','ち','t'],['tsu','つ','t'],['te','て','t'],['to','と','t'],
  ['na','な','n'],['ni','に','n'],['nu','ぬ','n'],['ne','ね','n'],['no','の','n'],
  ['ha','は','h'],['hi','ひ','h'],['fu','ふ','h'],['he','へ','h'],['ho','ほ','h'],
  ['ma','ま','m'],['mi','み','m'],['mu','む','m'],['me','め','m'],['mo','も','m'],
  ['ya','や','y'],['yu','ゆ','y'],['yo','よ','y'],
  ['ra','ら','r'],['ri','り','r'],['ru','る','r'],['re','れ','r'],['ro','ろ','r'],
  ['wa','わ','w'],['wo','を','w'],['n','ん','w'],
  ['ga','が','g'],['gi','ぎ','g'],['gu','ぐ','g'],['ge','げ','g'],['go','ご','g'],
  ['za','ざ','z'],['ji','じ','z'],['zu','ず','z'],['ze','ぜ','z'],['zo','ぞ','z'],
  ['da','だ','d'],['di','ぢ','d','ji'],['du','づ','d','zu'],['de','で','d'],['do','ど','d'],
  ['ba','ば','b'],['bi','び','b'],['bu','ぶ','b'],['be','べ','b'],['bo','ぼ','b'],
  ['pa','ぱ','p'],['pi','ぴ','p'],['pu','ぷ','p'],['pe','ぺ','p'],['po','ぽ','p']
];
const ROWS = [
  ['a','あ'],['k','か'],['s','さ'],['t','た'],['n','な'],['h','は'],['m','ま'],['y','や'],['r','ら'],['w','わ'],
  ['g','が'],['z','ざ'],['d','だ'],['b','ば'],['p','ぱ']
];
const BASIC = ['a','k','s','t','n','h','m','y','r','w'];
const BY_R = Object.fromEntries(DATA.map(d => [d[0], d]));
const kata = s => String.fromCharCode(s.charCodeAt(0) + 0x60);
// the sound shown on a slot; ぢ and づ are stored as di/du but read as ji/zu
const sound = r => BY_R[r][3] || r;
// kana that share a sound never appear in the same round
const CLASH = { ji:'di', di:'ji', zu:'du', du:'zu' };
const ROUND_SIZE = 8;

/* ---------------- state ---------------- */
const hr = new Date().getHours();
const S = {
  script:'hira', place:'rural', time:(hr >= 6 && hr < 18) ? 'day' : 'night',
  rows:['a','k','s'], sound:true, best:0
};
let R = { n:1, items:[], scripts:{}, matched:new Set(), misses:0, peeks:0 };
let streak = 0;

function loadPrefs(extra){
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('kana-michi') || 'null'); } catch(e) {}
  const src = Object.assign({}, saved || {}, extra || {});
  ['script','place','time'].forEach(k => { if (typeof src[k] === 'string') S[k] = src[k]; });
  if (Array.isArray(src.rows) && src.rows.length) S.rows = src.rows.filter(r => ROWS.some(x => x[0] === r));
  if (!S.rows.length) S.rows = ['a','k','s'];
  if (typeof src.sound === 'boolean') S.sound = src.sound;
  if (typeof src.best === 'number') S.best = src.best;
}
function savePrefs(){
  try { localStorage.setItem('kana-michi', JSON.stringify(S)); } catch(e) {}
}

/* ---------------- dom ---------------- */
const $ = id => document.getElementById(id);
const slotsEl = $('slots'), trayEl = $('tray'), clearEl = $('clear'), chipsEl = $('chips'), live = $('live');

function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function glyphFor(r){
  const h = BY_R[r][1];
  const sc = S.script === 'mix' ? R.scripts[r] : S.script;
  return sc === 'kata' ? kata(h) : h;
}
function announce(t){ live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); }

function newRound(advance){
  if (advance) R.n++;
  const pool = DATA.filter(d => S.rows.includes(d[2]));
  const picks = [];
  for (const d of shuffle(pool)){
    if (picks.length >= ROUND_SIZE) break;
    if (CLASH[d[0]] && picks.includes(CLASH[d[0]])) continue;
    picks.push(d[0]);
  }
  R.items = picks; R.matched = new Set(); R.misses = 0; R.peeks = 0;
  R.scripts = {}; picks.forEach(r => { R.scripts[r] = Math.random() < .5 ? 'hira' : 'kata'; });
  deselect();
  slotsEl.innerHTML = '';
  shuffle(picks).forEach(r => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'slot'; b.dataset.r = r;
    b.setAttribute('aria-label', 'Sound ' + sound(r));
    b.innerHTML = '<span class="kana"></span><span class="roma">' + sound(r) + '</span>';
    slotsEl.appendChild(b);
  });
  trayEl.innerHTML = '';
  shuffle(picks).forEach(r => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.r = r;
    b.innerHTML = '<span class="g"></span><span class="tag"></span>';
    trayEl.appendChild(b);
  });
  trayEl.hidden = false; clearEl.hidden = true;
  updateGlyphs(); updateStats();
}

function updateGlyphs(){
  trayEl.querySelectorAll('.tile').forEach(t => {
    const g = glyphFor(t.dataset.r);
    t.querySelector('.g').textContent = g;
    t.setAttribute('aria-label', 'Kana ' + g);
  });
  slotsEl.querySelectorAll('.slot').forEach(s => { s.querySelector('.kana').textContent = glyphFor(s.dataset.r); });
  $('trayTitle').textContent = { hira:'Hiragana', kata:'Katakana', mix:'Hiragana and katakana' }[S.script];
  $('brandJp').textContent = S.script === 'kata' ? 'カナミチ' : 'かなみち';
  renderChips();
}

function updateStats(){
  $('stRound').textContent = R.n;
  $('stMatched').textContent = R.matched.size + '/' + R.items.length;
  $('stMiss').textContent = R.misses;
  $('stStreak').textContent = streak;
  $('stBest').textContent = S.best;
  $('bar').style.width = (R.items.length ? R.matched.size / R.items.length * 100 : 0) + '%';
}

/* ---------------- rows picker ---------------- */
function renderChips(){
  chipsEl.innerHTML = '';
  const mk = (row, head) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.row = row;
    b.setAttribute('aria-pressed', String(S.rows.includes(row)));
    const k = S.script === 'kata' ? kata(head) : head;
    b.innerHTML = '<span class="k">' + k + '</span><span class="r">' + (row === 'a' ? 'vowels' : row + '-') + '</span>';
    return b;
  };
  ROWS.forEach(([row, head], i) => {
    if (i === 10){ const sep = document.createElement('span'); sep.className = 'chip-sep'; chipsEl.appendChild(sep); }
    chipsEl.appendChild(mk(row, head));
  });
  const sep = document.createElement('span'); sep.className = 'chip-sep'; chipsEl.appendChild(sep);
  [['basic','All 46 basic'],['all','Everything']].forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip quick'; b.dataset.quick = id; b.textContent = label;
    chipsEl.appendChild(b);
  });
}
chipsEl.addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (c.dataset.quick === 'basic') S.rows = BASIC.slice();
  else if (c.dataset.quick === 'all') S.rows = ROWS.map(r => r[0]);
  else {
    const row = c.dataset.row;
    if (S.rows.includes(row)){ if (S.rows.length === 1) return; S.rows = S.rows.filter(r => r !== row); }
    else S.rows = S.rows.concat(row);
  }
  savePrefs(); renderChips(); newRound(false);
  const again = chipsEl.querySelector(c.dataset.quick ? '[data-quick="' + c.dataset.quick + '"]' : '[data-row="' + c.dataset.row + '"]');
  if (again) again.focus();
});

/* ---------------- matching ---------------- */
let selected = null;
function select(tile){
  deselect();
  selected = tile; tile.classList.add('picked'); tile.setAttribute('aria-pressed','true');
  slotsEl.querySelectorAll('.slot:not(.done)').forEach(s => s.classList.add('armed'));
}
function deselect(){
  if (selected){ selected.classList.remove('picked'); selected.removeAttribute('aria-pressed'); }
  selected = null;
  slotsEl.querySelectorAll('.armed').forEach(s => s.classList.remove('armed'));
}

function attempt(tile, slot){
  const r = tile.dataset.r;
  if (slot.dataset.r === r){ match(tile, slot); return true; }
  R.misses++; streak = 0;
  restart(tile, 'nope'); restart(slot, 'nope');
  const tag = tile.querySelector('.tag');
  tag.textContent = 'this is ' + sound(r); tag.classList.add('show');
  clearTimeout(tag._t); tag._t = setTimeout(() => tag.classList.remove('show'), 1500);
  sfx('bad');
  announce('Not quite. ' + glyphFor(r) + ' is ' + sound(r) + '.');
  updateStats();
  return false;
}
function match(tile, slot){
  const r = tile.dataset.r;
  R.matched.add(r); streak++;
  if (streak > S.best){ S.best = streak; savePrefs(); }
  tile.classList.add('gone'); tile.disabled = true;
  slot.classList.remove('armed','over'); slot.classList.add('done');
  slot.setAttribute('aria-label', 'Sound ' + sound(r) + ', matched ' + glyphFor(r));
  deselect();
  sfx('good'); say(glyphFor(r));
  announce(glyphFor(r) + ' is ' + sound(r) + '. Correct.');
  updateStats();
  if (R.matched.size === R.items.length) setTimeout(roundClear, 450);
}
function restart(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }

function roundClear(){
  const tries = R.matched.size + R.misses;
  const acc = Math.round(R.matched.size / tries * 100);
  trayEl.hidden = true; clearEl.hidden = false;
  const h = $('hanko'); h.style.animation = 'none'; void h.offsetWidth; h.style.animation = '';
  h.textContent = acc === 100 ? '満点' : '合格';
  $('clearTitle').textContent = 'Round ' + R.n + ' clear';
  $('clearLine').textContent = R.matched.size + ' matched · ' + R.misses + (R.misses === 1 ? ' miss' : ' misses') + ' · ' + acc + '% accuracy' + (R.peeks ? ' · ' + R.peeks + (R.peeks === 1 ? ' peek' : ' peeks') : '');
  sfx('clear');
  announce('Round ' + R.n + ' clear. ' + acc + ' percent accuracy.');
  $('nextBtn').focus({preventScroll:true});
}

/* tap mode, also keyboard */
let suppressClick = false;
trayEl.addEventListener('click', e => {
  const t = e.target.closest('.tile'); if (!t || t.disabled) return;
  if (suppressClick){ suppressClick = false; return; }
  unlockAudio();
  if (selected === t) deselect(); else select(t);
});
slotsEl.addEventListener('click', e => {
  const s = e.target.closest('.slot'); if (!s || s.classList.contains('done')) return;
  unlockAudio();
  if (selected) attempt(selected, s);
  else { const first = trayEl.querySelector('.tile:not(.gone)'); if (first) { first.focus(); } }
});

/* drag mode with pointer events (mouse, touch, pen) */
let drag = null;
trayEl.addEventListener('pointerdown', e => {
  const t = e.target.closest('.tile'); if (!t || t.disabled) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const rect = t.getBoundingClientRect();
  drag = { tile:t, id:e.pointerId, sx:e.clientX, sy:e.clientY, ox:e.clientX - rect.left, oy:e.clientY - rect.top, moved:false, ghost:null, over:null };
  try { t.setPointerCapture(e.pointerId); } catch(err) {}
});
window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved){
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true; unlockAudio();
    if (selected && selected !== drag.tile) deselect();
    const rect = drag.tile.getBoundingClientRect();
    const g = drag.tile.cloneNode(true);
    g.classList.remove('picked','nope','peek'); g.classList.add('ghost');
    g.removeAttribute('id'); g.setAttribute('aria-hidden','true'); g.tabIndex = -1;
    g.style.width = rect.width + 'px'; g.style.height = rect.height + 'px';
    document.body.appendChild(g);
    drag.ghost = g; drag.tile.classList.add('lifted');
  }
  e.preventDefault();
  const x = e.clientX - drag.ox, y = e.clientY - drag.oy;
  drag.ghost.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1.08) rotate(-3deg)';
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const s = el && el.closest ? el.closest('.slot:not(.done)') : null;
  if (s !== drag.over){
    if (drag.over) drag.over.classList.remove('over');
    if (s) s.classList.add('over');
    drag.over = s;
  }
}, { passive:false });

function endDrag(e, cancelled){
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.moved) return;
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  if (d.over) d.over.classList.remove('over');
  const g = d.ghost, from = g.style.transform;
  if (!cancelled && d.over){
    const ok = d.over.dataset.r === d.tile.dataset.r;
    if (ok){
      const sr = d.over.getBoundingClientRect(), gr = g.getBoundingClientRect();
      const tx = sr.left + sr.width / 2 - gr.width / 2, ty = sr.top + sr.height / 2 - gr.height / 2;
      const a = g.animate([{ transform:from, opacity:1 }, { transform:'translate(' + tx + 'px,' + ty + 'px) scale(.55)', opacity:0 }], { duration:200, easing:'ease-in' });
      a.onfinish = () => g.remove();
      d.tile.classList.remove('lifted');
      attempt(d.tile, d.over);
      return;
    }
    flyBack(d, from, () => attempt(d.tile, d.over));
    return;
  }
  flyBack(d, from);
}
function flyBack(d, from, after){
  const r = d.tile.getBoundingClientRect();
  const a = d.ghost.animate([{ transform:from }, { transform:'translate(' + r.left + 'px,' + r.top + 'px) scale(1)' }], { duration:220, easing:'cubic-bezier(.3,.7,.4,1)' });
  a.onfinish = () => { d.ghost.remove(); d.tile.classList.remove('lifted'); if (after) after(); };
}
window.addEventListener('pointerup', e => endDrag(e, false));
window.addEventListener('pointercancel', e => endDrag(e, true));

/* peek */
$('peekBtn').addEventListener('click', () => {
  const r = R.items.find(x => !R.matched.has(x)); if (!r) return;
  R.peeks++; deselect();
  const t = trayEl.querySelector('.tile[data-r="' + r + '"]'), s = slotsEl.querySelector('.slot[data-r="' + r + '"]');
  restart(t, 'peek'); restart(s, 'peek');
  setTimeout(() => { t.classList.remove('peek'); s.classList.remove('peek'); }, 1400);
  announce(glyphFor(r) + ' goes with ' + sound(r) + '.');
});
$('newBtn').addEventListener('click', () => newRound(R.matched.size === R.items.length));
$('nextBtn').addEventListener('click', () => newRound(true));

/* ---------------- switches ---------------- */
function setScript(sc){
  S.script = sc; savePrefs();
  document.querySelectorAll('[data-script]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.script === sc)));
  updateGlyphs();
}
document.querySelectorAll('[data-script]').forEach(b => b.addEventListener('click', () => setScript(b.dataset.script)));
document.querySelectorAll('[data-place]').forEach(b => b.addEventListener('click', () => { S.place = b.dataset.place; applyScene(); }));
document.querySelectorAll('[data-time]').forEach(b => b.addEventListener('click', () => { S.time = b.dataset.time; applyScene(); }));
$('soundBtn').addEventListener('click', () => {
  S.sound = !S.sound; savePrefs();
  $('soundBtn').setAttribute('aria-pressed', String(S.sound));
  if (S.sound){ unlockAudio(); sfx('good'); }
});

function applyScene(){
  document.body.dataset.place = S.place;
  document.body.dataset.scene = S.place + '-' + S.time;
  document.querySelectorAll('[data-place]').forEach(b => { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.place === S.place)); });
  document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.time === S.time)));
  savePrefs(); paintBase();
}

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') deselect();
  else if (k === 'h') setScript('hira');
  else if (k === 'k') setScript('kata');
  else if (k === 'm') setScript('mix');
  else if (k === 'n') newRound(R.matched.size === R.items.length);
});

/* ---------------- sound ---------------- */
let ac = null;
function unlockAudio(){
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch(e) {}
}
function note(f, start, dur, type, vol){
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start); o.stop(start + dur + 0.02);
}
function sfx(kind){
  if (!S.sound || !ac) return;
  try {
    const t = ac.currentTime, rural = S.place === 'rural';
    if (kind === 'good'){
      if (rural){ note(1046, t, .14, 'triangle', .22); note(1568, t + .005, .09, 'sine', .08); }
      else { note(784, t, .32, 'sine', .16); note(988, t + .14, .4, 'sine', .14); }
    } else if (kind === 'bad'){
      note(196, t, .2, rural ? 'triangle' : 'square', rural ? .18 : .05);
    } else if (kind === 'clear'){
      const scale = rural ? [587, 659, 784, 880, 1175] : [659, 784, 988, 1175, 1319];
      scale.forEach((f, i) => note(f, t + i * .11, .5, rural ? 'triangle' : 'sine', .13));
    }
  } catch(e) {}
}
function say(text){
  if (!S.sound || !('speechSynthesis' in window)) return;
  try {
    const voices = speechSynthesis.getVoices();
    const ja = voices.find(v => /^ja/i.test(v.lang));
    if (!ja) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.voice = ja; u.rate = .85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch(e) {}
}
try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); } catch(e) {}

/* ---------------- painted scene ---------------- */
const cvs = $('scene'), ctx = cvs.getContext('2d');
const base = document.createElement('canvas'), bctx = base.getContext('2d');
let W = 0, H = 0, DPR = 1, signs = [], railTop = 0, hz = 0;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  [cvs, base].forEach(c => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
  paintBase();
}
function glow(c, x, y, r, col){
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function stars(c, r, n, maxY){
  for (let i = 0; i < n; i++){
    const x = r() * W, y = r() * maxY, s = r() * 1.3 + .3;
    c.fillStyle = 'rgba(255,255,240,' + (.25 + r() * .6) + ')';
    c.fillRect(x, y, s, s);
  }
}
function ridge(c, y0, amp, ph, col){
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8){
    const y = y0 - amp * (.55 * Math.sin(x * .004 + ph) + .3 * Math.sin(x * .011 + ph * 2.1) + .15 * Math.sin(x * .027 + ph * 3.7));
    c.lineTo(x, y);
  }
  c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill();
}

function paintBase(){
  if (!W) return;
  const c = bctx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.clearRect(0, 0, W, H);
  const night = S.time === 'night';
  if (S.place === 'rural') paintRural(c, night); else paintUrban(c, night);
  if (reduce) frame(5000);
}

function paintRural(c, night){
  const r = rng(7); hz = H * .6;
  let g = c.createLinearGradient(0, 0, 0, hz);
  if (night){ g.addColorStop(0,'#060a20'); g.addColorStop(.65,'#18224c'); g.addColorStop(1,'#353b6c'); }
  else { g.addColorStop(0,'#74b2de'); g.addColorStop(.6,'#b8dbec'); g.addColorStop(1,'#f3ebd3'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  const mx = W * .82, my = H * .15, mr = Math.max(16, Math.min(W, H) * .036);
  if (night){
    stars(c, r, 200, hz * .9);
    glow(c, mx, my, mr * 6, 'rgba(255,240,205,.22)');
    c.fillStyle = '#fbf2d8'; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(200,190,160,.25)'; c.beginPath(); c.arc(mx - mr * .3, my - mr * .2, mr * .22, 0, 7); c.arc(mx + mr * .35, my + mr * .3, mr * .15, 0, 7); c.fill();
  } else {
    glow(c, mx, my, mr * 7, 'rgba(255,250,222,.6)');
    c.fillStyle = '#fffbea'; c.beginPath(); c.arc(mx, my, mr * .9, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 6; i++){
      const cx = r() * W, cy = H * (.06 + r() * .22), cw = 60 + r() * 120;
      c.fillStyle = 'rgba(255,255,255,' + (.55 + r() * .3) + ')';
      c.beginPath();
      c.ellipse(cx, cy, cw * .5, cw * .12, 0, 0, 7);
      c.ellipse(cx - cw * .18, cy - cw * .06, cw * .22, cw * .11, 0, 0, 7);
      c.ellipse(cx + cw * .12, cy - cw * .08, cw * .25, cw * .13, 0, 0, 7);
      c.fill();
    }
  }

  // the big volcano
  const fx = W * .3, fw = Math.max(W * .58, 440), peak = H * .23;
  c.save();
  c.beginPath(); c.moveTo(fx - fw / 2, hz);
  c.quadraticCurveTo(fx - fw * .17, hz - (hz - peak) * .55, fx - fw * .06, peak);
  c.lineTo(fx + fw * .06, peak);
  c.quadraticCurveTo(fx + fw * .17, hz - (hz - peak) * .55, fx + fw / 2, hz);
  c.closePath();
  c.fillStyle = night ? '#28305f' : '#7d9cbb'; c.fill();
  c.clip();
  const sy = peak + (hz - peak) * .3;
  c.beginPath(); c.moveTo(fx - fw * .35, sy);
  for (let i = 0; i <= 14; i++) c.lineTo(fx - fw * .35 + i * (fw * .7 / 14), sy + (i % 2 ? H * .028 : -H * .004));
  c.lineTo(fx + fw * .35, 0); c.lineTo(fx - fw * .35, 0); c.closePath();
  c.fillStyle = night ? '#a3aad5' : '#f6f9fc'; c.fill();
  c.restore();

  ridge(c, hz - H * .07, H * .05, 1.3, night ? '#1d2652' : '#6c9884');
  ridge(c, hz - H * .02, H * .035, 4.1, night ? '#141c3d' : '#477b53');

  // cedar grove and shrine gate on the left
  const gx = W * .15, gb = hz + H * .015;
  for (let i = 0; i < 9; i++){
    const tx = gx - W * .1 + r() * W * .2, th = H * (.08 + r() * .07), tw = th * .32;
    c.fillStyle = night ? '#0d1428' : (i % 2 ? '#2c5a35' : '#244d2d');
    c.beginPath(); c.moveTo(tx, gb - th); c.lineTo(tx + tw, gb); c.lineTo(tx - tw, gb); c.closePath(); c.fill();
  }
  const th = clamp(H * .11, 46, 110), tw = th * 1.05;
  const red = night ? '#7a2c27' : '#c8402c', blk = night ? '#120c10' : '#2a1a14';
  c.fillStyle = red;
  c.fillRect(gx - tw * .32, gb - th * .86, th * .075, th * .86);
  c.fillRect(gx + tw * .32 - th * .075, gb - th * .86, th * .075, th * .86);
  c.fillRect(gx - tw * .42, gb - th * .7, tw * .84, th * .07);
  c.beginPath();
  c.moveTo(gx - tw * .55, gb - th * .98);
  c.quadraticCurveTo(gx, gb - th * .86, gx + tw * .55, gb - th * .98);
  c.lineTo(gx + tw * .5, gb - th * .86);
  c.quadraticCurveTo(gx, gb - th * .78, gx - tw * .5, gb - th * .86);
  c.closePath(); c.fill();
  c.fillStyle = blk;
  c.beginPath();
  c.moveTo(gx - tw * .56, gb - th * 1.02);
  c.quadraticCurveTo(gx, gb - th * .9, gx + tw * .56, gb - th * 1.02);
  c.lineTo(gx + tw * .55, gb - th * .97);
  c.quadraticCurveTo(gx, gb - th * .86, gx - tw * .55, gb - th * .97);
  c.closePath(); c.fill();

  // terraced rice paddies, golden for the autumn harvest
  const dayCols = ['#d4ae45','#c49b36','#9fb653','#dcbb57','#b9a03e'];
  const nightCols = ['#18272b','#1d2e31','#152225','#1b2a2c'];
  let y = hz, bh = 5, i = 0;
  while (y < H + 10){
    const amp = Math.min(7, bh * .14), ph = i * 1.7;
    const col = night ? nightCols[i % nightCols.length] : dayCols[Math.floor(r() * dayCols.length)];
    c.beginPath(); c.moveTo(0, y + Math.sin(ph) * amp);
    for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, y + Math.sin(x * .006 + ph) * amp);
    c.lineTo(W, H); c.lineTo(0, H); c.closePath();
    c.fillStyle = col; c.fill();
    c.strokeStyle = night ? '#0c1416' : '#7d6a2c'; c.lineWidth = Math.max(1, bh * .07); c.stroke();
    if (!night && bh > 16){
      c.strokeStyle = 'rgba(110,80,20,.28)'; c.lineWidth = 1;
      const n = Math.floor(W / 9);
      for (let k = 0; k < n; k++){
        const sx = r() * W, sy2 = y + Math.sin(sx * .006 + ph) * amp + 4 + r() * (bh - 6);
        c.beginPath(); c.moveTo(sx, sy2); c.lineTo(sx + 2, sy2 - Math.min(10, bh * .25)); c.stroke();
      }
    }
    y += bh; bh *= 1.33; i++;
  }
  if (night){
    for (let k = 0; k < 16; k++){
      const yy = hz + 8 + k * k * 1.6;
      if (yy > H) break;
      c.fillStyle = 'rgba(255,240,200,' + (.22 - k * .012) + ')';
      c.beginPath(); c.ellipse(mx, yy, 8 + k * 2.6, 1.2 + k * .18, 0, 0, 7); c.fill();
    }
  }

  // farmhouse with a thatched roof, and a persimmon tree
  const s = clamp(W * .1, 70, 150), x0 = W * .7, fb = hz + H * .035;
  c.fillStyle = night ? '#3a3953' : '#efe4cc';
  c.fillRect(x0 - s / 2, fb - s * .42, s, s * .42);
  c.fillStyle = night ? '#1c1a28' : '#5a3f26';
  for (let k = 0; k <= 4; k++) c.fillRect(x0 - s / 2 + k * (s / 4) - 1.5, fb - s * .42, 3, s * .42);
  c.fillStyle = night ? '#ffc96a' : '#3b2a1c';
  c.fillRect(x0 - s * .3, fb - s * .3, s * .2, s * .16);
  c.fillRect(x0 + s * .1, fb - s * .3, s * .2, s * .16);
  if (night){ glow(c, x0 - s * .2, fb - s * .22, s * .45, 'rgba(255,190,90,.35)'); glow(c, x0 + s * .2, fb - s * .22, s * .45, 'rgba(255,190,90,.3)'); }
  c.fillStyle = night ? '#2b2434' : '#8d6c40';
  c.beginPath();
  c.moveTo(x0 - s * .7, fb - s * .38); c.lineTo(x0 - s * .3, fb - s * .98);
  c.lineTo(x0 + s * .3, fb - s * .98); c.lineTo(x0 + s * .7, fb - s * .38); c.closePath(); c.fill();
  c.strokeStyle = night ? 'rgba(0,0,0,.35)' : 'rgba(70,45,15,.35)'; c.lineWidth = 1;
  for (let k = 0; k < 14; k++){
    const xx = x0 - s * .6 + k * s * .09;
    c.beginPath(); c.moveTo(xx, fb - s * .4); c.lineTo(xx + s * .06, fb - s * .9); c.stroke();
  }
  c.fillStyle = night ? '#16121c' : '#3d2b18';
  c.fillRect(x0 - s * .32, fb - s * 1.02, s * .64, s * .07);

  const kx = x0 + s * .95, kr = s * .34;
  c.fillStyle = night ? '#1d1418' : '#4b3221';
  c.fillRect(kx - 3, fb - kr * 1.2, 6, kr * 1.2);
  c.fillStyle = night ? '#132219' : '#3f6b35';
  c.beginPath(); c.arc(kx, fb - kr * 1.55, kr, 0, 7); c.arc(kx - kr * .6, fb - kr * 1.3, kr * .65, 0, 7); c.arc(kx + kr * .6, fb - kr * 1.35, kr * .62, 0, 7); c.fill();
  c.fillStyle = night ? '#9a4a26' : '#ec7a2c';
  for (let k = 0; k < 12; k++){
    const a = r() * Math.PI * 2, d = r() * kr * .9;
    c.beginPath(); c.arc(kx + Math.cos(a) * d * 1.2, fb - kr * 1.45 + Math.sin(a) * d * .7, Math.max(2.5, s * .028), 0, 7); c.fill();
  }

  // utility poles and sagging wires
  const poles = [W * .44, W * .57], pb = hz + H * .03, ph2 = H * .16;
  c.strokeStyle = night ? '#0a0d1a' : '#3b3226'; c.lineWidth = 3;
  poles.forEach(px => { c.beginPath(); c.moveTo(px, pb); c.lineTo(px, pb - ph2); c.moveTo(px - 12, pb - ph2 + 8); c.lineTo(px + 12, pb - ph2 + 8); c.stroke(); });
  c.lineWidth = 1; c.strokeStyle = night ? 'rgba(10,13,26,.8)' : 'rgba(50,40,30,.6)';
  [[-40, poles[0]], [poles[0], poles[1]], [poles[1], W + 40]].forEach(([a, b]) => {
    [-10, 10].forEach(o => {
      const ya = pb - ph2 + 8;
      c.beginPath(); c.moveTo(a + o, ya); c.quadraticCurveTo((a + b) / 2, ya + 18, b + o, ya); c.stroke();
    });
  });
}

function paintUrban(c, night){
  const r = rng(11); hz = H * .62;
  let g = c.createLinearGradient(0, 0, 0, hz);
  if (night){ g.addColorStop(0,'#05060f'); g.addColorStop(.6,'#151238'); g.addColorStop(1,'#3d1d52'); }
  else { g.addColorStop(0,'#86c4ee'); g.addColorStop(.65,'#cfe7f2'); g.addColorStop(1,'#f0e9da'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (night){ stars(c, r, 50, hz * .5); glow(c, W * .5, hz, W * .6, 'rgba(255,61,139,.12)'); }
  else glow(c, W * .15, H * .12, Math.min(W, H) * .3, 'rgba(255,250,225,.55)');

  // far skyline
  let x = -10;
  while (x < W){
    const w = 20 + r() * 50, h = H * (.06 + r() * .2);
    c.fillStyle = night ? '#1b1838' : '#a9c1d4';
    c.fillRect(x, hz - h, w, h + H);
    if (night){
      c.fillStyle = 'rgba(255,214,140,.35)';
      for (let k = 0; k < h * w / 500; k++) c.fillRect(x + 3 + r() * (w - 6), hz - h + 4 + r() * h, 2, 2);
    }
    x += w + r() * 3;
  }

  // lattice broadcast tower
  const tx = W * .76, tb = hz + H * .02, tH = H * .44;
  tower(c, tx, tb, tH, night);

  // near buildings with window grids and shop signs
  const nb = H * .82; signs = [];
  const dayBody = ['#d9d3c5','#c9ced3','#b6c1c9','#e5ddcf','#a5b2bc','#cfc6b8'];
  const nightBody = ['#11112a','#171535','#0d0f22','#14122e'];
  const words = ['ラーメン','カラオケ','くすり','ほんや','カフェ','すし','ホテル','ゲーム','うどん','パン'];
  const neon = ['#ff3d8b','#29e3ff','#ffd23d','#7dff6a','#ff8a3d'];
  const dayInk = ['#d0342c','#1f5fbf','#2f9e44','#17202b'];
  x = -20; let wi = 0;
  while (x < W + 20){
    const w = 50 + r() * 110, h = H * (.13 + r() * .3), top = nb - h;
    c.fillStyle = night ? nightBody[Math.floor(r() * nightBody.length)] : dayBody[Math.floor(r() * dayBody.length)];
    c.fillRect(x, top, w, h + H);
    if (!night){ c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(x + w - 6, top, 6, h); }
    const cols = Math.floor((w - 10) / 13), rows = Math.floor((h - 12) / 17);
    for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++){
      const wx = x + 7 + cx * 13, wy = top + 9 + ry * 17;
      if (night){
        const lit = r() < .34;
        c.fillStyle = lit ? (r() < .7 ? '#ffd27a' : '#cfe4ff') : '#1d1e3c';
      } else c.fillStyle = r() < .2 ? '#e7f1f8' : '#7f95aa';
      c.fillRect(wx, wy, 7, 10);
    }
    if (w > 70 && h > H * .2 && r() < .55){
      const word = words[wi++ % words.length], sh = word.length * 22 + 12;
      if (sh < h - 20){
        signs.push({ x:x + w - 30, y:top + 12, w:24, h:sh, word, col:night ? neon[Math.floor(r() * neon.length)] : dayInk[Math.floor(r() * dayInk.length)], ph:r() * 100 });
      }
    }
    x += w + 2 + r() * 8;
  }

  // elevated railway and street
  railTop = H * .8;
  const bh = Math.max(10, H * .026);
  c.fillStyle = night ? '#0a0a16' : '#5f646c';
  c.fillRect(0, railTop + bh, W, H);
  c.fillStyle = night ? '#ffd23d33' : 'rgba(255,255,255,.55)';
  for (let k = 0; k < W; k += 46) c.fillRect(k, H * .93, 24, 3);
  c.fillStyle = night ? '#1c1b30' : '#b8b2a6';
  for (let k = 20; k < W; k += 140) c.fillRect(k, railTop + bh, Math.max(10, bh * .9), H);
  c.fillStyle = night ? '#24233d' : '#cdc7bb';
  c.fillRect(0, railTop, W, bh);
  c.fillStyle = night ? '#100f1f' : '#9c968a';
  c.fillRect(0, railTop + bh - 3, W, 3);
  c.strokeStyle = night ? 'rgba(160,160,200,.35)' : 'rgba(40,40,40,.4)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, railTop - H * .045); c.lineTo(W, railTop - H * .045); c.stroke();
  for (let k = 60; k < W; k += 180){
    c.beginPath(); c.moveTo(k, railTop); c.lineTo(k, railTop - H * .055); c.stroke();
  }
}

function tower(c, x, b, h, night){
  const hw = h * .17, top = b - h * .86;
  const hwAt = y => hw * Math.pow((y - top) / (b - top), 1.35) + h * .012;
  c.save();
  c.beginPath(); c.moveTo(x - hw, b); c.lineTo(x - h * .012, top); c.lineTo(x + h * .012, top); c.lineTo(x + hw, b); c.closePath();
  c.fillStyle = night ? 'rgba(255,140,60,.07)' : 'rgba(226,72,47,.14)'; c.fill();
  if (night){ c.shadowBlur = 8; c.shadowColor = '#ff7a1a'; }
  const seg = 18;
  for (let k = 0; k < seg; k++){
    const y1 = b - (b - top) * k / seg, y2 = b - (b - top) * (k + 1) / seg;
    const band = Math.floor(k / 2) % 2;
    c.strokeStyle = night ? '#ff9a3c' : (band ? '#f4f1ea' : '#e2482f');
    c.lineWidth = 2;
    const w1 = hwAt(y1), w2 = hwAt(y2);
    c.beginPath();
    c.moveTo(x - w1, y1); c.lineTo(x - w2, y2);
    c.moveTo(x + w1, y1); c.lineTo(x + w2, y2);
    c.moveTo(x - w1, y1); c.lineTo(x + w2, y2);
    c.moveTo(x + w1, y1); c.lineTo(x - w2, y2);
    c.stroke();
  }
  [.38, .62].forEach((f, i) => {
    const y = b - (b - top) * f, w = hwAt(y) * 1.5;
    c.fillStyle = night ? '#ffb46b' : (i ? '#e2482f' : '#f4f1ea');
    c.fillRect(x - w, y - h * .02, w * 2, h * .028);
  });
  c.strokeStyle = night ? '#ffcf8a' : '#e2482f'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(x, top); c.lineTo(x, b - h); c.stroke();
  c.restore();
}

/* moving bits: dragonflies, fireflies, the train and the shop signs */
const rf = rng(99);
const flies = Array.from({ length:7 }, () => ({ bx:.1 + rf() * .8, by:.25 + rf() * .3, ph:rf() * 100, sp:.6 + rf() * .8 }));
const bugs = Array.from({ length:46 }, () => ({ bx:rf(), by:rf(), ph:rf() * 100, sp:.5 + rf() }));

function frame(t){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.drawImage(base, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const night = S.time === 'night';
  if (S.place === 'rural'){
    if (!night){
      flies.forEach(f => {
        const x = f.bx * W + Math.sin(t * .0005 * f.sp + f.ph) * W * .08 + Math.sin(t * .0023 + f.ph) * 14;
        const y = f.by * H + Math.sin(t * .0007 * f.sp + f.ph * 2) * H * .05 + Math.cos(t * .003 + f.ph) * 6;
        const a = Math.cos(t * .0005 * f.sp + f.ph) > 0 ? 0 : Math.PI;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        const flap = Math.sin(t * .05 + f.ph) * .25;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.ellipse(-1, -5, 2.4, 7, -.35 + flap, 0, 7); ctx.ellipse(-1, 5, 2.4, 7, .35 - flap, 0, 7);
        ctx.ellipse(3, -5, 2, 6, .4 + flap, 0, 7); ctx.ellipse(3, 5, 2, 6, -.4 - flap, 0, 7); ctx.fill();
        ctx.strokeStyle = '#c8361e'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#9e2a15'; ctx.beginPath(); ctx.arc(7, 0, 2.2, 0, 7); ctx.fill();
        ctx.restore();
      });
    } else {
      bugs.forEach(b => {
        const x = b.bx * W + Math.sin(t * .0004 * b.sp + b.ph) * 30;
        const y = hz + (b.by * .9) * (H - hz) - 20 + Math.cos(t * .0005 * b.sp + b.ph) * 18;
        const a = Math.max(0, Math.sin(t * .002 * b.sp + b.ph));
        if (a < .05) return;
        glow(ctx, x, y, 10, 'rgba(214,255,120,' + (.45 * a) + ')');
        ctx.fillStyle = 'rgba(240,255,180,' + a + ')';
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
      });
    }
  } else {
    signs.forEach(s => {
      let on = 1;
      if (night && Math.sin(t * .011 + s.ph) > .985) on = .25;
      ctx.save();
      if (night){
        ctx.fillStyle = 'rgba(8,6,22,.9)'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.shadowBlur = 12 * on; ctx.shadowColor = s.col;
        ctx.globalAlpha = on;
      } else {
        ctx.fillStyle = '#fffaf0'; ctx.fillRect(s.x, s.y, s.w, s.h);
      }
      ctx.strokeStyle = s.col; ctx.lineWidth = night ? 1.5 : 2; ctx.strokeRect(s.x + .5, s.y + .5, s.w - 1, s.h - 1);
      ctx.fillStyle = s.col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 16px "Zen Maru Gothic","Hiragino Sans",sans-serif';
      [...s.word].forEach((ch, i) => ctx.fillText(ch, s.x + s.w / 2, s.y + 17 + i * 22));
      ctx.restore();
    });
    const cars = 5, cw = Math.max(90, W * .085), ch = Math.max(16, H * .032), gap = 4;
    const len = cars * (cw + gap), speed = W / 8000, cycle = W + len + W * .7;
    const x0 = (t * speed) % cycle - len;
    for (let k = 0; k < cars; k++){
      const x = x0 + k * (cw + gap), y = railTop - ch;
      if (x > W || x + cw < 0) continue;
      ctx.fillStyle = night ? '#2b2e40' : '#eef0f2';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, cw, ch, k === cars - 1 ? [3, 10, 3, 3] : 3); else ctx.rect(x, y, cw, ch);
      ctx.fill();
      ctx.fillStyle = '#3fa34d'; ctx.fillRect(x, y + ch * .66, cw, ch * .14);
      ctx.fillStyle = night ? '#fff0bd' : '#3a4b5c';
      for (let w = 6; w < cw - 10; w += 14) ctx.fillRect(x + w, y + ch * .18, 9, ch * .36);
      if (night){ ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#fff0bd'; ctx.fillRect(x, y + ch, cw, 6); ctx.restore(); }
    }
  }
}

let last = 0;
function loop(t){
  if (t - last > 33){ frame(t); last = t; }
  requestAnimationFrame(loop);
}
let rz = null;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(resize, 120); });

/* ---------------- boot ---------------- */
function boot(data){
  loadPrefs(data && data.S);
  document.querySelectorAll('[data-script]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.script === S.script)));
  $('soundBtn').setAttribute('aria-pressed', String(S.sound));
  if (data && data.R && Array.isArray(data.R.items)) R.n = data.R.n || 1;
  applyScene();
  resize();
  newRound(false);
  if (!reduce) requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => frame(performance.now()));
}
try { window.claude?.hot?.snapshot?.(() => ({ S:{ ...S }, R:{ n:R.n, items:R.items } })); } catch(e) {}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
