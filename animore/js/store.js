// Local persistence + tiny pub/sub. Everything lives in localStorage on the device.
const K = 'animore:v1:';
const read = (k, d) => { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch { /* storage full/blocked */ } };

const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });

// Compact snapshot so Saved / Recent can render without the network.
export function snap(m) {
  return {
    id: m.id, title: m.title, cover: m.coverSm || m.cover, coverSm: m.coverSm || m.cover, color: m.color || null,
    score: m.score ?? null, episodes: m.episodes ?? null, year: m.year ?? null, format: m.format || null, genres: (m.genres || []).slice(0, 3),
  };
}

export const store = {
  settings: { theme: 'dark', lang: 'mn', ...read('settings', {}) },
  saved: read('saved', []),        // [{id, status:'planning'|'watched', at, m}]
  history: read('history', []),    // [{id, at, m}]
  searches: read('searches', []),  // [string]
  notifRead: read('notifRead', []),
  auth: read('auth', null),        // {token, name, avatar, id, exp}
  pendingDel: read('pendingDel', []), // ids removed locally, still to delete on AniList
  sync: { state: 'idle', done: 0, total: 0, at: read('syncAt', null), err: null }, // state: idle|syncing|ok|fail
  savedHook: null,                 // set by sync.js: called after the user changes the saved list

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setSetting(key, value) { this.settings[key] = value; write('settings', this.settings); emit(); },

  isSaved(id) { return this.saved.some(s => s.id === id); },
  savedStatus(id) { return this.saved.find(s => s.id === id)?.status || null; },
  toggleSaved(m) {
    const i = this.saved.findIndex(s => s.id === m.id);
    if (i >= 0) {
      this.saved.splice(i, 1);
      if (this.auth) { this.pendingDel = [...new Set([...this.pendingDel, m.id])]; write('pendingDel', this.pendingDel); }
    } else {
      this.saved.unshift({ id: m.id, status: 'planning', at: Date.now(), st: Date.now(), m: snap(m) });
      if (this.pendingDel.includes(m.id)) { this.pendingDel = this.pendingDel.filter(x => x !== m.id); write('pendingDel', this.pendingDel); }
    }
    write('saved', this.saved); emit(); this.savedHook?.();
    return i < 0;
  },
  setStatus(id, status) {
    const s = this.saved.find(x => x.id === id); if (!s) return;
    s.status = status; s.st = Date.now(); write('saved', this.saved); emit(); this.savedHook?.();
  },
  // Used by sync: replace the saved list without triggering another sync.
  replaceSaved(list) { this.saved = list; write('saved', this.saved); emit(); },
  clearPendingDel() { this.pendingDel = []; write('pendingDel', []); },
  setSyncState(patch) { Object.assign(this.sync, patch); if ('at' in patch) write('syncAt', this.sync.at); emit(); },

  pushHistory(m) {
    this.history = [{ id: m.id, at: Date.now(), m: snap(m) }, ...this.history.filter(h => h.id !== m.id)].slice(0, 10);
    write('history', this.history);
  },

  addSearch(q) {
    q = q.trim(); if (!q) return;
    this.searches = [q, ...this.searches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    write('searches', this.searches);
  },
  removeSearch(q) { this.searches = this.searches.filter(s => s !== q); write('searches', this.searches); },
  clearSearches() { this.searches = []; write('searches', this.searches); },

  markNotifRead(ids) { this.notifRead = [...new Set([...this.notifRead, ...ids])]; write('notifRead', this.notifRead); emit(); },

  setAuth(a) { this.auth = a; write('auth', a); emit(); },
};
