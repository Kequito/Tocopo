'use strict';
// =====================================================================
// TOCOPO — Configuración general (Guía de diseño v0.2).
// Los números son una primera propuesta: se balancean aquí, sin tocar
// la lógica del juego.
// =====================================================================

const CONFIG = {
  // Pantalla: 512×288 = 32×18 tiles de 16×16 (formato 16:9)
  VIEW_W: 512,
  VIEW_H: 288,
  TILE: 16,
  BATTLE_SCALE: 4,          // sprites ampliados ×4 en combate (64×64)

  // Tocopo
  START_STATS: { vid: 30, ene: 12, atq: 6, def: 4, vel: 5, ins: 5 },
  START_ITEMS: ['baya', 'baya'],
  START_CONCHAS: 20,
  XP_PER_LEVEL: 12,         // XP para subir = nivel × 12
  MAX_LEVEL: 12,
  LEVEL_GAIN: { vid: 5, ene: 1, atq: 1, def: 1 },
  LEVEL_HEAL: 0.30,         // cada nivel cura 30% de la vida

  // Combate
  WIN_ENE: 3,               // ENE recuperada al ganar un combate
  FLEE_BASE: 0.50,
  FLEE_FAST_BONUS: 0.10,
  ENEMY_CRIT: 5,            // % de crítico de los enemigos (la guía no lo fija)
  ROW_SCALE: 0.06,          // +6% de VID y ATQ por fila avanzada
  ELITE_MULT: { vid: 1.6, atq: 1.3 },
  ADN_PER_XP: 0.5,          // ADN por combate = XP ÷ 2 (decisión aprobada)
  DROP_CHANCE: 0.10,        // probabilidad de soltar una Baya Roja

  // Mutaciones
  OFFER_SIZE: 3,
  SKIP_ADN: 15,
  REROLL_COST: 20,
  BOOST: 0.5,               // potenciar: +50% a los bonos de estadísticas
  ELITE_UNSTABLE_CHANCE: 0.30,

  // Objetos y tienda
  INVENTORY_SLOTS: 6,
  SHOP_ITEMS: 4,
  SHOP_MUT_PRICE: 60,
  PIP_DISCOUNT: 0.5,

  // Descanso
  REST_HEAL: 0.40,

  // Mapa de nodos
  ROWS: 10,                 // la fila 10 es el jefe
  MIN_NODES: 2,
  MAX_NODES: 4,
  LANES: 4,
  NODE_WEIGHTS: { combat: 45, elite: 10, event: 18, shop: 8, rest: 12, nest: 7 },
  ELITE_MIN_ROW: 2,         // índice 0: los élites aparecen desde la fila 3
  REST_ROW: 4,              // fila 5 (índice 4) siempre ofrece Descanso
  PRE_BOSS_ROW: 8,          // fila 9 (índice 8): Descanso o Tienda
  VISIBLE_ROWS: 2,          // filas por delante cuyo tipo de nodo se ve

  // Almacenamiento
  SAVE_KEY: 'tocopo-expedicion-v2',
  RECORDS_KEY: 'tocopo-records-v2',
  LOG_KEY: 'tocopo-bitacora-v2',
  SETTINGS_KEY: 'tocopo-settings-v1',
};

// Etapas de crecimiento. El bono de etapa no se suma al anterior: Adulto da
// +10 VID en total (no +15). Alfa conserva el bono de Adulto y suma +10%.
const STAGES = [
  { id: 'cria',    name: 'Cría',    min: 1,  max: 3,  slots: 2, bonus: {} },
  { id: 'juvenil', name: 'Juvenil', min: 4,  max: 7,  slots: 4, bonus: { vid: 5 } },
  { id: 'adulto',  name: 'Adulto',  min: 8,  max: 11, slots: 6, bonus: { vid: 10, atq: 2 } },
  { id: 'alfa',    name: 'Alfa',    min: 12, max: 12, slots: 8, bonus: { vid: 10, atq: 2 }, mult: 0.10 },
];

const STAT_SHORT = { vid: 'VID', ene: 'ENE', atq: 'ATQ', def: 'DEF', vel: 'VEL', ins: 'INS', esq: 'Esquiva' };
const STAT_LONG = { vid: 'Vida', ene: 'Energía', atq: 'Ataque', def: 'Defensa', vel: 'Velocidad', ins: 'Instinto', esq: 'Esquiva' };

// Paleta limitada de 32 colores. Todos los sprites se ajustan a ella.
const PALETTE = [
  '#141018', '#3a2f2a', '#6b4a2b', '#a0703e', '#e3c15b', '#f3dfa0', '#fff6e0', '#ffffff',
  '#1f4a2a', '#2e6b2a', '#4f9a3e', '#8fd16a', '#d4f0a8', '#2a3d24', '#5e6b44', '#8a9a52',
  '#1f3a5a', '#3a8fd6', '#7fc4f0', '#d6f0ff', '#3b2257', '#7b4bc4', '#c46bff', '#7ff3ff',
  '#7a1f16', '#c0392b', '#ff6b3a', '#ffb03a', '#ffe14a', '#2a211e', '#5a4a42', '#9a8f88',
];
