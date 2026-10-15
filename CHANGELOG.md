# Tocopo · Registro de cambios

Referencia de diseño: `docs/Tocopo_Guia_de_Diseno_v0.2.pdf`.
Versionado por copias de carpeta (no hay Git): cada versión cerrada queda en `Desktop\Tocopo_vX.Y`.

## v1.0 · Paso a roguelike (fases v0.2 a v1.0 de la guía) — 2026-10-12

Las siete fases de la hoja de ruta se hicieron en una sola pasada, así que no hay
copias intermedias: está `Tocopo_v0.1` (antes del cambio) y `Tocopo_v1.0` (este estado).

**v0.2 · Base**
- Resolución interna de 512×288 (32×18 tiles), escalada sin suavizado.
- Datos separados de la lógica en `data/`: config, mutaciones, enemigos, objetos, eventos, regiones y textos.
- Estadísticas nuevas: nivel × 12 XP, nivel máximo 12, cada nivel cura 30%, etapas Cría/Juvenil/Adulto/Alfa con sus bonos.
- Azar con semilla (`js/rng.js`): mapa, combates, ofertas, tiendas y eventos se derivan de la semilla de la expedición y del nodo.
- Muerte permanente: al caer sin Huevo Fósil se borra el guardado. Guardado automático al entrar a cada nodo.

**v0.3 · Mapa de nodos**
- Generador de 10 filas con 2 a 4 nodos, caminos sin cruces y jefe en la fila final (`js/nodemap.js`).
- Reglas: fila 1 de combate, fila 5 con Descanso, fila 9 con Descanso o Tienda, sin dos élites seguidos.
- Mapa de tiles 16×16 por el que Tocopo camina de nodo en nodo; tipos visibles 2 filas adelante.
- Enemigos +6% de VID y ATQ por fila. Gran Raptor Rojo como primer jefe.

**v0.4 · Mutaciones**
- Oferta de 3 al azar tras cada combate ganado; saltar da 15 ADN; reemplazo si no hay espacios.
- Espacios por etapa (2/4/6/8).

**v0.5 · Objetos, tienda, descansos y eventos**
- Inventario de 6 espacios, Colmillo de Caza, precios nuevos.
- Tienda de Pip: 4 objetos al azar y 1 mutación por 60 conchas.
- Descanso con la Abuela Bracca: curar 40% y toda la ENE, o potenciar una mutación (+50%).
- Nido de Cristal: oferta con una rara o mejor; volver a tirar por 20 ADN.
- Los 6 eventos de la guía.

**v0.6 · Pantano, rarezas, sinergias, élites y capas**
- Rarezas común/rara/legendaria con la probabilidad de cada región.
- 6 sinergias entre ramas.
- Élites: +60% VID, +30% ATQ y un rasgo extra; no se puede huir.
- Sprite de Tocopo por capas (cuerpo por etapa + 6 ramas, la de mayor rareza de cada una), jefes de 32×32, paleta de 32 colores, 2 cuadros en reposo y al caminar.

**v0.7 · Volcán, Glaciar, Cráter**
- 6 mutaciones inestables (en eventos y élites).
- Glaciar Antiguo como ruta alternativa si se vence a la Reina sin usar objetos; Bestia de Escarcha da Pelaje Glaciar.
- Rey Tirano Cristalizado con 3 fases.

**v1.0 · Cierre**
- Récords, bitácora y expedición diaria con semilla del día.
- Pantalla de título, intro, final y resumen para compartir.

### Decisiones propias (la guía no las define)
- ADN por combate = XP ÷ 2. Élites dan ×1,5 de XP y conchas.
- XP y conchas de los jefes; crítico enemigo de 5%; 10% de soltar una Baya Roja.
- Rasgos de élite (Doble golpe, Escurridizo, Regeneración, Venenoso, Furia, Púas).
- El Fragmento de Meteoro se aplica al momento al vencer al jefe (no ocupa inventario).
- "Veneno fuerte" del huevo brillante: el próximo combate empieza con veneno de 6.
- Los élites aparecen desde la fila 3.
- Alfa conserva el bono de Adulto (+10 VID, +2 ATQ) y suma +10%.

### Balance pendiente
Con los números exactos de la guía, ninguna expedición simulada pasó del Valle de Helechos
(el Gran Raptor Rojo es casi imposible a nivel 2-3). Ver el resumen de simulaciones en el chat.
