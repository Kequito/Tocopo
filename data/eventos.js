'use strict';
// =====================================================================
// Eventos (Guía v0.2, sección 9). Cada opción tiene resultados con su
// probabilidad y una lista de efectos que interpreta el juego:
//   hp: n            cambia la VID (nunca baja de 1)
//   adn / conchas: n suma o resta recursos
//   item: id         da un objeto (pide espacio si el inventario está lleno)
//   pendingItem: id  da el objeto al entrar al siguiente nodo
//   mutation: r      ofrece una mutación al azar de rareza r (1, 2 o 3)
//   unstable: true   ofrece una mutación inestable al azar
//   poisonNext: n    el próximo combate empieza con veneno de n
//   combat: 'normal' | 'elite'   inicia un combate
//   pipDiscount: true            la próxima tienda tiene 50% de descuento
//   revealAll: true              revela todos los nodos de la región
// requires: { conchas: n } desactiva la opción si no alcanza.
// =====================================================================

const EVENTS = {
  huevo: {
    title: 'El huevo brillante',
    text: 'Entre los helechos hay un huevo que late con luz de cristal. Huele... delicioso.',
    options: [
      { label: 'Comerlo', outcomes: [
        { chance: 0.5, text: '¡Crunch! El cristal se mezcla con tu sangre.', effects: [{ mutation: 2 }] },
        { chance: 0.5, text: 'Sabe a piedra podrida. Algo en tu panza empieza a arder.', effects: [{ poisonNext: 6 }] },
      ] },
      { label: 'Dejarlo', outcomes: [{ chance: 1, text: 'Mejor no arriesgarse. Sigues tu camino.', effects: [] }] },
    ],
  },
  raptor: {
    title: 'Raptor herido',
    text: 'Un raptor joven tiene la pata atrapada bajo un tronco. Te mira con miedo.',
    options: [
      { label: 'Ayudarlo (−10 VID)', outcomes: [
        { chance: 1, text: 'Empujas el tronco con todas tus fuerzas y te raspas. El raptor huye... pero promete volver.', effects: [{ hp: -10 }, { pendingItem: 'baya' }] },
      ] },
      { label: 'Ignorarlo', outcomes: [{ chance: 1, text: 'No hay tiempo. Sigues tu camino.', effects: [] }] },
    ],
  },
  grieta: {
    title: 'Grieta de cristal',
    text: 'Una grieta en el suelo brilla con un color que nunca habías visto. Zumba como un enjambre.',
    options: [
      { label: 'Tocarla', outcomes: [
        { chance: 1, text: 'El cristal salta a tus garras. Te sientes poderoso... e inestable.', effects: [{ unstable: true }] },
      ] },
      { label: 'Rodearla (+20 ADN)', outcomes: [
        { chance: 1, text: 'Recoges unas esquirlas sueltas del borde sin tocar el centro.', effects: [{ adn: 20 }] },
      ] },
    ],
  },
  pip: {
    title: 'Pip perdido',
    speaker: 'Pip',
    text: '¡T-Tocopo! Me perdí y algo me está siguiendo... ¿Me acompañas hasta el camino? Te haré un buen precio, ¡lo juro!',
    options: [
      { label: 'Escoltarlo', outcomes: [
        { chance: 1, text: '¡Ahí viene! Pip se esconde detrás de ti.', effects: [{ combat: 'normal' }, { pipDiscount: true }] },
      ] },
      { label: 'No puedo, Pip', outcomes: [{ chance: 1, text: 'Pip se aleja temblando entre los arbustos.', effects: [] }] },
    ],
  },
  nido: {
    title: 'Nido abandonado',
    text: 'Un nido enorme, vacío y cubierto de polvo. Algo brilla entre las ramas del fondo.',
    options: [
      { label: 'Buscar', outcomes: [
        { chance: 0.6, text: '¡Una piedra de ámbar con un mosquito atrapado adentro!', effects: [{ item: 'ambar' }] },
        { chance: 0.4, text: '¡Era una trampa! La dueña del nido vuelve furiosa.', effects: [{ combat: 'elite' }] },
      ] },
      { label: 'Irse', outcomes: [{ chance: 1, text: 'Mejor no meterse en casa ajena.', effects: [] }] },
    ],
  },
  ptera: {
    title: 'Ptera con prisa',
    speaker: 'Ptera',
    text: '¡Tocopo! No tengo tiempo, me esperan en el cráter. Por 30 conchas te dibujo todo el mapa de la región.',
    options: [
      { label: 'Pagar 30 conchas', requires: { conchas: 30 }, outcomes: [
        { chance: 1, text: 'Ptera garabatea el mapa con el pico y sale volando.', effects: [{ conchas: -30 }, { revealAll: true }] },
      ] },
      { label: 'No, gracias', outcomes: [{ chance: 1, text: '¡Como quieras! ¡Nos vemos!', effects: [] }] },
    ],
  },
};
