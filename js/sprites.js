'use strict';
// =====================================================================
// Sprites 16×16 (jefes 32×32) en pixel art, ajustados a la paleta de
// 32 colores. Arte provisional: la estructura de capas y cuadros es la
// definitiva (Guía v0.2, sección 13).
// =====================================================================

const TEMPLATES = {
  raptor: [
    '................', '..aaaaa.........', '.aakaaaa........', 'aaaaaaaaa.......',
    'wmwmwaaaa.......', 'aaaaaaaaa.......', '.....aaaa.......', '....aaaaaa......',
    '...b.aeaeaa.....', '..b..acccaaa....', '.....acccaaaaa..', '......aaaaa.aaa.',
    '......a..a....aa', '......a..a......', '.....bb.bb......', '................',
  ],
  trex: [
    '................', '...aaaaaa.......', '..aakaaaaa......', '.aaaaaaaaaa.....',
    'aaaaaaaaaaa.....', 'wmwmwmaaaaa.....', 'aaaaaaaaaaa.....', '....aaaaaaaa....',
    '...b.accaaaaa...', '....accccaaaaa..', '....acccccaaaaa.', '.....acccaaaa.aa',
    '.....aaaaaaa...a', '.....aa...aa....', '.....aa...aa....', '....bbb..bbb....',
  ],
  bug: [
    '................', '................', '....bb....bb....', '...bbbb..bbbb...',
    '...bbbbbbbbbb...', '....bbbbbbbb....', '..kk.aaaa.......', '.kaaaaaaaaaaaaa.',
    '..kk.aaaa..c.cc.', '....bbbbbbbb....', '...bbbbbbbbbb...', '...bbbb..bbbb...',
    '....bb....bb....', '................', '................', '................',
  ],
  ptero: [
    '................', '................', '....aaee........', '...akaa.........',
    'cccaaaaa........', '......aa........', 'bb....aaa.....bb', '.bbb..aaaa..bbb.',
    '..bbbbaaaabbbb..', '...bbbbaabbbb...', '....bbbaabbb....', '......aaaa......',
    '......a..a......', '.....dd..dd.....', '................', '................',
  ],
  plant: [
    '................', '...aaaaaaa......', '..aaaaaaaaa.....', '.akaaaaakaa.....',
    '.aaaaaaaaaaa....', '.wcwcwcwcw......', '.cccccccc.......', '.wcwcwcwcw......',
    '..aaaaaaaaa.....', '....bbb.........', 'dd..bbb..dd.....', 'ddd.bbb.ddd.....',
    '.ddddbbddd......', '....bbb.........', '..eeeeeeeee.....', '...eeeeeee......',
  ],
  toad: [
    '................', '................', '................', '................',
    '...kk...kk......', '..akka.akka.....', '..aaaaaaaaaa....', '.aaaaaaaaaaaa...',
    '.mmmmmmmmmaaa...', '.aaaaaaaaaaaaa..', '.acccccccaeaea..', '..ccccccaaaaaaa.',
    '..aaaaaaaaaaaaa.', '.aa.aa...aa..aa.', 'bbb.bb...bb.bbb.', '................',
  ],
  lizard: [
    '................', '................', '................', '................',
    '................', '................', '....kk..........', '.aaaaaa.e.e.e...',
    'aaaaaaaaaaaaa...', 'wmwmwmaaaaaaaaa.', 'aaaaaaaaaaaaaaaa', '.cccccaaaaaaa..a',
    '...aa....aa.....', '..bbb...bbb.....', '................', '................',
  ],
  quad: [
    '................', '................', '................', '....aaaaa.......',
    '...aaaaaaaaaaa..', '..akaaaaaaaaaaa.', '..aaaaaaaaaaaaaa', 'ccaaaaaaaaaaaaaa',
    'c.aaaaaaaaaaaaaa', 'c.baaaaaaaaaaaa.', '..b.aaaaaaaaaaa.', '..b.aa.aa..aa.aa',
    '....aa.aa..aa.aa', '....bb.bb..bb.bb', '................', '................',
  ],
  golem: [
    '................', '................', '.....aaaaa......', '....aakakaa.....',
    '....aaccaaa.....', '..aaaaaaaaaaa...', '.aaacaaaaacaaa..', '.aa.aaccaaa.aa..',
    '.aa.aaaaaaa.aa..', '.cc.acaaaca.cc..', '....aaaaaaa.....', '....aaa.aaa.....',
    '....aac.caa.....', '...bbbb.bbbb....', '................', '................',
  ],
  wolf: [
    '................', '................', '................', '..a.a...........',
    '.aaaaa..........', 'akaaaa..........', 'kaaaaaa.........', '.wwaaaaaaaaaa..a',
    '...aaaaaaaaaaaa.', '...accccaaaaaa..', '...aaaaaaaaaaa..', '...a.a.....a.a..',
    '...a.a.....a.a..', '..bb.bb...bb.bb.', '................', '................',
  ],
  blob: [
    '................', '.....c.c.c......', '.....ccccc......', '....aaaaaaa.....',
    '...aakaaakaa....', '...aaaaaaaaa....', '..aaammmmmaaa...', '..aaaaaaaaaaa...',
    '.aaeaaaaaaaeaa..', '.aaaaaaaaaaaaa..', 'aaaaaaaaaaaaaaa.', 'abaaabaaaabaaab.',
    'bbbbbbbbbbbbbbb.', '................', '................', '................',
  ],
  bracca: [
    '........aaaa....', '.......aaakaa...', '........aaaaaa..', '........aa......',
    '.......aa.......', '.......aa.......', '......aa........', '......aa........',
    '...aaaaaaa......', '..aaaaaaaaa.....', '.aaaaaaaaaaa....', 'aacccccccaaa....',
    'a.aaaaaaaaaa....', '..aa.aa.aa.aa...', '..aa.aa.aa.aa...', '..bb.bb.bb.bb...',
  ],
  pip: [
    '................', '................', '...a.....a......', '...aa...aa......',
    '...aaaaaaa......', '...akaaaka......', '....aakaa.......', '.....aaa........',
    '....bbbbbb......', '...abbbbbba.....', '...abbccbba.....', '....bbbbbb......',
    '....aa..aa......', '...aaa..aaa.....', '................', '................',
  ],
};

const NPC_PALS = {
  bracca: { a: '#8a9a52', b: '#5e6b44', c: '#d4f0a8', k: '#141018' },
  pip:    { a: '#a0703e', b: '#3a8fd6', c: '#ffe14a', k: '#141018' },
  ptera:  { a: '#c46bff', b: '#7b4bc4', c: '#ffe14a', k: '#141018', d: '#3b2257', e: '#c0392b' },
};

// ---------------------------------------------------------------------
// Tocopo: un cuerpo base por etapa, con puntos de anclaje para las capas
// ---------------------------------------------------------------------
const TOCOPO_BODIES = {
  cria: {
    rows: [
      '................', '................', '................', '................',
      '................', '........gggg....', '.......gggggg...', '.......ggkhggg..',
      '.......gggggggg.', '.......gggmmmm..', '.....ggggggg....', '...gggolllog....',
      'gggggggllgggg...', '..ggggggggg.....', '.....dd.dd......', '....ddd.ddd.....',
    ],
    a: { eye: [9, 7], mouth: [10, 9], drip: [[14, 9], [14, 10]], crown: [8, 5],
         back: [[6, 7], [6, 9], [4, 10], [2, 11]], tail: [0, 12], arm: [12, 12],
         toes: [[7, 15], [11, 15]], chest: [7, 11], spots: [[5, 11], [10, 12], [4, 13], [9, 13], [8, 10], [9, 6]], legRow: 14 },
  },
  juvenil: {
    rows: [
      '................', '................', '................', '........gggg....',
      '.......gggggg...', '.......ggkhggg..', '.......gggggggg.', '.......gggmmmmm.',
      '........ggggg...', '.....ggggggg....', '....gggolllogg..', 'g..gggglllgggg..',
      'gggggggllgggg...', '.gggggggggg.....', '.....dd..dd.....', '....ddd.ddd.....',
    ],
    a: { eye: [9, 5], mouth: [10, 7], drip: [[15, 7], [15, 8]], crown: [8, 3],
         back: [[6, 5], [6, 7], [4, 9], [3, 10], [1, 11]], tail: [0, 11], arm: [13, 11],
         toes: [[7, 15], [11, 15]], chest: [8, 10], spots: [[5, 10], [12, 10], [4, 12], [10, 12], [3, 11], [10, 6]], legRow: 14 },
  },
  adulto: {
    rows: [
      '................', '........gggg....', '.......gggggg...', '.......ggkhggg..',
      '.......ggggggggg', '.......gggmmmmm.', '........ggggg...', '......gggggg....',
      '.....gggggggg...', '....ggolllloggg.', 'g..gggglllllgg..', 'gggggggllllgg...',
      '.ggggggggggg....', '......dd..dd....', '......dd..dd....', '.....ddd.ddd....',
    ],
    a: { eye: [9, 3], mouth: [10, 5], drip: [[15, 5], [15, 6]], crown: [8, 1],
         back: [[6, 6], [5, 7], [4, 8], [3, 9], [2, 10]], tail: [0, 10], arm: [14, 9],
         toes: [[8, 15], [12, 15]], chest: [9, 10], spots: [[7, 8], [10, 8], [5, 11], [9, 12], [3, 11], [9, 6]], legRow: 13 },
  },
  alfa: {
    rows: [
      '........d.d.....', '.......gggggd...', '......ggggggg...', '......gggkhggg..',
      '......gggggggggg', '......ggggmmmmmm', '.......gggggggg.', '.....dgggggg....',
      '....dggggggggg..', '...dggolllloggg.', 'g.dgggglllllgg..', 'gggggggllllgg...',
      '.ggggdgggdggg...', '.....ddd..ddd...', '.....dd...dd....', '....ddd..ddd....',
    ],
    a: { eye: [9, 3], mouth: [10, 5], drip: [[15, 6], [15, 7]], crown: [7, 1],
         back: [[5, 4], [4, 7], [3, 8], [2, 9], [1, 10]], tail: [0, 10], arm: [14, 9],
         toes: [[7, 15], [12, 15]], chest: [9, 10], spots: [[7, 8], [11, 8], [5, 11], [8, 12], [4, 11], [10, 6]], legRow: 13 },
  },
};

const TOCOPO_PAL = {
  g: '#8fd16a', d: '#4f9a3e', l: '#d4f0a8', k: '#141018', h: '#ffffff', m: '#1f4a2a', o: '#ffb03a',
  w: '#ffffff', b: '#f3dfa0', B: '#a0703e', f: '#3a8fd6', F: '#7fc4f0', a: '#d4f0a8',
  v: '#1f4a2a', c: '#7b4bc4', C: '#c46bff', r: '#c0392b', y: '#ffe14a', x: '#7ff3ff', X: '#3a8fd6',
  s: '#ffffff', e: '#ffe14a',
};

// Capas por rama (en el orden de la guía). Cada variante devuelve
// píxeles [x, y, color] a partir de los anclajes del cuerpo.
const CREST_PTS = A => { const [cx, cy] = A.crown; return [[cx, cy - 1], [cx - 1, cy], [cx - 1, cy - 1], [cx - 2, cy], [cx - 2, cy + 1], [cx - 1, cy - 2], [cx - 2, cy - 1], [cx - 3, cy + 1]]; };
const LAYER_VARIANTS = {
  placas: A => A.back.map(([x, y], i) => [x, y, i % 2 ? 'B' : 'b']),
  escudo: A => { const [cx, cy] = A.crown; return [[cx, cy, 'b'], [cx + 1, cy, 'b'], [cx + 2, cy, 'B'], [cx + 3, cy, 'b'], [cx + 1, cy - 1, 'b'], [cx + 2, cy - 1, 'b']]; },
  mazo: A => { const [x, y] = A.tail; return [[x, y - 1, 'B'], [x + 1, y - 1, 'b'], [x, y, 'b'], [x + 1, y, 'b'], [x, y + 1, 'b'], [x + 1, y + 1, 'B'], [x, y - 2, 'w'], [x, y + 2, 'w']]; },
  plumon: A => { const [cx, cy] = A.crown; return [[cx + 1, cy - 1, 'f'], [cx + 2, cy - 1, 'F'], [cx + 3, cy - 1, 'f'], [cx + 2, cy - 2, 'F']]; },
  alas: A => { const [x, y] = A.arm; return [[x - 2, y, 'f'], [x - 1, y, 'F'], [x, y, 'f'], [x - 2, y + 1, 'F'], [x - 1, y + 1, 'f'], [x + 1, y + 1, 'f']]; },
  tormenta: A => [
    ...LAYER_VARIANTS.plumon(A), ...LAYER_VARIANTS.alas(A),
    ...A.back.map(([x, y], i) => [x, y, i % 2 ? 'F' : 'f']),
    [A.tail[0], A.tail[1] - 1, 'F'], [A.tail[0] + 1, A.tail[1] - 1, 'f'],
  ],
  saliva: A => A.drip.map(([x, y]) => [x, y, 'a']),
  piel: A => A.spots.map(([x, y]) => [x, y, 'v']),
  nube: A => [...A.spots.map(([x, y]) => [x, y, 'v']), ...A.drip.map(([x, y]) => [x, y, 'a'])],
  colmillos: A => { const [x, y] = A.mouth; return [[x + 1, y, 'w'], [x + 3, y, 'w']]; },
  garrasHoz: A => [...A.toes.map(([x, y]) => [x, y, 'w']), [A.arm[0] + 1, A.arm[1], 'w']],
  mandibula: A => {
    const [cx, cy] = A.crown, [mx, my] = A.mouth;
    return [[cx - 1, cy, 'g'], [cx, cy - 1, 'g'], [cx + 1, cy - 1, 'g'], [cx + 2, cy - 1, 'g'], [cx + 3, cy - 1, 'g'],
      [mx, my + 1, 'g'], [mx + 1, my + 1, 'g'], [mx + 2, my + 1, 'g'], [mx + 3, my + 1, 'd'], [mx + 1, my, 'w'], [mx + 3, my, 'w']];
  },
  crestaPeq: A => CREST_PTS(A).slice(0, 3).map(([x, y], i) => [x, y, i === 2 ? 'C' : 'c']),
  crestaEco: A => CREST_PTS(A).map(([x, y], i) => [x, y, i % 3 === 2 ? 'C' : 'c']),
  coro: A => CREST_PTS(A).map(([x, y], i) => [x, y, ['c', 'y', 'C', 'r', 'x', 'c', 'y', 'r'][i]]),
  escamas: A => A.spots.map(([x, y]) => [x, y, 'y']),
  destello: A => [[A.eye[0], A.eye[1], 'e']],
  nucleo: A => { const [x, y] = A.chest; return [[x, y, 'x'], [x + 1, y, 'X'], [x, y + 1, 'X'], [x + 1, y + 1, 'x']]; },
  pelaje: A => A.back.flatMap(([x, y]) => [[x, y, 's'], [x + 1, y, 's']]),
};
const LAYER_ORDER = ['coraza', 'plumas', 'glandulas', 'garras', 'cresta', 'bio'];

// ---------------------------------------------------------------------
const Sprites = {
  cache: new Map(),
  _quant: new Map(),
  _rgb: PALETTE.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]),

  rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; },

  // Ajusta cualquier color al más cercano de la paleta de 32
  quant(hex) {
    if (!hex) return null;
    if (this._quant.has(hex)) return this._quant.get(hex);
    const [r, g, b] = this.rgbOf(hex);
    let best = PALETTE[0], bd = Infinity;
    this._rgb.forEach(([pr, pg, pb], i) => {
      const d = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
      if (d < bd) { bd = d; best = PALETTE[i]; }
    });
    this._quant.set(hex, best);
    return best;
  },

  shade(hex, k) {
    const [r, g, b] = this.rgbOf(hex);
    const f = v => clamp(Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)), 0, 255).toString(16).padStart(2, '0');
    return this.quant('#' + f(r) + f(g) + f(b));
  },

  grid(rows, pal) {
    return rows.map(r => r.padEnd(16, '.').slice(0, 16).split('').map(ch => (ch === '.' ? null : pal[ch] || null)));
  },

  // Cuadros de animación sobre una cuadrícula de colores
  frame(colors, frame, legRow) {
    const h = colors.length, w = colors[0].length;
    if (!frame || frame === 'idle0' || frame === 'walk0') return colors;
    const out = colors.map(r => r.slice());
    if (frame === 'idle1') {
      // respiración: el cuerpo baja 1 píxel, las patas quedan fijas
      for (let y = legRow; y >= 1; y--) for (let x = 0; x < w; x++) {
        const src = colors[y - 1][x];
        if (y === legRow) { if (src) out[y][x] = src; } else out[y][x] = src;
      }
      for (let x = 0; x < w; x++) out[0][x] = null;
    } else if (frame === 'walk1') {
      // paso: las patas se separan
      let minX = w, maxX = 0;
      for (let y = legRow; y < h; y++) for (let x = 0; x < w; x++) if (colors[y][x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
      const mid = (minX + maxX) / 2;
      for (let y = legRow; y < h; y++) {
        out[y] = new Array(w).fill(null);
        for (let x = 0; x < w; x++) {
          const c = colors[y][x];
          if (!c) continue;
          const nx = x < mid ? x - 1 : x + 1;
          if (nx >= 0 && nx < w) out[y][nx] = c;
        }
      }
    }
    return out;
  },

  toCanvas(colors) {
    const h = colors.length, w = colors[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = colors[y][x];
      if (!col) continue;
      ctx.fillStyle = this.quant(col);
      ctx.fillRect(x, y, 1, 1);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    c.box = { minX, maxX, minY, maxY };
    return c;
  },

  cached(key, make) {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key);
  },

  // Cristales sobre los corrompidos
  crystalize(colors) {
    const w = colors[0].length, step = w > 16 ? 5 : 3;
    for (let x = 1; x < w; x += step) {
      let top = -1;
      for (let y = 0; y < colors.length; y++) if (colors[y][x]) { top = y; break; }
      if (top < 0 || top > colors.length * 0.8) continue;
      colors[top][x] = '#c46bff';
      if (top > 0) colors[top - 1][x] = '#7ff3ff';
      if (top > 1 && x % 2) colors[top - 2][x] = '#ffffff';
    }
    return colors;
  },

  legRowOf(colors) {
    let maxY = 0;
    colors.forEach((r, y) => { if (r.some(Boolean)) maxY = y; });
    return Math.max(1, maxY - 2);
  },

  enemy(def, corrupt, frame = 'idle0') {
    return this.cached(`e:${def.name}:${corrupt ? 1 : 0}:${frame}`, () => {
      let g = this.grid(TEMPLATES[def.sprite], def.pal);
      g = this.frame(g, frame, this.legRowOf(g));
      if (corrupt || def.crystals) this.crystalize(g);
      return this.toCanvas(g);
    });
  },

  // Jefes 32×32: el dibujo 16×16 ampliado ×2 con luces y sombras
  boss(def, corrupt, frame = 'idle0') {
    return this.cached(`b:${def.name}:${corrupt ? 1 : 0}:${frame}`, () => {
      let g = this.grid(TEMPLATES[def.sprite], def.pal);
      g = this.frame(g, frame, this.legRowOf(g));
      const big = [];
      for (let y = 0; y < 32; y++) { big.push([]); for (let x = 0; x < 32; x++) big[y].push(g[y >> 1][x >> 1]); }
      const out = big.map(r => r.slice());
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const c = big[y][x];
        if (!c) continue;
        const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= 32 || yy >= 32 || !big[yy][xx];
        if (empty(x + 1, y) || empty(x, y + 1)) out[y][x] = this.shade(c, 0.62);
        else if (empty(x - 1, y) || empty(x, y - 1)) out[y][x] = this.shade(c, 1.35);
        else if ((x + y) % 7 === 0 && y > 4) out[y][x] = this.shade(c, 0.85);
      }
      if (corrupt || def.crystals) this.crystalize(out);
      return this.toCanvas(out);
    });
  },

  npc(name, frame = 'idle0') {
    const tpl = name === 'ptera' ? TEMPLATES.ptero : TEMPLATES[name];
    return this.cached(`n:${name}:${frame}`, () => {
      const g = this.grid(tpl, NPC_PALS[name]);
      return this.toCanvas(this.frame(g, frame, this.legRowOf(g)));
    });
  },

  // look: { stage, layers: { rama: idMutación }, pelaje, unstable }
  tocopo(look, frame = 'idle0') {
    const ids = LAYER_ORDER.map(b => look.layers[b] || '').join(',');
    return this.cached(`t:${look.stage}:${ids}:${look.pelaje ? 1 : 0}:${frame}`, () => {
      const body = TOCOPO_BODIES[look.stage] || TOCOPO_BODIES.cria;
      const g = this.grid(body.rows, TOCOPO_PAL);
      const put = list => list.forEach(([x, y, c]) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y][x] = TOCOPO_PAL[c]; });
      if (look.pelaje) put(LAYER_VARIANTS.pelaje(body.a));
      for (const b of LAYER_ORDER) if (look.layers[b]) put(LAYER_VARIANTS[look.layers[b]](body.a));
      return this.toCanvas(this.frame(g, frame, body.a.legRow));
    });
  },

  white(src) {
    if (!this._white) this._white = new WeakMap();
    if (this._white.has(src)) return this._white.get(src);
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    c.box = src.box;
    this._white.set(src, c);
    return c;
  },

  // Dibuja con la base (abajo, centro) en (x, y)
  draw(ctx, spr, x, y, scale, opts = {}) {
    const b = spr.box;
    const cx = (b.minX + b.maxX + 1) / 2;
    const dx = Math.round(x - cx * scale);
    const dy = Math.round(y - (b.maxY + 1) * scale);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flip) { ctx.translate(Math.round(x) * 2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(spr, dx, dy, spr.width * scale, spr.height * scale);
    ctx.restore();
    return { left: dx, top: dy, w: spr.width * scale, h: spr.height * scale };
  },
};

// Efectos animados de Tocopo (aura, chispas, brillos)
function drawTocopoFX(ctx, look, x, y, scale, t, flip) {
  const body = TOCOPO_BODIES[look.stage] || TOCOPO_BODIES.cria;
  const A = body.a, s = scale;
  const spr = Sprites.tocopo(look);
  const b = spr.box;
  const ox = x - ((b.minX + b.maxX + 1) / 2) * s, oy = y - (b.maxY + 1) * s;
  const P = (gx, gy) => [flip ? 2 * x - (ox + gx * s + s / 2) : ox + gx * s + s / 2, oy + gy * s + s / 2];
  const L = look.layers;
  ctx.save();
  if (L.glandulas === 'nube') {
    for (let i = 0; i < 7; i++) {
      const a = t * 0.8 + i * 0.9, r = 7 * s;
      ctx.fillStyle = `rgba(143,209,106,${0.16 + 0.1 * Math.sin(t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - 7 * s + Math.sin(a) * r * 0.6, 2.2 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (L.plumas === 'tormenta') {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 1.5 + i * 0.25) % 1;
      const [cx, cy] = P(A.back[i % A.back.length][0], A.back[i % A.back.length][1]);
      ctx.fillStyle = `rgba(214,240,255,${1 - ph})`;
      ctx.fillRect(cx - s / 2, cy - ph * 6 * s, s, s);
    }
  }
  if (L.bio === 'escamas') {
    for (const [gx, gy] of A.spots) {
      const k = 0.5 + 0.5 * Math.sin(t * 4 + gx * 1.7 + gy);
      const [cx, cy] = P(gx, gy);
      ctx.fillStyle = `rgba(255,225,74,${0.35 * k})`;
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (L.bio === 'destello') {
    const [cx, cy] = P(A.eye[0], A.eye[1]);
    ctx.fillStyle = `rgba(255,225,74,${0.35 + 0.2 * Math.sin(t * 5)})`;
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  if (L.bio === 'nucleo') {
    const [cx, cy] = P(A.chest[0] + 0.5, A.chest[1] + 0.5);
    ctx.fillStyle = `rgba(127,243,255,${0.3 + 0.2 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(cx, cy, s * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  if (look.unstable) {
    const k = Math.sin(t * 7) > 0.6 ? 0.35 : 0.1;
    ctx.fillStyle = `rgba(196,107,255,${k})`;
    ctx.beginPath(); ctx.ellipse(x, y - 7 * s, 8 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
