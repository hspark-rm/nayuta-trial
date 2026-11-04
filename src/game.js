'use strict';
// 나유타 재판 — 도트 법정 공방 엔진 v0.1
// 모든 그림은 320×180 기준 화면에 그리고, CSS로 정수배 확대한다(흐림 없음).
(() => {
  const W = 320, H = 180;
  const CASE = window.CASE;
  // 배치는 320×180 좌표로 하고, 실제로는 6배(1920×1080, FHD)로 그린다.
  // 사각형은 6픽셀 단위 도트가 되고, 글자와 초상화는 FHD 해상도로 선명하게 나온다.
  const RES = 6;
  const cv = document.getElementById('game');
  cv.width = W * RES; cv.height = H * RES;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const keyHint = (label, key) => (TOUCH ? label : `${label} ${key}`);

  const COL = {
    night: '#07060c', wall: '#2a2846', wall2: '#322f55', trim: '#4a4578',
    wood: '#5a3a22', wood2: '#4a2e1a', woodHi: '#9a6a3c', floor: '#24160f',
    gold: '#e8c060', text: '#f4f0e6', dim: '#8a86a8', think: '#8cc8ff',
    testimony: '#7ee08a', red: '#e0505a', box: '#10101c', ink: '#0d0b14',
  };
  // 저장은 대본 위치(pc)로 기억하므로, 대본이 바뀌면 옛 저장을 쓰지 않도록 대본 해시를 키에 붙인다
  const scriptHash = (() => { let h = 5381; const t = JSON.stringify(CASE.script); for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36); })();
  const SAVE_KEY = 'nayuta-trial.save.v1.' + scriptHash;
  const MAX_PATIENCE = 5;

  // ───────── 화면 맞춤: FHD 캔버스를 CSS로 화면 크기에 맞춘다 ─────────
  function fit() {
    const vw = window.visualViewport ? visualViewport.width : innerWidth;
    const vh = window.visualViewport ? visualViewport.height : innerHeight;
    const k = Math.min(vw / W, vh / H);
    cv.style.width = Math.floor(W * k) + 'px';
    cv.style.height = Math.floor(H * k) + 'px';
  }
  addEventListener('resize', fit);
  addEventListener('orientationchange', () => setTimeout(fit, 200));
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  fit();
  const portraitHeld = () => innerHeight > innerWidth * 1.1;

  // 안드로이드 크롬: 전체 화면에 들어가면 가로로 고정할 수 있다. 아이폰 사파리는 지원하지 않음.
  const canFull = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  async function goFull() {
    const el = document.documentElement;
    try { await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen()); } catch (e) { return; }
    try { await screen.orientation.lock('landscape'); } catch (e) { /* 고정을 못 하면 사용자가 돌린다 */ }
  }

  // ───────── 글자: 도트 글꼴(갈무리)을 FHD 해상도 벡터로 그린다 ─────────
  const measure = document.createElement('canvas').getContext('2d');
  const fontOf = (b, px = 12) => `${px}px ${b ? 'Galmuri11Bold' : 'Galmuri11'}, "Apple SD Gothic Neo", sans-serif`;
  function tw(s, b) { measure.font = fontOf(b); return Math.ceil(measure.measureText(s).width); }
  // clip: 앞에서부터 보여 줄 폭(한 글자씩 찍는 효과용), 좌표는 320×180 기준
  function text(s, x, y, color = COL.text, o = {}) {
    if (!s) return 0;
    const sc = o.scale || 1, w = tw(s, o.bold) * sc;
    if (o.align === 'center') x = Math.round(x - w / 2);
    else if (o.align === 'right') x -= w;
    g.save();
    g.font = fontOf(o.bold, 12 * sc);
    g.textBaseline = 'top';
    if (o.clip != null) { g.beginPath(); g.rect(x - 2, y - 2, o.clip * sc + 3, 16 * sc + 4); g.clip(); }
    const put = (c, dx, dy) => { g.fillStyle = c; g.fillText(s, x + dx, y + sc + dy); };
    if (o.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) put(o.outline, ox * sc, oy * sc);
    else if (o.shadow) put(o.shadow, sc * 0.75, sc * 0.75);
    put(color, 0, 0);
    g.restore();
    return w;
  }
  function wrap(s, maxW, b) {
    const out = [];
    for (const para of s.split('\n')) {
      let line = '';
      for (const ch of [...para]) {
        if (line && tw(line + ch, b) > maxW) {
          const sp = line.lastIndexOf(' ');
          if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; }
          else { out.push(line); line = ch === ' ' ? '' : ch; }
        } else line += ch;
      }
      out.push(line);
    }
    return out;
  }
  function josa(w, a, b) {
    const c = w.charCodeAt(w.length - 1);
    if (c < 0xac00 || c > 0xd7a3) return w + b;
    return w + ((c - 0xac00) % 28 ? a : b);
  }

  // ───────── 그림 도트 변환: 축소 + 색 수 줄이기(median cut) ─────────
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function quantize(p, n) {
    const px = [];
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 128) { p[i + 3] = 0; continue; }
      p[i + 3] = 255; px.push(i);
    }
    if (!px.length) return;
    const boxes = [px];
    while (boxes.length < n) {
      let bi = -1, best = 0, bch = 0;
      boxes.forEach((b, k) => {
        if (b.length < 2) return;
        for (let ch = 0; ch < 3; ch++) {
          let lo = 255, hi = 0;
          for (const i of b) { const v = p[i + ch]; if (v < lo) lo = v; if (v > hi) hi = v; }
          if (hi - lo > best) { best = hi - lo; bi = k; bch = ch; }
        }
      });
      if (bi < 0) break;
      const b = boxes[bi].sort((a, c) => p[a + bch] - p[c + bch]), m = b.length >> 1;
      boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
    }
    for (const b of boxes) {
      let r = 0, gg = 0, bb = 0;
      for (const i of b) { r += p[i]; gg += p[i + 1]; bb += p[i + 2]; }
      r = Math.round(r / b.length); gg = Math.round(gg / b.length); bb = Math.round(bb / b.length);
      for (const i of b) { p[i] = r; p[i + 1] = gg; p[i + 2] = bb; }
    }
  }
  // w, h는 320×180 기준 크기. 캔버스는 RES배로 만든다. colors를 주면 색 수를 줄인다
  function pixelate(im, src, w, h, colors) {
    const cw = Math.max(1, Math.round(w * RES)), ch = Math.max(1, Math.round(h * RES));
    const c = mk(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(im, src.x, src.y, src.w, src.h, 0, 0, cw, ch);
    if (colors) {
      const d = x.getImageData(0, 0, cw, ch);
      quantize(d.data, colors);
      x.putImageData(d, 0, 0);
    }
    return c;
  }
  // 투명 여백을 잘라 낸 실제 그림 범위
  function alphaBox(im) {
    const s = Math.min(1, 512 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
    const x = mk(w, h).getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0, w, h);
    const p = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      if (p[(y * w + xx) * 4 + 3] > 16) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return { x: 0, y: 0, w: im.naturalWidth, h: im.naturalHeight };
    return { x: x0 / s, y: y0 / s, w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s };
  }
  const PORTRAIT_W = 120, PORTRAIT_H = 112;
  function portraitFrom(im, ch) {
    let r;
    if (ch && ch.crop) {
      const [fx, fy, fw, fh] = ch.crop;
      r = { x: fx * im.naturalWidth, y: fy * im.naturalHeight, w: fw * im.naturalWidth, h: fh * im.naturalHeight };
    } else {
      r = alphaBox(im);
      // 전신 그림이면 상반신만 쓴다
      if (r.h > r.w * 1.6) r.h = r.w * 1.3;
    }
    const s = Math.min(PORTRAIT_W / r.w, PORTRAIT_H / r.h);
    // 초상화는 이미 도트 그림이라 색 수를 줄이지 않는다
    return pixelate(im, r, r.w * s, r.h * s, 0);
  }
  function coverFrom(im, w, h) {
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / s, sh = h / s;
    return pixelate(im, { x: (im.naturalWidth - sw) / 2, y: (im.naturalHeight - sh) / 2, w: sw, h: sh }, w, h, 0);
  }
  function containFrom(im, w, h) {
    const r = alphaBox(im), s = Math.min(w / r.w, h / r.h);
    return pixelate(im, r, r.w * s, r.h * s, 0);
  }
  // 상태: undefined = 아직 읽는 중, null = 파일 없음
  const imgs = new Map();
  function asset(key, src, make) {
    let e = imgs.get(key);
    if (!e) {
      e = { state: 'loading', canvas: null };
      imgs.set(key, e);
      const im = new Image();
      im.onload = () => {
        try { e.canvas = make(im); e.state = 'ok'; } catch (err) { console.warn('그림 변환 실패', src, err); e.state = 'missing'; }
      };
      im.onerror = () => { e.state = 'missing'; };
      im.src = src;
    }
    return e.state === 'ok' ? e.canvas : e.state === 'missing' ? null : undefined;
  }
  // 이격 선택: 인물 id → 그림 id. 고른 버전의 그림이 없으면 기본 그림으로 돌아간다
  const SKIN_KEY = 'nayuta-trial.skins';
  let skins = {};
  try { skins = JSON.parse(localStorage.getItem(SKIN_KEY) || '{}') || {}; } catch (e) { skins = {}; }
  const skinOf = (id) => {
    const vs = (CASE.variants || {})[id];
    return vs && vs.some((v) => v.id === skins[id]) ? skins[id] : id;
  };
  function cycleSkin(id, d) {
    const vs = CASE.variants[id];
    const i = Math.max(0, vs.findIndex((v) => v.id === skinOf(id)));
    skins[id] = vs[(i + d + vs.length) % vs.length].id;
    try { localStorage.setItem(SKIN_KEY, JSON.stringify(skins)); } catch (e) { /* 이번 판에서만 기억 */ }
    SFX.select();
  }
  function portraitImg(img, id, face) {
    const ch = CASE.chars[id];
    const c = asset(`p:${img}_${face}`, `assets/portraits/${img}_${face}.png`, (im) => portraitFrom(im, ch));
    if (c === null && face !== 'normal') return portraitImg(img, id, 'normal');
    return c;
  }
  function portrait(id, face) {
    const img = skinOf(id);
    const c = portraitImg(img, id, face);
    return c === null && img !== id ? portraitImg(id, id, face) : c;
  }

  // ───────── 소리: 웹 오디오로 만든 짧은 칩튠 효과음 ─────────
  let AC = null, muted = false;
  try { muted = localStorage.getItem('nayuta-trial.mute') === '1'; } catch (e) { /* 저장소를 못 쓰면 소리 켬 */ }
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function tone(freq, dur, type = 'square', vol = 0.04, slide = 0, delay = 0) {
    if (!AC || muted) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + dur);
  }
  const SFX = {
    blip: (v) => tone(v, 0.035, 'square', 0.025),
    ok: () => { tone(523, 0.08); tone(659, 0.08, 'square', 0.04, 0, 0.08); tone(784, 0.16, 'square', 0.04, 0, 0.16); },
    wrong: () => tone(140, 0.35, 'sawtooth', 0.05, -60),
    stamp: () => { tone(220, 0.12, 'square', 0.06, 440); tone(880, 0.25, 'square', 0.05, 0, 0.1); },
    select: () => tone(660, 0.03, 'square', 0.03),
    give: () => { tone(784, 0.07); tone(1046, 0.14, 'square', 0.04, 0, 0.07); },
  };

  // ───────── 데이터 점검: 시나리오를 손으로 고칠 때 깨진 연결을 바로 알려 준다 ─────────
  const labels = new Map();
  CASE.script.forEach((op, i) => { if (op.op === 'label') labels.set(op.id, i); });
  const dataErrors = [];
  (function check() {
    const needLabel = (id, where) => { if (!labels.has(id)) dataErrors.push(`없는 label '${id}' (${where})`); };
    const needEv = (id, where) => { if (!CASE.evidence[id]) dataErrors.push(`없는 증거 '${id}' (${where})`); };
    const needChar = (id, where) => { if (id && !CASE.chars[id]) dataErrors.push(`없는 인물 '${id}' (${where})`); };
    (CASE.startEvidence || []).forEach((id) => needEv(id, 'startEvidence'));
    const walk = (list, where) => list.forEach((op, i) => {
      const at = `${where}#${i}`;
      if (op.who) needChar(op.who, at);
      if (op.op === 'goto') needLabel(op.id, at);
      if (op.op === 'give') needEv(op.id, at);
      if (op.op === 'demand') { needEv(op.answer, at); needLabel(op.ok, at); needChar(op.who, at); walk(op.wrong || [], at + '.wrong'); }
      if (op.op === 'testimony') {
        needChar(op.witness, at);
        walk(op.wrong || [], at + '.wrong');
        op.statements.forEach((st, k) => {
          walk(st.press || [], `${at}.s${k + 1}.press`);
          for (const [ev, lb] of Object.entries(st.present || {})) { needEv(ev, `${at}.s${k + 1}`); needLabel(lb, `${at}.s${k + 1}`); }
        });
      }
    });
    walk(CASE.script, 'script');
    if (dataErrors.length) console.error('시나리오 데이터 오류', dataErrors);
  })();

  // ───────── 상태 ─────────
  const S = {
    scene: 'title', // title | play | over | end
    stack: [], ev: [], patience: MAX_PATIENCE, saved: null,
    mode: 'idle', // line | cross | chapter | testTitle | stamp | idle
    line: null, portrait: null, test: null, overlay: null, demand: null,
    chapter: null, testTitle: null, end: null, hinted: false,
    bg: 'court', pocket: null, pockets: 0, // pocket = 주머니에서 막 나온 증거품 카드
    fx: { shake: 0, flash: 0, stamp: null }, t: 0,
  };
  // 증거품을 받을 때 변호인이 하는 말(차례로 돌아가며 씀). 명령에 line이 있으면 그것을 쓴다
  const POCKET_LINES = [
    '(…증거품? 이게 왜 내 주머니에 있지?)',
    '(또 주머니에서 뭔가 나왔다. 이 세계의 주머니는 대체 어떻게 된 거야?)',
    '(넣은 기억이 없는데… 주머니가 알아서 증거를 모으나?)',
    '(주머니가 묵직하다. …설마 또?)',
  ];
  try { S.saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { S.saved = null; }

  // ───────── 진행기: 명령을 차례로 실행하다가 입력을 기다리는 명령에서 멈춘다 ─────────
  function step() {
    for (;;) {
      const f = S.stack[S.stack.length - 1];
      if (!f) return;
      if (f.pc >= f.list.length) {
        if (S.stack.length === 1) return; // 본 시나리오가 끝까지 감
        S.stack.pop();
        if (f.onDone) { f.onDone(); return; }
        continue;
      }
      const op = f.list[f.pc++];
      if (exec(op)) return;
    }
  }
  function sub(list, onDone) { S.stack.push({ list, pc: 0, onDone }); step(); }
  function jumpTo(id) {
    S.stack.length = 1;
    S.stack[0].pc = labels.get(id) + 1;
    S.test = null; S.demand = null; S.overlay = null; S.mode = 'idle';
  }
  // 참을 돌려주면 입력을 기다린다
  function exec(op) {
    if (op.who !== undefined && !op.op) { startLine(op); return true; }
    switch (op.op) {
      case 'label': return false;
      case 'goto': jumpTo(op.id); return false;
      case 'hide': S.portrait = null; return false;
      case 'fx':
        if (op.kind === 'shake') S.fx.shake = 0.35;
        if (op.kind === 'flash') S.fx.flash = 1;
        if (op.kind === 'stamp') { S.fx.stamp = { text: op.text, t: 1.1 }; S.mode = 'stamp'; SFX.stamp(); return true; }
        return false;
      case 'give': {
        if (S.ev.includes(op.id)) return false; // 같은 캐묻기를 다시 해도 한 번만 받는다
        S.ev.push(op.id);
        SFX.give();
        // 증거품이 변호인 주머니에서 '저절로' 나오는 연출: 카드를 띄우고 변호인이 놀란다
        S.pocket = { id: op.id, t: 0 };
        const got = { who: null, color: COL.gold, line: `${josa(`「${CASE.evidence[op.id].name}」`, '을', '를')} 증거 목록에 넣었다.` };
        const react = op.line === false ? [] : [{ who: 'me', face: op.face || 'shock', line: op.line || POCKET_LINES[S.pockets++ % POCKET_LINES.length] }];
        sub([...react, got], () => { S.pocket = null; step(); });
        return true;
      }
      case 'bg': S.bg = op.id; return false;
      case 'save': save(); return false;
      case 'chapter': S.portrait = null; S.chapter = op; S.mode = 'chapter'; return true;
      case 'testimony': startTestimony(op); return true;
      case 'demand':
        S.demand = op;
        sub([{ who: op.who, face: op.face, line: op.line }], () => openOverlay('demand'));
        return true;
      case 'end': S.scene = 'end'; S.end = op; clearSave(); if (op.result === 'win') SFX.ok(); return true;
      default: console.warn('모르는 명령', op); return false;
    }
  }

  // ───────── 대사 ─────────
  const LINE_W = 296, LINES = 3, CPS = 45;
  function startLine(op) {
    const ch = op.who ? CASE.chars[op.who] : null;
    if (ch && ch.portrait !== false) S.portrait = { id: op.who, face: op.face || 'normal' };
    const think = op.who === 'me' && op.line.startsWith('(');
    const all = wrap(op.line, LINE_W);
    const pages = [];
    for (let i = 0; i < all.length; i += LINES) pages.push(all.slice(i, i + LINES));
    S.line = {
      who: op.who, name: ch ? ch.name : null, voice: ch ? ch.voice : 500,
      color: op.color || (op.testimony ? COL.testimony : think ? COL.think : COL.text),
      pages, page: 0, shown: 0, lastBlip: 0,
    };
    S.mode = 'line';
  }
  const pageLen = (l) => l.pages[l.page].reduce((n, s) => n + [...s].length, 0);
  function advanceLine() {
    const l = S.line;
    if (l.shown < pageLen(l)) { l.shown = pageLen(l); return; }
    if (l.page < l.pages.length - 1) { l.page++; l.shown = 0; l.lastBlip = 0; return; }
    S.line = null; S.mode = 'idle';
    step();
  }

  // ───────── 증언과 신문 ─────────
  function startTestimony(op) {
    S.test = { op, idx: 0 };
    S.testTitle = { title: op.title, t: 1.6 };
    S.mode = 'testTitle';
  }
  function afterTestTitle() {
    const op = S.test.op;
    const lines = op.statements.map((st) => ({ who: op.witness, face: st.face, line: st.line, testimony: true }));
    if (!S.hinted) {
      S.hinted = true;
      lines.push({ who: null, color: COL.gold, line: '신문을 시작한다. ◀ ▶로 증언을 넘기고, 수상한 말은 캐묻거나 어긋나는 증거를 내자.' });
    }
    sub(lines, enterCross);
  }
  function enterCross() {
    const t = S.test, st = t.op.statements[t.idx];
    S.portrait = { id: t.op.witness, face: st.face || 'normal' };
    S.mode = 'cross';
  }
  function crossMove(d) {
    const n = S.test.op.statements.length;
    S.test.idx = (S.test.idx + d + n) % n;
    SFX.select();
    enterCross();
  }
  function crossPress() {
    const t = S.test, st = t.op.statements[t.idx];
    const press = st.press && st.press.length ? st.press : [{ who: t.op.witness, line: '더 할 말은 없어요.' }];
    S.mode = 'idle';
    sub(press, enterCross);
  }
  // 틀릴 때마다 변호인이 속으로 힌트를 말한다. 같은 증언에서 여러 번 틀리면 더 분명한 힌트로 넘어간다
  let wrongCount = new WeakMap();
  function hintFor(op) {
    const hs = op && op.hints;
    if (!hs || !hs.length) return [];
    const n = wrongCount.get(op) || 0;
    wrongCount.set(op, n + 1);
    return [{ who: 'me', line: hs[Math.min(n, hs.length - 1)] }];
  }
  function wrong(lines, then, op) {
    S.patience = Math.max(0, S.patience - 1);
    S.fx.shake = 0.4; SFX.wrong();
    const ls = lines && lines.length ? lines : [{ who: 'judge', line: '그 증거로는 아무것도 증명되지 않습니다.' }];
    S.overlay = null; S.mode = 'idle';
    sub(S.patience > 0 ? [...ls, ...hintFor(op)] : ls, () => { if (S.patience <= 0) gameOver(); else then(); });
  }
  function present(id) {
    const ov = S.overlay;
    if (ov.purpose === 'cross') {
      const st = S.test.op.statements[S.test.idx];
      const to = st.present && st.present[id];
      if (to) { S.overlay = null; jumpTo(to); SFX.ok(); step(); } else wrong(S.test.op.wrong, enterCross, S.test.op);
    } else if (ov.purpose === 'demand') {
      const d = S.demand;
      if (id === d.answer) { S.overlay = null; jumpTo(d.ok); SFX.ok(); step(); } else wrong(d.wrong, () => openOverlay('demand'), d);
    }
  }

  // ───────── 증거 목록 ─────────
  function openOverlay(purpose) {
    S.overlay = { purpose, sel: 0 }; // purpose: view | cross | demand
    if (S.mode !== 'line') S.mode = 'idle';
    SFX.select();
  }
  function closeOverlay() {
    const ov = S.overlay;
    if (!ov || ov.purpose === 'demand') return;
    S.overlay = null;
    if (ov.purpose === 'cross') enterCross();
  }

  // ───────── 저장 1칸 ─────────
  function snapshot() { return { pc: S.stack[0].pc, ev: [...S.ev], patience: S.patience, hinted: S.hinted, bg: S.bg, pockets: S.pockets }; }
  function save() {
    S.saved = snapshot();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S.saved)); } catch (e) { /* 저장소를 못 쓰면 이번 판에서만 기억 */ }
  }
  function clearSave() {
    S.saved = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
  }
  function begin(from) {
    S.scene = 'play';
    if (!from) wrongCount = new WeakMap(); // 새 게임이면 힌트 단계도 처음부터
    S.stack = [{ list: CASE.script, pc: from ? from.pc : 0 }];
    S.ev = from ? [...from.ev] : [...(CASE.startEvidence || [])];
    S.patience = from ? Math.max(from.patience, 1) : MAX_PATIENCE;
    S.hinted = from ? !!from.hinted : false;
    S.bg = (from && from.bg) || 'court';
    S.pockets = (from && from.pockets) || 0;
    S.pocket = null;
    S.line = null; S.portrait = null; S.test = null; S.overlay = null; S.demand = null;
    S.mode = 'idle';
    step();
  }
  function gameOver() { S.scene = 'over'; S.overlay = null; S.mode = 'idle'; }

  // ───────── 입력 ─────────
  let B = [];
  const pointer = { x: -1, y: -1 };
  function button(x, y, w, h, label, fn, o = {}) {
    const hot = !o.off && pointer.x >= x && pointer.x < x + w && pointer.y >= y && pointer.y < y + h;
    g.fillStyle = o.off ? '#2a2838' : hot ? COL.gold : (o.bg || COL.box);
    g.fillRect(x, y, w, h);
    g.fillStyle = o.off ? '#3a3850' : COL.gold;
    g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
    text(label, x + w / 2, y + Math.floor((h - 14) / 2) + 1, o.off ? COL.dim : hot ? COL.ink : COL.text, { align: 'center' });
    if (!o.off) B.push({ x, y, w, h, fn });
  }
  function toBase(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }
  cv.addEventListener('pointermove', (e) => { const p = toBase(e); pointer.x = p.x; pointer.y = p.y; });
  cv.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1; });
  // 손가락을 떼면 강조 표시를 지운다(마우스와 달리 위치가 남지 않게)
  cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.x = pointer.y = -1; });
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio();
    if (portraitHeld()) { if (canFull && !isFull()) goFull(); return; }
    const p = toBase(e); pointer.x = p.x; pointer.y = p.y;
    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i];
      if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) { b.fn(); return; }
    }
    confirm();
  });
  function confirm() {
    if (S.scene !== 'play' || S.overlay) return;
    if (S.mode === 'line') advanceLine();
    else if (S.mode === 'chapter') { S.chapter = null; S.mode = 'idle'; step(); }
    else if (S.mode === 'testTitle') { S.testTitle = null; S.mode = 'idle'; afterTestTitle(); }
    else if (S.mode === 'stamp') { S.fx.stamp = null; S.mode = 'idle'; step(); }
    else if (S.mode === 'cross') crossMove(1); // 신문 중에 화면을 누르면 다음 증언으로
  }
  addEventListener('keydown', (e) => {
    audio();
    const k = e.key;
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (k === 'f' || k === 'F') { toggleSpeed(); return; }
    if (S.scene === 'title') { if (k === 'Enter' || k === ' ') begin(null); return; }
    if (S.scene !== 'play') { if (k === 'Enter' || k === ' ') { S.scene === 'over' ? retry() : toTitle(); } return; }
    const ov = S.overlay;
    if (ov) {
      const n = S.ev.length;
      if (!n) { if (k === 'Escape' || k === 'e' || k === 'E' || k === 'x' || k === 'X') closeOverlay(); e.preventDefault(); return; }
      if (k === 'ArrowUp' || k === 'ArrowLeft') { ov.sel = (ov.sel - 1 + n) % n; ov.page = 0; SFX.select(); }
      else if (k === 'ArrowDown' || k === 'ArrowRight') { ov.sel = (ov.sel + 1) % n; ov.page = 0; SFX.select(); }
      else if ((k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') && ov.purpose !== 'view') present(S.ev[ov.sel]);
      else if (k === 'Escape' || k === 'e' || k === 'E' || k === 'x' || k === 'X') closeOverlay();
      e.preventDefault();
      return;
    }
    if (S.mode === 'cross') {
      if (k === 'ArrowLeft') crossMove(-1);
      else if (k === 'ArrowRight' || k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') crossMove(1);
      else if (k === 'x' || k === 'X') crossPress();
      else if (k === 'e' || k === 'E') openOverlay('cross');
      e.preventDefault();
      return;
    }
    if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') { confirm(); e.preventDefault(); }
    else if ((k === 'e' || k === 'E') && S.mode === 'line') openOverlay('view');
  });
  // 배속: 1 → 2 → 4 → 1. 다음 방문에도 기억한다
  let speed = 1;
  try { speed = [1, 2, 4].includes(+localStorage.getItem('nayuta-trial.speed')) ? +localStorage.getItem('nayuta-trial.speed') : 1; } catch (e) { speed = 1; }
  function toggleSpeed() {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    try { localStorage.setItem('nayuta-trial.speed', String(speed)); } catch (e) { /* 이번 판에서만 기억 */ }
    SFX.select();
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('nayuta-trial.mute', muted ? '1' : '0'); } catch (e) { /* 무시 */ }
  }
  function retry() { begin(S.saved ? { ...S.saved, patience: MAX_PATIENCE } : null); }
  function toTitle() { S.scene = 'title'; }

  // ───────── 갱신 ─────────
  function update(dt) {
    S.t += dt;
    const fx = S.fx;
    fx.shake = Math.max(0, fx.shake - dt);
    fx.flash = Math.max(0, fx.flash - dt * 2.5);
    if (S.pocket) S.pocket.t += dt;
    // 배속은 글자 찍기와 연출 대기 시간에만 적용한다
    const sdt = dt * speed;
    if (S.mode === 'stamp' && fx.stamp) { fx.stamp.t -= sdt; if (fx.stamp.t <= 0) confirm(); }
    if (S.mode === 'testTitle' && S.testTitle) { S.testTitle.t -= sdt; if (S.testTitle.t <= 0) confirm(); }
    const l = S.line;
    if (S.mode === 'line' && l && !S.overlay) {
      const len = pageLen(l);
      if (l.shown < len) {
        l.shown = Math.min(len, l.shown + sdt * CPS);
        const n = Math.floor(l.shown);
        if (n - l.lastBlip >= 2 * speed) { l.lastBlip = n; SFX.blip(l.voice); }
      }
    }
  }

  // ───────── 그리기 ─────────
  function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function frameBox(x, y, w, h) {
    rect(x, y, w, h, COL.gold); rect(x + 1, y + 1, w - 2, h - 2, COL.ink); rect(x + 2, y + 2, w - 4, h - 4, COL.box);
  }
  // 프롤로그용: 눈을 뜬 2D 세계. 도트 격자와 떠다니는 조각
  function drawVoid() {
    rect(0, 0, W, H, '#0b0a1a');
    for (let x = 0; x < W; x += 16) rect(x, 0, 1, H, '#15143a');
    for (let y = 0; y < H; y += 16) rect(0, y, W, 1, '#15143a');
    for (let i = 0; i < 24; i++) {
      const x = (i * 53) % W, y = Math.round((i * 37 + S.t * (6 + (i % 4) * 3)) % (H + 20)) - 10;
      rect(x, H - y, 4 + (i % 3) * 2, 4 + (i % 3) * 2, i % 5 ? '#2a2f6a' : '#c4e0f4');
    }
    text('404 NOT FOUND', 160, 40, '#1f2050', { align: 'center', bold: true, scale: 2.5 });
  }
  function drawCourt() {
    if (S.bg === 'void') { drawVoid(); return; }
    const bg = asset('bg:court', 'assets/bg/court.png', (im) => coverFrom(im, W, H));
    if (bg) { g.drawImage(bg, 0, 0, W, H); return; }
    rect(0, 0, W, H, COL.wall);
    for (let x = 0; x < W; x += 32) rect(x + 8, 0, 16, 78, COL.wall2);
    rect(0, 14, W, 2, COL.trim);
    // 뒤편 높은 창 세 개
    for (const cx of [60, 160, 260]) { rect(cx - 12, 22, 24, 40, '#1a1930'); rect(cx - 10, 24, 20, 36, '#3d4a7a'); rect(cx - 1, 24, 2, 36, '#1a1930'); rect(cx - 10, 40, 20, 2, '#1a1930'); }
    rect(0, 78, W, 30, COL.wood); rect(0, 78, W, 2, COL.woodHi);
    for (let x = 6; x < W; x += 22) rect(x, 84, 14, 20, COL.wood2);
    rect(0, 108, W, 72, COL.floor);
    for (let x = 0; x < W; x += 16) rect(x, 108, 1, 72, '#1c110b');
  }
  function drawStand() {
    rect(96, 96, 128, 24, COL.wood); rect(96, 96, 128, 3, COL.woodHi);
    rect(100, 102, 120, 1, COL.wood2); rect(108, 106, 104, 10, COL.wood2);
  }
  function drawPlaceholder(id) {
    const ch = CASE.chars[id] || {};
    const c = ch.color || '#6a6a80', cx = 160, top = 14;
    g.fillStyle = c;
    for (let dy = -18; dy <= 18; dy++) { const hw = Math.floor(Math.sqrt(18 * 18 - dy * dy)); g.fillRect(cx - hw, top + 18 + dy, hw * 2, 1); }
    for (let y = 0; y < 50; y++) { const hw = 22 + Math.min(y, 20); g.fillRect(cx - hw, top + 40 + y, hw * 2, 1); }
    rect(cx - 7, top + 34, 14, 8, c);
    text(ch.name || id, cx, top + 56, COL.ink, { align: 'center', bold: true });
  }
  function drawPortrait() {
    const p = S.portrait;
    if (!p) return;
    const c = portrait(p.id, p.face);
    if (c === undefined) return;
    if (c === null) { drawPlaceholder(p.id); return; }
    const pw = c.width / RES, ph = c.height / RES;
    g.drawImage(c, 160 - pw / 2, 118 - ph, pw, ph);
  }
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  function drawHud() {
    for (let i = 0; i < MAX_PATIENCE; i++) {
      const on = i < S.patience, ox = 6 + i * 10, oy = 6;
      HEART.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') rect(ox + x, oy + y, 1, 1, on ? COL.red : '#3a3040'); }));
    }
    const can = S.mode === 'line' || S.mode === 'cross';
    button(206, 3, 56, 16, keyHint(`${speed}배속`, 'F'), toggleSpeed, { off: !!S.overlay });
    button(266, 3, 50, 16, keyHint('증거', 'E'), () => openOverlay(S.mode === 'cross' ? 'cross' : 'view'), { off: !can || !!S.overlay });
  }
  function drawNameTag(name) {
    if (!name) return;
    const w = tw(name, true) + 12;
    rect(8, 106, w, 13, COL.gold); rect(9, 107, w - 2, 11, '#c89a3a');
    text(name, 14, 106, COL.ink, { bold: true });
  }
  function drawLine() {
    const l = S.line;
    frameBox(4, 118, 312, 58);
    drawNameTag(l.name);
    let left = Math.floor(l.shown);
    l.pages[l.page].forEach((s, i) => {
      const chars = [...s];
      const take = Math.max(0, Math.min(chars.length, left));
      left -= chars.length;
      if (take > 0) text(s, 12, 124 + i * 14, l.color, { clip: tw(chars.slice(0, take).join('')), shadow: COL.ink });
    });
    if (l.shown >= pageLen(l) && Math.floor(S.t * 3) % 2 === 0) {
      g.fillStyle = COL.gold; g.fillRect(304, 168, 5, 1); g.fillRect(305, 169, 3, 1); g.fillRect(306, 170, 1, 1);
    }
  }
  function drawCross() {
    const t = S.test, st = t.op.statements[t.idx], n = t.op.statements.length;
    frameBox(4, 118, 312, 58);
    drawNameTag(CASE.chars[t.op.witness].name);
    text(`증언 ${t.idx + 1}/${n}`, 308, 106, COL.testimony, { align: 'right', outline: COL.ink });
    wrap(st.line, LINE_W).slice(0, LINES).forEach((s, i) => text(s, 12, 124 + i * 14, COL.testimony, { shadow: COL.ink }));
    // 손가락으로 누르기 쉽게 18픽셀 높이
    button(4, 84, 26, 18, '◀', () => crossMove(-1));
    button(34, 84, 58, 18, keyHint('캐묻기', 'X'), crossPress);
    button(212, 84, 74, 18, keyHint('증거 내기', 'E'), () => openOverlay('cross'));
    button(290, 84, 26, 18, '▶', () => crossMove(1));
  }
  function evIcon(id, x, y, k = 1) {
    const c = asset(`e:${id}`, `assets/evidence/${id}.png`, (im) => containFrom(im, 32, 32));
    if (c) { const iw = (c.width / RES) * k, ih = (c.height / RES) * k; g.drawImage(c, x + (32 * k - iw) / 2, y + (32 * k - ih) / 2, iw, ih); return; }
    const ev = CASE.evidence[id];
    rect(x + 4 * k, y + 2 * k, 24 * k, 28 * k, '#d8d0b8'); rect(x + 4 * k, y + 2 * k, 24 * k, 4 * k, ev.color || COL.gold);
    for (let i = 0; i < 4; i++) rect(x + 8 * k, y + (10 + i * 5) * k, (16 - (i % 2) * 5) * k, 2 * k, '#8a8070');
  }
  // 주머니에서 나온 증거품 카드: 아래에서 튀어 오른 뒤 살짝 떠 있다
  function drawPocket() {
    const p = S.pocket, ev = CASE.evidence[p.id];
    const rise = Math.max(0, 1 - p.t * 5), bob = Math.round(Math.sin(S.t * 4) * 1);
    // 변호인 얼굴을 가리지 않게 오른쪽에 띄운다
    const x = 210, y = 20 + Math.round(rise * 60) + bob, w = 104, h = 84;
    frameBox(x, y, w, h);
    text('주머니 속 증거품', x + w / 2, y + 4, COL.dim, { align: 'center', scale: 10 / 12 });
    evIcon(p.id, x + w / 2 - 24, y + 17, 1.5);
    wrap(ev.name, w - 10, true).slice(0, 2).forEach((s, i) => text(s, x + w / 2, y + 64 + i * 10, COL.gold, { align: 'center', bold: true, scale: 10 / 12 }));
  }
  function drawOverlay() {
    const ov = S.overlay;
    rect(0, 0, W, H, 'rgba(7,6,12,0.72)');
    frameBox(12, 10, 296, 160);
    const head = ov.purpose === 'view' ? '증거 목록' : '어떤 증거를 낼까?';
    text(head, 20, 15, COL.gold, { bold: true });
    if (ov.sel >= S.ev.length) ov.sel = 0;
    S.ev.forEach((id, i) => {
      const y = 32 + i * 18, on = i === ov.sel;
      const hot = pointer.x >= 18 && pointer.x < 118 && pointer.y >= y && pointer.y < y + 16;
      rect(18, y, 100, 16, on ? COL.gold : hot ? '#2c2a44' : '#1a1830');
      // 긴 이름은 칸 폭에서 자르고 끝에 …를 붙인다(전체 이름은 오른쪽 설명에 나옴)
      const nm = CASE.evidence[id].name, full = tw(nm) <= 92;
      text(nm, 22, y + 1, on ? COL.ink : COL.text, { clip: full ? null : 86 });
      if (!full) text('…', 108, y + 1, on ? COL.ink : COL.text);
      B.push({ x: 18, y, w: 100, h: 16, fn: () => { ov.sel = i; ov.page = 0; SFX.select(); } });
    });
    const id = S.ev[ov.sel];
    if (id) {
      const ev = CASE.evidence[id];
      rect(124, 30, 178, 1, COL.trim);
      evIcon(id, 126, 36);
      wrap(ev.name, 136, true).slice(0, 2).forEach((s, i) => text(s, 164, 36 + i * 14, COL.gold, { bold: true }));
      // 설명은 10px로 쓰고, 6줄이 넘으면 '설명 1/2' 버튼으로 넘겨 본다
      const DS = 10 / 12, per = 6;
      const desc = wrap(ev.desc, 170 / DS), pages = Math.ceil(desc.length / per);
      if (!(ov.page < pages)) ov.page = 0;
      desc.slice(ov.page * per, ov.page * per + per).forEach((s, i) => text(s, 128, 72 + i * 12, COL.text, { scale: DS }));
      if (pages > 1) button(128, 148, 60, 18, `설명 ${ov.page + 1}/${pages}`, () => { ov.page = (ov.page + 1) % pages; SFX.select(); });
    }
    if (ov.purpose !== 'view') button(192, 148, 54, 18, keyHint('제시', 'Z'), () => present(S.ev[ov.sel]));
    if (ov.purpose !== 'demand') button(250, 148, 52, 18, '닫기', closeOverlay);
  }
  function drawStamp() {
    const st = S.fx.stamp;
    const k = Math.min(1, (1.1 - st.t) * 8);
    const h = Math.round(36 * k);
    rect(0, 72 - h / 2, W, h, COL.red);
    rect(0, 72 - h / 2 - 2, W, 2, COL.gold); rect(0, 72 + h / 2, W, 2, COL.gold);
    if (k >= 1) text(st.text, 160, 59, COL.text, { align: 'center', bold: true, scale: 2, outline: COL.ink });
  }
  function drawChapter() {
    rect(0, 0, W, H, COL.night);
    const c = S.chapter;
    text(c.text, 160, 70, COL.gold, { align: 'center', bold: true, scale: 2 });
    if (c.sub) text(c.sub, 160, 104, COL.dim, { align: 'center' });
  }
  function drawTestTitle() {
    rect(0, 58, W, 52, 'rgba(7,6,12,0.85)');
    rect(0, 58, W, 1, COL.testimony); rect(0, 109, W, 1, COL.testimony);
    text('증언', 160, 64, COL.testimony, { align: 'center', bold: true });
    text(S.testTitle.title, 160, 82, COL.text, { align: 'center', bold: true, scale: 1 });
  }
  const TITLE = '나유타 재판', TAGLINE = '이 길이 아닌가?';
  const CREDIT = '비공식 팬 제작 · 원작: 승리의 여신: 니케 / SHIFT UP';
  const NOTICE = '비영리 팬 프로젝트 · 문제 시 즉시 삭제합니다';
  function drawTitle() {
    rect(0, 0, W, H, COL.night);
    for (let i = 0; i < 40; i++) {
      const x = (i * 73) % W, y = (i * 41 + Math.floor(S.t * 6 * ((i % 3) + 1))) % 120;
      rect(x, y, 1, 1, i % 4 ? '#3a3858' : '#6a68a0');
    }
    text(TITLE, 160, 10, COL.gold, { align: 'center', bold: true, scale: 3, outline: COL.ink });
    // 부제 = 나유타의 시그니처 대사
    text(TAGLINE, 160, 50, COL.text, { align: 'center', bold: true, scale: 1.5, outline: COL.ink });
    text(CASE.subtitle || '', 160, 72, COL.dim, { align: 'center' });
    button(110, 88, 100, 18, '새로 시작', () => begin(null));
    button(110, 109, 100, 18, '이어하기', () => begin(S.saved), { off: !S.saved });
    const sound = muted ? '소리 꺼짐' : '소리 켜짐';
    const hasSkins = Object.keys(CASE.variants || {}).length > 0;
    const row = [[sound, toggleMute]];
    if (hasSkins) row.push(['의상', () => { S.scene = 'skins'; }]);
    if (canFull && !isFull()) row.push(['전체 화면', goFull]);
    const bw = 64, gap = 10, x0 = Math.round(160 - (row.length * bw + (row.length - 1) * gap) / 2);
    row.forEach(([label, fn], i) => button(x0 + i * (bw + gap), 130, bw, 18, label, fn));
    text(CREDIT, 160, 152, COL.dim, { align: 'center' });
    text(NOTICE, 160, 165, '#6a6890', { align: 'center' });
    text('v0.1', 316, 2, '#4a4870', { align: 'right' });
    if (dataErrors.length) text(`데이터 오류 ${dataErrors.length}건 (콘솔 확인)`, 4, 2, COL.red);
  }
  function drawOver() {
    rect(0, 0, W, H, COL.night);
    text('패소', 160, 40, COL.red, { align: 'center', bold: true, scale: 3, outline: COL.ink });
    text('재판장의 인내심이 바닥났다.', 160, 86, COL.text, { align: 'center' });
    button(90, 110, 140, 18, '마지막 저장 지점부터', retry);
    button(90, 132, 140, 18, '타이틀로', toTitle);
  }
  function drawEnd() {
    rect(0, 0, W, H, COL.night);
    const e = S.end;
    text(e.title, 160, 40, e.result === 'win' ? COL.gold : COL.red, { align: 'center', bold: true, scale: 3, outline: COL.ink });
    wrap(e.text || '', 280).forEach((s, i) => text(s, 160, 90 + i * 14, COL.text, { align: 'center' }));
    button(110, 140, 100, 18, '타이틀로', toTitle);
  }
  function drawSkins() {
    rect(0, 0, W, H, COL.night);
    text('의상 고르기', 160, 8, COL.gold, { align: 'center', bold: true });
    Object.keys(CASE.variants).forEach((id, i) => {
      const y = 30 + i * 22, vs = CASE.variants[id];
      const cur = vs.find((v) => v.id === skinOf(id)) || vs[0];
      text(CASE.chars[id].name, 24, y + 2, COL.text, { bold: true });
      button(92, y, 20, 18, '◀', () => cycleSkin(id, -1));
      text(cur.label, 152, y + 2, COL.gold, { align: 'center' });
      button(192, y, 20, 18, '▶', () => cycleSkin(id, 1));
    });
    // 첫 인물의 고른 그림 미리 보기
    const first = Object.keys(CASE.variants)[0];
    const pv = first && portrait(first, 'normal');
    if (pv) { rect(222, 26, 90, 104, '#1a1830'); g.drawImage(pv, 0, 0, pv.width, pv.height, 224, 28, 86, Math.round((86 * pv.height) / pv.width)); }
    button(110, 150, 100, 18, '돌아가기', toTitle);
  }
  function drawRotate() {
    rect(0, 0, W, H, COL.night);
    // 휴대폰 모양을 눕히는 그림
    rect(112, 40, 24, 40, COL.dim); rect(114, 43, 20, 32, COL.night);
    rect(172, 56, 40, 24, COL.gold); rect(175, 58, 32, 20, COL.night);
    text('→', 154, 54, COL.text, { align: 'center' });
    text('휴대폰을 가로로 돌려 주세요', 160, 100, COL.text, { align: 'center', bold: true });
    if (canFull) text('화면을 누르면 전체 화면으로 바뀝니다', 160, 120, COL.dim, { align: 'center' });
  }
  function draw() {
    B = [];
    g.setTransform(RES, 0, 0, RES, 0, 0);
    if (portraitHeld()) drawRotate();
    else if (S.scene === 'title') drawTitle();
    else if (S.scene === 'skins') drawSkins();
    else if (S.scene === 'over') drawOver();
    else if (S.scene === 'end') drawEnd();
    else if (S.mode === 'chapter') drawChapter();
    else {
      const sh = S.fx.shake > 0 ? 2 : 0;
      g.setTransform(RES, 0, 0, RES, sh ? Math.round(Math.random() * 4 - 2) * RES : 0, sh ? Math.round(Math.random() * 4 - 2) * RES : 0);
      drawCourt(); drawPortrait(); if (S.bg !== 'void') drawStand();
      g.setTransform(RES, 0, 0, RES, 0, 0);
      drawHud();
      if (S.mode === 'line' && S.line) drawLine();
      else if (S.mode === 'cross') drawCross();
      else frameBox(4, 118, 312, 58);
      if (S.pocket) drawPocket();
      // 위에 덮는 화면이 뜨면 아래 버튼은 눌리지 않게 비운다
      if (S.mode === 'testTitle' && S.testTitle) { B = []; drawTestTitle(); }
      if (S.overlay) { B = []; drawOverlay(); }
      if (S.mode === 'stamp' && S.fx.stamp) { B = []; drawStamp(); }
    }
    if (S.fx.flash > 0) rect(0, 0, W, H, `rgba(255,255,255,${S.fx.flash.toFixed(2)})`);
  }

  // ───────── 시작: 글꼴을 기다린 뒤(최대 3초) 돌린다 ─────────
  let last = performance.now();
  function loop(t) {
    update(Math.min(0.05, (t - last) / 1000));
    last = t;
    draw();
    requestAnimationFrame(loop);
  }
  const fonts = Promise.all([document.fonts.load('12px Galmuri11'), document.fonts.load('12px Galmuri11Bold')]);
  Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).catch(() => {}).then(() => requestAnimationFrame(loop));

  // 개발 확인용
  window.__nayuta = { S, step, present, begin, dataErrors };
})();
