'use strict';
// =====================================================================
// Enemigos y jefes (Guía v0.2, sección 11). Estadísticas en la fila 1
// de su región; suben CONFIG.ROW_SCALE por cada fila avanzada.
// =====================================================================

// Rasgos extra de los élites (la guía no los define: propuesta para balancear)
const ELITE_TRAITS = {
  double: { name: 'Doble golpe', desc: 'Da un segundo golpe a media potencia', pot: 0.5 },
  dodge:  { name: 'Escurridizo', desc: '+20% de esquiva' },
  regen:  { name: 'Regeneración', desc: 'Recupera 4% de su vida al inicio de su turno', pct: 0.04 },
  venom:  { name: 'Venenoso', desc: 'Todos sus golpes envenenan (3 por turno)' },
  enrage: { name: 'Furia', desc: '+30% ATQ con menos de la mitad de vida' },
  thorns: { name: 'Púas', desc: 'Quien lo golpea recibe 3 de daño' },
};

const ENEMIES = {
  raptorcito:  { name: 'Raptorcito', vid: 16, atq: 6, def: 2, vel: 7, xp: 6, conchas: 5, first: true, elite: 'double', trait: 'Suele actuar primero',
                 sprite: 'raptor', pal: { a: '#e3c15b', b: '#6b4a2b', c: '#f3dfa0', k: '#141018', w: '#ffffff', m: '#3a2f2a', e: '#a0703e' } },
  libelula:    { name: 'Libélula Gigante', vid: 12, atq: 5, def: 1, vel: 9, xp: 5, conchas: 4, dodge: 15, elite: 'dodge', trait: '15% de esquiva',
                 sprite: 'bug', pal: { a: '#4f9a3e', b: '#d6f0ff', c: '#1f4a2a', k: '#141018' } },
  planta:      { name: 'Planta Mordedora', vid: 22, atq: 5, def: 4, vel: 2, xp: 7, conchas: 6, elite: 'regen', trait: 'Mucha vida',
                 sprite: 'plant', pal: { a: '#c0392b', b: '#2e6b2a', c: '#7a1f16', d: '#4f9a3e', e: '#6b4a2b', k: '#ffe14a', w: '#ffffff' } },
  sapo:        { name: 'Sapo Ácido', vid: 30, atq: 8, def: 4, vel: 5, xp: 12, conchas: 8, ai: 'sapo', elite: 'venom', trait: 'Escupe veneno',
                 sprite: 'toad', pal: { a: '#8fd16a', b: '#2e6b2a', c: '#d4f0a8', k: '#141018', m: '#3a2f2a', e: '#ffe14a' } },
  cocodrilo:   { name: 'Cocodrilo Ancestral', vid: 42, atq: 10, def: 7, vel: 3, xp: 15, conchas: 10, ai: 'cocodrilo', elite: 'enrage', trait: 'Mordida fuerte cada 3 turnos',
                 sprite: 'lizard', pal: { a: '#5e6b44', b: '#2a3d24', c: '#f3dfa0', k: '#ffe14a', w: '#ffffff', m: '#141018', e: '#2a3d24' } },
  mosquito:    { name: 'Mosquito Gigante', vid: 22, atq: 7, def: 2, vel: 10, xp: 10, conchas: 7, ai: 'mosquito', elite: 'double', trait: 'Roba 3 de vida por golpe',
                 sprite: 'bug', pal: { a: '#6b4a2b', b: '#d6f0ff', c: '#c0392b', k: '#c0392b' } },
  pterosaurio: { name: 'Pterosaurio Ígneo', vid: 44, atq: 13, def: 6, vel: 11, xp: 20, conchas: 13, ai: 'pterosaurio', elite: 'double', trait: 'Ataque de fuego en picada',
                 sprite: 'ptero', pal: { a: '#ff6b3a', b: '#c0392b', c: '#ffe14a', k: '#141018', d: '#3a2f2a', e: '#ffb03a' } },
  salamandra:  { name: 'Salamandra de Lava', vid: 52, atq: 12, def: 10, vel: 5, xp: 22, conchas: 14, ai: 'salamandra', elite: 'thorns', trait: 'Quema: veneno de 4',
                 sprite: 'lizard', pal: { a: '#ff6b3a', b: '#7a1f16', c: '#ffe14a', k: '#141018', w: '#ffffff', m: '#3a2f2a', e: '#ffb03a' } },
  raptorCorr:  { name: 'Raptor Corrompido', vid: 48, atq: 15, def: 6, vel: 10, xp: 25, conchas: 15, corrupt: true, elite: 'enrage', trait: 'Corrompido',
                 sprite: 'raptor', pal: { a: '#7b4bc4', b: '#3b2257', c: '#c46bff', k: '#ff6b3a', w: '#ffffff', m: '#141018', e: '#7ff3ff' } },
  mamut:       { name: 'Mamut Bebé', vid: 70, atq: 14, def: 12, vel: 4, xp: 28, conchas: 18, ai: 'mamut', elite: 'regen', trait: 'Embiste y aturde',
                 sprite: 'quad', pal: { a: '#a0703e', b: '#6b4a2b', c: '#fff6e0', k: '#141018' } },
  lobo:        { name: 'Lobo de Escarcha', vid: 55, atq: 16, def: 8, vel: 12, xp: 28, conchas: 18, pair: true, elite: 'enrage', trait: 'Aparece en pareja',
                 sprite: 'wolf', pal: { a: '#d6f0ff', b: '#7fc4f0', c: '#ffffff', k: '#1f3a5a', w: '#ffffff' } },
  alfa:        { name: 'Alfa Corrompido', vid: 80, atq: 20, def: 12, vel: 10, xp: 40, conchas: 25, corrupt: true, ai: 'alfa', elite: 'thorns', trait: 'Corrompido, se cura al 30%',
                 sprite: 'trex', pal: { a: '#7b4bc4', b: '#3b2257', c: '#c46bff', k: '#ff6b3a', w: '#ffffff', m: '#141018' } },
};

// XP y conchas de los jefes: la guía no los define (propuesta para balancear)
const BOSSES = {
  granRaptor: { name: 'Gran Raptor Rojo', vid: 95, atq: 10, def: 5, vel: 9, xp: 40, conchas: 35, ai: 'granRaptor',
                mech: 'Llama a un Raptorcito a la mitad de su vida',
                sprite: 'raptor', pal: { a: '#c0392b', b: '#7a1f16', c: '#f3dfa0', k: '#141018', w: '#ffffff', m: '#3a2f2a', e: '#ff6b3a' } },
  reina:      { name: 'Reina del Fango', vid: 190, atq: 14, def: 9, vel: 4, xp: 90, conchas: 55, ai: 'reina',
                mech: 'Envenena cada turno: hay que curarse o atacar rápido',
                sprite: 'blob', pal: { a: '#6b4a2b', b: '#3a2f2a', c: '#ffe14a', k: '#8fd16a', m: '#141018', e: '#8a9a52' } },
  coloso:     { name: 'Coloso de Magma', vid: 310, atq: 20, def: 16, vel: 5, xp: 160, conchas: 80, ai: 'coloso',
                mech: 'Coraza alta: las habilidades que rompen o ignoran DEF son clave',
                sprite: 'golem', pal: { a: '#5a4a42', b: '#2a211e', c: '#ff6b3a', k: '#ffe14a' } },
  bestia:     { name: 'Bestia de Escarcha', vid: 280, atq: 22, def: 12, vel: 12, xp: 170, conchas: 85, ai: 'bestia', reward: 'pelaje',
                mech: 'Congela: aturde cada 4 turnos. Da Pelaje Glaciar',
                sprite: 'wolf', pal: { a: '#ffffff', b: '#7fc4f0', c: '#d6f0ff', k: '#1f3a5a', w: '#ffffff' } },
  rey:        { name: 'Rey Tirano Cristalizado', vid: 520, atq: 26, def: 15, vel: 10, xp: 0, conchas: 0, ai: 'rey', crystals: true, final: true,
                mech: 'Tres fases; en la última se vuelve Corrompido',
                sprite: 'trex', pal: { a: '#7a1f16', b: '#3a2f2a', c: '#a0703e', k: '#ffe14a', w: '#ffffff', m: '#141018' } },
};
