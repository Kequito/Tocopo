# Tocopo

Roguelike por turnos en pixel art 16×16, hecho a partir de la *Guía de diseño v0.2* (`docs/`).
Cada expedición va del Valle de Helechos al Cráter por un mapa de nodos distinto. Si Tocopo cae, se empieza de cero.

## Cómo jugar
Abre `index.html` en Google Chrome (doble clic). No necesita instalación ni servidor.

- **Flechas / WASD**: elegir camino y opciones
- **Z / Enter / Espacio**: confirmar
- **X / Esc**: menú y volver
- En celular todo se toca: los nodos del mapa, los botones, las opciones y la pantalla para avanzar textos.
  Está pensado para jugar en vertical.
- **Para jugar como app en el iPhone:** abre el link en Safari → Compartir → "Agregar a inicio".
  Así abre a pantalla completa, sin la barra del navegador. En Android: menú de Chrome → "Agregar a la pantalla principal".

La expedición se guarda sola al entrar a cada nodo. Al morir se borra; solo quedan los récords y la bitácora.

## Estructura
- `data/` — todos los números y textos para balancear sin tocar la lógica:
  `config.js` (reglas generales, etapas, paleta), `mutaciones.js`, `enemigos.js`, `objetos.js`,
  `eventos.js`, `regiones.js`, `textos.js`.
- `js/` — lógica: `rng.js` (azar con semilla), `run.js` (expedición, guardado, récords),
  `nodemap.js` (mapa de nodos), `nodes.js` (combate, eventos, tienda, descanso...), `battle.js`,
  `sprites.js` (capas de Tocopo), `ui.js`, `audio.js`, `game.js` (escenas y menús).

## Compartir con amigos
Comparte la carpeta completa (por ejemplo, en un .zip) o súbela a un hosting estático
como GitHub Pages o Netlify. La expedición diaria usa la misma semilla para todos ese día.
