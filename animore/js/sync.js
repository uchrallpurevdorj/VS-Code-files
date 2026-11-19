// Two-way sync of the saved list with the user's AniList account (only when signed in).
// «Үзэх» (planning) <-> PLANNING, «Үзсэн» (watched) <-> COMPLETED. Nothing else is read or changed:
// entries the user keeps with other statuses on AniList (watching, dropped, ...) are left alone.
import { store, snap } from './store.js';
import * as api from './api.js';
import { t } from './i18n.js';
import { toast } from './ui.js';

const toRemote = s => (s === 'watched' ? 'COMPLETED' : 'PLANNING');
const toLocal = s => (s === 'COMPLETED' ? 'watched' : 'planning');
const isOurs = s => s === 'PLANNING' || s === 'COMPLETED';
const CAP = 300;       // never keep more than this many pulled entries on the device
const BATCH = 8;       // mutations per request
const sleep = ms => new Promise(r => setTimeout(r, ms));

let running = false, again = false, timer = null;

export function scheduleSync(delay = 1500) {
  if (!store.auth) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow({ silent: true }), delay);
}

// Returns {pushed, pulled} or null when nothing ran. silent = no toast on success.
export async function syncNow({ silent = false } = {}) {
  if (!store.auth) return null;
  if (running) { again = true; return null; }
  if (!navigator.onLine) { store.setSyncState({ state: 'fail', err: 'network' }); return null; }
  running = true; again = false;
  store.setSyncState({ state: 'syncing', done: 0, total: 0, err: null });
  try {
    if (!store.auth.id) { const v = await api.viewer(store.auth.token); store.setAuth({ ...store.auth, id: v.id, name: v.name, avatar: v.avatar }); }
    const { token, id: userId } = store.auth;
    const remote = await api.myList(token, userId);
    const byId = new Map(remote.filter(r => isOurs(r.status)).map(r => [r.mediaId, r]));
    const foreign = new Set(remote.filter(r => !isOurs(r.status)).map(r => r.mediaId));
    const ops = [];
    let pulled = 0, pushed = 0;

    // 1) removals made on this device
    const pending = new Set(store.pendingDel);
    for (const mid of pending) { const r = byId.get(mid); if (r) { ops.push({ t: 'del', entryId: r.entryId }); byId.delete(mid); } }

    // 2) compare local with remote
    let list = store.saved.map(s => ({ ...s }));
    for (const item of list) {
      const r = byId.get(item.id);
      if (!r) { if (!foreign.has(item.id)) { ops.push({ t: 'save', id: item.id, status: toRemote(item.status) }); pushed++; } continue; }
      if (toLocal(r.status) !== item.status) {
        if (r.updatedAt * 1000 > (item.st || item.at || 0)) { item.status = toLocal(r.status); item.st = r.updatedAt * 1000; pulled++; }
        else { ops.push({ t: 'save', id: item.id, status: toRemote(item.status) }); pushed++; }
      }
      byId.delete(item.id);
    }
    // 3) remote-only entries come to this device
    for (const r of byId.values()) {
      if (list.length >= CAP) break;
      list.push({ id: r.mediaId, status: toLocal(r.status), at: r.updatedAt * 1000 || Date.now(), st: r.updatedAt * 1000 || Date.now(), m: snap(r.media) });
      pulled++;
    }
    if (pulled) { list.sort((a, b) => (b.at || 0) - (a.at || 0)); store.replaceSaved(list); }

    // 4) write to AniList in small batches
    store.setSyncState({ total: ops.length, done: 0 });
    for (let i = 0; i < ops.length; i += BATCH) {
      await api.writeBatch(token, ops.slice(i, i + BATCH));
      store.setSyncState({ done: Math.min(ops.length, i + BATCH) });
      if (i + BATCH < ops.length) await sleep(350);
    }
    store.clearPendingDel();
    store.setSyncState({ state: 'ok', at: Date.now(), err: null });
    if (!silent) toast(summary(pushed, pulled));
    return { pushed, pulled };
  } catch (err) {
    if (err?.kind === 'auth') {
      store.setAuth(null); store.setSyncState({ state: 'idle', at: null, err: null }); store.clearPendingDel();
      toast(t('sync.expired'));
    } else store.setSyncState({ state: 'fail', err: err?.kind || 'gen' });
    return null;
  } finally {
    running = false;
    if (again) scheduleSync(400);
  }
}

function summary(pushed, pulled) {
  if (pushed && pulled) return t('sync.toast.both', { a: pushed, b: pulled });
  if (pushed) return t('sync.toast.push', { n: pushed });
  if (pulled) return t('sync.toast.pull', { n: pulled });
  return t('sync.toast.same');
}

export function initSync(justSignedIn = false) {
  store.savedHook = scheduleSync;
  addEventListener('online', () => { if (store.auth && store.sync.state === 'fail') scheduleSync(600); });
  const a = store.auth;
  if (!a || justSignedIn) return;
  if (a.exp && Date.now() > a.exp) { store.setAuth(null); store.clearPendingDel(); toast(t('sync.expired')); return; }
  // Pick up changes made on AniList / another device, but not on every quick re-open.
  if (!store.sync.at || Date.now() - store.sync.at > 10 * 60000) scheduleSync(2500);
}
