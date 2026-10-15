'use strict';
// =====================================================================
// Objetos (Guía v0.2, sección 8). Inventario de 6 espacios en total.
// use: heal | ene | cure | auto | atk | adn | frag
// =====================================================================

const ITEMS = {
  baya:      { name: 'Baya Roja', desc: 'Recupera 20 VID', price: 12, use: 'heal', amount: 20, battle: true, field: true, icon: 'berry' },
  fruta:     { name: 'Fruta Dorada', desc: 'Recupera 50 VID', price: 30, use: 'heal', amount: 50, battle: true, field: true, icon: 'fruit' },
  hoja:      { name: 'Hoja Energética', desc: 'Recupera 8 ENE', price: 15, use: 'ene', amount: 8, battle: true, field: true, icon: 'leaf' },
  musgo:     { name: 'Musgo Curativo', desc: 'Quita veneno y ceguera', price: 10, use: 'cure', battle: true, field: false, icon: 'moss' },
  huevo:     { name: 'Huevo Fósil', desc: 'Revive con 50% de vida al caer, se usa solo. Máximo 1', price: 80, use: 'auto', max: 1, icon: 'egg' },
  colmillo:  { name: 'Colmillo de Caza', desc: 'En el próximo combate, +4 ATQ', price: 20, use: 'atk', amount: 4, battle: true, field: true, icon: 'fang' },
  ambar:     { name: 'Ámbar Antiguo', desc: '+40 ADN', use: 'adn', amount: 40, field: true, icon: 'amber' },
  fragmento: { name: 'Fragmento de Meteoro', desc: '+1 permanente a una estadística (solo en esta expedición)', use: 'frag', field: true, icon: 'shard' },
};

// Lo que Pip puede ofrecer (4 al azar por tienda)
const SHOP_POOL = ['baya', 'baya', 'fruta', 'hoja', 'musgo', 'huevo', 'colmillo'];
