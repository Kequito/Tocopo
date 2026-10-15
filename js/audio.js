'use strict';
// =====================================================================
// Música chiptune y efectos de sonido generados con WebAudio.
// =====================================================================

const TRACKS = {
  title: { bpm: 110,
    lead: 'C5 - E5 - G5 - C6 - B5 - G5 - A5 - - - F5 - A5 - C6 - A5 - G5 - E5 - D5 - - -',
    bass: 'C3 - - - E3 - - - G2 - - - A2 - - - F2 - - - A2 - - - G2 - - - G2 - - -' },
  valle: { bpm: 132,
    lead: 'E5 - G5 C6 B5 G5 A5 - G5 E5 F5 G5 E5 - C5 - D5 - F5 A5 G5 F5 E5 - D5 E5 F5 D5 C5 - - -',
    bass: 'C3 - G3 - C3 - G3 - F3 - C4 - F3 - C4 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - G2 -' },
  pantano: { bpm: 96, leadType: 'triangle',
    lead: 'A4 - C5 - E5 - D5 C5 B4 - - - G4 - B4 - A4 - C5 - E5 - G5 F5 E5 - D5 - C5 - B4 -',
    bass: 'A2 - - - E3 - - - G2 - - - D3 - - - F2 - - - C3 - - - E2 - - - E3 - - -' },
  volcan: { bpm: 150,
    lead: 'E5 E5 G5 E5 A5 G5 E5 D5 E5 - B4 - D5 - E5 - E5 E5 G5 E5 B5 A5 G5 A5 B5 - A5 - G5 - F#5 -',
    bass: 'E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 D2 D3 D2 D3 E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 B1 B2 B1 B2' },
  glaciar: { bpm: 88, leadType: 'triangle',
    lead: 'B5 - - F#5 - - D5 - E5 - - - - - - - B5 - - A5 - - F#5 - G5 - - - F#5 - - -',
    bass: 'B2 - - - - - - - G2 - - - - - - - E2 - - - - - - - F#2 - - - - - - -' },
  crater: { bpm: 104,
    lead: 'C5 - D#5 - F#5 - D#5 - C5 - B4 - C5 - - - C5 - D#5 - F#5 - A5 - G5 - F#5 - D#5 - - -',
    bass: 'C2 C2 - C2 C2 - C2 - C#2 C#2 - C#2 C#2 - C#2 - C2 C2 - C2 C2 - C2 - B1 B1 - B1 B1 - B1 -' },
  battle: { bpm: 168,
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 E5 A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 G4 B4 D5',
    bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3 A2 A3 A2 A3 E2 E3 E2 E3 F2 F3 G2 G3 E2 E3 E2 E3' },
  boss: { bpm: 176,
    lead: 'D5 D5 F5 D5 G#5 G5 F5 D5 C5 D5 F5 D5 A5 G#5 G5 F5 D5 D5 F5 D5 G#5 G5 F5 G5 A5 - G#5 - G5 - F5 -',
    bass: 'D2 D3 D2 D3 D2 D3 D2 D3 A#1 A#2 A#1 A#2 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 D2 D3 A#1 A#2 C2 C3 C#2 C#3 C#2 C#3' },
  ending: { bpm: 84, leadType: 'triangle',
    lead: 'C5 - E5 - G5 - C6 - B5 - G5 - A5 - - - F5 - A5 - C6 - A5 - G5 - E5 - D5 - - -',
    bass: 'C3 - - - E3 - - - G2 - - - A2 - - - F2 - - - A2 - - - G2 - - - C3 - - -' },
};

const NOTE_IDX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function noteFreq(tok) {
  const m = /^([A-G]#?)(\d)$/.exec(tok);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTE_IDX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
for (const k in TRACKS) {
  const t = TRACKS[k];
  t.leadF = t.lead.split(/\s+/).map(noteFreq);
  t.bassF = t.bass.split(/\s+/).map(noteFreq);
  t.len = Math.max(t.leadF.length, t.bassF.length);
}

const Sound = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  on: true, track: null, pending: null, step: 0, nextT: 0, timer: null, noiseBuf: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.6 : 0;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.4;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pending) { const p = this.pending; this.track = null; this.play(p); }
    } catch (e) { this.ctx = null; }
  },

  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.value = v ? 0.6 : 0;
  },

  tone(freq, t, dur, type = 'square', vol = 0.3, dest, slideTo) {
    if (!this.ctx || !freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  },

  noise(t, dur, vol = 0.3, freq = 1200) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  },

  seq(notes, step, type = 'square', vol = 0.25) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    notes.forEach((n, i) => this.tone(noteFreq(n), t0 + i * step, step * 1.4, type, vol));
  },

  sfx(name) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'select': this.tone(880, t, 0.05, 'square', 0.15); break;
      case 'move':   this.tone(660, t, 0.03, 'square', 0.08); break;
      case 'blip':   this.tone(520 + Math.random() * 60, t, 0.025, 'square', 0.04); break;
      case 'error':  this.tone(180, t, 0.12, 'square', 0.2); this.tone(140, t + 0.08, 0.12, 'square', 0.2); break;
      case 'bump':   this.tone(110, t, 0.06, 'triangle', 0.2); break;
      case 'hit':    this.noise(t, 0.12, 0.5, 1800); this.tone(220, t, 0.1, 'square', 0.2, null, 90); break;
      case 'crit':   this.noise(t, 0.2, 0.7, 3000); this.tone(440, t, 0.15, 'square', 0.25, null, 110); this.tone(880, t + 0.05, 0.1, 'square', 0.15); break;
      case 'miss':   this.tone(600, t, 0.12, 'triangle', 0.15, null, 300); break;
      case 'skill':  this.tone(300, t, 0.15, 'sawtooth', 0.12, null, 900); break;
      case 'crystal':this.tone(1200, t, 0.3, 'triangle', 0.2, null, 2400); this.tone(1800, t + 0.06, 0.25, 'triangle', 0.15); break;
      case 'heal':   this.seq(['C5', 'E5', 'G5', 'C6'], 0.06, 'triangle', 0.25); break;
      case 'poison': this.tone(160, t, 0.25, 'sawtooth', 0.12, null, 90); break;
      case 'stun':   this.seq(['A5', 'F5', 'A5', 'F5'], 0.05, 'square', 0.12); break;
      case 'level':  this.seq(['G5', 'C6', 'E6', 'G6', 'E6', 'G6'], 0.08, 'square', 0.22); break;
      case 'victory':this.seq(['C5', 'E5', 'G5', 'C6', '-', 'G5', 'C6'], 0.1, 'square', 0.22); break;
      case 'defeat': this.seq(['G4', 'F4', 'D#4', 'D4', 'C4'], 0.18, 'triangle', 0.25); break;
      case 'encounter': this.tone(1000, t, 0.35, 'square', 0.15, null, 120); this.noise(t + 0.1, 0.2, 0.2, 800); break;
      case 'flee':   this.tone(300, t, 0.2, 'triangle', 0.2, null, 1200); break;
      case 'chest':  this.seq(['E5', 'G5', 'B5', 'E6'], 0.07, 'square', 0.2); break;
      case 'buy':    this.seq(['B5', 'E6'], 0.06, 'square', 0.18); break;
      case 'mutate': this.seq(['C5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.06, 'triangle', 0.25); this.tone(2000, t + 0.3, 0.4, 'sine', 0.1, null, 3000); break;
      case 'door':   this.tone(400, t, 0.15, 'triangle', 0.18, null, 200); break;
      case 'roar':   this.noise(t, 0.6, 0.5, 600); this.tone(90, t, 0.6, 'sawtooth', 0.25, null, 60); break;
    }
  },

  play(name) {
    this.pending = name;
    if (!this.ctx) return;
    if (this.track === name) return;
    this.track = name;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 40);
  },

  stop() { this.track = null; this.pending = null; },

  tick() {
    if (!this.ctx || !this.track) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 2;
    while (this.nextT < this.ctx.currentTime + 0.15) {
      const i = this.step % tr.len;
      const lf = tr.leadF[i], bf = tr.bassF[i];
      if (lf) this.tone(lf, this.nextT, stepDur * 0.9, tr.leadType || 'square', 0.16, this.musicGain);
      if (bf) this.tone(bf, this.nextT, stepDur * 0.95, 'triangle', 0.32, this.musicGain);
      this.step++;
      this.nextT += stepDur;
    }
  },
};
