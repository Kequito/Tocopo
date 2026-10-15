'use strict';
// =====================================================================
// La expedición: estado, estadísticas, mutaciones, inventario,
// guardado con muerte permanente, récords y bitácora.
// =====================================================================

const Run = {
  create(seed, dailyKey) {
    const s = CONFIG.START_STATS;
    return {
      v: 2, seed: seed >>> 0, daily: dailyKey || null,
      regionIdx: 0, route: ROUTE.slice(), pos: 'start', visited: [], revealed: [], escamasUsed: {},
      queue: [], actionN: 0,
      level: 1, xp: 0, hp: s.vid, ene: s.ene, adn: 0, conchas: CONFIG.START_CONCHAS,
      frags: { vid: 0, ene: 0, atq: 0, def: 0, vel: 0, ins: 0 },
      muts: [], pelaje: false, inv: CONFIG.START_ITEMS.slice(),
      nextAtk: 0, poisonNext: 0, pendingItem: null, pipDiscount: false,
      glacierUnlocked: false, shops: {},
      kills: 0, elites: 0, bosses: 0, nodes: 0, time: 0,
    };
  },

  region(run) { return run.route[run.regionIdx]; },
  stage(run) { return STAGES.find(s => run.level >= s.min && run.level <= s.max) || STAGES[STAGES.length - 1]; },
  slots(run) { return this.stage(run).slots; },

  branchesOf(run) {
    const set = new Set();
    for (const m of run.muts) { const d = mutDef(m.id); if (!d.unstable) set.add(d.branch); }
    return set;
  },

  synergies(run) {
    const b = this.branchesOf(run);
    return Object.keys(SYNERGIES).filter(id => SYNERGIES[id].branches.every(x => b.has(x)));
  },
  hasSyn(run, id) { return this.synergies(run).includes(id); },

  // Efecto de mutación inestable equipada (bleed, lifesteal, ...)
  hasFx(run, fx) { return run.muts.some(m => mutDef(m.id).effect === fx); },
  hasMut(run, id) { return run.muts.some(m => m.id === id); },

  // Estadísticas: base + niveles + etapa + fragmentos + mutaciones + multiplicadores
  stats(run) {
    const b = CONFIG.START_STATS, g = CONFIG.LEVEL_GAIN, L = run.level - 1;
    const s = { vid: b.vid + g.vid * L, ene: b.ene + g.ene * L, atq: b.atq + g.atq * L, def: b.def + g.def * L, vel: b.vel, ins: b.ins, esq: 0 };
    const stage = this.stage(run);
    for (const k in stage.bonus) s[k] += stage.bonus[k];
    for (const k in run.frags) s[k] += run.frags[k];
    let mult = 1 + (stage.mult || 0);
    for (const m of run.muts) {
      const d = mutDef(m.id);
      for (const k in d.stats) {
        const v = d.stats[k];
        s[k] += v > 0 && m.boost ? Math.round(v * (1 + CONFIG.BOOST)) : v;
      }
      if (d.mult) mult *= 1 + d.mult * (m.boost ? 1 + CONFIG.BOOST : 1);
    }
    if (run.pelaje) { s.vid += SECRET_MUTATION.stats.vid; s.def += SECRET_MUTATION.stats.def; }
    if (this.hasSyn(run, 'cazador')) s.ins += 10;
    if (mult !== 1) for (const k of ['vid', 'ene', 'atq', 'def', 'vel', 'ins']) s[k] = Math.round(s[k] * mult);
    s.def = Math.max(0, s.def);
    s.vel = Math.max(1, s.vel);
    s.esq = clamp(s.esq, 0, 75);
    return s;
  },

  clampVitals(run) {
    const s = this.stats(run);
    run.hp = clamp(run.hp, 0, s.vid);
    run.ene = clamp(run.ene, 0, s.ene);
  },

  // Aspecto: de cada rama solo la capa de la mutación de mayor rareza
  look(run) {
    const layers = {};
    for (const m of run.muts) {
      const d = mutDef(m.id);
      if (d.unstable) continue;
      const cur = layers[d.branch];
      if (!cur || MUTATIONS[cur].rarity < d.rarity) layers[d.branch] = m.id;
    }
    return { stage: this.stage(run).id, layers, pelaje: run.pelaje, unstable: run.muts.some(m => mutDef(m.id).unstable) };
  },

  // Sube de nivel: +5 VID, +1 ENE, +1 ATQ, +1 DEF y cura 30% de la vida
  gainXP(run, n) {
    const ups = [];
    if (run.level >= CONFIG.MAX_LEVEL) return ups;
    run.xp += n;
    while (run.level < CONFIG.MAX_LEVEL && run.xp >= run.level * CONFIG.XP_PER_LEVEL) {
      run.xp -= run.level * CONFIG.XP_PER_LEVEL;
      run.level++;
      const s = this.stats(run);
      run.hp = Math.min(s.vid, run.hp + CONFIG.LEVEL_GAIN.vid + Math.round(s.vid * CONFIG.LEVEL_HEAL));
      run.ene = Math.min(s.ene, run.ene + CONFIG.LEVEL_GAIN.ene);
      ups.push(run.level);
    }
    if (run.level >= CONFIG.MAX_LEVEL) run.xp = 0;
    return ups;
  },

  // ---------------- Inventario (6 espacios) ----------------
  // Devuelve 'ok' | 'full' | 'max'
  canAdd(run, id) {
    const it = ITEMS[id];
    if (it.max && run.inv.filter(x => x === id).length >= it.max) return 'max';
    if (run.inv.length >= CONFIG.INVENTORY_SLOTS) return 'full';
    return 'ok';
  },
  addItem(run, id) {
    const r = this.canAdd(run, id);
    if (r === 'ok') run.inv.push(id);
    return r;
  },
  removeItem(run, id) {
    const i = run.inv.indexOf(id);
    if (i >= 0) run.inv.splice(i, 1);
  },
  count(run, id) { return run.inv.filter(x => x === id).length; },

  // ---------------- Mutaciones ----------------
  addMutation(run, id, replaceIdx) {
    if (replaceIdx != null) run.muts.splice(replaceIdx, 1, { id, boost: false });
    else run.muts.push({ id, boost: false });
    Log.mark('mutations', id);
    this.clampVitals(run);
  },

  // Oferta de mutaciones al azar según la rareza de la región
  rollRarity(rng, region, minRarity = 1) {
    const odds = RARITY_ODDS[region] || RARITY_ODDS.valle;
    const list = [1, 2, 3].filter(r => r >= minRarity).map(r => ({ r, w: odds[r - 1] }));
    return rng.weighted(list).r;
  },

  pickMutation(rng, run, rarity, exclude) {
    const owned = new Set(run.muts.map(m => m.id).concat(exclude || []));
    let pool = Object.keys(MUTATIONS).filter(id => MUTATIONS[id].rarity === rarity && !owned.has(id));
    if (!pool.length) pool = Object.keys(MUTATIONS).filter(id => !owned.has(id));
    return pool.length ? rng.pick(pool) : null;
  },

  // kind: combat | elite | nest | boss | shop
  makeOffer(rng, run, kind) {
    const region = this.region(run);
    const offer = [];
    const n = CONFIG.OFFER_SIZE;
    for (let i = 0; i < n; i++) {
      let min = 1;
      if (kind === 'elite' || kind === 'boss') min = 2;
      if (kind === 'nest' && i === 0) min = 2;
      const id = this.pickMutation(rng, run, this.rollRarity(rng, region, min), offer);
      if (id) offer.push(id);
    }
    if (kind === 'elite' && rng.chance(CONFIG.ELITE_UNSTABLE_CHANCE)) {
      const u = this.pickUnstable(rng, run);
      if (u) offer[offer.length - 1] = u;
    }
    return rng.shuffle(offer);
  },

  pickUnstable(rng, run) {
    const pool = Object.keys(UNSTABLE).filter(id => !this.hasMut(run, id));
    return pool.length ? rng.pick(pool) : null;
  },

  // ---------------- Guardado ----------------
  save(run) {
    if (!run) return;
    try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(run)); } catch (e) { /* sin almacenamiento */ }
  },
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return null;
      const run = JSON.parse(raw);
      return run && run.v === 2 ? run : null;
    } catch (e) { return null; }
  },
  // Muerte permanente: la expedición se borra por completo
  clear() {
    try { localStorage.removeItem(CONFIG.SAVE_KEY); } catch (e) { /* nada */ }
  },
};

// ---------------------------------------------------------------------
// Récords: lo único que queda entre partidas, y no da poder
// ---------------------------------------------------------------------
const Records = {
  get() {
    try { return Object.assign(this.empty(), JSON.parse(localStorage.getItem(CONFIG.RECORDS_KEY) || '{}')); }
    catch (e) { return this.empty(); }
  },
  empty() { return { runs: 0, victories: 0, bestRegion: 0, bestRegionName: '', totalKills: 0, bestKills: 0, bestWinTime: 0, daily: {} }; },
  // result: 'win' | 'death'
  finish(run, result) {
    const r = this.get();
    r.runs++;
    const reg = REGIONS[Run.region(run)];
    if (reg.order > r.bestRegion || (reg.order === r.bestRegion && result === 'win')) {
      r.bestRegion = reg.order;
      r.bestRegionName = result === 'win' ? 'Victoria' : reg.name;
    }
    r.totalKills += run.kills;
    r.bestKills = Math.max(r.bestKills, run.kills);
    if (result === 'win') {
      r.victories++;
      if (!r.bestWinTime || run.time < r.bestWinTime) r.bestWinTime = Math.round(run.time);
    }
    if (run.daily) {
      const prev = r.daily[run.daily];
      const score = { result, region: reg.name, order: reg.order, kills: run.kills, time: Math.round(run.time), level: run.level };
      if (!prev || score.order > prev.order || (score.result === 'win' && (prev.result !== 'win' || score.time < prev.time))) r.daily[run.daily] = score;
    }
    try { localStorage.setItem(CONFIG.RECORDS_KEY, JSON.stringify(r)); } catch (e) { /* nada */ }
    return r;
  },
};

// Bitácora: mutaciones, enemigos y eventos descubiertos (solo consulta)
const Log = {
  data: null,
  get() {
    if (this.data) return this.data;
    try { this.data = Object.assign({ mutations: {}, enemies: {}, events: {}, bosses: {} }, JSON.parse(localStorage.getItem(CONFIG.LOG_KEY) || '{}')); }
    catch (e) { this.data = { mutations: {}, enemies: {}, events: {}, bosses: {} }; }
    return this.data;
  },
  mark(kind, id) {
    const d = this.get();
    if (d[kind][id]) return;
    d[kind][id] = true;
    try { localStorage.setItem(CONFIG.LOG_KEY, JSON.stringify(d)); } catch (e) { /* nada */ }
  },
};
