'use strict';
// =====================================================================
// Nodos y acciones. Al entrar a un nodo se arma una cola de acciones
// que se guarda; cada acción terminada se guarda otra vez. Una recarga
// retoma la acción pendiente con la misma semilla.
// =====================================================================

const R = () => Game.run;
const regionId = () => Run.region(R());
const rngFor = (...parts) => RNG.for(R(), regionId(), ...parts);

// Marca una acción como resuelta (y guarda) antes de mostrar su resultado
function commit(a, follow) {
  a.resolved = { follow: follow || [] };
  Run.save(R());
  return a.resolved.follow;
}

async function processQueue() {
  const run = R();
  while (run.queue.length && Game.run === run) {
    const a = run.queue[0];
    let follow;
    if (a.resolved) follow = a.resolved.follow;
    else {
      const fn = Actions[a.t];
      follow = fn ? (await fn(a)) || [] : [];
    }
    if (Game.run !== run) return;   // murió o salió al título
    run.queue.shift();
    run.queue.unshift(...follow);
    Run.save(run);
    updateHUD(true);
  }
}

async function enterNode(node) {
  const run = R();
  run.pos = node.id;
  run.visited.push(node.id);
  run.nodes++;
  const q = [];
  if (run.pendingItem) q.push({ t: 'pendingItem' });
  q.push({ t: node.type, key: node.id });
  run.queue = q;
  Run.save(run); // guardado al entrar al nodo
  Sound.sfx('door');
  await processQueue();
}

// ---------------------------------------------------------------------
// Combates
// ---------------------------------------------------------------------
function rollEnemies(key, elite) {
  const run = R(), reg = REGIONS[regionId()];
  const rng = rngFor(key, 'enemigos');
  const node = Game.map.nodes[run.pos];
  const row = node && node.row >= 0 ? node.row : 0;
  const pick = rng.weighted(reg.enemies);
  const corrupt = !!reg.corruptFrom && row >= reg.corruptFrom && rng.chance(0.25);
  const list = [{ id: pick.id, elite, corrupt }];
  if (ENEMIES[pick.id].pair && !elite) list.push({ id: pick.id });
  return { list, row };
}

async function fight(list, opts, key) {
  const run = R();
  const rng = rngFor(key, 'combate');
  Sound.sfx('encounter');
  Sound.play(opts.kind === 'boss' ? 'boss' : 'battle');
  for (let i = 0; i < 2; i++) { await UI.fade(true, 90); await UI.fade(false, 90); }
  await UI.fade(true, 200);
  Game.battle = new Battle(run, list, Object.assign({ rng, region: regionId() }, opts));
  Game.scene = 'battle';
  await UI.fade(false, 250);
  const res = await Game.battle.run_();
  const itemsUsed = Game.battle.itemsUsed;
  await UI.fade(true, 300);
  Game.battle = null;
  Game.scene = 'map';
  if (res === 'lose') { await death(); return { res }; }
  $('hud').classList.remove('hidden');
  Sound.play(REGIONS[regionId()].music);
  await UI.fade(false, 300);
  return { res, itemsUsed };
}

const Actions = {
  async combat(a) {
    const { list, row } = rollEnemies(a.key, false);
    const { res } = await fight(list, { kind: 'combat', row }, a.key);
    if (res === 'lose') return [];
    if (res === 'flee') return commit(a, []);
    return commit(a, [{ t: 'offer', kind: 'combat', key: a.key }]);
  },

  async elite(a) {
    const { list, row } = rollEnemies(a.key, true);
    const { res } = await fight(list, { kind: 'elite', row }, a.key);
    if (res !== 'win') return [];
    R().elites++;
    return commit(a, [{ t: 'offer', kind: 'elite', key: a.key }]);
  },

  async boss(a) {
    const run = R();
    const id = REGIONS[regionId()].boss;
    const b = BOSSES[id];
    Sound.sfx('roar');
    await UI.say('Ptera', BOSS_ANNOUNCE[id]);
    const { res, itemsUsed } = await fight([{ id, boss: true }], { kind: 'boss', row: 9, intro: `¡${b.name} te desafía!` }, a.key);
    if (res !== 'win') return [];
    run.bosses++;
    if (id === 'reina' && itemsUsed === 0) run.glacierUnlocked = true;
    // Vencer a un jefe cura por completo
    const s = Run.stats(run);
    run.hp = s.vid; run.ene = s.ene;
    if (b.final) return commit(a, [{ t: 'victory' }]);
    const follow = [{ t: 'healMsg' }, { t: 'fragment' }];
    if (b.reward === 'pelaje') follow.push({ t: 'pelaje' });
    follow.push({ t: 'offer', kind: 'boss', key: a.key }, { t: 'nextRegion' });
    return commit(a, follow);
  },

  async healMsg() {
    Sound.sfx('heal');
    await UI.say('', 'Vencer al jefe cura a Tocopo por completo: VID y ENE al máximo.');
  },

  async fragment() {
    Sound.sfx('chest');
    await UI.say('', '¡El jefe dejó un Fragmento de Meteoro! +1 permanente a una estadística (solo en esta expedición).');
    await chooseFragment();
  },

  async pelaje() {
    R().pelaje = true;
    Log.mark('mutations', 'pelaje');
    Sound.sfx('mutate');
    await UI.say('', '¡Mutación secreta! Tocopo obtuvo el Pelaje Glaciar: +10 VID, +2 DEF e inmunidad al veneno. No ocupa espacio.');
  },

  async nextRegion(a) {
    const run = R();
    const done = regionId();
    if (done === 'pantano' && run.glacierUnlocked) {
      const go = await UI.confirm(GLACIER_OFFER, 'Ir al Glaciar', 'Ir al Volcán');
      run.route[2] = go ? 'glaciar' : 'volcan';
    }
    // el cambio de región y la marca de resuelto se guardan juntos
    run.regionIdx++;
    run.pos = 'start';
    run.visited = [];
    run.revealed = [];
    commit(a, []);
    await UI.fade(true, 500);
    loadRegion();
    Run.save(run);
    await UI.fade(false, 500);
    await regionIntro();
    return [];
  },

  async nest(a) {
    Sound.sfx('crystal');
    await UI.say('', 'Un Nido de Cristal. Los cristales vibran al sentir a Tocopo... Aquí puedes elegir una mutación sin pelear.');
    return commit(a, [{ t: 'offer', kind: 'nest', key: a.key }]);
  },

  async offer(a) {
    const follow = await offerPanel(a);
    return commit(a, follow || []);
  },

  async event(a) { return eventNode(a); },
  async shop(a) { await shopNode(a); return commit(a, []); },
  async rest(a) { await restNode(a); return commit(a, []); },

  async gainItem(a) { await gainItem(a.id); return commit(a, []); },

  async pendingItem(a) {
    const run = R();
    const id = run.pendingItem;
    run.pendingItem = null;
    if (!id) return [];
    await UI.say('', '¡El raptor que ayudaste te alcanza y deja una Baya Roja a tus pies!');
    await gainItem(id);
    return commit(a, []);
  },

  async victory() { await victoryEnd(); return []; },
};

// ---------------------------------------------------------------------
// Objetos: si el inventario está lleno, se elige qué soltar
// ---------------------------------------------------------------------
async function gainItem(id) {
  const run = R();
  const r = Run.addItem(run, id);
  if (r === 'ok') { Sound.sfx('chest'); UI.toast(`Obtuviste: ${ITEMS[id].name}`); return true; }
  if (r === 'max') { await UI.say('', `Ya llevas un ${ITEMS[id].name}: solo se puede llevar uno.`); return false; }
  const items = run.inv.map((x, i) => ({ label: `Soltar ${ITEMS[x].name}`, value: i, desc: ITEMS[x].desc }));
  items.push({ label: `Dejar ${ITEMS[id].name}`, value: -1, desc: ITEMS[id].desc });
  const v = await UI.menu({ title: `Inventario lleno (${CONFIG.INVENTORY_SLOTS} espacios). Para tomar ${ITEMS[id].name}...`, items, cls: 'wide' });
  if (v == null || v < 0) return false;
  run.inv.splice(v, 1, id);
  Sound.sfx('chest');
  return true;
}

async function chooseFragment() {
  const run = R();
  const v = await UI.menu({
    title: 'Fragmento de Meteoro: +1 a...', cancel: false,
    items: ['vid', 'ene', 'atq', 'def', 'vel', 'ins'].map(k => ({ label: STAT_LONG[k], right: k === 'ins' ? '+1%' : '+1', value: k })),
  });
  run.frags[v]++;
  if (v === 'vid') run.hp++;
  if (v === 'ene') run.ene++;
  Sound.sfx('mutate');
  UI.toast(`${STAT_LONG[v]} +1`);
}

// ---------------------------------------------------------------------
// Mutaciones: oferta de 3 (o 1 en eventos), reemplazo si no hay espacio
// ---------------------------------------------------------------------
function mutCardHTML(id, run) {
  const d = mutDef(id);
  const rar = RARITY[d.rarity];
  const br = BRANCHES.find(b => b.id === d.branch);
  const sk = d.skill ? SKILLS[d.skill] : null;
  // ¿activa una sinergia nueva?
  const before = Run.synergies(run);
  const test = Object.assign({}, run, { muts: run.muts.concat([{ id }]) });
  const gained = Run.synergies(test).filter(s => !before.includes(s));
  let body = '';
  if (d.unstable) {
    body = `<div class="pro">▲ ${esc(d.pro)}</div><div class="con">▼ ${esc(d.con)}</div>`;
  } else {
    body = `<div>${esc(fmtStats(d.stats))}</div>` +
      (sk ? `<div><b>${esc(sk.name)}</b>: ${esc(sk.desc)} (${sk.ene} ENE)</div>` : '') +
      (d.passive && d.passive !== 'Pasiva' ? `<div>${esc(d.passive)}</div>` : '') +
      `<div class="dim">${esc(d.visual)}</div>`;
  }
  return `<div class="rar" style="color:${rar.color}">${rar.name}</div>
    <canvas width="64" height="64"></canvas>
    <div class="mname">${esc(d.name)}</div>
    <div class="mbranch" style="color:${br ? br.color : rar.color}">${esc(br ? br.name : 'Inestable')}</div>
    <div class="mbody">${body}</div>
    ${gained.length ? `<div class="syn">¡Activa ${gained.map(s => esc(SYNERGIES[s].name)).join(' y ')}!</div>` : ''}`;
}

function previewLook(run, id) {
  return Run.look(Object.assign({}, run, { muts: run.muts.concat([{ id }]) }));
}

async function acquireMutation(id) {
  const run = R();
  const d = mutDef(id);
  if (run.muts.length < Run.slots(run)) {
    Run.addMutation(run, id);
  } else {
    const v = await UI.menu({
      title: `Espacios llenos (${Run.slots(run)}). ¿Qué mutación reemplaza ${d.name}?`, cls: 'wide',
      items: run.muts.map((m, i) => {
        const md = mutDef(m.id);
        return { label: md.name + (m.boost ? ' ★' : ''), right: RARITY[md.rarity].name, value: i, desc: md.unstable ? `${md.pro} / ${md.con}` : fmtStats(md.stats) };
      }).concat([{ label: 'Cancelar', value: -1 }]),
    });
    if (v == null || v < 0) return false;
    Run.addMutation(run, id, v);
  }
  Sound.sfx('mutate');
  UI.toast(`¡Tocopo absorbe ${d.name}!`);
  if (id === 'escamas') revealWithEscamas();
  updateHUD(true);
  return true;
}

// kind: combat | elite | nest | boss | single | unstable
function offerPanel(a) {
  const run = R();
  return new Promise(resolve => {
    a.rerolls = a.rerolls || 0;
    let ids;
    const roll = () => {
      const rng = rngFor(a.key || 'x', 'oferta', a.kind, a.rerolls);
      if (a.kind === 'single') ids = [Run.pickMutation(rng, run, a.rarity || 2)].filter(Boolean);
      else if (a.kind === 'unstable') ids = [Run.pickUnstable(rng, run)].filter(Boolean);
      else ids = Run.makeOffer(rng, run, a.kind);
      ids.forEach(id => Log.mark('mutations', id));
    };
    roll();
    const gift = a.kind === 'single' || a.kind === 'unstable';
    const canReroll = a.kind === 'nest';
    let focus = 0, busy = false;
    const box = document.createElement('div');
    box.className = 'box panel offer';
    $('menu-layer').appendChild(box);

    const buttons = () => {
      const b = [{ id: 'skip', label: gift ? 'Rechazar' : `Saltar (+${CONFIG.SKIP_ADN} ADN)` }];
      if (canReroll) b.push({ id: 'reroll', label: `Volver a tirar (${CONFIG.REROLL_COST} ADN)`, disabled: run.adn < CONFIG.REROLL_COST });
      return b;
    };
    const render = () => {
      const btns = buttons();
      const title = gift ? (a.kind === 'unstable' ? 'Mutación inestable' : 'Una mutación te espera') : a.kind === 'nest' ? 'Nido de Cristal: elige 1 mutación' : a.kind === 'elite' ? 'Oferta de élite: elige 1 mutación' : 'Elige 1 mutación';
      box.innerHTML = `<div class="offer-head"><span class="panel-title">${title}</span>
        <span>Espacios ${run.muts.length}/${Run.slots(run)} · ADN ${run.adn}</span></div>
        <div class="cards">${ids.map((id, i) => `<div class="card-m${focus === i ? ' focus' : ''}" data-i="${i}" style="--rc:${RARITY[mutDef(id).rarity].color}">${mutCardHTML(id, run)}</div>`).join('') || '<div class="dim">No quedan mutaciones disponibles.</div>'}</div>
        <div class="offer-btns">${btns.map((b, j) => `<div class="btn${focus === ids.length + j ? ' focus' : ''}${b.disabled ? ' disabled' : ''}" data-i="${ids.length + j}">${esc(b.label)}</div>`).join('')}</div>
        <div class="panel-foot">←/→ elegir · Z/Enter confirmar</div>`;
      box.querySelectorAll('.card-m canvas').forEach((cv, i) => UI.drawLook(cv, previewLook(run, ids[i]), 4));
      box.querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => { focus = +el.dataset.i; act(); }));
    };
    const close = follow => { UI.popInput(handler); box.remove(); resolve(follow); };
    const act = async () => {
      if (busy) return;
      const btns = buttons();
      if (focus < ids.length) {
        busy = true;
        box.classList.add('dimmed');
        const ok = await acquireMutation(ids[focus]);
        box.classList.remove('dimmed');
        busy = false;
        if (ok) return close([]);
        return render();
      }
      const b = btns[focus - ids.length];
      if (b.id === 'skip') {
        if (!gift) { run.adn += CONFIG.SKIP_ADN; UI.toast(`+${CONFIG.SKIP_ADN} ADN`); }
        Sound.sfx('select');
        return close([]);
      }
      if (b.id === 'reroll') {
        if (b.disabled) { Sound.sfx('error'); return; }
        run.adn -= CONFIG.REROLL_COST;
        a.rerolls++;
        Run.save(run);
        Sound.sfx('crystal');
        roll();
        focus = 0;
        render();
      }
    };
    const handler = k => {
      if (busy) return;
      const n = ids.length + buttons().length;
      if (k === 'left' || k === 'up') { focus = (focus - 1 + n) % n; Sound.sfx('move'); render(); }
      else if (k === 'right' || k === 'down') { focus = (focus + 1) % n; Sound.sfx('move'); render(); }
      else if (k === 'ok') act();
    };
    UI.pushInput(handler);
    if (!ids.length) focus = 0;
    render();
  });
}

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------
async function eventNode(a) {
  const run = R();
  run.seenEvents = run.seenEvents || [];
  const rng = rngFor(a.key, 'evento');
  let pool = Object.keys(EVENTS).filter(id => !run.seenEvents.includes(id));
  if (!pool.length) { run.seenEvents = []; pool = Object.keys(EVENTS); }
  const id = a.eventId || rng.pick(pool);
  a.eventId = id;
  const ev = EVENTS[id];
  Log.mark('events', id);
  Sound.sfx('select');
  const choice = await UI.menu({
    title: ev.title, text: (ev.speaker ? `${ev.speaker}: ` : '') + ev.text, cancel: false, cls: 'event',
    items: ev.options.map((o, i) => {
      const lacks = o.requires && o.requires.conchas && run.conchas < o.requires.conchas;
      return { label: o.label, value: i, disabled: !!lacks, desc: lacks ? `Necesitas ${o.requires.conchas} conchas.` : '' };
    }),
  });
  const opt = ev.options[choice];
  const orng = rngFor(a.key, 'resultado', choice);
  const out = orng.weighted(opt.outcomes.map(o => ({ o, w: o.chance }))).o;
  run.seenEvents.push(id);
  const follow = applyEffects(out.effects, a.key);
  commit(a, follow);
  await UI.say(ev.speaker || '', out.text);
  return follow;
}

function applyEffects(effects, key) {
  const run = R();
  const follow = [];
  for (const e of effects) {
    if (e.hp) { run.hp = Math.max(1, Math.min(Run.stats(run).vid, run.hp + e.hp)); }
    if (e.adn) run.adn = Math.max(0, run.adn + e.adn);
    if (e.conchas) run.conchas = Math.max(0, run.conchas + e.conchas);
    if (e.poisonNext) run.poisonNext = Math.max(run.poisonNext || 0, e.poisonNext);
    if (e.pendingItem) run.pendingItem = e.pendingItem;
    if (e.pipDiscount) run.pipDiscount = true;
    if (e.revealAll) NodeMap.revealAll(run, Game.map);
    if (e.item) follow.push({ t: 'gainItem', id: e.item });
    if (e.mutation) follow.push({ t: 'offer', kind: 'single', rarity: e.mutation, key: key + 'm' });
    if (e.unstable) follow.push({ t: 'offer', kind: 'unstable', key: key + 'u' });
    if (e.combat) follow.push({ t: e.combat === 'elite' ? 'elite' : 'combat', key: key + 'c' });
  }
  updateHUD(true);
  return follow;
}

// ---------------------------------------------------------------------
// Tienda de Pip: 4 objetos al azar y 1 mutación por 60 conchas
// ---------------------------------------------------------------------
async function shopNode(a) {
  const run = R();
  const rng = rngFor(a.key, 'tienda');
  const stock = [];
  for (let i = 0; i < CONFIG.SHOP_ITEMS; i++) stock.push(rng.pick(SHOP_POOL));
  const mut = Run.pickMutation(rng, run, Run.rollRarity(rng, regionId()));
  const st = run.shops[a.key] || (run.shops[a.key] = { bought: [], discount: !!run.pipDiscount });
  run.pipDiscount = false;
  Run.save(run);
  const price = p => Math.round(st.discount ? p * CONFIG.PIP_DISCOUNT : p);
  await UI.say('Pip', st.discount ? '¡Tocopo! Gracias por escoltarme. Todo a mitad de precio, ¡como prometí!' : rng.pick(PIP_GREET));
  let start = 0;
  while (true) {
    const items = stock.map((id, i) => {
      const sold = st.bought.includes(i);
      const it = ITEMS[id];
      const can = Run.canAdd(run, id);
      const why = sold ? '' : run.conchas < price(it.price) ? ' (faltan conchas)' : can === 'max' ? ' (solo 1)' : can === 'full' ? ' (inventario lleno)' : '';
      return { label: sold ? `${it.name} — vendido` : it.name, right: sold ? '' : `${price(it.price)}`, value: 'i' + i, disabled: sold || run.conchas < price(it.price) || can !== 'ok', desc: it.desc + why };
    });
    if (mut) {
      const d = MUTATIONS[mut], sold = st.bought.includes('m');
      items.push({ label: sold ? `${d.name} — vendida` : `Mutación: ${d.name}`, right: sold ? '' : `${price(CONFIG.SHOP_MUT_PRICE)}`, value: 'm', color: RARITY[d.rarity].color,
        disabled: sold || run.conchas < price(CONFIG.SHOP_MUT_PRICE), desc: `${RARITY[d.rarity].name} · ${fmtStats(d.stats)}${d.skill ? ' · ' + SKILLS[d.skill].name : ''}` });
    }
    items.push({ label: 'Salir', value: 'exit', desc: '¡Vuelve pronto!' });
    const v = await UI.menu({ title: `Tienda de Pip · Conchas: ${run.conchas} · Inventario ${run.inv.length}/${CONFIG.INVENTORY_SLOTS}${st.discount ? ' · ¡50% de descuento!' : ''}`, items, start, cls: 'shop' });
    if (!v || v === 'exit') break;
    start = items.findIndex(i => i.value === v);
    if (v === 'm') {
      if (await acquireMutation(mut)) {
        run.conchas -= price(CONFIG.SHOP_MUT_PRICE);
        st.bought.push('m');
        Sound.sfx('buy');
      }
    } else {
      const i = +v.slice(1);
      const id = stock[i];
      run.conchas -= price(ITEMS[id].price);
      Run.addItem(run, id);
      st.bought.push(i);
      Sound.sfx('buy');
      UI.toast(`Compraste: ${ITEMS[id].name}`);
    }
    Run.save(run);
    updateHUD(true);
  }
}

// ---------------------------------------------------------------------
// Descanso: curar 40% de vida y toda la energía, o potenciar
// ---------------------------------------------------------------------
async function restNode(a) {
  const run = R();
  const rng = rngFor(a.key, 'descanso');
  await UI.say('Abuela Bracca', rng.pick(BRACCA_REST));
  const s = Run.stats(run);
  const noHeal = Run.hasFx(run, 'noRestHeal');
  const healAmt = Math.min(s.vid - run.hp, Math.round(s.vid * CONFIG.REST_HEAL));
  const boostable = run.muts.map((m, i) => ({ m, i })).filter(({ m }) => !m.boost && Object.values(mutDef(m.id).stats).some(v => v > 0));
  while (true) {
    const v = await UI.menu({
      title: `Descanso · VID ${run.hp}/${s.vid} · ENE ${run.ene}/${s.ene}`, cancel: false,
      items: [
        { label: noHeal ? 'Recuperar energía' : 'Curar', value: 'heal', desc: noHeal ? 'El Corazón Corrompido no deja curarte aquí. Recuperas toda la ENE.' : `Recuperas ${healAmt} VID (40%) y toda la ENE.` },
        { label: 'Potenciar una mutación', value: 'boost', disabled: !boostable.length, desc: boostable.length ? 'Los bonos de estadísticas de una mutación suben 50%.' : 'No hay mutaciones para potenciar.' },
      ],
    });
    if (v === 'heal') {
      if (!noHeal) run.hp += healAmt;
      run.ene = s.ene;
      Run.save(run);
      Sound.sfx('heal');
      await UI.say('Abuela Bracca', noHeal ? 'Ese cristal oscuro en tu pecho... no deja que tus heridas cierren. Al menos descansa.' : 'Listo, pequeño. Ya te ves mejor.');
      return;
    }
    const pick = await UI.menu({
      title: 'Potenciar: +50% a sus bonos de estadísticas', cls: 'wide',
      items: boostable.map(({ m, i }) => {
        const d = mutDef(m.id);
        const boosted = {};
        for (const k in d.stats) boosted[k] = d.stats[k] > 0 ? Math.round(d.stats[k] * (1 + CONFIG.BOOST)) : d.stats[k];
        return { label: d.name, value: i, desc: `${fmtStats(d.stats)}  →  ${fmtStats(boosted)}` };
      }).concat([{ label: 'Volver', value: -1 }]),
    });
    if (pick == null || pick < 0) continue;
    run.muts[pick].boost = true;
    Run.clampVitals(run);
    Run.save(run);
    Sound.sfx('mutate');
    await UI.say('Abuela Bracca', `¡Mira cómo brilla tu ${mutDef(run.muts[pick].id).name}! Más fuerte que nunca.`);
    return;
  }
}

// ---------------------------------------------------------------------
// Bioluminiscencia: Escamas Brillantes revela un nodo oculto por región
// ---------------------------------------------------------------------
function revealWithEscamas() {
  const n = NodeMap.useEscamas(R(), Game.map);
  if (n) UI.toast(`Escamas Brillantes revela un nodo: ${NODE_INFO[n.type].name} (fila ${n.row + 1}).`, 3500);
}
