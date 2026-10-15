'use strict';
// =====================================================================
// Mapa de nodos (Guía v0.2, sección 9): 10 filas, 2 a 4 nodos por fila,
// caminos sin cruces, jefe en la fila final. Se dibuja como un mapa de
// tiles 16×16 por el que Tocopo camina de nodo en nodo.
// =====================================================================

const NodeMap = {
  ROW_GAP: 5,

  // Generación determinista: misma semilla + región = mismo mapa
  generate(seed, region) {
    const rng = RNG.create(RNG.hash(seed, 'mapa', region));
    const R = CONFIG.ROWS - 1;
    const rows = [];
    for (let r = 0; r < R; r++) {
      const n = rng.int(CONFIG.MIN_NODES, CONFIG.MAX_NODES);
      const lanes = rng.shuffle([...Array(CONFIG.LANES).keys()]).slice(0, n).sort((a, b) => a - b);
      rows.push(lanes.map((lane, i) => ({ id: `r${r}c${i}`, row: r, lane, type: null, children: [], parents: [] })));
    }
    const nodes = {};
    rows.flat().forEach(n => { nodes[n.id] = n; });
    const link = (a, b) => {
      if (!a.children.includes(b.id)) a.children.push(b.id);
      if (!b.parents.includes(a.id)) b.parents.push(a.id);
    };
    // Conexiones monótonas (sin cruces) entre filas seguidas
    for (let r = 0; r < R - 1; r++) {
      const A = rows[r], B = rows[r + 1];
      let i = 0, j = 0;
      link(A[0], B[0]);
      while (i < A.length - 1 || j < B.length - 1) {
        if (i === A.length - 1) j++;
        else if (j === B.length - 1) i++;
        else {
          const ni = A[i + 1].lane, nj = B[j + 1].lane;
          if (ni < nj) i++;
          else if (nj < ni) j++;
          else if (rng.chance(0.5)) { i++; j++; }
          else if (rng.chance(0.5)) i++;
          else j++;
        }
        link(A[i], B[j]);
      }
    }
    const boss = { id: 'boss', row: R, lane: 1.5, type: 'boss', children: [], parents: [] };
    nodes.boss = boss;
    rows[R - 1].forEach(n => link(n, boss));
    const start = { id: 'start', row: -1, lane: 1.5, type: 'start', children: rows[0].map(n => n.id), parents: [] };
    nodes.start = start;

    // Tipos de nodo
    const W = CONFIG.NODE_WEIGHTS;
    for (const row of rows) for (const node of row) {
      if (node.row === 0) { node.type = 'combat'; continue; }
      const eliteParent = node.parents.some(p => nodes[p].type === 'elite');
      const w = Object.assign({}, W);
      if (node.row < CONFIG.ELITE_MIN_ROW || eliteParent) delete w.elite;
      node.type = rng.weighted(w).id;
    }
    // La fila 5 siempre ofrece un Descanso; la fila 9, Descanso o Tienda
    const ensure = (rowIdx, types) => {
      for (const parent of rows[rowIdx - 1]) {
        const kids = parent.children.map(id => nodes[id]);
        if (!kids.some(k => types.includes(k.type))) rng.pick(kids).type = rng.pick(types);
      }
    };
    ensure(CONFIG.REST_ROW, ['rest']);
    ensure(CONFIG.PRE_BOSS_ROW, ['rest', 'shop']);

    // Posición en tiles
    const H = (CONFIG.ROWS) * this.ROW_GAP + 6;
    for (const n of Object.values(nodes)) {
      if (n.id === 'boss') { n.x = 16; n.y = 3; }
      else if (n.id === 'start') { n.x = 16; n.y = H - 2; }
      else { n.x = 7 + n.lane * 6 + rng.int(-1, 1); n.y = H - 6 - n.row * this.ROW_GAP + rng.int(0, 1); }
    }
    const map = { region, rows, nodes, boss, start, w: 32, h: H, paths: {} };
    for (const n of Object.values(nodes)) for (const c of n.children) map.paths[`${n.id}>${c}`] = this.line(n, nodes[c]);
    this.buildTerrain(map, rng);
    return map;
  },

  // Camino de tiles con pasos de 4 direcciones
  line(a, b) {
    const pts = [[a.x, a.y]];
    let x = a.x, y = a.y;
    const tx = b.x, ty = b.y;
    const dx = tx - a.x, dy = ty - a.y;
    while (x !== tx || y !== ty) {
      const px = dx ? (x - a.x) / dx : 1, py = dy ? (y - a.y) / dy : 1;
      if (x !== tx && (px <= py || y === ty)) x += Math.sign(dx);
      else y += Math.sign(dy);
      pts.push([x, y]);
    }
    return pts;
  },

  // Terreno: suelo, caminos y decoración según la región
  buildTerrain(map, rng) {
    const { w, h } = map;
    const t = [];
    for (let y = 0; y < h; y++) { t.push([]); for (let x = 0; x < w; x++) t[y].push(rng.chance(0.18) ? 'g2' : 'g'); }
    const path = new Set();
    Object.values(map.paths).forEach(p => p.forEach(([x, y]) => path.add(`${x},${y}`)));
    const near = (x, y) => Object.values(map.nodes).some(n => Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1);
    // bordes de bosque, roca, hielo o cristal
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (path.has(`${x},${y}`) || near(x, y)) { if (path.has(`${x},${y}`)) t[y][x] = 'p'; continue; }
      const edge = x < 3 || x > w - 4;
      const r = rng.next();
      if (edge && r < 0.75) t[y][x] = 'T';
      else if (r < 0.08) t[y][x] = 'T';
      else if (r < 0.11) t[y][x] = 'R';
      else if (r < 0.14) t[y][x] = 'F';
    }
    // charcos de agua, lava o hielo
    const pools = rng.int(3, 6);
    for (let i = 0; i < pools; i++) {
      const cx = rng.int(4, w - 5), cy = rng.int(3, h - 4), rr = rng.int(1, 2);
      for (let y = cy - rr; y <= cy + rr; y++) for (let x = cx - rr - 1; x <= cx + rr + 1; x++) {
        if (y < 0 || y >= h || x < 0 || x >= w) continue;
        if (path.has(`${x},${y}`) || near(x, y)) continue;
        if (Math.abs(x - cx) / (rr + 1.5) + Math.abs(y - cy) / (rr + 0.5) <= 1.2) t[y][x] = 'W';
      }
    }
    map.tiles = t;
  },

  // ¿Se ve el tipo de este nodo?
  visible(run, map, node) {
    if (node.id === 'boss' || node.id === 'start') return true;
    if (run.visited.includes(node.id) || run.revealed.includes(node.id)) return true;
    const cur = run.pos === 'start' ? -1 : map.nodes[run.pos].row;
    return node.row <= cur + CONFIG.VISIBLE_ROWS;
  },

  // Escamas Brillantes: revela un nodo oculto por región
  useEscamas(run, map) {
    const region = Run.region(run);
    if (run.escamasUsed[region] || !Run.hasMut(run, 'escamas')) return null;
    const hidden = Object.values(map.nodes).filter(n => !this.visible(run, map, n));
    run.escamasUsed[region] = true;
    if (!hidden.length) return null;
    const n = RNG.for(run, region, 'escamas').pick(hidden);
    run.revealed.push(n.id);
    return n;
  },

  revealAll(run, map) {
    for (const n of Object.values(map.nodes)) if (!run.revealed.includes(n.id)) run.revealed.push(n.id);
  },

  // ------------------------------------------------------------------
  // Dibujo
  renderLayer(map) {
    const reg = REGIONS[map.region];
    const [c0, c1, c2, c3, c4] = reg.tones;
    const c = document.createElement('canvas');
    c.width = map.w * 16; c.height = map.h * 16;
    const ctx = c.getContext('2d');
    const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const ch = map.tiles[y][x], X = x * 16, Y = y * 16, h = RNG.hash(x, y, map.region);
      const ground = reg.deco === 'ice' ? c2 : reg.deco === 'crystal' ? c1 : c1;
      P(X, Y, 16, 16, ch === 'g2' ? (reg.deco === 'ice' ? c3 : c2) : ground);
      if (ch === 'g' || ch === 'g2') {
        ctx.fillStyle = reg.deco === 'ice' ? c1 : c0;
        for (let i = 0; i < 3; i++) ctx.fillRect(X + ((h >>> (i * 5)) & 15), Y + ((h >>> (i * 5 + 3)) & 15), 2, 1);
      }
      if (ch === 'p') {
        P(X, Y, 16, 16, reg.path);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(X + (h & 11), Y + ((h >>> 4) & 11), 3, 2);
      }
      if (ch === 'T') this.drawTree(ctx, reg, X, Y, h);
      if (ch === 'R') { P(X + 3, Y + 6, 10, 8, c0); P(X + 4, Y + 5, 7, 3, reg.deco === 'crystal' ? c4 : '#9a8f88'); P(X + 5, Y + 6, 3, 1, '#ffffff'); }
      if (ch === 'F') {
        const cols = reg.deco === 'lava' ? [c3, c4] : reg.deco === 'crystal' ? [c4, c3] : reg.deco === 'ice' ? ['#ffffff', c1] : ['#ffe14a', '#c46bff'];
        for (let i = 0; i < 3; i++) P(X + 2 + ((h >>> (i * 4)) & 11), Y + 3 + ((h >>> (i * 4 + 2)) & 9), 2, 2, cols[i % 2]);
      }
      if (ch === 'W') P(X, Y, 16, 16, this.poolColor(reg)[0]);
    }
    return c;
  },

  poolColor(reg) {
    if (reg.deco === 'lava') return ['#ff6b3a', '#ffe14a'];
    if (reg.deco === 'ice') return ['#7fc4f0', '#ffffff'];
    if (reg.deco === 'crystal') return ['#3b2257', '#7ff3ff'];
    if (reg.deco === 'swamp') return ['#1f3a5a', '#5e6b44'];
    return ['#3a8fd6', '#d6f0ff'];
  },

  drawTree(ctx, reg, X, Y, h) {
    const [c0, c1, c2, c3, c4] = reg.tones;
    const P = (x, y, w, hh, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, hh); };
    if (reg.deco === 'fern') {
      P(6, 10, 4, 6, c4); P(2, 2, 12, 9, c0); P(1, 4, 14, 5, c0); P(4, 1, 8, 2, c0); P(4, 3, 4, 2, c2); P(9, 5, 3, 2, c2);
    } else if (reg.deco === 'swamp') {
      P(7, 4, 3, 12, c4); P(3, 5, 4, 2, c4); P(10, 3, 4, 2, c4); P(2, 1, 6, 4, c0); P(9, 0, 6, 4, c0); P(3, 5, 1, 4, c2);
    } else if (reg.deco === 'lava') {
      P(2, 5, 12, 11, c0); P(4, 2, 8, 4, c0); P(5, 2, 4, 2, c1); P(3, 6, 3, 2, c1); if (h & 1) P(10, 9, 2, 2, c3);
    } else if (reg.deco === 'ice') {
      P(7, 13, 2, 3, '#5a4a42');
      for (let i = 0; i < 6; i++) P(7 - i, 2 + i * 2, 2 + i * 2, 2, c0);
      P(6, 1, 4, 2, '#ffffff'); P(4, 6, 3, 1, '#ffffff'); P(9, 9, 3, 1, '#ffffff');
    } else {
      P(6, 1, 4, 15, c3); P(2, 6, 3, 10, c2); P(11, 4, 3, 12, c2); P(7, 2, 1, 10, c4); P(3, 7, 1, 6, c4); P(12, 5, 1, 7, c4);
    }
  },

  // Ícono del nodo (16×16) dibujado en (X, Y)
  drawNode(ctx, type, X, Y, t, state) {
    const P = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
    const base = state === 'done' ? '#5a4a42' : '#3a2f2a';
    P(1, 1, 14, 14, base);
    P(2, 2, 12, 12, state === 'done' ? '#9a8f88' : '#fff6e0');
    if (state === 'done') { P(4, 7, 8, 2, '#5a4a42'); return; }
    switch (type) {
      case 'combat': // garra
        P(4, 4, 2, 8, '#c0392b'); P(7, 3, 2, 9, '#c0392b'); P(10, 4, 2, 8, '#c0392b'); P(4, 11, 8, 2, '#7a1f16'); break;
      case 'elite': // cráneo con cuernos
        P(3, 2, 2, 3, '#7a1f16'); P(11, 2, 2, 3, '#7a1f16'); P(4, 5, 8, 6, '#c0392b'); P(5, 7, 2, 2, '#ffe14a'); P(9, 7, 2, 2, '#ffe14a'); P(6, 11, 4, 2, '#c0392b'); break;
      case 'event': // signo de pregunta
        P(5, 3, 6, 2, '#7b4bc4'); P(9, 5, 2, 3, '#7b4bc4'); P(7, 7, 2, 3, '#7b4bc4'); P(7, 11, 2, 2, '#7b4bc4'); break;
      case 'shop': // bolsa de Pip
        P(5, 3, 6, 2, '#6b4a2b'); P(3, 5, 10, 8, '#a0703e'); P(6, 7, 4, 4, '#ffe14a'); P(7, 8, 2, 2, '#e3c15b'); break;
      case 'rest': { // fogata
        const k = Math.sin(t * 8) > 0 ? 1 : 0;
        P(3, 11, 10, 2, '#6b4a2b'); P(6, 5 + k, 4, 6 - k, '#ff6b3a'); P(7, 7, 2, 4, '#ffe14a'); break;
      }
      case 'nest': // cristal
        P(7, 2, 2, 11, '#7ff3ff'); P(4, 6, 2, 7, '#c46bff'); P(10, 5, 2, 8, '#3a8fd6'); P(3, 12, 10, 2, '#a0703e'); break;
      case 'boss':
        P(3, 3, 10, 8, '#7a1f16'); P(5, 5, 2, 2, '#ffe14a'); P(9, 5, 2, 2, '#ffe14a'); P(4, 11, 2, 2, '#ffffff'); P(7, 11, 2, 2, '#ffffff'); P(10, 11, 2, 2, '#ffffff'); break;
      case 'start':
        P(3, 8, 10, 5, '#a0703e'); P(5, 6, 6, 3, '#6b4a2b'); P(6, 9, 4, 3, '#f3dfa0'); break;
      default: // oculto
        P(6, 4, 4, 2, '#9a8f88'); P(9, 6, 2, 2, '#9a8f88'); P(7, 8, 2, 2, '#9a8f88'); P(7, 11, 2, 2, '#9a8f88');
    }
  },
};
