'use strict';
// =====================================================================
// Combate por turnos (Guía v0.2, sección 4). Todo el azar sale de
// this.rng, derivado de la semilla de la expedición y del nodo.
// =====================================================================

// Posiciones (base de los pies) en la pantalla de 512×288
const ENEMY_SLOTS = {
  1: [{ x: 372, y: 150 }],
  2: [{ x: 336, y: 142 }, { x: 446, y: 164 }],
  3: [{ x: 318, y: 136 }, { x: 398, y: 162 }, { x: 470, y: 132 }],
};
const BOSS_SLOTS = { 1: [{ x: 380, y: 176 }], 2: [{ x: 350, y: 176 }, { x: 466, y: 168 }], 3: [{ x: 340, y: 176 }, { x: 452, y: 170 }, { x: 488, y: 120 }] };
const PLAYER_POS = { x: 132, y: 198 };

// En celular vertical la escena es más angosta y alta: posiciones relativas
// a VW/VH (horizonte, Tocopo abajo a la izquierda, enemigos arriba a la derecha)
function battleLayout(n, boss) {
  if (VW >= 500) return { horizon: 110, player: { ...PLAYER_POS }, slots: (boss ? BOSS_SLOTS : ENEMY_SLOTS)[n] };
  const hz = Math.round(VH * 0.40);
  const fx = (x, dy) => ({ x: Math.round(VW * x), y: hz + dy });
  const slots = boss
    ? { 1: [fx(0.66, 112)], 2: [fx(0.56, 112), fx(0.88, 128)], 3: [fx(0.52, 112), fx(0.86, 128), fx(0.88, 60)] }[n]
    : { 1: [fx(0.70, 70)], 2: [fx(0.56, 62), fx(0.86, 92)], 3: [fx(0.48, 52), fx(0.70, 96), fx(0.90, 56)] }[n];
  return { horizon: hz, player: { x: Math.round(VW * 0.27), y: VH - 16 }, slots };
}

// --- Inteligencia de enemigos y jefes -------------------------------
const AI = {
  basic: (b, e) => b.enemyAttack(e, {}),
  sapo: (b, e) => b.rng.chance(0.35) ? b.enemyAttack(e, { name: 'Escupitajo Ácido', pot: 0.8, poison: 3 }) : b.enemyAttack(e, {}),
  async cocodrilo(b, e) {
    const every = e.elite === 'enrage' ? 3 : 3;
    if (e.turns % every === 0) return b.enemyAttack(e, { name: 'Mordida Fuerte', pot: 1.8 });
    await b.enemyAttack(e, {});
    if (e.turns % every === every - 1 && b.player.alive && e.alive) await b.msg(`${e.name} abre sus enormes fauces...`);
  },
  mosquito: (b, e) => b.enemyAttack(e, { name: 'Picadura', drain: 3 }),
  pterosaurio: (b, e) => b.rng.chance(0.3) ? b.enemyAttack(e, { name: 'Picada de Fuego', pot: 1.5 }) : b.enemyAttack(e, {}),
  salamandra: (b, e) => b.rng.chance(0.3) ? b.enemyAttack(e, { name: 'Quemadura', pot: 0.8, poison: 4 }) : b.enemyAttack(e, {}),
  mamut: (b, e) => b.rng.chance(0.25) ? b.enemyAttack(e, { name: 'Embestida', pot: 1.3, stun: 0.5 }) : b.enemyAttack(e, {}),
  async alfa(b, e) {
    if (!e.flags.healed && e.hp <= e.maxhp * 0.3) {
      e.flags.healed = true;
      const amt = Math.round(e.maxhp * 0.3);
      b.healEnemy(e, amt);
      return b.msg(`${e.name} absorbe cristal y recupera ${amt} VID.`);
    }
    return b.enemyAttack(e, {});
  },
  async granRaptor(b, e) {
    if (!e.flags.summoned && e.hp <= e.maxhp / 2) {
      e.flags.summoned = true;
      Sound.sfx('roar');
      await b.msg('¡El Gran Raptor Rojo lanza un chillido!');
      b.addEnemy({ id: 'raptorcito' });
      return b.msg('¡Un Raptorcito acude a ayudarlo!');
    }
    return b.rng.chance(0.3) ? b.enemyAttack(e, { name: 'Garra Roja', pot: 1.3 }) : b.enemyAttack(e, {});
  },
  async reina(b, e) {
    if (b.player.alive) {
      await b.msg('La Reina del Fango esparce esporas tóxicas.');
      await b.msg(b.applyStatus(b.player, 'veneno', { power: 3 }));
    }
    return b.enemyAttack(e, { name: 'Lodo Pesado' });
  },
  async coloso(b, e) {
    if (e.turns % 4 === 0) return b.enemyAttack(e, { name: 'Erupción', pot: 1.6 });
    await b.enemyAttack(e, {});
    if (e.turns % 4 === 3 && e.alive && b.player.alive) await b.msg('El Coloso acumula magma en su interior...');
  },
  async bestia(b, e) {
    if (e.turns % 4 === 0) return b.enemyAttack(e, { name: 'Congelar', pot: 0.6, stun: 1 });
    await b.enemyAttack(e, {});
    if (e.turns % 4 === 3 && e.alive && b.player.alive) await b.msg('El aire se vuelve helado de golpe...');
  },
  async rey(b, e) {
    const ratio = e.hp / e.maxhp;
    if (e.flags.phase === 1 && ratio <= 0.66) {
      e.flags.phase = 2;
      e.st.vel += 3;
      Sound.sfx('roar');
      b.shakeScreen = 0.6;
      return b.msg('¡El Rey Tirano ruge! Los cristales de su lomo se encienden. (Fase 2: más rápido)');
    }
    if (e.flags.phase === 2 && ratio <= 0.33) {
      e.flags.phase = 3;
      e.corrupt = true;
      Sound.sfx('roar');
      b.shakeScreen = 0.8;
      b.updateBoxes();
      return b.msg('El cristal lo consume por completo... ¡El Rey Tirano está Corrompido! (Fase 3)');
    }
    if (e.flags.phase === 1) {
      if (e.turns % 3 === 0 && !b.player.status.intimidado) {
        Sound.sfx('roar');
        await b.msg('El Rey Tirano usa Rugido Real.');
        return b.msg(b.applyStatus(b.player, 'intimidado'));
      }
      return b.enemyAttack(e, { name: 'Mordida Real' });
    }
    if (e.flags.phase === 2) {
      return e.turns % 2 === 0 ? b.enemyAttack(e, { name: 'Aliento de Cristal', pot: 1.4 }) : b.enemyAttack(e, { name: 'Mordida Real' });
    }
    return e.turns % 3 === 0 ? b.enemyAttack(e, { name: 'Pisotón Sísmico', pot: 1.8, stun: 0.3 }) : b.enemyAttack(e, { name: 'Mordida Cristalina', pot: 1.2 });
  },
};

class Battle {
  // list: [{ id, boss, elite, corrupt }]
  // opts: { kind: combat|elite|boss, rng, region, row, bg, intro }
  constructor(run, list, opts) {
    this.run = run;
    this.opts = opts;
    this.rng = opts.rng;
    this.kind = opts.kind || 'combat';
    this.boss = this.kind === 'boss';
    this.noFlee = this.kind !== 'combat';
    this.region = opts.region;
    this.rowMult = 1 + CONFIG.ROW_SCALE * Math.max(0, opts.row || 0);
    this.bg = REGIONS[opts.region].battle;
    this.round = 0;
    this.result = null;
    this.itemsUsed = 0;
    this.fx = [];
    this.shakeScreen = 0;
    this.flashScreen = 0;
    this.focusTarget = null;
    this.player = this.makePlayer();
    this.enemies = [];
    list.forEach(e => this.enemies.push(this.makeEnemy(e)));
    this.layout();
  }

  makePlayer() {
    const run = this.run;
    const s = Run.stats(run);
    const p = {
      side: 'player', name: 'Tocopo', alive: true,
      maxhp: s.vid, hp: Math.min(run.hp, s.vid), maxene: s.ene, ene: Math.min(run.ene, s.ene),
      st: { atq: s.atq, def: s.def, vel: s.vel, ins: s.ins, esq: s.esq },
      status: {}, guard: false, velDown: 0,
      anim: { shake: 0, flash: 0, lunge: 0, alpha: 1 },
      pos: { ...PLAYER_POS },
    };
    if (run.nextAtk) { p.st.atq += run.nextAtk; p.atkBuff = run.nextAtk; run.nextAtk = 0; }
    return p;
  }

  makeEnemy({ id, boss = false, elite = false, corrupt = false }) {
    const base = boss ? BOSSES[id] : ENEMIES[id];
    const isCorrupt = corrupt || !!base.corrupt;
    let name = base.name;
    if (corrupt && !base.corrupt) name = base.name.split(' ')[0] + ' Corrompido';
    if (elite) name += ' Élite';
    const m = boss ? 1 : this.rowMult;
    let vid = base.vid * m, atq = base.atq * m;
    if (elite) { vid *= CONFIG.ELITE_MULT.vid; atq *= CONFIG.ELITE_MULT.atq; }
    const rewardMult = elite ? 1.5 : 1;
    const e = {
      side: 'enemy', id, base, name, boss, elite: elite ? base.elite : null, alive: true, fled: false,
      maxhp: Math.round(vid), hp: Math.round(vid),
      st: { atq: Math.round(atq), def: base.def, vel: base.vel, ins: CONFIG.ENEMY_CRIT, esq: (base.dodge || 0) + (elite && base.elite === 'dodge' ? 20 : 0) },
      corrupt: isCorrupt, status: {}, turns: 0, flags: { phase: 1 }, velDown: 0,
      rewards: { xp: Math.round(base.xp * rewardMult), conchas: Math.round(base.conchas * rewardMult) },
      anim: { shake: 0, flash: 0, lunge: 0, alpha: 1 },
      pos: { x: 0, y: 0 },
    };
    Log.mark(boss ? 'bosses' : 'enemies', id);
    return e;
  }

  sprite(c, frame) {
    if (c.side === 'player') return Sprites.tocopo(Run.look(this.run), frame);
    return c.boss ? Sprites.boss(c.base, c.corrupt, frame) : Sprites.enemy(c.base, c.corrupt, frame);
  }

  addEnemy(spec) {
    this.enemies.push(this.makeEnemy(spec));
    this.layout();
    this.updateBoxes();
  }

  // Se recalcula en cada cuadro: la pantalla puede girar en pleno combate
  layout() {
    const n = Math.min(3, this.enemies.length);
    const L = battleLayout(n, this.boss);
    this.horizon = L.horizon;
    this.player.pos = L.player;
    this.enemies.forEach((e, i) => { e.pos = { ...L.slots[Math.min(i, L.slots.length - 1)] }; });
  }

  alive() { return this.enemies.filter(e => e.alive); }

  // ------------------------------------------------------------------
  // Presentación
  msg(text, ms) {
    if (!text) return Promise.resolve();
    const log = $('battle-log');
    log.textContent = text;
    log.classList.remove('hidden');
    $('battle-actions').classList.add('hidden');
    ms = ms || clamp(450 + text.length * 24, 800, 2600);
    return new Promise(res => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        clearTimeout(tm);
        UI.popInput(h);
        res();
      };
      // tocar el panel o la pantalla envía 'ok' (ver init en game.js)
      const h = k => { if (k === 'ok' || k === 'back') fin(); };
      const tm = setTimeout(fin, ms * (Game.fast ? 0.01 : 1));
      UI.pushInput(h);
    });
  }

  popNum(c, text, color) {
    const s = this.scaleOf(c);
    const h = (this.sprite(c).box.maxY + 1 - this.sprite(c).box.minY) * s;
    this.fx.push({ text: String(text), x: c.pos.x + this.rng.int(-6, 6), y: c.pos.y - h * 0.8, color, t: 0 });
  }

  // ×4 según la guía; en vertical, con varios enemigos, ×3 para que quepan
  scaleOf(c) {
    if (VW < 500 && c && c.side === 'enemy' && this.enemies.length > 1 && !(c.boss && this.enemies.length === 2)) return 3;
    return CONFIG.BATTLE_SCALE;
  }

  showUI() {
    $('battle-ui').classList.remove('hidden');
    $('hud').classList.add('hidden');
    this.updateBoxes();
  }
  hideUI() { $('battle-ui').classList.add('hidden'); }

  statusTags(c) {
    let s = '';
    for (const k in c.status) if (STATUS[k]) s += `<span class="tag" style="background:${STATUS[k].color}">${STATUS[k].short}</span>`;
    if (c.corrupt) s += '<span class="tag corrupt">CRISTAL</span>';
    if (c.elite) s += `<span class="tag elite">${esc(ELITE_TRAITS[c.elite].name)}</span>`;
    if (c.guard) s += '<span class="tag guard">ESCUDO</span>';
    if (c.atkBuff) s += `<span class="tag guard">+${c.atkBuff} ATQ</span>`;
    return s;
  }

  updateBoxes() {
    $('enemy-boxes').innerHTML = this.enemies.filter(e => e.alive).map(e => {
      const pct = Math.max(0, e.hp / e.maxhp * 100);
      const lv = e.boss ? 'JEFE' : e.elite ? 'ÉLITE' : '';
      return `<div class="ebox box${this.focusTarget === e ? ' targeted' : ''}${e.elite || e.boss ? ' strong' : ''}">
        <div class="ename"><span>${esc(e.name)}</span><span>${lv}</span></div>
        <div class="bar hp"><i style="width:${pct}%"></i></div>
        <div class="elabel">${e.hp}/${e.maxhp}</div>
        <div class="etags">${this.statusTags(e)}</div></div>`;
    }).join('');
    const p = this.player, run = this.run;
    $('player-box').innerHTML = `
      <div class="pname"><span>Tocopo <span class="pstage">${Run.stage(run).name}</span></span><span>Nv ${run.level}</span></div>
      <div class="pbars">
        <div class="pstat"><div class="plabel"><span>VID</span><span>${p.hp}/${p.maxhp}</span></div>
          <div class="bar hp"><i style="width:${Math.max(0, p.hp / p.maxhp * 100)}%"></i></div></div>
        <div class="pstat"><div class="plabel"><span>ENE</span><span>${p.ene}/${p.maxene}</span></div>
          <div class="bar ene"><i style="width:${Math.max(0, p.ene / p.maxene * 100)}%"></i></div></div>
      </div>
      <div class="etags">${this.statusTags(p)}</div>`;
  }

  // ------------------------------------------------------------------
  // Bucle principal
  async run_() {
    const run = this.run;
    this.showUI();
    const names = this.enemies.map(e => e.name);
    if (this.opts.intro) await this.msg(this.opts.intro);
    else if (names.length > 1) await this.msg(`¡Aparecen ${names.join(' y ')}!`);
    else await this.msg(`¡${names[0]} aparece!`);
    const el = this.enemies.find(e => e.elite);
    if (el) await this.msg(`Rasgo de élite: ${ELITE_TRAITS[el.elite].desc}.`);
    if (this.enemies.some(e => e.corrupt) && !this.boss && !run.flags_seenCorrupt) {
      run.flags_seenCorrupt = true;
      await this.msg('Está Corrompido: +20% ATQ, pero el daño de cristal le hace ×1,5.');
    }
    if (this.player.atkBuff) await this.msg(`El Colmillo de Caza da +${this.player.atkBuff} ATQ en este combate.`);
    if (run.poisonNext) {
      await this.msg(this.applyStatus(this.player, 'veneno', { power: run.poisonNext }));
      run.poisonNext = 0;
    }

    while (!this.result) {
      this.round++;
      let act;
      if (this.player.status.aturdido) act = { type: 'stunned' };
      else act = await this.chooseAction(true);

      if (act.type === 'flee') {
        await this.msg('Tocopo intenta huir...');
        const fastest = Math.max(...this.alive().map(e => this.effVel(e)));
        const chance = CONFIG.FLEE_BASE + (this.effVel(this.player) > fastest ? CONFIG.FLEE_FAST_BONUS : 0);
        if (this.rng.chance(chance)) {
          Sound.sfx('flee');
          await this.msg('¡Escapaste! Sin recompensa.');
          this.result = 'flee';
          break;
        }
        await this.msg('¡No pudo escapar!');
        act = { type: 'none' };
      }

      for (const c of this.turnOrder(act)) {
        if (this.result) break;
        if (!c.alive) continue;
        if (c === this.player) await this.playerTurn(act);
        else await this.enemyTurn(c);
        this.checkEnd();
      }
      if (this.result) break;
      this.endRound();
    }

    run.hp = Math.max(0, this.player.hp);
    run.ene = this.player.ene;
    if (this.result === 'win') await this.victory();
    if (this.result === 'lose') {
      Sound.stop();
      Sound.sfx('defeat');
      await this.msg('Tocopo cayó en combate...', 2200);
    }
    this.hideUI();
    return this.result;
  }

  turnOrder(act) {
    const p = this.player;
    const firstRoll = new Map(this.alive().map(e => [e, e.base.first && this.rng.chance(0.8)]));
    const key = c => {
      if (c === p) return (act.priority ? 1000 : 0) + this.effVel(p) + 0.5; // empate: actúa Tocopo
      return (firstRoll.get(c) ? 500 : 0) + this.effVel(c);
    };
    return [p, ...this.alive()].map(c => ({ c, k: key(c) })).sort((a, b) => b.k - a.k).map(o => o.c);
  }

  endRound() {
    for (const c of [this.player, ...this.enemies]) {
      c.guard = false;
      for (const k of ['cegado', 'intimidado', 'corazaRota', 'stunImmune', 'muralla']) {
        if (c.status[k] && --c.status[k].turns <= 0) delete c.status[k];
      }
    }
    this.updateBoxes();
  }

  checkEnd() {
    if (this.result) return;
    if (!this.player.alive) this.result = 'lose';
    else if (!this.alive().length) this.result = 'win';
  }

  // ------------------------------------------------------------------
  // Elección del jugador
  playerSkills() {
    return this.run.muts.map(m => mutDef(m.id).skill).filter(Boolean);
  }
  skillCost(id) { return Run.hasFx(this.run, 'cheapSkills') ? 1 : SKILLS[id].ene; }
  battleItems() {
    const seen = [];
    for (const id of this.run.inv) if (ITEMS[id].battle && !seen.includes(id)) seen.push(id);
    return seen;
  }

  async chooseAction(canFlee) {
    const box = $('battle-actions');
    const log = $('battle-log');
    while (true) {
      log.classList.add('hidden');
      box.classList.remove('hidden');
      box.innerHTML = '';
      const skills = this.playerSkills();
      const items = this.battleItems();
      const main = await UI.menu({
        container: box, embedded: true, cols: 2, cancel: false, cls: 'actions',
        items: [
          { label: 'Atacar', value: 'attack' },
          { label: 'Mutaciones', value: 'skills', disabled: !skills.length },
          { label: 'Objetos', value: 'items', disabled: !items.length },
          { label: 'Huir', value: 'flee', disabled: this.noFlee || !canFlee },
        ],
      });
      box.innerHTML = '';
      if (main === 'flee') return { type: 'flee' };
      if (main === 'attack') {
        const t = await this.chooseTarget();
        if (t) return { type: 'attack', target: t };
        continue;
      }
      if (main === 'skills') {
        const p = this.player;
        const id = await UI.menu({
          container: box, embedded: true, cols: 2, cls: 'skills',
          items: skills.map(s => ({ label: SKILLS[s].name, right: this.skillCost(s) + '', value: s, disabled: p.ene < this.skillCost(s), desc: `${SKILLS[s].desc} · ${this.skillCost(s)} ENE` })),
        });
        box.innerHTML = '';
        if (!id) continue;
        const sk = SKILLS[id];
        let target = null;
        if (!sk.self) {
          target = await this.chooseTarget();
          if (!target) continue;
        }
        return { type: 'skill', skill: id, target, priority: !!sk.priority };
      }
      if (main === 'items') {
        const id = await UI.menu({
          container: box, embedded: true, cols: 2, cls: 'skills',
          items: items.map(i => ({ label: ITEMS[i].name, right: '×' + Run.count(this.run, i), value: i, desc: ITEMS[i].desc + ' · Gasta el turno' })),
        });
        box.innerHTML = '';
        if (!id) continue;
        return { type: 'item', item: id };
      }
    }
  }

  async chooseTarget() {
    const alive = this.alive();
    if (alive.length === 1) return alive[0];
    const box = $('battle-actions');
    box.innerHTML = '';
    const t = await UI.menu({
      container: box, embedded: true, cls: 'skills', title: '¿A quién?',
      items: alive.map(e => ({ label: e.name, right: `${e.hp}/${e.maxhp}`, value: e })),
      onFocus: it => { this.focusTarget = it.value; this.updateBoxes(); },
    });
    this.focusTarget = null;
    this.updateBoxes();
    box.innerHTML = '';
    return t;
  }

  resolveTarget(t) { return t && t.alive ? t : this.alive()[0] || null; }

  // ------------------------------------------------------------------
  // Turnos
  async startTurn(c) {
    // Sangre Hirviente: pierde 2 VID por turno en combate
    if (c === this.player && Run.hasFx(this.run, 'bleed')) {
      c.hp = Math.max(0, c.hp - 2);
      c.anim.flash = 0.15;
      this.popNum(c, 2, '#ff6b3a');
      this.updateBoxes();
      await this.msg('La Sangre Hirviente quema a Tocopo: −2 VID.', 900);
      await this.afterDamage(c);
      if (!c.alive) return false;
    }
    if (c.side === 'enemy' && c.elite === 'regen' && c.hp < c.maxhp) {
      const amt = Math.max(1, Math.round(c.maxhp * ELITE_TRAITS.regen.pct));
      this.healEnemy(c, amt);
      await this.msg(`${c.name} se regenera: +${amt} VID.`, 900);
    }
    if (c.status.veneno) {
      const v = c.status.veneno;
      c.hp = Math.max(0, c.hp - v.power);
      c.anim.flash = 0.2;
      this.popNum(c, v.power, '#8fd16a');
      Sound.sfx('poison');
      this.updateBoxes();
      await this.msg(`${c.name} pierde ${v.power} VID por el veneno.`);
      if (--v.turns <= 0) delete c.status.veneno;
      this.updateBoxes();
      await this.afterDamage(c);
      if (!c.alive) return false;
    }
    if (c.status.aturdido) {
      delete c.status.aturdido;
      c.status.stunImmune = { turns: 2 };
      this.updateBoxes();
      await this.msg(`${c.name} está aturdido y pierde el turno.`);
      return false;
    }
    return true;
  }

  async playerTurn(act) {
    if (!(await this.startTurn(this.player))) return;
    if (act.type === 'none' || act.type === 'stunned') return;
    await this.execPlayer(act);
    // Plumaje Tormenta: 15% de actuar dos veces
    if (Run.hasMut(this.run, 'tormenta') && this.player.alive && this.alive().length && this.rng.chance(0.15)) {
      await this.msg('¡Plumaje Tormenta! Tocopo actúa otra vez.');
      await this.execPlayer(await this.chooseAction(false));
    }
  }

  async execPlayer(act) {
    const p = this.player;
    if (act.type === 'attack') {
      const t = this.resolveTarget(act.target);
      if (!t) return;
      await this.msg('Tocopo ataca.', 600);
      const filo = Run.hasSyn(this.run, 'filo') && t.corrupt;
      await this.hit(p, t, { pot: 1.0, mult: filo ? 1.3 : 1, filo });
    } else if (act.type === 'skill') {
      await this.useSkill(act.skill, act.target);
    } else if (act.type === 'item') {
      await this.useItem(act.item);
    }
  }

  async useSkill(id, target) {
    const p = this.player, run = this.run;
    const sk = SKILLS[id];
    p.ene -= this.skillCost(id);
    this.updateBoxes();
    Sound.sfx(sk.crystal ? 'crystal' : 'skill');
    await this.msg(`Tocopo usa ${sk.name}.`, 750);
    if (sk.kind === 'guard') {
      p.guard = true;
      this.updateBoxes();
      return this.msg('Tocopo se atrinchera tras su escudo óseo.');
    }
    if (sk.kind === 'heal') {
      const amt = await this.healPlayer(Math.round(p.maxhp * sk.heal));
      return this.msg(`Un canto antiguo resuena. Tocopo recupera ${amt} VID.`);
    }
    const t = this.resolveTarget(target);
    if (!t) return;
    if (sk.kind === 'debuff') {
      if (sk.intimidate) {
        Sound.sfx('roar');
        await this.msg(this.applyStatus(t, 'intimidado'));
        if (Run.hasSyn(run, 'aurora') && this.rng.chance(0.3)) { await this.msg('¡Aurora!'); await this.msg(this.applyStatus(t, 'cegado')); }
      }
      if (sk.blind) { this.flashScreen = 0.3; await this.msg(this.applyStatus(t, 'cegado')); }
      if (sk.armor) await this.msg(this.applyStatus(t, 'corazaRota'));
      if (sk.poison) await this.msg(this.applyStatus(t, 'veneno', { power: sk.poison }));
      return;
    }
    let landed = false;
    for (let i = 0; i < (sk.hits || 1); i++) {
      if (!t.alive) break;
      const ok = await this.hit(p, t, { pot: sk.pot, pierce: sk.pierce, crystal: sk.crystal });
      landed = landed || ok;
    }
    if (!landed || !t.alive) return;
    if (sk.stun && this.rng.chance(sk.stun)) { Sound.sfx('stun'); await this.msg(this.applyStatus(t, 'aturdido')); }
    if (sk.poison) await this.msg(this.applyStatus(t, 'veneno', { power: sk.poison }));
    // Dardos Venenosos: Picada y Torbellino también envenenan
    if ((id === 'picada' || id === 'torbellino') && Run.hasSyn(run, 'dardos')) await this.msg(this.applyStatus(t, 'veneno', { power: 3 }));
    if (sk.slow) {
      t.velDown = (t.velDown || 0) + sk.slow;
      await this.msg(`La VEL de ${t.name} baja ${sk.slow} puntos.`);
    }
  }

  async useItem(id) {
    const p = this.player, run = this.run;
    const it = ITEMS[id];
    Run.removeItem(run, id);
    this.itemsUsed++;
    if (it.use === 'heal') {
      let amt = it.amount;
      if (Run.hasFx(run, 'lifesteal')) amt = Math.floor(amt / 2);
      const got = await this.healPlayer(amt);
      return this.msg(`Tocopo come una ${it.name} y recupera ${got} VID.`);
    }
    if (it.use === 'ene') {
      const amt = Math.min(it.amount, p.maxene - p.ene);
      p.ene += amt;
      Sound.sfx('heal');
      this.updateBoxes();
      return this.msg(`Tocopo mastica una ${it.name} y recupera ${amt} ENE.`);
    }
    if (it.use === 'cure') {
      delete p.status.veneno;
      delete p.status.cegado;
      Sound.sfx('heal');
      this.updateBoxes();
      return this.msg('El Musgo Curativo quita el veneno y la ceguera.');
    }
    if (it.use === 'atk') {
      p.st.atq += it.amount;
      p.atkBuff = (p.atkBuff || 0) + it.amount;
      Sound.sfx('skill');
      this.updateBoxes();
      return this.msg(`Tocopo se afila con el Colmillo de Caza: +${it.amount} ATQ en este combate.`);
    }
  }

  // Curación de Tocopo (Muralla Viviente: +2 DEF por 3 turnos)
  async healPlayer(amount) {
    const p = this.player;
    const got = Math.max(0, Math.min(amount, p.maxhp - p.hp));
    p.hp += got;
    if (got > 0) { this.popNum(p, '+' + got, '#8fd16a'); Sound.sfx('heal'); }
    if (Run.hasSyn(this.run, 'muralla')) p.status.muralla = { turns: 3 };
    this.updateBoxes();
    return got;
  }

  healEnemy(e, amt) {
    e.hp = Math.min(e.maxhp, e.hp + amt);
    this.popNum(e, '+' + amt, '#8fd16a');
    Sound.sfx('heal');
    this.updateBoxes();
  }

  async enemyTurn(e) {
    if (!(await this.startTurn(e))) return;
    if (!this.player.alive) return;
    e.turns++;
    const fn = AI[e.base.ai] || AI.basic;
    await fn(this, e);
    // Élite con doble golpe
    if (e.elite === 'double' && e.alive && this.player.alive && !this.result) {
      await this.enemyAttack(e, { name: 'un segundo golpe', pot: ELITE_TRAITS.double.pot });
    }
  }

  async enemyAttack(e, opts) {
    await this.msg(opts.name ? `${e.name} usa ${opts.name}.` : `${e.name} ataca.`, 650);
    const p = this.player;
    const ok = await this.hit(e, p, { pot: opts.pot || 1.0 });
    if (!ok || !p.alive) return;
    const poison = opts.poison || (e.elite === 'venom' ? 3 : 0);
    if (poison) await this.msg(this.applyStatus(p, 'veneno', { power: poison }));
    if (opts.stun && this.rng.chance(opts.stun)) { Sound.sfx('stun'); await this.msg(this.applyStatus(p, 'aturdido')); }
    if (opts.drain && e.alive) {
      this.healEnemy(e, opts.drain);
      await this.msg(`${e.name} roba ${opts.drain} de vida.`);
    }
  }

  // ------------------------------------------------------------------
  // Daño
  effAtq(c) {
    let a = c.st.atq;
    if (c.status.intimidado) a *= 0.75;
    if (c.corrupt && c.side === 'enemy') a *= 1.2;
    if (c.elite === 'enrage' && c.hp < c.maxhp / 2) a *= 1.3;
    return a;
  }
  effDef(c) {
    let d = c.st.def;
    if (c.status.muralla) d += 2;
    if (c.status.corazaRota) d *= 0.5;
    return d;
  }
  effVel(c) { return Math.max(1, c.st.vel - (c.velDown || 0)); }

  // Daño = (ATQ × potencia) − (DEF rival ÷ 2), variación −1 a +2, mínimo 1
  calcDamage(att, tgt, opts) {
    let d = this.effDef(tgt);
    if (opts.pierce) d *= (1 - opts.pierce);
    let dmg = this.effAtq(att) * opts.pot - d / 2 + this.rng.int(-1, 2);
    const crit = this.rng.next() * 100 < att.st.ins;
    if (crit) dmg *= 1.5;
    if (opts.crystal && tgt.corrupt) dmg *= 1.5;
    if (opts.mult) dmg *= opts.mult;
    if (tgt.guard) dmg *= 0.4;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  async hit(att, tgt, opts) {
    const run = this.run;
    if (att.status.cegado && this.rng.chance(0.5)) {
      Sound.sfx('miss');
      await this.msg(`${att.name} está cegado y falla.`);
      return false;
    }
    // Ojos de Meteoro: 15% de fallar cualquier ataque
    if (att === this.player && Run.hasFx(run, 'shaky') && this.rng.chance(0.15)) {
      Sound.sfx('miss');
      await this.msg('Los Ojos de Meteoro tiemblan... ¡Tocopo falla!');
      return false;
    }
    att.anim.lunge = 0.3;
    await sleep(Game.fast ? 0 : 140);
    if (this.rng.next() * 100 < tgt.st.esq) {
      Sound.sfx('miss');
      this.popNum(tgt, 'ESQUIVA', '#ffffff');
      await this.msg(`¡${tgt.name} esquiva el ataque!`);
      return false;
    }
    const { dmg, crit } = this.calcDamage(att, tgt, opts);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    tgt.anim.shake = 0.35;
    tgt.anim.flash = 0.25;
    if (crit) this.shakeScreen = 0.25;
    this.popNum(tgt, dmg, crit ? '#ffe14a' : (tgt.side === 'player' ? '#ff6b3a' : '#ffffff'));
    Sound.sfx(crit ? 'crit' : 'hit');
    // vibración al recibir un golpe (Android; Safari en iPhone no la permite)
    if (tgt === this.player && navigator.vibrate) { try { navigator.vibrate(crit ? 70 : 30); } catch (e) { /* nada */ } }
    this.updateBoxes();
    let text = `${tgt.name} recibe ${dmg} de daño.`;
    if (crit) text = `¡Golpe crítico! ${text}`;
    if (opts.crystal && tgt.corrupt) text += ' ¡El cristal lo destroza!';
    if (opts.filo) text += ' (Filo de Cristal)';
    if (tgt.guard) text += ' (Atrincherado)';
    await this.msg(text);

    if (att === this.player) {
      // Cazador Veloz: cada crítico da +1 VEL en este combate
      if (crit && Run.hasSyn(run, 'cazador')) { att.st.vel += 1; await this.msg('Cazador Veloz: +1 VEL.', 800); }
      if (Run.hasFx(run, 'lifesteal') && att.hp > 0) {
        const got = await this.healPlayer(Math.max(1, Math.round(dmg * 0.2)));
        if (got) await this.msg(`Hambre Voraz: Tocopo recupera ${got} VID.`, 900);
      }
      if (Run.hasFx(run, 'cheapSkills')) {
        const back = Math.max(1, Math.round(dmg * 0.1));
        att.hp = Math.max(0, att.hp - back);
        this.popNum(att, back, '#c46bff');
        this.updateBoxes();
        await this.msg(`El Cristal Desbordado devuelve ${back} de daño a Tocopo.`, 900);
      }
      if (tgt.elite === 'thorns') {
        att.hp = Math.max(0, att.hp - 3);
        this.popNum(att, 3, '#ff6b3a');
        this.updateBoxes();
        await this.msg('¡Las púas lastiman a Tocopo! −3 VID.', 900);
      }
      await this.afterDamage(att);
    }

    if (tgt === this.player && att.alive) {
      if (Run.hasMut(run, 'piel') && this.rng.chance(0.25)) {
        await this.msg('¡La Piel Venenosa de Tocopo hace efecto!');
        await this.msg(this.applyStatus(att, 'veneno', { power: 3 }));
      }
      // Espinas Tóxicas: 2 de daño al rival y 20% de veneno
      if (Run.hasSyn(run, 'espinas')) {
        att.hp = Math.max(0, att.hp - 2);
        this.popNum(att, 2, '#8fd16a');
        this.updateBoxes();
        await this.msg(`Espinas Tóxicas: ${att.name} recibe 2 de daño.`, 900);
        if (att.hp > 0 && this.rng.chance(0.2)) await this.msg(this.applyStatus(att, 'veneno', { power: 3 }));
        await this.afterDamage(att);
      }
    }
    await this.afterDamage(tgt);
    return true;
  }

  async afterDamage(c) {
    if (c.hp > 0 || !c.alive) return;
    if (c.side === 'enemy') {
      c.alive = false;
      this.updateBoxes();
      Sound.sfx('hit');
      await this.msg(`¡${c.name} fue derrotado!`);
      return;
    }
    if (Run.count(this.run, 'huevo') > 0) {
      Run.removeItem(this.run, 'huevo');
      c.hp = Math.round(c.maxhp * 0.5);
      c.status = {};
      Sound.sfx('heal');
      this.popNum(c, '+' + c.hp, '#8fd16a');
      this.updateBoxes();
      await this.msg('¡El Huevo Fósil brilla! Tocopo revive con la mitad de su vida.');
      return;
    }
    c.alive = false;
  }

  applyStatus(c, key, opts = {}) {
    if (!c.alive) return '';
    if (key === 'veneno') {
      if (c.side === 'player' && this.run.pelaje) return 'El Pelaje Glaciar protege a Tocopo del veneno.';
      const cur = c.status.veneno;
      c.status.veneno = { turns: 3, power: Math.max(opts.power || 3, cur ? cur.power : 0) };
      this.updateBoxes();
      Sound.sfx('poison');
      return `¡${c.name} está envenenado!`;
    }
    if (key === 'aturdido') {
      if (c.status.stunImmune || c.status.aturdido) return `${c.name} resiste el aturdimiento.`;
      c.status.aturdido = { turns: 1 };
      this.updateBoxes();
      return `¡${c.name} queda aturdido!`;
    }
    if (key === 'cegado') { c.status.cegado = { turns: 2 }; this.updateBoxes(); return `¡${c.name} queda cegado!`; }
    if (key === 'intimidado') { c.status.intimidado = { turns: 3 }; this.updateBoxes(); return `¡${c.name} está intimidado! Su ATQ baja.`; }
    if (key === 'corazaRota') { c.status.corazaRota = { turns: 3 }; this.updateBoxes(); return `¡La coraza de ${c.name} se rompe! Su DEF baja a la mitad.`; }
    return '';
  }

  // ------------------------------------------------------------------
  // Recompensas: XP, conchas, ADN (= XP ÷ 2) y +3 ENE
  async victory() {
    const run = this.run;
    Sound.stop();
    Sound.sfx('victory');
    const killed = this.enemies.filter(e => !e.alive && !e.fled);
    let xp = 0, conchas = 0;
    for (const e of killed) { xp += e.rewards.xp; conchas += e.rewards.conchas; }
    const adn = Math.round(xp * CONFIG.ADN_PER_XP);
    run.kills += killed.length;
    await this.msg('¡Victoria!', 900);
    run.conchas += conchas;
    run.adn += adn;
    const parts = [];
    if (xp) parts.push(`${xp} XP`);
    if (conchas) parts.push(`${conchas} conchas`);
    if (adn) parts.push(`${adn} ADN`);
    if (parts.length) await this.msg(`Tocopo gana ${parts.join(', ')}.`);
    const maxEne = Run.stats(run).ene;
    if (run.ene < maxEne) {
      run.ene = Math.min(maxEne, run.ene + CONFIG.WIN_ENE);
      this.player.ene = run.ene;
      this.updateBoxes();
      await this.msg(`Tocopo recupera ${CONFIG.WIN_ENE} ENE.`, 800);
    }
    if (!this.boss && this.rng.chance(CONFIG.DROP_CHANCE)) {
      if (Run.addItem(run, 'baya') === 'ok') await this.msg('¡El enemigo soltó una Baya Roja!', 1000);
    }
    const before = Run.stage(run);
    const ups = Run.gainXP(run, xp);
    for (const lv of ups) {
      Sound.sfx('level');
      const s = Run.stats(run);
      this.player.maxhp = s.vid; this.player.hp = run.hp; this.player.maxene = s.ene; this.player.ene = run.ene;
      this.updateBoxes();
      await this.msg(`¡Tocopo sube al nivel ${lv}! VID +5, ENE +1, ATQ +1, DEF +1 y se cura 30% de la vida.`, 2400);
    }
    const after = Run.stage(run);
    if (after !== before) {
      Sound.sfx('mutate');
      const bonus = after.mult ? ' +10% a todas las estadísticas.' : Object.keys(after.bonus).map(k => ` +${after.bonus[k]} ${STAT_SHORT[k]}`).join(',');
      await this.msg(`¡Tocopo crece! Ahora es ${after.name}: ${after.slots} espacios de mutación.${bonus}`, 3200);
    }
  }

  // ------------------------------------------------------------------
  // Dibujo (512×288)
  update(dt) {
    for (const c of [this.player, ...this.enemies]) {
      const a = c.anim;
      a.shake = Math.max(0, a.shake - dt);
      a.flash = Math.max(0, a.flash - dt);
      a.lunge = Math.max(0, a.lunge - dt);
      if (!c.alive) a.alpha = Math.max(0, a.alpha - dt * 2.2);
    }
    this.shakeScreen = Math.max(0, this.shakeScreen - dt);
    this.flashScreen = Math.max(0, this.flashScreen - dt);
    this.fx.forEach(f => { f.t += dt; });
    this.fx = this.fx.filter(f => f.t < 1.1);
  }

  render(ctx, t) {
    const bg = this.bg, W = VW, H = VH;
    this.layout();
    const hz = this.horizon;
    ctx.save();
    if (this.shakeScreen > 0) ctx.translate(Math.round(Math.sin(t * 90) * 3), Math.round(Math.cos(t * 70) * 2));
    const g = ctx.createLinearGradient(0, 0, 0, hz + 40);
    g.addColorStop(0, bg.sky[0]); g.addColorStop(1, bg.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(-4, -4, W + 8, H + 8);
    ctx.fillStyle = bg.hill;
    for (let i = 0; i < Math.ceil(W / 64) + 1; i++) {
      const x = i * 64 - 20;
      ctx.beginPath(); ctx.moveTo(x, hz); ctx.lineTo(x + 36, hz - 40 + (i % 3) * 12); ctx.lineTo(x + 76, hz); ctx.fill();
    }
    ctx.fillStyle = bg.ground;
    ctx.fillRect(-4, hz - 2, W + 8, H);
    ctx.fillStyle = bg.ground2;
    for (let i = 0; i < 60; i++) ctx.fillRect((i * 53) % W, hz + 4 + (i * 37) % Math.max(20, H - hz - 8), 6, 2);
    const frame = Math.floor(t * 2) % 2 ? 'idle1' : 'idle0';
    // sombras
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (const e of this.enemies) if (e.anim.alpha > 0) {
      const k = this.scaleOf(e) / 4;
      ctx.beginPath(); ctx.ellipse(e.pos.x, e.pos.y, (e.boss ? 52 : 28) * k, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(this.player.pos.x, this.player.pos.y, 28, 6, 0, 0, Math.PI * 2); ctx.fill();

    for (const e of this.enemies) {
      if (e.anim.alpha <= 0) continue;
      let x = e.pos.x;
      const y = e.pos.y;
      if (e.anim.shake > 0) x += Math.sin(e.anim.shake * 60) * 3;
      if (e.anim.lunge > 0) x -= Math.sin((0.3 - e.anim.lunge) / 0.3 * Math.PI) * 16;
      const base = this.sprite(e, frame);
      const spr = e.anim.flash > 0 && Math.floor(e.anim.flash * 30) % 2 === 0 ? Sprites.white(base) : base;
      const sc = this.scaleOf(e);
      const box = Sprites.draw(ctx, spr, x, y, sc, { alpha: e.anim.alpha });
      if (e.corrupt && e.alive) {
        ctx.fillStyle = `rgba(196,107,255,${0.1 + 0.07 * Math.sin(t * 4)})`;
        ctx.beginPath(); ctx.ellipse(x, y - box.h * 0.4, box.w * 0.45, box.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (e.elite && e.alive) {
        ctx.strokeStyle = `rgba(255,225,74,${0.5 + 0.3 * Math.sin(t * 5)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 8 * sc, 8, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (this.focusTarget === e) {
        const top = y - (spr.box.maxY + 1 - spr.box.minY) * sc - 12 + Math.sin(t * 8) * 2;
        ctx.fillStyle = '#ffe14a';
        ctx.beginPath(); ctx.moveTo(x - 6, top - 7); ctx.lineTo(x + 6, top - 7); ctx.lineTo(x, top); ctx.fill();
      }
    }

    const p = this.player;
    let px = p.pos.x;
    if (p.anim.shake > 0) px += Math.sin(p.anim.shake * 60) * 3;
    if (p.anim.lunge > 0) px += Math.sin((0.3 - p.anim.lunge) / 0.3 * Math.PI) * 20;
    if (p.alive || p.anim.alpha > 0) {
      const look = Run.look(this.run);
      drawTocopoFX(ctx, look, px, p.pos.y, 4, t, false);
      const base = this.sprite(p, frame);
      const spr = p.anim.flash > 0 && Math.floor(p.anim.flash * 30) % 2 === 0 ? Sprites.white(base) : base;
      Sprites.draw(ctx, spr, px, p.pos.y, 4, { alpha: p.anim.alpha });
      if (p.guard) {
        ctx.strokeStyle = 'rgba(243,223,160,0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, p.pos.y - 32, 40, -0.9, 0.9); ctx.stroke();
      }
    }

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const f of this.fx) {
      const yy = f.y - f.t * 24;
      ctx.globalAlpha = Math.min(1, 1.6 - f.t * 1.4);
      ctx.fillStyle = '#141018';
      ctx.fillText(f.text, f.x + 1, yy + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, yy);
    }
    ctx.globalAlpha = 1;
    if (this.flashScreen > 0) {
      ctx.fillStyle = `rgba(255,255,230,${this.flashScreen * 2})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}

const STATUS = {
  veneno:     { name: 'Veneno',      short: 'VEN', color: '#8fd16a' },
  aturdido:   { name: 'Aturdido',    short: 'ATU', color: '#ffe14a' },
  cegado:     { name: 'Cegado',      short: 'CEG', color: '#9a8f88' },
  intimidado: { name: 'Intimidado',  short: 'INT', color: '#ffb03a' },
  corazaRota: { name: 'Coraza rota', short: 'COR', color: '#ff6b3a' },
  muralla:    { name: 'Muralla',     short: '+DEF', color: '#f3dfa0' },
};
