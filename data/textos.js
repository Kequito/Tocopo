'use strict';
// =====================================================================
// Textos y diálogos (Guía v0.2, secciones 1 y 12)
// =====================================================================

const INTRO_LINES = [
  'Un meteorito cayó sobre el mundo prehistórico... pero no trajo la extinción.',
  'Sus cristales empezaron a mutar a los dinosaurios. Algunos se volvieron más fuertes. Otros se "corrompieron" y atacan todo lo que ven.',
  'Tocopo es una cría pequeña que puede absorber esos cristales sin perder el control.',
  'Su objetivo: llegar al cráter del meteorito y vencer al Rey Tirano Cristalizado.',
];

// Bracca despide a Tocopo al iniciar cada expedición
const BRACCA_FAREWELL = [
  ['Abuela Bracca', 'Otra vez al camino, pequeño. Recuerda: si caes, no hay vuelta atrás. Vuelves al nido sin nada.'],
  ['Abuela Bracca', 'Cada cristal te cambiará distinto. Elige con cuidado, y adáptate a lo que encuentres.'],
  ['Tocopo', '¡Kii-kii!'],
];
const BRACCA_FAREWELL_SHORT = [
  'Ve con cuidado, Tocopo. El cráter no perdona.',
  'Esta vez el camino será distinto. Siempre lo es.',
  'Come bien, elige bien... y vuelve entero.',
  'Yo vi caer el meteorito. Tú vas a apagar su luz.',
];

const BRACCA_REST = [
  'Siéntate junto al fuego, pequeño. Aquí nadie te molesta.',
  'Llegué tan lejos con estas patas viejas solo para verte. Descansa.',
  'Los cristales te cambian, pero sigues siendo tú. Respira.',
  'Dicen que en el Glaciar vive una bestia que el meteorito nunca tocó...',
];

const PIP_GREET = [
  '¡H-hola, Tocopo! Precios honestos, ¡lo juro!',
  '¡Llegué antes que tú, je! ¿Compras algo?',
  'Todo fresco, todo útil, casi todo comestible.',
];

const PTERA_HINTS = [
  'Las mutaciones de dos ramas distintas a veces se potencian entre sí. ¡Prueba combinarlas!',
  'Los élites pegan fuerte, pero su oferta de mutación es mucho mejor.',
  'Si vences a la Reina del Fango sin usar objetos, se abre el camino al Glaciar Antiguo.',
  'El Rayo de Cristal hace muchísimo daño a los corrompidos.',
];

const BOSS_ANNOUNCE = {
  granRaptor: '¡Alto, Tocopo! Ese es el Gran Raptor Rojo. Cuando lo hieres a la mitad, llama a sus crías. ¡De un jefe no se puede huir!',
  reina: '¡Es la Reina del Fango! Envenena en cada turno: cúrate o atácala rápido.',
  coloso: '¡El Coloso de Magma! Su coraza es durísima. Usa habilidades que rompan o ignoren su DEF.',
  bestia: '¡La Bestia de Escarcha! Congela cada 4 turnos. Si la vences, su pelaje te protegerá del veneno.',
  rey: 'Ahí está... el Rey Tirano Cristalizado. Tres fases, y al final se vuelve Corrompido. ¡Todo el valle confía en ti!',
};

const GLACIER_OFFER = 'Venciste a la Reina sin usar un solo objeto... Siento un viento helado hacia el norte. ¿Tomas la ruta del Glaciar Antiguo en lugar del Volcán? Es más difícil.';

const ENDING_LINES = [
  ['', 'El Rey Tirano cae. Los cristales del cráter dejan de brillar, uno por uno...'],
  ['', 'Del gigante cristalizado solo queda un viejo tiranosaurio cansado, libre por fin de la corrupción.'],
  ['Ptera', '¡Tocopo! ¡Lo lograste! ¡Voy a volar a contárselo a todo el mundo!'],
  ['Abuela Bracca', 'Lo lograste, pequeño. El valle vuelve a respirar.'],
  ['Tocopo', '¡KIII-KIII!'],
];

const DEATH_LINES = [
  'Tocopo cae... Los cristales se apagan en su lomo.',
  'La expedición termina aquí. Nada se conserva: la próxima vez empezarás de cero.',
];

const NODE_INFO = {
  combat: { name: 'Combate', desc: 'Enemigo normal. Da XP, conchas, ADN y oferta de mutación.' },
  elite:  { name: 'Élite', desc: 'Enemigo fuerte. Mejor oferta de mutación. No se puede huir.' },
  event:  { name: 'Evento', desc: 'Una situación con decisiones y riesgo.' },
  shop:   { name: 'Tienda de Pip', desc: 'Objetos y 1 mutación a la venta.' },
  rest:   { name: 'Descanso', desc: 'Curar 40% de vida y toda la energía, o potenciar una mutación.' },
  nest:   { name: 'Nido de Cristal', desc: 'Oferta de mutación garantizada sin pelear.' },
  boss:   { name: 'Jefe', desc: 'Al vencerlo: curación completa y Fragmento de Meteoro.' },
  start:  { name: 'Inicio', desc: '' },
};
