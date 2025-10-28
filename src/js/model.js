// FILE: src/js/model.js
// Data & persistence layer: owns messages, localStorage, and change notifications.

const STORAGE_KEY = 'lab7-mvc-crud:messages';
const STORAGE_META_KEY = 'lab7-mvc-crud:meta';

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} text
 * @property {boolean} isUser
 * @property {string} timestamp  // ISO string
 * @property {boolean} edited
 */
export class ChatModel {
  #messages = /** @type {ChatMessage[]} */([]);
  #observers = new Set();
  #lastSaved = /** @type {string|null} */(null);

  constructor() {
    this.load(); // why: boot from persisted state
  }

  // ---- Observer API ----
  subscribe(fn) {
    this.#observers.add(fn);
    return () => this.#observers.delete(fn);
  }
  notify() {
    for (const fn of this.#observers) fn(this.snapshot());
  }
  snapshot() {
    return {
      messages: [...this.#messages],
      lastSaved: this.#lastSaved,
      count: this.#messages.length,
    };
  }

  // ---- Persistence ----
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const metaRaw = localStorage.getItem(STORAGE_META_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const safe = Array.isArray(parsed) ? parsed : [];
      // Normalize & filter corrupt data
      this.#messages = safe.filter(this.#isValidMessage).map(this.#normalizeMessage);
      this.#lastSaved = metaRaw ? (JSON.parse(metaRaw)?.lastSaved ?? null) : null;
    } catch {
      // why: corrupted storage must not brick the app
      this.#messages = [];
      this.#lastSaved = null;
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#messages));
    this.#lastSaved = new Date().toISOString();
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ lastSaved: this.#lastSaved }));
  }

  // ---- CRUD ----
  /** @returns {ChatMessage} */
  createMessage(text, isUser) {
    const t = String(text ?? '').trim();
    if (!t) throw new Error('Message text required');

    const msg = /** @type {ChatMessage} */({
      id: this.#uuid(),
      text: t,
      isUser: Boolean(isUser),
      timestamp: new Date().toISOString(),
      edited: false,
    });

    this.#messages.push(msg);
    this.save();
    this.notify();
    return msg;
  }

  /** @returns {ChatMessage} */
  updateMessage(id, newText) {
    const msg = this.#messages.find(m => m.id === id);
    if (!msg) throw new Error('Message not found');
    const t = String(newText ?? '').trim();
    if (!t) throw new Error('Message text required');

    msg.text = t;
    msg.edited = true;
    this.save();
    this.notify();
    return msg;
  }

  /** @returns {boolean} */
  deleteMessage(id) {
    const idx = this.#messages.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.#messages.splice(idx, 1);
    this.save();
    this.notify();
    return true;
  }

  clear() {
    this.#messages = [];
    this.save();
    this.notify();
  }

  // ---- Import / Export ----
  exportJSON() {
    return JSON.stringify(this.#messages, null, 2);
  }

  importJSON(json) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON');
    }
    if (!Array.isArray(data)) throw new Error('Expected an array of messages');

    const cleaned = data.filter(this.#isValidMessage).map(this.#normalizeMessage);
    // Defensive: ensure required fields & drop empties
    this.#messages = cleaned.map(m => ({
      id: (typeof m.id === 'string' && m.id) ? m.id : this.#uuid(),
      text: String(m.text ?? '').trim(),
      isUser: Boolean(m.isUser),
      timestamp: this.#isoOrNow(m.timestamp),
      edited: Boolean(m.edited),
    })).filter(m => m.text);

    this.save();
    this.notify();
  }

  // ---- Helpers ----
  #uuid() {
    // why: non-sequential unique ID per lab requirement
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const b = new Uint8Array(16);
    (globalThis.crypto?.getRandomValues?.(b)) || b.forEach((_, i) => (b[i] = (Math.random() * 256) | 0));
    b[6] = (b[6] & 0x0f) | 0x40; // version
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = [...b].map(x => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
  }

  #isoOrNow(v) {
    const s = String(v ?? '');
    return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s : new Date().toISOString();
  }

  #isValidMessage(m) {
    return m && typeof m === 'object' && typeof m.text === 'string' && m.text.trim().length > 0;
  }

  #normalizeMessage(m) {
    return {
      id: typeof m.id === 'string' ? m.id : String(m.id ?? ''),
      text: String(m.text ?? '').trim(),
      isUser: Boolean(m.isUser),
      timestamp: this.#isoOrNow(m.timestamp),
      edited: Boolean(m.edited),
    };
  }
}
