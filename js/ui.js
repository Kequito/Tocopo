'use strict';
// =====================================================================
// Interfaz: entrada (teclado y táctil), diálogos, menús y paneles.
// =====================================================================

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = () => Math.random();
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const Input = {
  held: {},
  keyMap: {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    Enter: 'ok', ' ': 'ok', z: 'ok', Z: 'ok', e: 'ok', E: 'ok',
    Escape: 'back', x: 'back', X: 'back', Backspace: 'back', q: 'back', Q: 'back',
  },
  press(k, repeat) {
    Sound.init();
    if (UI.dispatch(k)) return;
    if (!repeat) Game.onKey(k);
  },
  init() {
    window.addEventListener('keydown', e => {
      const k = this.keyMap[e.key];
      if (!k) return;
      e.preventDefault();
      this.held[k] = true;
      if (e.repeat && (k === 'ok' || k === 'back')) return;
      this.press(k, e.repeat);
    });
    window.addEventListener('keyup', e => {
      const k = this.keyMap[e.key];
      if (k) this.held[k] = false;
    });
    window.addEventListener('blur', () => { this.held = {}; });
    window.addEventListener('pointerdown', () => Sound.init(), { capture: true });

    // Controles táctiles
    document.querySelectorAll('#touch [data-k]').forEach(btn => {
      const k = btn.dataset.k;
      let rep = null;
      const down = e => {
        e.preventDefault();
        btn.classList.add('on');
        this.held[k] = true;
        this.press(k, false);
        if (['up', 'down', 'left', 'right'].includes(k)) {
          clearInterval(rep);
          rep = setInterval(() => { if (UI.hasInput()) UI.dispatch(k); }, 220);
        }
      };
      const up = e => {
        e.preventDefault();
        btn.classList.remove('on');
        this.held[k] = false;
        clearInterval(rep);
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    });
  },
  dir() {
    for (const d of ['up', 'down', 'left', 'right']) if (this.held[d]) return d;
    return null;
  },
};

const UI = {
  stack: [],
  pushInput(h) { this.stack.push(h); },
  popInput(h) { const i = this.stack.lastIndexOf(h); if (i >= 0) this.stack.splice(i, 1); },
  hasInput() { return this.stack.length > 0; },
  dispatch(k) {
    if (!this.stack.length) return false;
    this.stack[this.stack.length - 1](k);
    return true;
  },

  // ---------------------------------------------------------------
  // Diálogo con efecto máquina de escribir
  say(speaker, text) {
    return new Promise(resolve => {
      const box = $('dialog');
      const sp = box.querySelector('.speaker');
      const tEl = box.querySelector('.text');
      box.classList.remove('hidden', 'ready');
      sp.textContent = speaker || '';
      sp.classList.toggle('hidden', !speaker);
      box.classList.toggle('narration', !speaker);
      tEl.textContent = '';
      let i = 0, done = false;
      const finishTyping = () => {
        clearInterval(timer);
        tEl.textContent = text;
        done = true;
        box.classList.add('ready');
      };
      const timer = setInterval(() => {
        i++;
        tEl.textContent = text.slice(0, i);
        if (i % 3 === 0) Sound.sfx('blip');
        if (i >= text.length) finishTyping();
      }, 22);
      const handler = k => {
        if (k !== 'ok' && k !== 'back') return;
        if (!done) { finishTyping(); return; }
        this.popInput(handler);
        box.onclick = null;
        box.classList.add('hidden');
        Sound.sfx('select');
        resolve();
      };
      box.onclick = () => handler('ok');
      this.pushInput(handler);
    });
  },

  async talk(lines) {
    for (const l of lines) {
      if (typeof l === 'string') await this.say('', l);
      else await this.say(l[0], l[1]);
    }
  },

  // ---------------------------------------------------------------
  // Menú de lista o cuadrícula. Devuelve el valor elegido o null.
  menu(opts) {
    return new Promise(resolve => {
      const layer = opts.container || $('menu-layer');
      const items = opts.items;
      const cols = opts.cols || 1;
      const box = document.createElement('div');
      box.className = 'menu ' + (opts.embedded ? 'embedded ' : 'box ') + (opts.cls || '');
      if (opts.title) {
        const h = document.createElement('div');
        h.className = 'menu-title';
        h.textContent = opts.title;
        box.appendChild(h);
      }
      if (opts.text) {
        const p = document.createElement('div');
        p.className = 'menu-text';
        p.textContent = opts.text;
        box.appendChild(p);
      }
      const list = document.createElement('div');
      list.className = 'menu-list';
      list.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      box.appendChild(list);
      const hasDesc = items.some(it => it.desc);
      let descEl = null;
      if (hasDesc) {
        descEl = document.createElement('div');
        descEl.className = 'menu-desc';
        box.appendChild(descEl);
      }
      const els = items.map((it, i) => {
        const b = document.createElement('div');
        b.className = 'mi' + (it.disabled ? ' disabled' : '');
        if (it.color) b.style.setProperty('--mc', it.color);
        b.innerHTML = `<span class="l">${esc(it.label)}</span>` + (it.right != null ? `<span class="r">${esc(it.right)}</span>` : '');
        b.addEventListener('mouseenter', () => setFocus(i, true));
        b.addEventListener('click', e => { e.stopPropagation(); setFocus(i, true); choose(); });
        list.appendChild(b);
        return b;
      });
      let idx = opts.start != null ? opts.start : Math.max(0, items.findIndex(it => !it.disabled));
      const setFocus = (i, silent) => {
        if (i === idx && els[i].classList.contains('focus')) return;
        idx = i;
        els.forEach((el, j) => el.classList.toggle('focus', j === idx));
        if (descEl) descEl.textContent = items[idx].desc || '';
        if (!silent) Sound.sfx('move');
        if (opts.onFocus) opts.onFocus(items[idx], idx);
        els[idx].scrollIntoView({ block: 'nearest' });
      };
      const close = v => {
        this.popInput(handler);
        box.remove();
        resolve(v);
      };
      const choose = () => {
        const it = items[idx];
        if (it.disabled) { Sound.sfx('error'); return; }
        Sound.sfx('select');
        close(it.value !== undefined ? it.value : idx);
      };
      const n = items.length;
      const handler = k => {
        if (k === 'up' && idx - cols >= 0) setFocus(idx - cols);
        else if (k === 'down' && idx + cols < n) setFocus(idx + cols);
        else if (k === 'left' && cols > 1 && idx % cols > 0) setFocus(idx - 1);
        else if (k === 'right' && cols > 1 && idx % cols < cols - 1 && idx + 1 < n) setFocus(idx + 1);
        else if (k === 'up' && cols === 1) setFocus((idx - 1 + n) % n);
        else if (k === 'down' && cols === 1) setFocus((idx + 1) % n);
        else if (k === 'ok') choose();
        else if (k === 'back' && opts.cancel !== false) { Sound.sfx('select'); close(null); }
      };
      layer.appendChild(box);
      this.pushInput(handler);
      setFocus(idx, true);
    });
  },

  confirm(text, yes = 'Sí', no = 'No') {
    return this.menu({ text, items: [{ label: yes, value: true }, { label: no, value: false }], cls: 'confirm' })
      .then(v => v === true);
  },

  // ---------------------------------------------------------------
  // Panel libre: html + manejador de teclas. Se cierra con "back".
  panel(html, opts = {}) {
    return new Promise(resolve => {
      const box = document.createElement('div');
      box.className = 'box panel ' + (opts.cls || '');
      box.innerHTML = html + `<div class="panel-foot">${esc(opts.foot || 'X / Esc: cerrar')}</div>`;
      $('menu-layer').appendChild(box);
      const close = v => {
        this.popInput(handler);
        box.remove();
        resolve(v);
      };
      const handler = k => {
        if (opts.onKey && opts.onKey(k, close) === true) return;
        if (k === 'back' || (k === 'ok' && !opts.onKey)) { Sound.sfx('select'); close(null); }
      };
      box.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => handler(b.dataset.act)));
      const closeBtn = document.createElement('div');
      closeBtn.className = 'panel-x';
      closeBtn.textContent = '×';
      closeBtn.onclick = () => handler('back');
      box.appendChild(closeBtn);
      this.pushInput(handler);
      if (opts.setup) opts.setup(box, close);
    });
  },

  toast(text, ms = 2200) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  },

  banner(title, sub) {
    const b = $('banner');
    b.innerHTML = `<div class="b1">${esc(title)}</div>` + (sub ? `<div class="b2">${esc(sub)}</div>` : '');
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  },

  fade(on, ms = 300) {
    const f = $('fade');
    f.style.transitionDuration = ms + 'ms';
    f.classList.toggle('on', on);
    return sleep(ms + 20);
  },

  // Dibuja a Tocopo (con sus capas) en un canvas de panel
  drawLook(canvas, look, scale) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Sprites.draw(ctx, Sprites.tocopo(look), canvas.width / 2, canvas.height, scale);
  },
};
