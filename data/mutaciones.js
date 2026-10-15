'use strict';
// =====================================================================
// Mutaciones, habilidades y sinergias (Guía v0.2, secciones 5 a 7).
// rarity: 1 = común, 2 = rara, 3 = legendaria.
// =====================================================================

const RARITY = {
  1: { name: 'Común', color: '#9a8f88' },
  2: { name: 'Rara', color: '#3a8fd6' },
  3: { name: 'Legendaria', color: '#ffb03a' },
  4: { name: 'Inestable', color: '#c46bff' },
};

// El orden de las ramas es el orden de las capas del sprite de Tocopo
const BRANCHES = [
  { id: 'coraza',    name: 'Coraza Ósea',        color: '#8a6e55', desc: 'Resistencia. Aguanta golpes y gana por desgaste.' },
  { id: 'plumas',    name: 'Plumas',             color: '#3f86b8', desc: 'Velocidad y esquiva.' },
  { id: 'glandulas', name: 'Glándulas Tóxicas',  color: '#6b9a2a', desc: 'Daño en el tiempo.' },
  { id: 'garras',    name: 'Garras y Colmillos', color: '#c0412f', desc: 'Daño directo. Para terminar las peleas rápido.' },
  { id: 'cresta',    name: 'Cresta Resonante',   color: '#8e4fa8', desc: 'Apoyo: debilita, aturde y cura.' },
  { id: 'bio',       name: 'Bioluminiscencia',   color: '#d98a1c', desc: 'Utilidad y poder del cristal.' },
];

const MUTATIONS = {
  colmillos: { branch: 'garras', rarity: 1, name: 'Colmillos Afilados', stats: { atq: 3 }, skill: 'mordida', visual: 'Dientes visibles' },
  garrasHoz: { branch: 'garras', rarity: 2, name: 'Garras de Hoz', stats: { atq: 4, ins: 3 }, skill: 'zarpazo', visual: 'Garras curvas' },
  mandibula: { branch: 'garras', rarity: 3, name: 'Mandíbula Titánica', stats: { atq: 6 }, skill: 'triturar', visual: 'Cabeza más grande' },

  placas: { branch: 'coraza', rarity: 1, name: 'Placas Dorsales', stats: { def: 3, vid: 8 }, passive: 'Pasiva', visual: 'Placas en la espalda' },
  escudo: { branch: 'coraza', rarity: 2, name: 'Escudo Óseo', stats: { def: 5 }, skill: 'atrincherarse', visual: 'Frente ósea' },
  mazo:   { branch: 'coraza', rarity: 3, name: 'Cola de Mazo', stats: { def: 4, vid: 15 }, skill: 'coletazo', visual: 'Mazo en la cola' },

  plumon:   { branch: 'plumas', rarity: 1, name: 'Plumón Ligero', stats: { vel: 2, esq: 5 }, passive: 'Pasiva', visual: 'Plumitas en la cabeza' },
  alas:     { branch: 'plumas', rarity: 2, name: 'Alas de Planeo', stats: { vel: 3 }, skill: 'picada', visual: 'Plumas en los brazos' },
  tormenta: { branch: 'plumas', rarity: 3, name: 'Plumaje Tormenta', stats: { vel: 4, esq: 10 }, skill: 'torbellino', passive: 'Pasiva: 15% de actuar dos veces', visual: 'Plumaje completo' },

  saliva: { branch: 'glandulas', rarity: 1, name: 'Saliva Ácida', stats: { ene: 2 }, skill: 'escupitajo', visual: 'Gota verde en la boca' },
  piel:   { branch: 'glandulas', rarity: 2, name: 'Piel Venenosa', stats: { def: 2 }, passive: 'Pasiva: quien te golpea tiene 25% de quedar envenenado', visual: 'Manchas verdes' },
  nube:   { branch: 'glandulas', rarity: 3, name: 'Nube Corrosiva', stats: { ene: 4 }, skill: 'nube', visual: 'Aura de humo verde' },

  crestaPeq: { branch: 'cresta', rarity: 1, name: 'Cresta Pequeña', stats: { ene: 3 }, skill: 'rugido', visual: 'Cresta corta' },
  crestaEco: { branch: 'cresta', rarity: 2, name: 'Cresta Eco', stats: { ene: 4 }, skill: 'grito', visual: 'Cresta alta' },
  coro:      { branch: 'cresta', rarity: 3, name: 'Coro Ancestral', stats: { ene: 5, vid: 10 }, skill: 'canto', visual: 'Cresta con anillos' },

  escamas:  { branch: 'bio', rarity: 1, name: 'Escamas Brillantes', stats: { ins: 5 }, passive: 'Pasiva: revela un nodo oculto por región', visual: 'Puntos que brillan' },
  destello: { branch: 'bio', rarity: 2, name: 'Destello', stats: { vel: 2 }, skill: 'destello', visual: 'Ojos luminosos' },
  nucleo:   { branch: 'bio', rarity: 3, name: 'Núcleo de Cristal', stats: { atq: 3, def: 3, ins: 10 }, skill: 'rayo', visual: 'Cristal en el pecho' },
};

// Mutaciones inestables: solo en eventos y élites, nunca en la oferta normal
const UNSTABLE = {
  sangre:   { name: 'Sangre Hirviente', stats: { atq: 8 }, effect: 'bleed', pro: '+8 ATQ', con: 'Pierde 2 VID por turno en combate' },
  huesos:   { name: 'Huesos Huecos', stats: { vel: 5, esq: 10, def: -4 }, pro: '+5 VEL, +10% esquiva', con: '−4 DEF' },
  hambre:   { name: 'Hambre Voraz', stats: {}, effect: 'lifesteal', pro: 'Recupera 20% del daño que hace', con: 'Los objetos curan la mitad' },
  cristalD: { name: 'Cristal Desbordado', stats: {}, effect: 'cheapSkills', pro: 'Las habilidades cuestan 1 ENE', con: 'Recibe 10% del daño que hace' },
  ojos:     { name: 'Ojos de Meteoro', stats: { ins: 20 }, effect: 'shaky', pro: '+20% INS', con: '15% de fallar cualquier ataque' },
  corazon:  { name: 'Corazón Corrompido', stats: {}, mult: 0.20, effect: 'noRestHeal', pro: '+20% a todas las estadísticas', con: 'No puede curarse en Descansos' },
};
for (const id in UNSTABLE) Object.assign(UNSTABLE[id], { branch: 'inestable', rarity: 4, unstable: true });

const SECRET_MUTATION = {
  id: 'pelaje', name: 'Pelaje Glaciar', stats: { vid: 10, def: 2 },
  passive: 'Inmunidad al veneno. No ocupa espacio.', visual: 'Pelaje blanco en el lomo',
};

function mutDef(id) { return MUTATIONS[id] || UNSTABLE[id]; }

const SKILLS = {
  mordida:       { name: 'Mordida', ene: 3, kind: 'attack', pot: 1.4, desc: 'Potencia 1,4' },
  zarpazo:       { name: 'Zarpazo Doble', ene: 5, kind: 'attack', pot: 0.8, hits: 2, desc: '2 golpes de potencia 0,8' },
  triturar:      { name: 'Triturar', ene: 9, kind: 'attack', pot: 2.2, pierce: 0.5, desc: 'Potencia 2,2, ignora la mitad de la DEF' },
  atrincherarse: { name: 'Atrincherarse', ene: 3, kind: 'guard', self: true, desc: 'Reduce el daño recibido 60% por 1 turno' },
  coletazo:      { name: 'Coletazo', ene: 7, kind: 'attack', pot: 1.6, stun: 0.30, desc: 'Potencia 1,6 y 30% de aturdir' },
  picada:        { name: 'Picada', ene: 4, kind: 'attack', pot: 1.3, priority: true, desc: 'Siempre actúa primero, potencia 1,3' },
  torbellino:    { name: 'Torbellino', ene: 6, kind: 'attack', pot: 1.2, slow: 3, desc: 'Potencia 1,2 y −3 VEL al rival' },
  escupitajo:    { name: 'Escupitajo', ene: 4, kind: 'attack', pot: 1.0, poison: 3, desc: 'Potencia 1,0 y veneno de 3 por turno' },
  nube:          { name: 'Nube Corrosiva', ene: 8, kind: 'debuff', poison: 5, armor: true, desc: 'Coraza rota y veneno de 5 por turno' },
  rugido:        { name: 'Rugido', ene: 3, kind: 'debuff', intimidate: true, desc: 'El rival queda Intimidado' },
  grito:         { name: 'Grito Sónico', ene: 6, kind: 'attack', pot: 1.3, stun: 0.35, desc: 'Potencia 1,3 y 35% de aturdir' },
  canto:         { name: 'Canto Vital', ene: 10, kind: 'heal', heal: 0.4, self: true, desc: 'Recupera 40% de la vida máxima' },
  destello:      { name: 'Destello', ene: 5, kind: 'debuff', blind: true, desc: 'El rival queda Cegado' },
  rayo:          { name: 'Rayo de Cristal', ene: 10, kind: 'attack', pot: 2.0, crystal: true, desc: 'Potencia 2,0, ×1,5 contra corrompidos' },
};

// Se activan con al menos una mutación de cada rama del par
const SYNERGIES = {
  cazador:  { name: 'Cazador Veloz', branches: ['garras', 'plumas'], desc: '+10% INS; cada crítico da +1 VEL por el resto del combate' },
  espinas:  { name: 'Espinas Tóxicas', branches: ['coraza', 'glandulas'], desc: 'Al recibir un golpe, el rival recibe 2 de daño y 20% de veneno' },
  dardos:   { name: 'Dardos Venenosos', branches: ['plumas', 'glandulas'], desc: 'Picada y Torbellino también envenenan' },
  muralla:  { name: 'Muralla Viviente', branches: ['coraza', 'cresta'], desc: 'Cada curación da +2 DEF por 3 turnos' },
  aurora:   { name: 'Aurora', branches: ['cresta', 'bio'], desc: 'Rugido también ciega con 30% de probabilidad' },
  filo:     { name: 'Filo de Cristal', branches: ['garras', 'bio'], desc: 'El ataque básico hace ×1,3 contra corrompidos' },
};

// Probabilidad de rareza por región: [común, rara, legendaria]
const RARITY_ODDS = {
  valle:   [80, 18, 2],
  pantano: [60, 32, 8],
  volcan:  [40, 42, 18],
  glaciar: [40, 42, 18],
  crater:  [25, 45, 30],
};
