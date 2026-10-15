'use strict';
// =====================================================================
// Regiones (Guía v0.2, sección 10). Cada región usa 4-5 tonos de la
// paleta para sus tiles.
//   tones: [oscuro, medio, claro, muy claro, acento]
// =====================================================================

const REGIONS = {
  valle: {
    name: 'Valle de Helechos', order: 1, music: 'valle', boss: 'granRaptor',
    desc: 'Inicio de la expedición. Enemigos fáciles.',
    enemies: [{ id: 'raptorcito', w: 4 }, { id: 'libelula', w: 3 }, { id: 'planta', w: 3 }],
    tones: ['#1f4a2a', '#2e6b2a', '#4f9a3e', '#8fd16a', '#6b4a2b'],
    deco: 'fern', path: '#a0703e',
    battle: { sky: ['#7fc4f0', '#d6f0ff'], ground: '#4f9a3e', ground2: '#2e6b2a', hill: '#2e6b2a' },
  },
  pantano: {
    name: 'Pantano Brumoso', order: 2, music: 'pantano', boss: 'reina',
    desc: 'Niebla y criaturas venenosas. Aparece el primer corrompido.',
    enemies: [{ id: 'sapo', w: 4 }, { id: 'cocodrilo', w: 3 }, { id: 'mosquito', w: 3 }],
    corruptFrom: 3, // desde la fila 4 algunos enemigos aparecen corrompidos
    tones: ['#2a3d24', '#5e6b44', '#8a9a52', '#1f3a5a', '#6b4a2b'],
    deco: 'swamp', path: '#6b4a2b',
    // el suelo no puede ser del color del Cocodrilo Ancestral (#5e6b44)
    battle: { sky: ['#5e6b44', '#9a8f88'], ground: '#8a9a52', ground2: '#5e6b44', hill: '#2a3d24' },
  },
  volcan: {
    name: 'Montaña Volcánica', order: 3, music: 'volcan', boss: 'coloso',
    desc: 'Ríos de lava y enemigos con mucha defensa.',
    enemies: [{ id: 'pterosaurio', w: 3 }, { id: 'salamandra', w: 3 }, { id: 'raptorCorr', w: 3 }],
    tones: ['#2a211e', '#5a4a42', '#9a8f88', '#ff6b3a', '#ffe14a'],
    deco: 'lava', path: '#9a8f88',
    battle: { sky: ['#2a211e', '#7a1f16'], ground: '#5a4a42', ground2: '#2a211e', hill: '#141018' },
  },
  glaciar: {
    name: 'Glaciar Antiguo', order: 3, music: 'glaciar', boss: 'bestia', alternative: true,
    desc: 'Ruta opcional más difícil en lugar del Volcán.',
    enemies: [{ id: 'mamut', w: 5 }, { id: 'lobo', w: 4 }],
    tones: ['#1f3a5a', '#7fc4f0', '#d6f0ff', '#ffffff', '#9a8f88'],
    deco: 'ice', path: '#7fc4f0',
    battle: { sky: ['#7fc4f0', '#ffffff'], ground: '#d6f0ff', ground2: '#7fc4f0', hill: '#7fc4f0' },
  },
  crater: {
    name: 'El Cráter', order: 4, music: 'crater', boss: 'rey',
    desc: 'Solo enemigos corrompidos. Región final.',
    enemies: [{ id: 'alfa', w: 6 }, { id: 'raptorCorr', w: 4 }],
    tones: ['#141018', '#3b2257', '#7b4bc4', '#c46bff', '#7ff3ff'],
    deco: 'crystal', path: '#7b4bc4',
    battle: { sky: ['#141018', '#3b2257'], ground: '#3b2257', ground2: '#141018', hill: '#141018' },
  },
};

// Recorrido de una expedición. El paso 3 es Volcán, o Glaciar si se
// venció a la Reina del Fango sin usar objetos y el jugador lo elige.
const ROUTE = ['valle', 'pantano', 'volcan', 'crater'];
