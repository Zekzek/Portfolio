'use strict';
// Table Cards: pick a card on Scryfall, apply copy exceptions, render it for a display.
// Everything runs in the phone's browser; Scryfall is called directly, one request per user action.

const API = 'https://api.scryfall.com';
const STORE_KEY = 'tablecards.v1';
const SLOT_COUNT = 4;

const TARGETS = {
  lcd:    { w: 320, h: 480, label: 'LCD 4" · 320×480' },
  grey:   { w: 540, h: 960, label: 'E-paper 4.7" greyscale · 540×960', grey: true },
  epaper: { w: 400, h: 600, label: 'E-paper 4" colour · 400×600', dither: true },
  phone:  { w: 672, h: 936, label: 'Phone · full size' },
};

const ACCENT = '#d81b60';
const PATCH_BG = '#f4efe3';
const MANA = { W: '#f6f1d1', U: '#2f6fd0', B: '#2d2826', R: '#d3202a', G: '#1f8a4c', C: '#b9b3ad' };
const MANA_INK = { W: '#3a3320', U: '#fff', B: '#fff', R: '#fff', G: '#fff', C: '#222' };
const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];
const SUPERTYPES = ['Legendary', 'Basic', 'Snow', 'World', 'Ongoing', 'Host'];
const CARD_TYPES = ['artifact', 'creature', 'enchantment', 'land', 'planeswalker', 'battle', 'kindred', 'tribal', 'instant', 'sorcery'];

// Where things sit on a card image, as fractions of width/height: [x0, y0, x1, y1].
// Measured on Scryfall scans of the 2015 (M15) and 2003 (8th edition) frames.
const FRAMES = {
  '2015': { name: [0.072, 0.047, 0.70, 0.098], type: [0.072, 0.566, 0.86, 0.613], pt: [0.78, 0.894, 0.928, 0.957] },
  '2003': { name: [0.085, 0.053, 0.70, 0.103], type: [0.085, 0.566, 0.80, 0.613], pt: [0.748, 0.894, 0.922, 0.955] },
};
const ART_BOTTOM = 0.555;   // banner sits just above the type line
const PATCH_LAYOUTS = ['normal', 'transform', 'modal_dfc', 'token', 'double_faced_token', 'meld', 'adventure'];
const ODD_FRAME_EFFECTS = ['showcase', 'extendedart', 'fullart', 'inverted', 'etched', 'shatteredglass', 'borderless', 'textless'];

// ---------- state ----------

const blankOv = () => ({ name: '', p: '', t: '', colors: null, subs: '', subsMode: 'replace',
  types: '', typesMode: 'replace', addText: '', notLegendary: false, token: false });
const blankSlot = () => ({ card: null, face: 0, ov: blankOv(), view: 'image', target: 'lcd' });

let state = { active: 0, slots: Array.from({ length: SLOT_COUNT }, blankSlot) };
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved && Array.isArray(saved.slots)) {
    state.active = Math.min(saved.active | 0, SLOT_COUNT - 1);
    saved.slots.slice(0, SLOT_COUNT).forEach((s, i) => {
      state.slots[i] = { ...blankSlot(), ...s, ov: { ...blankOv(), ...(s.ov || {}) } };
    });
  }
} catch { /* private window etc. */ }
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { } };
const slot = () => state.slots[state.active];

// ---------- helpers ----------

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cap = (w) => w ? w[0].toUpperCase() + w.slice(1) : w;
const words = (s) => (s || '').split(/[\s,]+/).filter(Boolean).map(cap);
const uniq = (a) => [...new Set(a)];

function status(msg, err = false) {
  const el = $('status');
  el.textContent = msg || '';
  el.classList.toggle('err', !!err);
}

// Scryfall asks for 50-100 ms between requests.
let nextSlot = 0;
async function sf(path, signal) {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Date.now() + wait + 100;
  if (wait) await sleep(wait);
  const r = await fetch(API + path, { signal, headers: { Accept: 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.details || `Scryfall: ${r.status}`), { status: r.status });
  return j;
}

const imgCache = new Map();
function loadImg(url) {
  if (!url) return Promise.resolve(null);
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((res) => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => { imgCache.delete(url); res(null); };
      im.src = url;
    }));
  }
  return imgCache.get(url);
}

// Keep only what rendering needs, so saved slots stay small.
function trimCard(c) {
  const f = (o) => o && ({
    name: o.name, mana_cost: o.mana_cost, type_line: o.type_line, oracle_text: o.oracle_text,
    power: o.power, toughness: o.toughness, loyalty: o.loyalty, defense: o.defense, colors: o.colors,
    image_uris: o.image_uris && { large: o.image_uris.large, art_crop: o.image_uris.art_crop },
  });
  return {
    ...f(c), id: c.id, layout: c.layout, frame: c.frame, frame_effects: c.frame_effects || [],
    border_color: c.border_color, set: c.set, collector_number: c.collector_number,
    scryfall_uri: c.scryfall_uri, card_faces: c.card_faces && c.card_faces.map(f),
  };
}

// The face to show: its own text, image and frame info.
function faceOf(s) {
  const c = s.card;
  const base = { frame: c.frame, frame_effects: c.frame_effects, border_color: c.border_color, layout: c.layout, faces: 1 };
  const fs = c.card_faces;
  if (fs && fs[0].image_uris) {           // double-faced: each face has its own picture
    const f = fs[s.face % fs.length];
    return { ...base, ...f, colors: f.colors || c.colors, img: f.image_uris.large, art: f.image_uris.art_crop, faces: fs.length };
  }
  if (fs) {                               // split / adventure / flip: one picture, several texts
    return {
      ...base, name: c.name, mana_cost: fs[0].mana_cost, type_line: fs[0].type_line,
      power: fs[0].power ?? c.power, toughness: fs[0].toughness ?? c.toughness, colors: c.colors,
      oracle_text: fs.map((f, i) => (i ? `— ${f.name} ${f.mana_cost || ''} · ${f.type_line || ''}\n` : '') + (f.oracle_text || '')).join('\n'),
      img: c.image_uris?.large, art: c.image_uris?.art_crop,
    };
  }
  return { ...base, ...c, img: c.image_uris?.large, art: c.image_uris?.art_crop };
}

// ---------- copy exceptions ----------

function parseType(tl) {
  const [left, right = ''] = (tl || '').split(/\s+—\s+/);
  const ws = left.trim().split(/\s+/).filter(Boolean);
  return { supers: ws.filter((w) => SUPERTYPES.includes(w)), types: ws.filter((w) => !SUPERTYPES.includes(w)),
    subs: right.trim() ? right.trim().split(/\s+/) : [] };
}

function applyOv(f, ov) {
  const t = parseType(f.type_line);
  if (ov.notLegendary) t.supers = t.supers.filter((x) => x !== 'Legendary');
  const nt = words(ov.types), ns = words(ov.subs);
  if (nt.length) t.types = ov.typesMode === 'add' ? uniq([...t.types, ...nt]) : nt;
  if (ns.length) t.subs = ov.subsMode === 'add' ? uniq([...t.subs, ...ns]) : ns;
  const type_line = [...t.supers, ...t.types].join(' ') + (t.subs.length ? ' — ' + t.subs.join(' ') : '');
  const colors = ov.colors ?? f.colors ?? [];
  const p = ov.p !== '' ? ov.p : f.power, tt = ov.t !== '' ? ov.t : f.toughness;
  const same = (a, b) => [...(a || [])].sort().join() === [...(b || [])].sort().join();
  return {
    name: ov.name.trim() || f.name,
    type_line, colors, power: p, toughness: tt,
    addText: ov.addText.trim(), token: ov.token,
    changed: {
      name: !!ov.name.trim() && ov.name.trim() !== f.name,
      type: type_line !== f.type_line,
      colors: ov.colors !== null && !same(ov.colors, f.colors),
      pt: (ov.p !== '' && ov.p !== f.power) || (ov.t !== '' && ov.t !== f.toughness),
    },
  };
}

// "4/4 black Zombie", "an artifact in addition to its other types", "1/1 white Spirit with flying"
function parseExcept(s) {
  const o = {};
  s = ' ' + s.replace(/[’‘]/g, "'") + ' ';
  const pt = s.match(/([0-9]+|X|\*)\s*\/\s*([0-9]+|X|\*)/i);
  if (pt) { o.p = pt[1].toUpperCase(); o.t = pt[2].toUpperCase(); s = s.replace(pt[0], ' '); }
  const add = /in addition/i.test(s);
  const ab = s.match(/\b(?:with|has|have|gains?)\s+(.+)$/i);
  if (ab) { o.addText = cap(ab[1].trim().replace(/\.$/, '')); s = s.slice(0, ab.index); }
  const colorWords = { white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' };
  const cols = Object.entries(colorWords).filter(([w]) => new RegExp(`\\b${w}\\b`, 'i').test(s)).map(([, c]) => c);
  if (/\bcolorless\b/i.test(s)) o.colors = [];
  else if (cols.length) o.colors = cols;
  if (/\b(non-?legendary|not legendary|isn't legendary)\b/i.test(s)) o.notLegendary = true;
  if (/\btoken\b/i.test(s)) o.token = true;
  const stop = new Set(['except', 'it', 'its', "it's", 'is', 'a', 'an', 'the', 'and', 'in', 'addition', 'to', 'other',
    'types', 'type', 'token', 'that', 'copy', 'of', 'legendary', 'nonlegendary', 'non-legendary', 'not', "isn't",
    'colorless', 'color', 'colors', 'creature-type', 'subtype', 'subtypes', 'named', 'also', 'still', 'all',
    ...Object.keys(colorWords)]);
  const types = [], subs = [];
  for (const raw of s.split(/[\s,.;]+/)) {
    const w = raw.trim(); if (!w) continue;
    const lw = w.toLowerCase();
    if (CARD_TYPES.includes(lw)) types.push(cap(lw));
    else if (!stop.has(lw) && /^[a-z][a-z'-]*$/i.test(w)) subs.push(cap(w));
  }
  if (types.length) { o.types = types.join(' '); o.typesMode = add ? 'add' : 'replace'; }
  if (subs.length) { o.subs = subs.join(' '); o.subsMode = add ? 'add' : 'replace'; }
  return o;
}

// ---------- rendering ----------

function usesPatches(f) {
  return FRAMES[f.frame] && PATCH_LAYOUTS.includes(f.layout) && f.border_color !== 'borderless' &&
    !(f.frame_effects || []).some((e) => ODD_FRAME_EFFECTS.includes(e)) &&
    !/Planeswalker|Saga|Class|Battle|Case/.test(f.type_line || '');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function fitFont(ctx, text, maxW, size, weight = '700', family = 'Georgia, "Times New Roman", serif') {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; } while (ctx.measureText(text).width > maxW && --s > 6);
  return s;
}

function colorDots(ctx, colors, x, cy, r) {
  const list = colors.length ? COLOR_ORDER.filter((c) => colors.includes(c)) : ['C'];
  for (const c of list) {
    ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = MANA[c]; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = '#0008'; ctx.stroke();
    if (r >= 5) {   // the letter too, so colours still read on a greyscale panel
      const f = ctx.font, a = ctx.textAlign, b = ctx.textBaseline;
      ctx.font = `800 ${Math.round(r * 1.25)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = MANA_INK[c];
      ctx.fillText(c, x + r, cy + r * 0.05);
      ctx.font = f; ctx.textAlign = a; ctx.textBaseline = b;
    }
    x += r * 2 + r * 0.5;
  }
  return x;
}

// A changed field drawn over the card: parchment box, accent border.
function patch(ctx, W, H, box, text, { center = false, dots = null } = {}) {
  const [x0, y0, x1, y1] = box;
  const x = x0 * W, y = y0 * H, w = (x1 - x0) * W, h = (y1 - y0) * H;
  const lw = Math.max(2, W * 0.007);
  roundRect(ctx, x, y, w, h, h * 0.22);
  ctx.fillStyle = PATCH_BG; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = ACCENT; ctx.stroke();
  let tx = x + h * 0.25;
  if (dots) tx = colorDots(ctx, dots, tx, y + h / 2, h * 0.2) + h * 0.1;
  const size = fitFont(ctx, text, x + w - tx - h * 0.2, Math.round(h * (center ? 0.72 : 0.6)));
  ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
  if (center) { ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + h / 2 + size * 0.04); }
  else { ctx.textAlign = 'left'; ctx.fillText(text, tx, y + h / 2 + size * 0.04); }
  ctx.textAlign = 'left';
}

function wrapPlain(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      const tryL = line ? line + ' ' + w : w;
      if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
    }
    out.push(line);
  }
  return out;
}

// Box of text lines stacked upward from `bottom` (fraction of H): used for "also has" and the banner.
function banner(ctx, W, H, lines, bottom, { dots = null } = {}) {
  if (!lines.length) return;
  const x = W * 0.075, w = W * 0.85, pad = W * 0.025;
  const fs = Math.round(H * 0.032);
  ctx.font = `700 ${fs}px Georgia, "Times New Roman", serif`;
  const wrapped = lines.flatMap((l) => wrapPlain(ctx, l, w - pad * 2 - (dots ? fs * 1.6 : 0)));
  const lh = fs * 1.22, h = wrapped.length * lh + pad * 1.2;
  const y = bottom * H - h - H * 0.004;
  roundRect(ctx, x, y, w, h, fs * 0.5);
  ctx.fillStyle = PATCH_BG + 'f0'; ctx.fill();
  ctx.lineWidth = Math.max(2, W * 0.007); ctx.strokeStyle = ACCENT; ctx.stroke();
  ctx.fillStyle = '#111'; ctx.textBaseline = 'middle';
  let tx = x + pad;
  if (dots) tx = colorDots(ctx, dots, tx, y + pad * 0.6 + lh / 2, fs * 0.36) + fs * 0.3;
  wrapped.forEach((l, i) => ctx.fillText(l, tx, y + pad * 0.6 + lh * (i + 0.5)));
}

function tokenBadge(ctx, W, H) {
  const fs = Math.round(H * 0.03), x = W * 0.09, y = H * 0.118;
  ctx.font = `800 ${fs}px system-ui, sans-serif`;
  const w = ctx.measureText('TOKEN').width + fs;
  roundRect(ctx, x, y, w, fs * 1.5, fs * 0.4);
  ctx.fillStyle = ACCENT; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText('TOKEN', x + fs / 2, y + fs * 0.78);
}

// Pictures go on `base` (dithered for e-paper); text and patches go on `ctx`, the overlay
// (snapped to the panel's inks without dithering, so letters stay crisp).
async function renderImage(base, ctx, W, H, f, o) {
  const im = await loadImg(f.img);
  if (!im) return renderText(base, ctx, W, H, f, o, 'Image unavailable');
  base.drawImage(im, 0, 0, W, H);
  const c = o.changed;
  if (usesPatches(f)) {
    const fr = FRAMES[f.frame];
    if (c.name) patch(ctx, W, H, fr.name, o.name);
    if (c.type || c.colors) patch(ctx, W, H, fr.type, o.type_line, { dots: c.colors ? o.colors : null });
    if (c.pt) patch(ctx, W, H, fr.pt, `${o.power ?? '?'}/${o.toughness ?? '?'}`, { center: true });
    if (o.addText) banner(ctx, W, H, [o.addText], ART_BOTTOM);
  } else {
    const lines = [];
    if (c.name) lines.push(o.name);
    if (c.type || c.colors) lines.push(o.type_line);
    if (c.pt) lines.push(`${o.power ?? '?'}/${o.toughness ?? '?'}`);
    if (o.addText) lines.push(o.addText);
    banner(ctx, W, H, lines, ART_BOTTOM, { dots: c.colors ? o.colors : null });
  }
  if (o.token) tokenBadge(ctx, W, H);
}

// --- large-text card: name, art strip, type line, rules text sized to fit, P/T ---

// Paragraphs -> words -> segments, so "{T}:" and "{G}." stay one word.
function tokenize(text) {
  return text.split('\n').map((para) => para.split(/\s+/).filter(Boolean).map((w) => w.match(/\{[^}]+\}|[^{]+/g)));
}
const segW = (ctx, seg, fs) => seg.startsWith('{') ? fs : ctx.measureText(seg).width;
const wordW = (ctx, word, fs) => word.reduce((a, s) => a + segW(ctx, s, fs), 0);

function symColor(sym) {
  const s = sym.replace(/[{}]/g, '');
  if (MANA[s]) return [MANA[s], MANA_INK[s], s];
  const parts = s.split('/');
  const c = parts.find((p) => MANA[p]);
  if (s === 'T' || s === 'Q') return ['#ffffff', '#222', s];
  return [c ? MANA[c] : MANA.C, c ? MANA_INK[c] : '#222', s];
}

function layoutParas(ctx, paras, fs, maxW) {
  ctx.font = `500 ${fs}px system-ui, "Segoe UI", Roboto, sans-serif`;
  const space = ctx.measureText(' ').width;
  const lines = [];
  for (const p of paras) {
    let line = [], w = 0;
    for (const t of p.toks) {
      const tw = wordW(ctx, t, fs);
      if (line.length && w + space + tw > maxW) { lines.push({ toks: line, color: p.color }); line = []; w = 0; }
      line.push(t); w += (line.length > 1 ? space : 0) + tw;
    }
    lines.push({ toks: line, color: p.color, paraEnd: true });
  }
  return lines;
}

function drawSym(ctx, sym, x, cy, fs) {
  const [bg, ink, label] = symColor(sym);
  const r = fs * 0.46;
  ctx.beginPath(); ctx.arc(x + r, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = Math.max(1, fs * 0.06); ctx.strokeStyle = '#0007'; ctx.stroke();
  ctx.fillStyle = ink; ctx.textAlign = 'center';
  const save = ctx.font;
  ctx.font = `700 ${fs * (label.length > 2 ? 0.42 : 0.62)}px system-ui, sans-serif`;
  ctx.fillText(label, x + r, cy + fs * 0.03);
  ctx.font = save; ctx.textAlign = 'left';
}

async function renderText(base, ctx, W, H, f, o, note) {
  const pad = W * 0.05;
  base.fillStyle = '#fbfaf6'; base.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  let y = pad;

  // name + cost
  const costToks = (f.mana_cost || '').match(/\{[^}]+\}/g) || [];
  const nameFs = Math.round(H * 0.052), costW = costToks.length * nameFs * 0.95;
  const nfs = fitFont(ctx, o.name, W - pad * 2 - costW - pad * 0.5, nameFs, '700', 'system-ui, sans-serif');
  ctx.fillStyle = o.changed.name ? ACCENT : '#111';
  ctx.fillText(o.name, pad, y + nameFs / 2);
  let cx = W - pad - costW;
  for (const t of costToks) { drawSym(ctx, t, cx, y + nameFs / 2, nameFs * 0.9); cx += nameFs * 0.95; }
  y += nameFs * 1.25;

  // art strip
  const art = await loadImg(f.art);
  const artH = H * 0.2;
  if (art) {
    const ar = art.width / art.height, boxAr = (W - pad * 2) / artH;
    let sx = 0, sy = 0, sw = art.width, sh = art.height;
    if (ar > boxAr) { sw = art.height * boxAr; sx = (art.width - sw) / 2; } else { sh = art.width / boxAr; sy = (art.height - sh) / 2; }
    base.save(); roundRect(base, pad, y, W - pad * 2, artH, W * 0.02); base.clip();
    base.drawImage(art, sx, sy, sw, sh, pad, y, W - pad * 2, artH); base.restore();
    if (o.token) { ctx.save(); ctx.translate(pad - W * 0.09 + W * 0.02, y - H * 0.118 + H * 0.012); tokenBadge(ctx, W, H); ctx.restore(); }
    y += artH + H * 0.015;
  } else if (note) {
    ctx.fillStyle = '#888'; ctx.font = `500 ${H * 0.03}px system-ui`; ctx.fillText(note, pad, y + H * 0.02); y += H * 0.05;
  }

  // type line
  const tfs = Math.round(H * 0.038);
  let tx = pad;
  if (o.changed.colors) tx = colorDots(ctx, o.colors, pad, y + tfs / 2, tfs * 0.32) + tfs * 0.25;
  fitFont(ctx, o.type_line, W - pad - tx, tfs, '700', 'system-ui, sans-serif');
  ctx.fillStyle = o.changed.type ? ACCENT : '#222';
  ctx.fillText(o.type_line, tx, y + tfs / 2);
  y += tfs * 1.3;
  ctx.fillStyle = '#d6d0c2'; ctx.fillRect(pad, y, W - pad * 2, Math.max(1, H * 0.002));
  y += H * 0.015;

  // rules text, biggest font that fits
  const hasPT = o.power != null && o.toughness != null;
  const ptH = hasPT ? H * 0.075 : 0;
  const bottom = H - pad - ptH - (hasPT ? H * 0.01 : 0);
  const paras = tokenize(f.oracle_text || '').map((toks) => ({ toks, color: '#141414' }));
  if (o.addText) for (const toks of tokenize(o.addText)) paras.push({ toks, color: ACCENT });
  let fs = Math.round(H * 0.06), lines;
  for (; fs > 8; fs -= 1) {
    lines = layoutParas(ctx, paras, fs, W - pad * 2);
    const hh = lines.length * fs * 1.22 + lines.filter((l) => l.paraEnd).length * fs * 0.35;
    if (y + hh <= bottom) break;
  }
  ctx.font = `500 ${fs}px system-ui, "Segoe UI", Roboto, sans-serif`;
  const space = ctx.measureText(' ').width;
  for (const l of lines) {
    let x = pad; const cy = y + fs * 0.61;
    ctx.fillStyle = l.color;
    l.toks.forEach((word, i) => {
      if (i) x += space;
      for (const seg of word) {
        if (seg.startsWith('{')) { drawSym(ctx, seg, x, cy, fs * 0.92); x += fs; ctx.fillStyle = l.color; }
        else { ctx.fillText(seg, x, cy); x += ctx.measureText(seg).width; }
      }
    });
    y += fs * 1.22 + (l.paraEnd ? fs * 0.35 : 0);
  }

  // P/T
  if (hasPT) {
    const txt = `${o.power}/${o.toughness}`;
    const w = W * 0.3, x = W - pad - w, yy = H - pad - ptH;
    roundRect(ctx, x, yy, w, ptH, ptH * 0.25);
    ctx.fillStyle = o.changed.pt ? PATCH_BG : '#efeae0'; ctx.fill();
    ctx.lineWidth = Math.max(2, W * 0.007); ctx.strokeStyle = o.changed.pt ? ACCENT : '#bdb5a5'; ctx.stroke();
    fitFont(ctx, txt, w * 0.85, Math.round(ptH * 0.7), '800', 'system-ui, sans-serif');
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(txt, x + w / 2, yy + ptH / 2 + 1); ctx.textAlign = 'left';
  }
}

// Spectra 6 e-paper: 6 inks, Floyd-Steinberg so the preview looks like the panel will.
// 16-level greyscale e-paper (e.g. LilyGo T5 4.7"): luminance, Floyd-Steinberg to 16 greys.
// Unlike the colour panel, edges keep in-between greys, so text stays smooth.
function grey16(ctx, W, H) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const buf = new Float32Array(W * H);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) buf[j] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x, v = buf[j];
    const q = Math.max(0, Math.min(255, Math.round(v / 17) * 17)), e = v - q;
    const i = j * 4; d[i] = d[i + 1] = d[i + 2] = q;
    if (x + 1 < W) buf[j + 1] += e * 7 / 16;
    if (y + 1 < H) {
      if (x > 0) buf[j + W - 1] += e * 3 / 16;
      buf[j + W] += e * 5 / 16;
      if (x + 1 < W) buf[j + W + 1] += e / 16;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Below a card image on a display taller than a card: the changed values again, large.
function changesFooter(ctx, W, H, top, o) {
  const c = o.changed, lines = [];
  if (c.pt) lines.push(`${o.power ?? '?'}/${o.toughness ?? '?'}`);
  if (c.type || c.colors) lines.push(o.type_line);
  if (c.name) lines.push(o.name);
  if (o.addText) lines.push('+ ' + o.addText);
  if (o.token) lines.push('Token');
  const pad = W * 0.05;
  let fs = Math.round(W * 0.075), wrapped;
  for (; fs > 12; fs -= 2) {
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    wrapped = lines.flatMap((l) => wrapPlain(ctx, l, W - pad * 2 - (c.colors ? fs * 1.4 : 0)));
    if (wrapped.length * fs * 1.25 <= H - top - pad * 1.5) break;
  }
  ctx.fillStyle = ACCENT; ctx.fillRect(pad, top + pad * 0.5, W - pad * 2, Math.max(2, W * 0.006));
  ctx.textBaseline = 'middle';
  let y = top + pad;
  if (c.colors) colorDots(ctx, o.colors, pad, y + fs * 0.62, fs * 0.42);
  for (const l of wrapped) {
    ctx.fillStyle = '#111';
    ctx.fillText(l, pad + (c.colors ? fs * 1.4 : 0), y + fs * 0.62);
    y += fs * 1.25;
  }
}

const SPECTRA6 = [[25, 30, 33], [232, 232, 226], [239, 222, 68], [178, 19, 24], [33, 87, 186], [18, 95, 32]];
function dither(ctx, W, H, pal = SPECTRA6) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const buf = new Float32Array(W * H * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { buf[j] = d[i]; buf[j + 1] = d[i + 1]; buf[j + 2] = d[i + 2]; }
  const push = (x, y, er, eg, eb, k) => {
    if (x < 0 || x >= W || y >= H) return;
    const j = (y * W + x) * 3; buf[j] += er * k; buf[j + 1] += eg * k; buf[j + 2] += eb * k;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = (y * W + x) * 3, r = buf[j], g = buf[j + 1], b = buf[j + 2];
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = r - pal[k][0], dg = g - pal[k][1], db = b - pal[k][2];
      const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dist < bd) { bd = dist; best = k; }
    }
    const p = pal[best], i = (y * W + x) * 4;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
    const er = r - p[0], eg = g - p[1], eb = b - p[2];
    push(x + 1, y, er, eg, eb, 7 / 16); push(x - 1, y + 1, er, eg, eb, 3 / 16);
    push(x, y + 1, er, eg, eb, 5 / 16); push(x + 1, y + 1, er, eg, eb, 1 / 16);
  }
  ctx.putImageData(img, 0, 0);
}

const nearestInk = (r, g, b, pal) => {
  let best = 0, bd = Infinity;
  for (let k = 0; k < pal.length; k++) {
    const dr = r - pal[k][0], dg = g - pal[k][1], db = b - pal[k][2];
    const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (dist < bd) { bd = dist; best = k; }
  }
  return pal[best];
};

// Overlay for e-paper: every mostly-opaque pixel becomes its nearest ink, the rest transparent.
function quantize(ctx, W, H, pal = SPECTRA6) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    const p = nearestInk(d[i], d[i + 1], d[i + 2], pal);
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

const canvases = Array.from({ length: SLOT_COUNT }, () => document.createElement('canvas'));
let renderSeq = Array(SLOT_COUNT).fill(0);

async function renderSlot(i) {
  const s = state.slots[i], cv = canvases[i];
  const T = TARGETS[s.target] || TARGETS.lcd;
  const seq = ++renderSeq[i];
  const layer = (w = T.w, h = T.h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    return c.getContext('2d', { willReadFrequently: !!(T.dither || T.grey) });
  };
  const base = layer(), over = layer();
  if (s.card) {
    const f = faceOf(s), o = applyOv(f, s.ov);
    const cardH = Math.round(T.w * 936 / 672);
    if (s.view === 'text') await renderText(base, over, T.w, T.h, f, o);
    else if (T.h > cardH * 1.04) {
      // Display taller than a card: card on top (centred if nothing changed), changes listed below it.
      const cb = layer(T.w, cardH), co = layer(T.w, cardH);
      await renderImage(cb, co, T.w, cardH, f, o);
      const c = o.changed, any = c.pt || c.type || c.colors || c.name || o.addText || o.token;
      const top = any ? 0 : Math.round((T.h - cardH) / 2);
      base.fillStyle = '#fbfaf6'; base.fillRect(0, 0, T.w, T.h);
      base.drawImage(cb.canvas, 0, top); over.drawImage(co.canvas, 0, top);
      if (any) changesFooter(over, T.w, T.h, cardH, o);
    } else await renderImage(base, over, T.w, T.h, f, o);
    if (T.dither) { dither(base, T.w, T.h); quantize(over, T.w, T.h); }
    base.drawImage(over.canvas, 0, 0);
    if (T.grey) grey16(base, T.w, T.h);
  }
  const off = base.canvas;
  if (seq !== renderSeq[i]) return;   // a newer render won
  cv.width = T.w; cv.height = T.h;
  cv.getContext('2d').drawImage(off, 0, 0);
  drawThumb(i);
  if (i === state.active) { showPreview(); refreshFull(); }
}

// ---------- UI ----------

function buildSlots() {
  const box = $('slots');
  box.innerHTML = '';
  for (let i = 0; i < SLOT_COUNT; i++) {
    const b = document.createElement('button');
    b.className = 'slot'; b.dataset.i = i;
    b.innerHTML = `<b>${i + 1}</b><canvas width="80" height="120"></canvas><span></span>`;
    b.onclick = () => { state.active = i; save(); syncUI(); };
    box.appendChild(b);
  }
}

function drawThumb(i) {
  const el = $('slots').children[i]; if (!el) return;
  const t = el.querySelector('canvas'), ctx = t.getContext('2d');
  ctx.clearRect(0, 0, t.width, t.height);
  const s = state.slots[i];
  if (s.card) {
    const src = canvases[i], k = Math.min(t.width / src.width, t.height / src.height);
    const w = src.width * k, h = src.height * k;
    ctx.drawImage(src, (t.width - w) / 2, (t.height - h) / 2, w, h);
  }
  el.querySelector('span').textContent = s.card ? faceOf(s).name : 'empty';
}

function showPreview() {
  const p = $('preview');
  if (!slot().card) { p.innerHTML = '<div class="empty">Search for a card to put on display ' + (state.active + 1) + '.</div>'; return; }
  if (p.firstChild !== canvases[state.active]) { p.innerHTML = ''; p.appendChild(canvases[state.active]); }
}

const COLOR_BTNS = [...COLOR_ORDER, 'C'];
function buildColors() {
  const box = $('colors');
  for (const c of COLOR_BTNS) {
    const b = document.createElement('button');
    b.textContent = c; b.dataset.c = c;
    b.style.background = MANA[c]; b.style.color = MANA_INK[c];
    b.onclick = () => {
      const ov = slot().ov;
      if (c === 'C') ov.colors = (ov.colors && ov.colors.length === 0) ? null : [];
      else {
        const cur = ov.colors ? [...ov.colors] : [];
        ov.colors = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
        if (!ov.colors.length) ov.colors = null;
      }
      changed();
    };
    box.appendChild(b);
  }
}

function setSeg(id, value, attr) {
  for (const b of $(id).querySelectorAll('button')) b.classList.toggle('on', b.dataset[attr] === value);
}

function syncUI() {
  const s = slot(), ov = s.ov;
  for (const el of $('slots').children) el.classList.toggle('active', +el.dataset.i === state.active);
  setSeg('viewSeg', s.view, 'view');
  setSeg('subsMode', ov.subsMode, 'mode');
  setSeg('typesMode', ov.typesMode, 'mode');
  $('target').value = s.target;
  $('faceBtn').hidden = !(s.card && faceOf(s).faces > 1);
  for (const id of ['p', 't', 'subs', 'types', 'addText', 'name']) if (document.activeElement !== $(id)) $(id).value = ov[id];
  $('notLegendary').checked = ov.notLegendary; $('token').checked = ov.token;
  for (const b of $('colors').children) {
    const c = b.dataset.c;
    b.classList.toggle('on', ov.colors !== null && (c === 'C' ? ov.colors.length === 0 : ov.colors.includes(c)));
  }
  if (s.card) {
    const f = faceOf(s), o = applyOv(f, ov);
    const bits = [];
    if (o.changed.pt) bits.push(`${o.power}/${o.toughness}`);
    if (o.changed.colors) bits.push(o.colors.length ? o.colors.join('') : 'colorless');
    if (o.changed.type) bits.push(o.type_line);
    if (o.addText) bits.push('+ ' + o.addText);
    if (o.token) bits.push('token');
    $('ovSummary').textContent = bits.join(' · ');
    $('t').placeholder = f.toughness ?? 'T'; $('p').placeholder = f.power ?? 'P';
  } else $('ovSummary').textContent = '';
  const ct = $('copyTo');
  ct.innerHTML = '<option value="">Copy to…</option>' + state.slots.map((x, i) => i === state.active ? '' :
    `<option value="${i}">Display ${i + 1}${x.card ? ' (' + faceOf(x).name + ')' : ''}</option>`).join('');
  showPreview();
}

let renderTimer = 0;
function changed(now = false) {
  save(); syncUI();
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => renderSlot(state.active), now ? 0 : 120);
}

function wireUI() {
  for (const [k, v] of Object.entries(TARGETS)) $('target').add(new Option(v.label, k));
  $('target').onchange = (e) => { slot().target = e.target.value; changed(true); };
  $('viewSeg').onclick = (e) => { const v = e.target.dataset.view; if (v) { slot().view = v; changed(true); } };
  $('subsMode').onclick = (e) => { const m = e.target.dataset.mode; if (m) { slot().ov.subsMode = m; changed(); } };
  $('typesMode').onclick = (e) => { const m = e.target.dataset.mode; if (m) { slot().ov.typesMode = m; changed(); } };
  $('faceBtn').onclick = () => { slot().face = (slot().face + 1) % faceOf(slot()).faces; changed(true); };
  for (const id of ['p', 't', 'subs', 'types', 'addText', 'name']) $(id).oninput = (e) => { slot().ov[id] = e.target.value; changed(); };
  $('notLegendary').onchange = (e) => { slot().ov.notLegendary = e.target.checked; changed(); };
  $('token').onchange = (e) => { slot().ov.token = e.target.checked; changed(); };
  $('ovReset').onclick = () => { slot().ov = blankOv(); $('except').value = ''; changed(true); };
  const applyExcept = () => {
    const v = $('except').value.trim(); if (!v) return;
    slot().ov = { ...slot().ov, ...parseExcept(v) };
    changed(true);
  };
  $('exceptBtn').onclick = applyExcept;
  $('except').onkeydown = (e) => { if (e.key === 'Enter') applyExcept(); };
  $('clearBtn').onclick = () => { state.slots[state.active] = blankSlot(); changed(true); };
  $('copyTo').onchange = (e) => {
    const to = e.target.value; e.target.value = '';
    if (to === '') return;
    state.slots[+to] = JSON.parse(JSON.stringify(slot()));
    save(); renderSlot(+to); status(`Copied to display ${+to + 1}.`);
  };
  $('fullBtn').onclick = openFull;
  $('full').onclick = closeFull;
}

// ---------- full screen (phone as the display) ----------

let wakeLock = null;
async function openFull() {
  if (!slot().card) return;
  $('full').classList.add('open'); refreshFull();
  try { await document.documentElement.requestFullscreen?.(); } catch { }
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { }
}
function refreshFull() {
  const f = $('full'); if (!f.classList.contains('open')) return;
  const src = canvases[state.active];
  let c = f.querySelector('canvas');
  if (!c) { c = document.createElement('canvas'); f.appendChild(c); }
  c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
  c.style.width = Math.min(innerWidth, innerHeight * src.width / src.height) + 'px';
}
function closeFull() {
  $('full').classList.remove('open');
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch { }
  try { wakeLock?.release(); } catch { } wakeLock = null;
}

// ---------- search ----------

let acCtl = null, acTimer = 0;
const isSearchSyntax = (q) => /[:=<>]/.test(q) || /^!/.test(q);
const scryfallLink = (q) => q.match(/scryfall\.com\/card\/([^/\s]+)\/([^/\s?#]+)/i);

function showSuggest(items) {
  const ul = $('suggest');
  ul.innerHTML = '';
  for (const it of items) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = '';
    b.append(it.label);
    if (it.sub) { const sm = document.createElement('small'); sm.textContent = it.sub; b.append(sm); }
    b.onclick = () => { hideSuggest(); it.pick(); };
    li.appendChild(b); ul.appendChild(li);
  }
  ul.classList.toggle('open', items.length > 0);
}
const hideSuggest = () => { $('suggest').classList.remove('open'); };

function onQueryInput() {
  const q = $('q').value.trim();
  clearTimeout(acTimer);
  if (q.length < 2 || isSearchSyntax(q) || scryfallLink(q)) { hideSuggest(); return; }
  acTimer = setTimeout(async () => {
    acCtl?.abort(); acCtl = new AbortController();
    try {
      const r = await sf('/cards/autocomplete?q=' + encodeURIComponent(q), acCtl.signal);
      if ($('q').value.trim() !== q) return;
      showSuggest(r.data.slice(0, 12).map((name) => ({ label: name, pick: () => lookupName(name, true) })));
    } catch (e) { if (e.name !== 'AbortError') status(e.message, true); }
  }, 180);
}

async function search(q) {
  q = q.trim(); if (!q) return;
  hideSuggest();
  const link = scryfallLink(q);
  try {
    if (link) {
      status('Loading…');
      return place(await sf(`/cards/${encodeURIComponent(link[1])}/${encodeURIComponent(link[2])}`));
    }
    if (isSearchSyntax(q)) {
      status('Searching…');
      const r = await sf('/cards/search?order=name&q=' + encodeURIComponent(q));
      status(`${r.total_cards} match${r.total_cards === 1 ? '' : 'es'}${r.has_more ? ' (first 40 shown)' : ''}.`);
      showSuggest(r.data.slice(0, 40).map((c) => ({ label: c.name, sub: c.type_line, pick: () => place(c) })));
      return;
    }
    await lookupName(q, false);
  } catch (e) { status(e.status === 404 ? `No card found for “${q}”.` : e.message, true); }
}

// Name -> card, preferring a print with a regular frame so the patches line up.
async function lookupName(name, exact) {
  status('Loading…');
  try {
    let c = await sf(`/cards/named?${exact ? 'exact' : 'fuzzy'}=` + encodeURIComponent(name));
    if (!usesPatches({ ...c, ...(c.card_faces?.[0] || {}), layout: c.layout })) {
      try {
        const q = `!"${c.name}" (frame:2015 or frame:2003) -is:extendedart -is:showcase -is:borderless -is:fullart -is:etched lang:en`;
        const r = await sf('/cards/search?order=released&dir=desc&unique=prints&q=' + encodeURIComponent(q));
        if (r.data?.length) c = r.data[0];
      } catch { /* keep the first print */ }
    }
    place(c);
  } catch (e) { status(e.status === 404 ? `No card found for “${name}”.` : e.message, true); }
}

function place(c) {
  const s = slot();
  s.card = trimCard(c); s.face = 0; s.ov = blankOv();
  $('except').value = ''; $('q').value = '';
  status(`${c.name} → display ${state.active + 1} (${c.set.toUpperCase()} #${c.collector_number}).`);
  changed(true);
}

function wireSearch() {
  $('q').oninput = onQueryInput;
  $('q').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); search($('q').value); } };
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) hideSuggest(); });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('mic').hidden = true; return; }
  let rec = null;
  $('mic').onclick = () => {
    if (rec) { rec.abort(); return; }
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
    $('mic').classList.add('listening'); status('Listening…');
    rec.onresult = async (e) => {
      const alts = [...e.results[0]].map((a) => a.transcript.trim()).filter(Boolean);
      $('q').value = alts[0] || '';
      for (const a of alts) {
        try { await sf('/cards/named?fuzzy=' + encodeURIComponent(a)); return lookupName(a, false); } catch { }
      }
      status(`Heard “${alts[0] || ''}”, no card by that name.`, true);
      onQueryInput();
    };
    rec.onerror = (e) => status(e.error === 'no-speech' ? 'Didn’t catch that.' : 'Mic: ' + e.error, e.error !== 'no-speech');
    rec.onend = () => { rec = null; $('mic').classList.remove('listening'); if ($('status').textContent === 'Listening…') status(''); };
    rec.start();
  };
}

// Shared from another app (Android share sheet -> installed page), e.g. a Scryfall card page.
function handleShare() {
  const p = new URLSearchParams(location.search);
  const shared = [p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ');
  if (!shared) return;
  history.replaceState(null, '', location.pathname);
  const link = scryfallLink(shared);
  search(link ? link[0] : (p.get('title') || p.get('text') || '').replace(/\s*[·|-]\s*Scryfall.*$/i, ''));
}

// ---------- start ----------

buildSlots();
buildColors();
wireUI();
wireSearch();
syncUI();
for (let i = 0; i < SLOT_COUNT; i++) renderSlot(i);
handleShare();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
