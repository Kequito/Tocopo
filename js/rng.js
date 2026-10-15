'use strict';
// =====================================================================
// Azar con semilla (mulberry32). Todo lo que afecta la partida usa un
// generador derivado de la semilla de la expedición + el nodo, así una
// recarga repite exactamente los mismos resultados.
// =====================================================================

const RNG = {
  // Hash FNV-1a de varias partes → entero de 32 bits
  hash(...parts) {
    let h = 2166136261 >>> 0;
    for (const p of parts) {
      const s = String(p);
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      h ^= 0x7c;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  create(seed) {
    let a = seed >>> 0;
    return {
      next() {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); },
      chance(p) { return this.next() < p; },
      pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
      // lista [{w}] u objeto {clave: peso}
      weighted(src) {
        const list = Array.isArray(src) ? src : Object.keys(src).map(k => ({ id: k, w: src[k] }));
        const total = list.reduce((s, it) => s + it.w, 0);
        let r = this.next() * total;
        for (const it of list) { r -= it.w; if (r < 0) return it; }
        return list[list.length - 1];
      },
      shuffle(arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(this.next() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      },
    };
  },

  // Generador para un propósito concreto dentro de la expedición
  for(run, ...parts) { return this.create(this.hash(run.seed, ...parts)); },

  randomSeed() { return (Math.random() * 4294967296) >>> 0; },

  todayKey(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },

  dailySeed(key = this.todayKey()) { return this.hash('tocopo-diaria', key); },

  code(seed) { return (seed >>> 0).toString(36).toUpperCase().padStart(7, '0'); },
};
