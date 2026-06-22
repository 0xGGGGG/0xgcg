// ---------------------------------------------------------------------------
// Shared TTS narrator with karaoke word-highlighting. Given an ordered list of
// DOM elements, it wraps their text into .kw spans and speaks them in turn,
// lighting each word as it is spoken. Used by the Timeline overlay and the
// Layout surface card (the Script page has its own richer narration loop).
// ---------------------------------------------------------------------------

export class Narrator {
  constructor() {
    this.tts = window.speechSynthesis || null;
    this.voice = null;
    this.queue = []; this.i = 0; this.onDone = null;
    this.busy = false;
    if (this.tts) { this.pick(); this.tts.onvoiceschanged = () => this.pick(); }
  }
  pick() {
    const vs = this.tts.getVoices();
    this.voice = vs.find((v) => /en[-_]GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name))
      || vs.find((v) => /^en/i.test(v.lang)) || vs[0] || null;
  }

  // els: ordered DOM elements (their text is spoken + karaoke'd)
  speak(els, { rate = 0.95, pitch = 0.86, onDone } = {}) {
    this.stop();
    const list = els.filter(Boolean);
    if (!this.tts || !list.length) { onDone && onDone(); return; }
    this.queue = list.map((el) => ({ el, words: wrapWords(el), text: el.textContent }));
    this.i = 0; this.onDone = onDone; this.rate = rate; this.pitch = pitch;
    this.busy = true;
    this._next();
  }

  _next() {
    clearTimeout(this._wd);
    if (this.i >= this.queue.length) { this.busy = false; const d = this.onDone; this.onDone = null; d && d(); return; }
    const seg = this.queue[this.i];
    seg.el.classList.add('kw-active');
    const u = new SpeechSynthesisUtterance(seg.text);
    u.rate = this.rate; u.pitch = this.pitch; if (this.voice) u.voice = this.voice;
    let lit = -1, ended = false;
    const finish = () => {
      if (ended) return; ended = true; clearTimeout(this._wd);
      seg.words.forEach((w) => w.el.classList.add('done'));
      seg.el.classList.remove('kw-active');
      this.i++; this._next();
    };
    u.onboundary = (e) => {
      const ci = e.charIndex || 0;
      const wi = seg.words.findIndex((w) => ci >= w.s && ci < w.e);
      if (wi >= 0 && wi !== lit) { if (lit >= 0) seg.words[lit].el.classList.remove('lit'); seg.words[wi].el.classList.add('lit'); lit = wi; }
    };
    u.onend = finish;
    u.onerror = finish;
    // watchdog: if TTS stalls or has no voice, don't freeze the caller's tour
    this._wd = setTimeout(finish, seg.text.length * 95 + 4000);
    this.cur = u; this.tts.cancel(); this.tts.speak(u);
  }

  stop() {
    clearTimeout(this._wd);
    if (this.tts) this.tts.cancel();
    this.queue.forEach((s) => s.el.classList.remove('kw-active'));
    this.queue = []; this.busy = false; this.onDone = null;
  }
}

// conservative estimate of how long `text` takes to speak, in seconds — used to
// size a scene's dwell so the progress animation keeps running and the narration
// still finishes inside it (≈13 chars/s at rate 1, plus a tail of silence)
export function speechSeconds(text, rate = 0.95) {
  const chars = (text || '').trim().length;
  return chars / (13 * rate) + 2.2;
}

// wrap an element's plain text into .kw spans (idempotent)
function wrapWords(el) {
  if (el.dataset.kw === '1') return [...el.querySelectorAll('.kw')].map((w) => ({ el: w, s: +w.dataset.s, e: +w.dataset.e }));
  const text = el.textContent; el.textContent = '';
  const words = []; let idx = 0;
  text.split(/(\s+)/).forEach((tok) => {
    if (tok === '' || /^\s+$/.test(tok)) { el.appendChild(document.createTextNode(tok)); idx += tok.length; return; }
    const w = document.createElement('span'); w.className = 'kw'; w.textContent = tok;
    w.dataset.s = idx; w.dataset.e = idx + tok.length;
    el.appendChild(w); words.push({ el: w, s: idx, e: idx + tok.length }); idx += tok.length;
  });
  el.dataset.kw = '1';
  return words;
}
