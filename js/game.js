'use strict';
// =====================================================================
// TOCOPO — núcleo: escenas, mapa de nodos, HUD, menús y pantallas.
// =====================================================================

// Tamaño interno del canvas: 512×288 en escritorio; en celular vertical
// el ancho baja a 352 y la altura se adapta a la pantalla (ver fit()).
let VW = CONFIG.VIEW_W, VH = CONFIG.VIEW_H;

const Game = {
  scene: 'boot', run: null, t: 0, last: 0,
  map: null, layer: null, sel: 0, walker: null, busy: false,
  battle: null, particles: [], sceneData: {}, mobile: false, fast: false, camX: 0, camY: 0,
  onKey(k) {
    if (this.scene !== 'map' || this.busy || this.walker || !this.run) return;
    const ch = choices();
    if (k === 'left' || k === 'right') {
      if (!ch.length) return;
      this.sel = (this.sel + (k === 'left' ? -1 : 1) + ch.length) % ch.length;
      Sound.sfx('move');
      updateNodeInfo();
    } else if (k === 'ok' || k === 'up') {
      if (ch[this.sel]) go(ch[this.sel]);
    } else if (k === 'back') {
      runBusy(pauseMenu);
    }
  },
};

async function runBusy(fn) {
  if (Game.busy) return;
  Game.busy = true;
  try { await fn(); } catch (e) { console.error(e); } finally { Game.busy = false; updateNodeInfo(); }
}

// ---------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------
function fmtStats(stats) {
  const parts = Object.keys(stats).map(k => {
    const v = stats[k], sign = v >= 0 ? '+' : '−', a = Math.abs(v);
    if (k === 'ins') return `${sign}${a}% INS`;
    if (k === 'esq') return `${sign}${a}% esquiva`;
    return `${sign}${a} ${STAT_SHORT[k]}`;
  });
  return parts.join(', ') || 'Sin bonos';
}

function fmtTime(sec) {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  } catch (e) { /* sigue */ }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

// ---------------------------------------------------------------------
// Íconos de objetos (16×16) para el HUD
// ---------------------------------------------------------------------
const ItemIcons = {
  cache: {},
  url(icon) {
    if (this.cache[icon]) return this.cache[icon];
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    switch (icon) {
      case 'berry': P(4, 5, 8, 8, '#c0392b'); P(5, 6, 2, 2, '#ff6b3a'); P(7, 2, 2, 3, '#2e6b2a'); P(9, 3, 3, 2, '#4f9a3e'); break;
      case 'fruit': P(3, 4, 10, 10, '#e3c15b'); P(4, 5, 3, 3, '#ffe14a'); P(7, 1, 2, 3, '#6b4a2b'); P(9, 2, 3, 2, '#4f9a3e'); break;
      case 'leaf': P(4, 3, 8, 10, '#4f9a3e'); P(7, 2, 2, 12, '#2e6b2a'); P(5, 5, 2, 2, '#8fd16a'); P(11, 4, 2, 4, '#3a8fd6'); break;
      case 'moss': P(2, 8, 12, 6, '#5e6b44'); P(4, 6, 8, 3, '#8a9a52'); P(6, 4, 3, 3, '#8fd16a'); break;
      case 'egg': P(5, 3, 6, 11, '#f3dfa0'); P(4, 6, 8, 6, '#f3dfa0'); P(6, 7, 2, 2, '#a0703e'); P(9, 10, 2, 2, '#a0703e'); break;
      case 'fang': P(6, 2, 4, 3, '#fff6e0'); P(7, 5, 3, 6, '#fff6e0'); P(8, 11, 2, 3, '#f3dfa0'); P(5, 2, 1, 3, '#6b4a2b'); break;
      case 'amber': P(4, 4, 8, 9, '#ffb03a'); P(5, 5, 3, 3, '#ffe14a'); P(8, 8, 2, 2, '#3a2f2a'); break;
      case 'shard': P(7, 1, 3, 13, '#7ff3ff'); P(5, 5, 2, 7, '#c46bff'); P(10, 4, 2, 8, '#3a8fd6'); break;
      default: P(4, 4, 8, 8, '#9a8f88');
    }
    this.cache[icon] = c.toDataURL();
    return this.cache[icon];
  },
};

// ---------------------------------------------------------------------
// Región y mapa
// ---------------------------------------------------------------------
function loadRegion() {
  const run = Game.run;
  const region = Run.region(run);
  Game.map = NodeMap.generate(run.seed, region);
  Game.layer = NodeMap.renderLayer(Game.map);
  Game.sel = 0;
  initParticles(region);
  Sound.play(REGIONS[region].music);
  const n = NodeMap.useEscamas(run, Game.map);
  if (n) setTimeout(() => UI.toast(`Escamas Brillantes revela un nodo: ${NODE_INFO[n.type].name} (fila ${n.row + 1}).`, 3500), 1200);
}

async function regionIntro() {
  const run = Game.run;
  const reg = REGIONS[Run.region(run)];
  UI.banner(reg.name, `Región ${run.regionIdx + 1} de ${run.route.length} · ${reg.desc}`);
  Game.camY = Game.map.h * 16 - VH;
  await sleep(Game.fast ? 0 : 900);
  // Ptera da una pista al llegar a cada región nueva
  if (run.regionIdx > 0) await UI.say('Ptera', PTERA_HINTS[(run.seed + run.regionIdx) % PTERA_HINTS.length]);
}

function currentNode() {
  const run = Game.run;
  return run.pos === 'start' ? Game.map.start : Game.map.nodes[run.pos];
}

function choices() {
  if (!Game.run || !Game.map) return [];
  return currentNode().children.map(id => Game.map.nodes[id]).sort((a, b) => a.x - b.x);
}

async function go(node) {
  await runBusy(async () => {
    const from = currentNode();
    const path = Game.map.paths[`${from.id}>${node.id}`] || [[from.x, from.y], [node.x, node.y]];
    $('nodeinfo').classList.add('hidden');
    await new Promise(resolve => { Game.walker = { path, i: 0, t: 0, resolve, flip: false }; });
    Game.walker = null;
    await enterNode(node);
    if (Game.run && Game.scene === 'map') { Game.sel = 0; }
  });
}

function updateWalker(dt) {
  const w = Game.walker;
  if (!w) return;
  w.t += dt / (Game.fast ? 0.001 : 0.09);
  while (w.t >= 1) {
    w.t -= 1;
    w.i++;
    if (w.i >= w.path.length - 1) { w.i = w.path.length - 1; w.t = 0; const r = w.resolve; w.resolve = null; if (r) r(); return; }
  }
}

function tocopoMapPos() {
  const w = Game.walker;
  if (w) {
    const a = w.path[w.i], b = w.path[Math.min(w.i + 1, w.path.length - 1)];
    if (b[0] !== a[0]) w.flip = b[0] < a[0];
    return { x: (a[0] + (b[0] - a[0]) * w.t) * 16, y: (a[1] + (b[1] - a[1]) * w.t) * 16, flip: w.flip, walking: true };
  }
  const n = currentNode();
  return { x: n.x * 16, y: n.y * 16, flip: false, walking: false };
}

function renderMap(ctx, t) {
  const map = Game.map, run = Game.run;
  const tp = tocopoMapPos();
  const target = clamp(tp.y - VH * 0.55, 0, Math.max(0, map.h * 16 - VH));
  Game.camY += (target - Game.camY) * 0.12;
  if (Math.abs(target - Game.camY) < 0.5 || Math.abs(target - Game.camY) > 240) Game.camY = target;
  const cy = Math.round(Game.camY);
  // en pantallas angostas se centra la franja de los nodos (columnas 5 a 26)
  const cx = Game.camX = Math.max(0, Math.round((map.w * 16 - VW) / 2));
  ctx.fillStyle = '#141018';
  ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.translate(-cx, 0);
  ctx.drawImage(Game.layer, 0, -cy);

  // agua, lava y hielo con brillo
  const pc = NodeMap.poolColor(REGIONS[map.region]);
  const y0 = Math.floor(cy / 16), y1 = Math.min(map.h - 1, y0 + Math.ceil(VH / 16) + 1);
  for (let y = y0; y <= y1; y++) for (let x = 0; x < map.w; x++) {
    if (map.tiles[y][x] !== 'W') continue;
    const o = Math.floor(t * 5 + x * 3 + y * 5) % 16;
    ctx.fillStyle = pc[1];
    ctx.fillRect(x * 16 + o % 12, y * 16 - cy + 5, 4, 1);
    ctx.fillRect(x * 16 + (o + 7) % 12, y * 16 - cy + 11, 3, 1);
  }

  // camino elegido
  const ch = choices();
  const selNode = !Game.walker && !Game.busy ? ch[Game.sel] : null;
  if (selNode) {
    const path = map.paths[`${currentNode().id}>${selNode.id}`] || [];
    ctx.fillStyle = `rgba(255,225,74,${0.25 + 0.2 * Math.sin(t * 6)})`;
    for (const [x, y] of path) ctx.fillRect(x * 16 + 5, y * 16 - cy + 5, 6, 6);
  }

  // nodos
  for (const n of Object.values(map.nodes)) {
    const X = n.x * 16, Y = n.y * 16 - cy;
    if (Y < -40 || Y > VH + 20) continue;
    const vis = NodeMap.visible(run, map, n);
    const done = run.visited.includes(n.id) && n.id !== run.pos;
    if (n.id === 'boss') {
      const def = BOSSES[REGIONS[map.region].boss];
      Sprites.draw(ctx, Sprites.boss(def, false, Math.floor(t * 2) % 2 ? 'idle1' : 'idle0'), X + 8, Y + 2, 1);
    }
    NodeMap.drawNode(ctx, vis ? n.type : 'hidden', X, Y, t, done ? 'done' : 'open');
    if (n === selNode) {
      ctx.strokeStyle = Math.sin(t * 8) > 0 ? '#ffe14a' : '#fff6e0';
      ctx.lineWidth = 2;
      ctx.strokeRect(X - 1, Y - 1, 18, 18);
    }
  }
  // Bracca despide a Tocopo al inicio de la expedición
  if (run.regionIdx === 0) {
    const s = map.start;
    Sprites.draw(ctx, Sprites.npc('bracca', Math.floor(t * 1.5) % 2 ? 'idle1' : 'idle0'), s.x * 16 - 14, s.y * 16 - cy + 16, 1);
  }

  // Tocopo
  const look = Run.look(run);
  const frame = tp.walking ? (Math.floor(t * 8) % 2 ? 'walk1' : 'walk0') : (Math.floor(t * 2) % 2 ? 'idle1' : 'idle0');
  drawTocopoFX(ctx, look, tp.x + 8, tp.y - cy + 12, 1, t, tp.flip);
  Sprites.draw(ctx, Sprites.tocopo(look, frame), tp.x + 8, tp.y - cy + 12, 1, { flip: tp.flip });
  ctx.restore();

  drawParticles(ctx, map.region, t);
}

function updateNodeInfo() {
  const box = $('nodeinfo');
  if (Game.scene !== 'map' || !Game.run || Game.busy || Game.walker) { box.classList.add('hidden'); return; }
  const n = choices()[Game.sel];
  if (!n) { box.classList.add('hidden'); return; }
  const vis = NodeMap.visible(Game.run, Game.map, n);
  const info = vis ? NODE_INFO[n.type] : { name: 'Desconocido', desc: `Solo se ve el tipo de nodo hasta ${CONFIG.VISIBLE_ROWS} filas adelante.` };
  const row = n.id === 'boss' ? 'Jefe' : `Fila ${n.row + 1} de ${CONFIG.ROWS}`;
  const many = choices().length > 1;
  box.innerHTML = `<div class="ni-text"><b>${esc(info.name)}</b> <span class="dim">· ${row}</span><br>${esc(info.desc)}</div>
    <div class="ni-btns">
      <button class="icon-btn" data-k="left"${many ? '' : ' disabled'} aria-label="Camino anterior">◀</button>
      <button class="go-btn" data-k="ok">Avanzar</button>
      <button class="icon-btn" data-k="right"${many ? '' : ' disabled'} aria-label="Camino siguiente">▶</button>
    </div>
    <div class="hint">←/→ elegir camino · Z/Enter avanzar · X menú · o toca un nodo</div>`;
  box.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); Sound.init(); Game.onKey(b.dataset.k); }));
  box.classList.remove('hidden');
}

// Toques sobre el canvas: elegir nodos en el mapa y avanzar textos
function onCanvasClick(e) {
  Sound.init();
  // Tocar la pantalla también avanza diálogos y mensajes de combate
  if (!$('dialog').classList.contains('hidden') || (Game.scene === 'battle' && !$('battle-log').classList.contains('hidden'))) {
    if (UI.hasInput()) UI.dispatch('ok');
    return;
  }
  if (Game.scene !== 'map' || Game.busy || Game.walker || UI.hasInput()) return;
  const r = $('screen').getBoundingClientRect();
  const ix = (e.clientX - r.left) / r.width * VW + Game.camX, iy = (e.clientY - r.top) / r.height * VH + Game.camY;
  const ch = choices();
  // en celular el área de toque es más generosa
  const tol = Game.mobile ? 22 : 14;
  let best = -1, bd = Infinity;
  ch.forEach((n, i) => {
    const dx = Math.abs(n.x * 16 + 8 - ix), dy = Math.abs(n.y * 16 + 8 - iy);
    if (dx < tol && dy < tol && dx + dy < bd) { bd = dx + dy; best = i; }
  });
  if (best < 0) return;
  if (best === Game.sel) go(ch[best]);
  else { Game.sel = best; Sound.sfx('move'); updateNodeInfo(); }
}

// ---------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------
function updateHUD(force) {
  const run = Game.run;
  if (!run || !Game.map) return;
  const s = Run.stats(run);
  const stage = Run.stage(run);
  const node = currentNode();
  const key = [run.level, run.xp, run.hp, run.ene, s.vid, s.ene, run.adn, run.conchas, run.inv.join(), run.muts.map(m => m.id + m.boost).join(), run.pos, run.regionIdx, Game.mobile].join('|');
  if (key === Game._hudKey && !force) return;
  Game._hudKey = key;
  const reg = REGIONS[Run.region(run)];
  $('hud-region').textContent = `${reg.name} · ${node.id === 'start' ? 'Inicio' : node.id === 'boss' ? 'Jefe' : 'Fila ' + (node.row + 1)}`;
  $('hud-lv').textContent = `Nv ${run.level} · ${stage.name}` + (run.level < CONFIG.MAX_LEVEL ? ` · XP ${run.xp}/${run.level * CONFIG.XP_PER_LEVEL}` : '') +
    (Game.mobile ? ` · Mut ${run.muts.length}/${stage.slots}` : '');
  $('hud-hp').textContent = `${run.hp}/${s.vid}`;
  $('hud-ene').textContent = `${run.ene}/${s.ene}`;
  $('hud-hpbar').style.width = `${run.hp / s.vid * 100}%`;
  $('hud-enebar').style.width = `${run.ene / s.ene * 100}%`;
  $('hud-res').textContent = `ADN ${run.adn} · Conchas ${run.conchas}`;
  let inv = '';
  for (let i = 0; i < CONFIG.INVENTORY_SLOTS; i++) {
    const id = run.inv[i];
    inv += id ? `<img src="${ItemIcons.url(ITEMS[id].icon)}" title="${esc(ITEMS[id].name)}">` : '<i></i>';
  }
  $('hud-inv').innerHTML = inv;
  const syn = Run.synergies(run);
  $('hud-muts').innerHTML = `<div>Mutaciones ${run.muts.length}/${stage.slots}</div>` +
    run.muts.map(m => { const d = mutDef(m.id); return `<span style="color:${RARITY[d.rarity].color}">${esc(d.name)}${m.boost ? ' ★' : ''}</span>`; }).join('') +
    (syn.length ? `<div class="syn">${syn.map(x => esc(SYNERGIES[x].name)).join(' · ')}</div>` : '');
}

// ---------------------------------------------------------------------
// Menú de pausa y paneles
// ---------------------------------------------------------------------
async function pauseMenu() {
  let start = 0;
  while (Game.run) {
    const items = [
      { label: 'Estado', value: 'status' },
      { label: 'Objetos', value: 'items' },
      { label: 'Sinergias', value: 'syn' },
      { label: `Sonido: ${Sound.on ? 'Sí' : 'No'}`, value: 'sound' },
      { label: 'Controles', value: 'help' },
      { label: 'Guardar y salir al título', value: 'title' },
      { label: 'Abandonar expedición', value: 'abandon' },
      { label: 'Cerrar', value: 'close' },
    ];
    const v = await UI.menu({ title: 'Menú', items, start, cls: 'pause' });
    if (!v || v === 'close') return;
    start = items.findIndex(i => i.value === v);
    if (v === 'status') await statusPanel();
    else if (v === 'items') await fieldItems();
    else if (v === 'syn') await synergyPanel();
    else if (v === 'help') await helpPanel();
    else if (v === 'sound') { Sound.setOn(!Sound.on); saveSettings(); }
    else if (v === 'title') { Run.save(Game.run); setTimeout(goTitle, 0); return; }
    else if (v === 'abandon') {
      if (await UI.confirm('¿Abandonar la expedición? Se borra por completo, como si Tocopo cayera.')) {
        setTimeout(() => death(true), 0);
        return;
      }
    }
  }
}

function statusPanel() {
  const run = Game.run;
  const s = Run.stats(run);
  const stage = Run.stage(run);
  const skills = run.muts.map(m => mutDef(m.id).skill).filter(Boolean).map(k => SKILLS[k].name);
  const frag = Object.keys(run.frags).filter(k => run.frags[k]).map(k => `${STAT_SHORT[k]} +${run.frags[k]}`).join(', ');
  const muts = run.muts.map(m => {
    const d = mutDef(m.id);
    return `<div class="mrow"><span style="color:${RARITY[d.rarity].color}">${esc(d.name)}${m.boost ? ' ★' : ''}</span> <span class="dim">${esc(d.unstable ? d.pro + ' / ' + d.con : fmtStats(d.stats))}</span></div>`;
  }).join('') || '<div class="dim">Ninguna todavía</div>';
  const html = `<div class="status">
    <div class="st-left"><canvas width="128" height="128"></canvas>
      <div class="st-name">TOCOPO</div><div class="dim">${stage.name}</div></div>
    <div class="st-right">
      <table>
        <tr><td>Nivel</td><td>${run.level}</td><td>XP</td><td>${run.level >= CONFIG.MAX_LEVEL ? 'Máximo' : `${run.xp}/${run.level * CONFIG.XP_PER_LEVEL}`}</td></tr>
        <tr><td>VID</td><td>${run.hp}/${s.vid}</td><td>ENE</td><td>${run.ene}/${s.ene}</td></tr>
        <tr><td>ATQ</td><td>${s.atq}</td><td>DEF</td><td>${s.def}</td></tr>
        <tr><td>VEL</td><td>${s.vel}</td><td>INS</td><td>${s.ins}%</td></tr>
        <tr><td>Esquiva</td><td>${s.esq}%</td><td>Espacios</td><td>${run.muts.length}/${stage.slots}</td></tr>
      </table>
      <div class="st-sec"><b>Mutaciones</b>${run.pelaje ? ' <span class="dim">(+ Pelaje Glaciar)</span>' : ''}</div>${muts}
      <div class="st-sec"><b>Habilidades:</b> ${esc(skills.join(', ') || 'ninguna')}</div>
      ${frag ? `<div class="st-sec"><b>Fragmentos:</b> ${esc(frag)}</div>` : ''}
      ${run.nextAtk ? `<div class="st-sec">Colmillo de Caza listo: +${run.nextAtk} ATQ en el próximo combate</div>` : ''}
      ${run.poisonNext ? `<div class="st-sec">El próximo combate empieza con veneno de ${run.poisonNext}</div>` : ''}
      <div class="st-sec dim">Semilla ${RNG.code(run.seed)}${run.daily ? ' (diaria ' + run.daily + ')' : ''} · Tiempo ${fmtTime(run.time)} · Enemigos vencidos ${run.kills}</div>
    </div></div>`;
  return UI.panel(html, { cls: 'status-panel', setup: box => UI.drawLook(box.querySelector('canvas'), Run.look(run), 8) });
}

function synergyPanel() {
  const run = Game.run;
  const active = Run.synergies(run);
  const branches = Run.branchesOf(run);
  const rows = Object.keys(SYNERGIES).map(id => {
    const s = SYNERGIES[id];
    const names = s.branches.map(b => { const br = BRANCHES.find(x => x.id === b); return `<span style="color:${br.color}">${esc(br.name)}${branches.has(b) ? ' ✓' : ''}</span>`; }).join(' + ');
    return `<div class="quest${active.includes(id) ? ' on' : ''}"><b>${esc(s.name)}</b>${active.includes(id) ? ' · ACTIVA' : ''}<br>${names}<br><span class="dim">${esc(s.desc)}</span></div>`;
  }).join('');
  return UI.panel(`<div class="panel-title">Sinergias</div><div class="help">Se activan solas con al menos una mutación de cada rama del par.</div><div class="grid2">${rows}</div>`, { cls: 'quest-panel' });
}

async function fieldItems() {
  const run = Game.run;
  let start = 0;
  while (true) {
    if (!run.inv.length) return UI.say('', 'El inventario está vacío.');
    const items = run.inv.map((id, i) => ({
      label: ITEMS[id].name, value: i,
      desc: ITEMS[id].desc + (ITEMS[id].field ? '' : ITEMS[id].use === 'auto' ? ' (se usa solo)' : ' (solo en combate)'),
      disabled: !ITEMS[id].field,
    }));
    const s = Run.stats(run);
    const v = await UI.menu({ title: `Objetos ${run.inv.length}/${CONFIG.INVENTORY_SLOTS} · VID ${run.hp}/${s.vid} · ENE ${run.ene}/${s.ene}`, items, start: Math.min(start, items.length - 1), cls: 'shop' });
    if (v == null) return;
    start = v;
    await useFieldItem(v);
    Run.save(run);
    updateHUD(true);
  }
}

async function useFieldItem(idx) {
  const run = Game.run;
  const id = run.inv[idx];
  const it = ITEMS[id];
  const s = Run.stats(run);
  const use = () => run.inv.splice(idx, 1);
  if (it.use === 'heal') {
    if (run.hp >= s.vid) { Sound.sfx('error'); return UI.toast('La vida ya está al máximo.'); }
    let amt = Run.hasFx(run, 'lifesteal') ? Math.floor(it.amount / 2) : it.amount;
    amt = Math.min(amt, s.vid - run.hp);
    run.hp += amt; use();
    Sound.sfx('heal'); UI.toast(`+${amt} VID`);
  } else if (it.use === 'ene') {
    if (run.ene >= s.ene) { Sound.sfx('error'); return UI.toast('La energía ya está al máximo.'); }
    const amt = Math.min(it.amount, s.ene - run.ene);
    run.ene += amt; use();
    Sound.sfx('heal'); UI.toast(`+${amt} ENE`);
  } else if (it.use === 'atk') {
    if (run.nextAtk) { Sound.sfx('error'); return UI.toast('Ya tienes un Colmillo de Caza preparado.'); }
    run.nextAtk = it.amount; use();
    Sound.sfx('skill'); UI.toast(`+${it.amount} ATQ en el próximo combate`);
  } else if (it.use === 'adn') {
    run.adn += it.amount; use();
    Sound.sfx('crystal'); UI.toast(`+${it.amount} ADN`);
  } else if (it.use === 'frag') {
    use();
    await chooseFragment();
  }
}

function helpPanel() {
  return UI.panel(`<div class="panel-title">Cómo se juega</div>
    <div class="help">
      <div><b>Flechas / WASD</b> elegir · <b>Z / Enter</b> confirmar · <b>X / Esc</b> menú y volver. En celular: cruceta y A / B.</div>
      <div>Cada expedición va del Valle al Cráter por un mapa de nodos distinto. Elige tu camino de abajo hacia arriba.</div>
      <div>Tras cada combate ganado eliges 1 de 3 mutaciones al azar, o la saltas por ${CONFIG.SKIP_ADN} ADN. Los espacios dependen de la etapa: Cría 2, Juvenil 4, Adulto 6, Alfa 8.</div>
      <div>La vida no se recupera sola: usa objetos, Descansos o vence jefes.</div>
      <div><b>Muerte permanente:</b> si Tocopo cae sin Huevo Fósil, la expedición se borra. El juego se guarda al entrar a cada nodo.</div>
    </div>`, { cls: 'help-panel' });
}

// ---------------------------------------------------------------------
// Partículas de clima por región
// ---------------------------------------------------------------------
function initParticles(region) {
  Game.particles = [];
  const n = { valle: 14, pantano: 18, volcan: 30, glaciar: 50, crater: 26 }[region] || 0;
  for (let i = 0; i < n; i++) Game.particles.push({ x: Math.random() * VW, y: Math.random() * VH, v: 0.5 + Math.random(), p: Math.random() * 6 });
}

function updateParticles(dt) {
  const region = Game.map && Game.map.region;
  for (const p of Game.particles) {
    p.p += dt;
    if (region === 'glaciar') { p.y += dt * 22 * p.v; p.x += Math.sin(p.p) * dt * 10; }
    else if (region === 'volcan') { p.y -= dt * 18 * p.v; p.x += Math.sin(p.p * 2) * dt * 6; }
    else if (region === 'crater') p.y -= dt * 8 * p.v;
    else { p.x += Math.sin(p.p) * dt * 9; p.y += Math.cos(p.p * 1.2) * dt * 6; }
    if (p.y > VH + 4) p.y = -4;
    if (p.y < -4) p.y = VH + 4;
    if (p.x > VW + 4) p.x = -4;
    if (p.x < -4) p.x = VW + 4;
  }
}

function drawParticles(ctx, region, t) {
  for (const p of Game.particles) {
    if (region === 'glaciar') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(p.x, p.y, p.v > 1 ? 2 : 1, p.v > 1 ? 2 : 1); }
    else if (region === 'volcan') { ctx.fillStyle = `rgba(255,${120 + Math.floor(p.v * 60)},58,${0.5 + 0.4 * Math.sin(p.p * 3)})`; ctx.fillRect(p.x, p.y, 1, 1); }
    else if (region === 'crater') { const k = 0.5 + 0.5 * Math.sin(p.p * 3); ctx.fillStyle = `rgba(127,243,255,${k})`; ctx.fillRect(p.x, p.y, 1, k > 0.8 ? 2 : 1); }
    else if (region === 'pantano') { const k = 0.5 + 0.5 * Math.sin(p.p * 2.5); ctx.fillStyle = `rgba(212,240,168,${k * 0.8})`; ctx.fillRect(p.x, p.y, 1, 1); }
    else { ctx.fillStyle = `rgba(255,246,224,${0.4 + 0.3 * Math.sin(p.p * 2)})`; ctx.fillRect(p.x, p.y, 1, 1); }
  }
  if (region === 'pantano') {
    for (let i = 0; i < 5; i++) {
      const x = ((t * 6 + i * 130) % (VW + 240)) - 120;
      ctx.fillStyle = 'rgba(225,235,225,0.12)';
      ctx.beginPath(); ctx.ellipse(x, 40 + i * 55, 110, 24, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------
// Expediciones: nueva, continuar, muerte y victoria
// ---------------------------------------------------------------------
function settings() {
  try { return JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
}
function saveSettings(extra) {
  const s = Object.assign(settings(), { sound: Sound.on }, extra || {});
  try { localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* nada */ }
}

async function newRun(daily) {
  const key = daily ? RNG.todayKey() : null;
  const seed = daily ? RNG.dailySeed(key) : RNG.randomSeed();
  Game.run = Run.create(seed, key);
  $('title-ui').classList.add('hidden');
  const first = !settings().seenIntro;
  await UI.fade(true, 300);
  if (first) {
    Game.scene = 'intro';
    Game.sceneData = { step: 0 };
    Sound.play('ending');
    await UI.fade(false, 500);
    for (let i = 0; i < INTRO_LINES.length; i++) { Game.sceneData.step = i; await UI.say('', INTRO_LINES[i]); }
    saveSettings({ seenIntro: true });
    await UI.fade(true, 400);
  }
  loadRegion();
  Game.scene = 'map';
  Game.camY = Game.map.h * 16 - VH;
  $('hud').classList.remove('hidden');
  updateHUD(true);
  Run.save(Game.run);
  await UI.fade(false, 500);
  await runBusy(async () => {
    await regionIntro();
    if (first) await UI.talk(BRACCA_FAREWELL);
    else await UI.say('Abuela Bracca', BRACCA_FAREWELL_SHORT[Game.run.seed % BRACCA_FAREWELL_SHORT.length]);
    if (daily) UI.toast(`Expedición diaria ${key} · Semilla ${RNG.code(seed)}`, 4000);
  });
  updateNodeInfo();
}

async function continueRun(run) {
  Game.run = run;
  $('title-ui').classList.add('hidden');
  await UI.fade(true, 300);
  loadRegion();
  Game.scene = 'map';
  const tp = tocopoMapPos();
  Game.camY = clamp(tp.y - VH * 0.55, 0, Game.map.h * 16 - VH);
  $('hud').classList.remove('hidden');
  updateHUD(true);
  await UI.fade(false, 400);
  const reg = REGIONS[Run.region(run)];
  UI.banner(reg.name, `Nv ${run.level} · ${Run.stage(run).name}`);
  // Retoma la acción pendiente (combate, oferta, evento...)
  if (run.queue && run.queue.length) await runBusy(processQueue);
  updateNodeInfo();
}

function summaryText(run, result) {
  const reg = REGIONS[Run.region(run)];
  const muts = run.muts.map(m => mutDef(m.id).name).concat(run.pelaje ? ['Pelaje Glaciar'] : []);
  return [
    result === 'win' ? '🦖 ¡Tocopo venció al Rey Tirano!' : `🦖 Tocopo cayó en ${reg.name}`,
    `${run.daily ? 'Diaria ' + run.daily + ' · ' : ''}Semilla ${RNG.code(run.seed)}`,
    `Nv ${run.level} (${Run.stage(run).name}) · Enemigos ${run.kills} · Tiempo ${fmtTime(run.time)}`,
    `Mutaciones: ${muts.join(', ') || 'ninguna'}`,
  ].join('\n');
}

async function endPanel(run, result, records) {
  const text = summaryText(run, result);
  const look = Run.look(run);
  await UI.panel(`<div class="panel-title">${result === 'win' ? '¡EXPEDICIÓN COMPLETADA!' : 'FIN DE LA EXPEDICIÓN'}</div>
    <div class="card"><canvas width="128" height="128"></canvas><div class="card-text">${esc(text).replace(/\n/g, '<br>')}</div></div>
    <div class="help">Récords: ${records.victories} victorias en ${records.runs} expediciones · Mejor región: ${esc(records.bestRegionName || '—')} · Enemigos vencidos en total: ${records.totalKills}</div>
    <div class="card-actions"><div class="btn" data-act="ok">Copiar resumen (Enter)</div><div class="btn" data-act="back">Volver al título (X)</div></div>`, {
    cls: 'card-panel', foot: 'Compara tu resultado con tus amigos',
    setup: box => UI.drawLook(box.querySelector('canvas'), look, 7),
    onKey: k => {
      if (k === 'ok') { copyText(text).then(ok => UI.toast(ok ? '¡Resumen copiado!' : 'No se pudo copiar.')); Sound.sfx('buy'); return true; }
      return false;
    },
  });
}

// Muerte permanente: se borra el guardado y solo quedan los récords
async function death(abandoned) {
  const run = Game.run;
  if (!run) return;
  Game.run = null;
  Run.clear();
  const records = Records.finish(run, 'death');
  Game.busy = true;
  $('hud').classList.add('hidden');
  $('nodeinfo').classList.add('hidden');
  Game.scene = 'end';
  Game.sceneData = { win: false, look: Run.look(run) };
  Sound.play('ending');
  await UI.fade(false, 600);
  if (!abandoned) for (const l of DEATH_LINES) await UI.say('', l);
  await endPanel(run, 'death', records);
  Game.busy = false;
  goTitle();
}

async function victoryEnd() {
  const run = Game.run;
  Game.run = null;
  Run.clear();
  const records = Records.finish(run, 'win');
  $('hud').classList.add('hidden');
  await UI.fade(true, 800);
  Game.scene = 'end';
  Game.sceneData = { win: true, look: Run.look(run) };
  Sound.play('ending');
  await UI.fade(false, 900);
  await UI.talk(ENDING_LINES);
  await endPanel(run, 'win', records);
  goTitle();
}

// ---------------------------------------------------------------------
// Título, récords y bitácora
// ---------------------------------------------------------------------
async function titleScreen() {
  Game.scene = 'title';
  Game.busy = false;
  $('hud').classList.add('hidden');
  $('nodeinfo').classList.add('hidden');
  $('title-ui').classList.remove('hidden');
  Sound.play('title');
  await UI.fade(false, 400);
  while (true) {
    const saved = Run.load();
    const today = RNG.todayKey();
    const rec = Records.get();
    const daily = rec.daily[today];
    const items = [
      { label: 'Nueva expedición', value: 'new' },
      { label: saved ? `Continuar · ${REGIONS[Run.region(saved)].name} · Nv ${saved.level}` : 'Continuar', value: 'cont', disabled: !saved },
      { label: `Expedición diaria${daily ? ' ✓' : ''}`, right: today.slice(5).split('-').reverse().join('/'), value: 'daily', desc: daily ? `Tu mejor resultado hoy: ${daily.result === 'win' ? 'victoria' : daily.region} · ${daily.kills} enemigos` : `Mismo mapa para todos hoy · Semilla ${RNG.code(RNG.dailySeed(today))}` },
      { label: 'Récords', value: 'records' },
      { label: 'Bitácora', value: 'log' },
      { label: `Sonido: ${Sound.on ? 'Sí' : 'No'}`, value: 'snd' },
    ];
    const v = await UI.menu({ container: $('title-menu'), embedded: true, cancel: false, items, start: saved ? 1 : 0, cls: 'title-list' });
    if (v === 'snd') { Sound.setOn(!Sound.on); saveSettings(); continue; }
    if (v === 'records') { await recordsPanel(); continue; }
    if (v === 'log') { await logPanel(); continue; }
    if (v === 'cont' && saved) return continueRun(saved);
    if (v === 'new' || v === 'daily') {
      if (saved) {
        if (!(await UI.confirm('Hay una expedición en curso. Empezar otra la abandona (cuenta como caída). ¿Seguir?'))) continue;
        Records.finish(saved, 'death');
        Run.clear();
      }
      return newRun(v === 'daily');
    }
  }
}

function goTitle() {
  Game.busy = false;
  Game.run = null;
  UI.fade(true, 300).then(() => titleScreen());
}

function recordsPanel() {
  const r = Records.get();
  const days = Object.keys(r.daily).sort().reverse().slice(0, 5).map(d => {
    const x = r.daily[d];
    return `<div>${d}: ${x.result === 'win' ? '¡Victoria!' : esc(x.region)} · Nv ${x.level} · ${x.kills} enemigos · ${fmtTime(x.time)}</div>`;
  }).join('') || '<div class="dim">Todavía no jugaste una expedición diaria.</div>';
  return UI.panel(`<div class="panel-title">Récords</div>
    <div class="help">
      <div>Expediciones: <b>${r.runs}</b> · Victorias: <b>${r.victories}</b></div>
      <div>Mejor región alcanzada: <b>${esc(r.bestRegionName || '—')}</b></div>
      <div>Enemigos vencidos: <b>${r.totalKills}</b> en total · <b>${r.bestKills}</b> en una sola expedición</div>
      <div>Mejor tiempo de victoria: <b>${r.bestWinTime ? fmtTime(r.bestWinTime) : '—'}</b></div>
      <br><div><b>Expediciones diarias</b></div>${days}
      <br><div class="dim">Los récords no dan poder: cada expedición empieza de cero.</div>
    </div>`, { cls: 'help-panel' });
}

function logPanel() {
  const L = Log.get();
  const sec = (title, ids, names, kind) => {
    const got = ids.filter(id => L[kind][id]).length;
    return `<div class="st-sec"><b>${title}</b> <span class="dim">${got}/${ids.length}</span></div><div class="logrow">` +
      ids.map(id => `<span class="${L[kind][id] ? '' : 'dim'}">${L[kind][id] ? esc(names(id)) : '???'}</span>`).join('') + '</div>';
  };
  const mutIds = Object.keys(MUTATIONS).concat(Object.keys(UNSTABLE)).concat(['pelaje']);
  return UI.panel(`<div class="panel-title">Bitácora</div>
    ${sec('Mutaciones', mutIds, id => id === 'pelaje' ? SECRET_MUTATION.name : mutDef(id).name, 'mutations')}
    ${sec('Enemigos', Object.keys(ENEMIES), id => ENEMIES[id].name, 'enemies')}
    ${sec('Jefes', Object.keys(BOSSES), id => BOSSES[id].name, 'bosses')}
    ${sec('Eventos', Object.keys(EVENTS), id => EVENTS[id].title, 'events')}`, { cls: 'help-panel' });
}

// ---------------------------------------------------------------------
// Dibujo de escenas
// ---------------------------------------------------------------------
function renderTitle(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#1f4a2a'); g.addColorStop(1, '#2e6b2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 26; i++) {
    const x = (i * 67 + 13) % VW, y = ((t * (12 + i % 5 * 4) + i * 41) % (VH + 20)) - 10;
    ctx.fillStyle = i % 3 ? 'rgba(127,243,255,0.6)' : 'rgba(196,107,255,0.6)';
    ctx.fillRect(x, y, 2, 3);
  }
  const span = VW + 200, mx = ((t * 50) % span) - 100, my = 20 + ((t * 50) % span) * 0.22;
  ctx.fillStyle = 'rgba(255,176,58,0.35)';
  for (let i = 1; i < 9; i++) ctx.fillRect(mx - i * 5, my - i * 1.1, 4, 2);
  ctx.fillStyle = '#ffe14a';
  ctx.fillRect(mx, my, 4, 4);
  // en vertical el menú tapa la parte baja: Tocopo se para más arriba
  const ground = Game.mobile ? Math.round(VH * 0.64) : VH - 48;
  ctx.fillStyle = '#1f4a2a';
  ctx.fillRect(0, ground, VW, VH - ground);
  const look = { stage: ['cria', 'juvenil', 'adulto', 'alfa'][Math.floor(t / 3) % 4], layers: {}, pelaje: false };
  // en vertical, Tocopo va al centro y bajo el logo
  const tx = Game.mobile ? VW / 2 : 150, sc = Game.mobile ? 7 : 8;
  Sprites.draw(ctx, Sprites.tocopo(look, Math.floor(t * 2) % 2 ? 'idle1' : 'idle0'), tx, ground + 4, sc);
}

function renderIntro(ctx, t) {
  const step = Game.sceneData.step || 0;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#141018'); g.addColorStop(1, step >= 2 ? '#1f4a2a' : '#3b2257');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`;
    ctx.fillRect((i * 97) % VW, (i * 53) % Math.round(VH * 0.62), 1, 1);
  }
  if (step === 0) {
    const k = (t * 0.15) % 1.2, mx = -20 + k * (VW - 50), my = 10 + k * VH * 0.6;
    ctx.fillStyle = 'rgba(255,176,58,0.3)';
    for (let i = 1; i < 14; i++) ctx.fillRect(mx - i * 6, my - i * 2.4, 6, 4);
    ctx.fillStyle = '#ffe14a'; ctx.fillRect(mx, my, 6, 6);
  }
  const base = VH - 78;
  ctx.fillStyle = '#1f4a2a';
  ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(VW * 0.23, base - 30); ctx.lineTo(VW * 0.5, base - 5); ctx.lineTo(VW * 0.78, base - 35); ctx.lineTo(VW, base - 10); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
  if (step >= 1) Sprites.draw(ctx, Sprites.enemy(ENEMIES.raptorCorr, true), VW * 0.78, VH - 58, 4, { alpha: step === 1 ? 1 : 0.35 });
  if (step >= 2) Sprites.draw(ctx, Sprites.tocopo({ stage: 'cria', layers: {}, pelaje: false }, Math.floor(t * 2) % 2 ? 'idle1' : 'idle0'), VW * 0.35, VH - 52, 4);
  if (step >= 3) { ctx.fillStyle = `rgba(196,107,255,${0.4 + 0.2 * Math.sin(t * 3)})`; ctx.beginPath(); ctx.arc(VW - 42, 40, 26, 0, Math.PI * 2); ctx.fill(); }
}

function renderEnd(ctx, t) {
  const win = Game.sceneData.win;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  if (win) { g.addColorStop(0, '#ffb03a'); g.addColorStop(0.6, '#f3dfa0'); g.addColorStop(1, '#7fc4f0'); }
  else { g.addColorStop(0, '#141018'); g.addColorStop(1, '#3b2257'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  const ground = VH - 58;
  ctx.fillStyle = win ? '#4f9a3e' : '#2a211e';
  ctx.fillRect(0, ground, VW, 58);
  const look = Game.sceneData.look || { stage: 'cria', layers: {} };
  if (win) {
    Sprites.draw(ctx, Sprites.npc('bracca'), VW * 0.2, ground + 2, Game.mobile ? 3 : 4);
    Sprites.draw(ctx, Sprites.npc('ptera'), VW * 0.8, ground - 120 + Math.sin(t * 2) * 6, 3, { flip: true });
    Sprites.draw(ctx, Sprites.tocopo(look, Math.floor(t * 3) % 2 ? 'idle1' : 'idle0'), VW / 2, ground + 4 + Math.round(Math.sin(t * 5) * 2), 5);
  } else {
    Sprites.draw(ctx, Sprites.tocopo(look), VW / 2, ground + 4, 5, { alpha: 0.45 + 0.1 * Math.sin(t * 2) });
  }
}

function render() {
  const ctx = Game.ctx;
  ctx.imageSmoothingEnabled = false;
  const t = Game.t;
  switch (Game.scene) {
    case 'title': renderTitle(ctx, t); break;
    case 'intro': renderIntro(ctx, t); break;
    case 'map': if (Game.map) renderMap(ctx, t); break;
    case 'battle': if (Game.battle) Game.battle.render(ctx, t); break;
    case 'end': renderEnd(ctx, t); break;
    default: ctx.fillStyle = '#141018'; ctx.fillRect(0, 0, VW, VH);
  }
}

function tick(dt) {
  Game.t += dt;
  if (Game.run && (Game.scene === 'map' || Game.scene === 'battle')) Game.run.time += dt;
  if (Game.scene === 'map') { updateWalker(dt); updateParticles(dt); updateHUD(); }
  if (Game.scene === 'battle' && Game.battle) Game.battle.update(dt);
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - (Game.last || ts)) / 1000);
  Game.last = ts;
  tick(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------
// Inicio y escalado sin suavizado
// ---------------------------------------------------------------------
// Escritorio y celular apaisado: pantalla lógica de 1024×576 escalada.
// Celular vertical: el canvas ocupa todo el ancho, con una franja arriba
// (HUD) y una hoja abajo (menús, diálogos, combate) a tamaño real.
const MOBILE_W = 352;     // 22 tiles: justo la franja de nodos del mapa
const TOP_STRIP = 104;    // alto de la franja superior en píxeles CSS

function safeInsets() {
  const cs = getComputedStyle($('safe-probe'));
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

function fit() {
  const W = innerWidth, H = innerHeight;
  const mobile = H > W && W < 760;
  const changed = mobile !== Game.mobile;
  Game.mobile = mobile;
  document.body.classList.toggle('mobile', mobile);
  const canvas = $('screen'), root = document.documentElement.style;
  root.setProperty('--app-h', H + 'px');
  if (mobile) {
    const safe = safeInsets();
    const bottom = Math.round(clamp(H * 0.31, 220, 300));
    const top = safe.top + TOP_STRIP;
    const cssH = Math.max(160, H - top - bottom - safe.bottom);
    const s = W / MOBILE_W;
    VW = MOBILE_W;
    VH = clamp(Math.round(cssH / s), 220, 720);
    const realH = VH * s;
    root.setProperty('--cv-top', top + 'px');
    root.setProperty('--cv-h', realH + 'px');
    root.setProperty('--cv-bottom', (top + realH) + 'px');
    root.setProperty('--safe-top', safe.top + 'px');
    root.setProperty('--safe-bottom', safe.bottom + 'px');
    $('wrap').style.height = H + 'px';
    $('game').style.transform = 'none';
  } else {
    VW = CONFIG.VIEW_W;
    VH = CONFIG.VIEW_H;
    const s = Math.min(W / 1024, H / 576);
    $('wrap').style.height = H + 'px';
    $('game').style.transform = `scale(${s})`;
  }
  if (canvas.width !== VW || canvas.height !== VH) { canvas.width = VW; canvas.height = VH; }
  if (changed && Game.map) initParticles(Game.map.region);
}

function init() {
  Game.ctx = $('screen').getContext('2d');
  if (settings().sound === false) Sound.setOn(false);
  Input.init();
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  $('screen').addEventListener('click', onCanvasClick);
  $('menu-btn').addEventListener('click', () => { Sound.init(); Game.onKey('back'); });
  // En combate, tocar el panel avanza los mensajes
  $('battle-panel').addEventListener('click', () => {
    if (!$('battle-log').classList.contains('hidden') && UI.hasInput()) UI.dispatch('ok');
  });
  requestAnimationFrame(loop);
  const start = () => titleScreen();
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('10px "Press Start 2P"'), sleep(1500)]).then(start, start);
  else start();
}

window.addEventListener('DOMContentLoaded', init);
