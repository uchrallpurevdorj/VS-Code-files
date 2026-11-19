import { h, icon, logo, clear } from './dom.js';
import { t, lang } from './i18n.js';
import { store } from './store.js';
import * as router from './router.js';
import * as api from './api.js';
import { syncNow, initSync } from './sync.js';
import { home, prefetchHome } from './screens/home.js';
import { notifications } from './screens/notifications.js';
import { searchScreen } from './screens/search.js';
import { saved } from './screens/saved.js';
import { detail } from './screens/detail.js';
import { listScreen } from './screens/list.js';
import { profile, appearance, language, about, legal } from './screens/profile.js';
import { toast, sheet, errorScreen } from './ui.js';
import { APP_VERSION } from './config.js';

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- theme ----------
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const pref = store.settings.theme;
  const eff = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = eff;
  document.documentElement.lang = lang();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', eff === 'dark' ? '#141414' : '#F7F7F8');
}
mq.addEventListener?.('change', () => { if (store.settings.theme === 'system') applyTheme(); });

// ---------- routes ----------
router.define([
  { name: 'home', re: /^\/home$/, tab: 'home', fn: home },
  { name: 'notifications', re: /^\/notifications$/, tab: 'home', fn: notifications },
  { name: 'search', re: /^\/search$/, tab: 'search', fn: searchScreen },
  { name: 'saved', re: /^\/saved$/, tab: 'saved', fn: saved },
  { name: 'profile', re: /^\/profile$/, tab: 'profile', fn: profile },
  { name: 'appearance', re: /^\/profile\/appearance$/, tab: 'profile', fn: appearance },
  { name: 'language', re: /^\/profile\/language$/, tab: 'profile', fn: language },
  { name: 'about', re: /^\/profile\/about$/, tab: 'profile', fn: about },
  { name: 'legal', re: /^\/profile\/legal$/, tab: 'profile', fn: legal },
  { name: 'detail', re: /^\/detail\/(\d+)$/, tab: null, fn: detail },
  { name: 'list', re: /^\/list\/([a-z]+)(?:\/([a-z]+))?$/, tab: null, fn: listScreen },
], onRoute);

const FNS = { notfound: () => errorScreen({ kind: 'notfound' }), home, notifications, search: searchScreen, saved, profile, appearance, language, about, legal, detail, list: listScreen };
const TAB_ROOTS = new Set(['/home', '/search', '/saved', '/profile']);
let lastPath = null, lastTab = 'home';

async function onRoute(r, opts = {}) {
  const view = $('view');
  const prev = view.firstElementChild;
  if (prev && lastPath && TAB_ROOTS.has(lastPath)) router.saveScroll(lastPath, prev.scrollTop);

  let el;
  try { el = await FNS[r.name](r.params); } catch (e) { el = errorScreen(e, () => router.refresh()); }
  clear(view).append(el);
  const hideTabs = r.name === 'detail' || r.name === 'list' || r.name === 'notfound';
  const tab = hideTabs ? lastTab : r.tab;
  if (r.tab) lastTab = r.tab;
  setTab(tab, hideTabs);

  if (TAB_ROOTS.has(r.path) || opts.keepScroll) {
    const top = router.getScroll(r.path);
    if (top) { requestAnimationFrame(() => { el.scrollTop = top; }); setTimeout(() => { if (el.scrollTop < top - 4) el.scrollTop = top; }, 160); }
  }
  if (r.name === 'search' && el.autofocusSearch && !opts.keepScroll) el.autofocusSearch();
  const names = { home: 'nav.home', search: 'nav.search', saved: 'nav.saved', profile: 'nav.profile', notifications: 'notif.title' };
  document.title = (names[r.name] ? t(names[r.name]) + ' · ' : '') + 'Animore';
  lastPath = r.path;
}

// ---------- tab bar ----------
const TABS = [['home', 'home'], ['search', 'search'], ['saved', 'bookmark'], ['profile', 'user']];
const tabbar = $('tabbar');
const fade = $('bottom-fade');
const dot = h('span', { class: 'tab-dot', 'aria-hidden': 'true' });
const tabEls = {};
function buildTabs() {
  clear(tabbar).append(dot);
  TABS.forEach(([key, ic], i) => {
    const content = key === 'profile' && store.auth?.avatar
      ? h('img', { class: 'avatar-mini', src: store.auth.avatar, alt: '', referrerpolicy: 'no-referrer' })
      : icon(ic, 24);
    const b = h('button', { class: 'tab', type: 'button', 'aria-label': t('nav.' + key), onclick: () => tapTab(key) }, h('span', null, content), h('small', { class: 'tab-label', 'aria-hidden': 'true' }, t('nav.' + key)));
    tabEls[key] = b; tabbar.append(b);
  });
}
function tapTab(key) {
  const path = '/' + key;
  if (router.parse().path === path) { $('view').firstElementChild?.scrollTo?.({ top: 0, behavior: 'smooth' }); return; }
  router.go(path);
}
// Tablet / wide screens: the tab bar becomes a side rail that stays visible on every screen.
const wide = matchMedia('(min-width:600px)');
let lastHidden = false;
function setTab(key, hidden) {
  lastHidden = hidden;
  const idx = Math.max(0, TABS.findIndex(x => x[0] === key));
  tabbar.style.setProperty('--i', idx);
  TABS.forEach(([k]) => { if (tabEls[k]) tabEls[k].toggleAttribute('aria-current', false), tabEls[k].removeAttribute('aria-current'); });
  if (tabEls[key]) tabEls[key].setAttribute('aria-current', 'page');
  tabbar.classList.toggle('hidden', !!hidden); fade.classList.toggle('hidden', !!hidden);
  tabbar.toggleAttribute('inert', !!hidden && !wide.matches);
}

wide.addEventListener?.('change', () => setTab(lastTab, lastHidden));

// ---------- store reactions ----------
let lastSettings = JSON.stringify(store.settings), lastAuth = JSON.stringify(store.auth);
store.subscribe(() => {
  const s = JSON.stringify(store.settings), a = JSON.stringify(store.auth);
  if (s !== lastSettings) { lastSettings = s; applyTheme(); buildTabs(); setTab(lastTab, false); }
  if (a !== lastAuth) { lastAuth = a; buildTabs(); setTab(lastTab, false); }
});

// ---------- AniList OAuth (implicit grant) ----------
async function handleOAuth() {
  const m = location.hash.match(/access_token=([^&]+)/);
  const denied = /[#?&]error=/.test(location.hash + location.search);   // user pressed "Decline" on AniList
  if (!m && !denied) return false;
  const token = m ? decodeURIComponent(m[1]) : null;
  const exp = Date.now() + (Number((location.hash.match(/expires_in=(\d+)/) || [])[1]) || 0) * 1000;
  history.replaceState(null, '', location.pathname + (m ? location.search : '') + '#/profile');
  if (!token) { setTimeout(() => toast(t('profile.loginFail')), 300); return true; }
  try {
    const v = await api.viewer(token);
    store.setAuth({ token, name: v.name, avatar: v.avatar, id: v.id, exp: exp > Date.now() ? exp : null });
    setTimeout(() => toast(t('profile.loginOk')), 300);
  } catch { setTimeout(() => toast(t('profile.loginFail')), 300); }
  return true;
}

// ---------- offline strip (slim bar under the status area) ----------
function netBar() {
  const app = $('app');
  let wasOffline = !navigator.onLine;
  const set = () => {
    app.querySelector('.netbar')?.remove();
    const off = !navigator.onLine;
    app.classList.toggle('has-offline', off);
    if (off) app.append(h('div', { class: 'netbar', role: 'status' }, icon('wifioff', 14), t('common.offline')));
    // Back online: re-run the screen if it is showing an error.
    if (!off && wasOffline && $('view').querySelector('.empty, .errcard')) router.refresh();
    wasOffline = off;
  };
  addEventListener('online', set); addEventListener('offline', set); set();
}

// ---------- first launch without internet: full-screen gate ----------
function offlineGate() {
  return new Promise(resolve => {
    const circle = h('div', { class: 'circle' });
    const title = h('h2', { class: 't-card' });
    const text = h('p', { class: 't-cap muted' });
    const btn = h('button', { class: 'btn primary', type: 'button', style: { marginTop: '8px' } }, t('common.retry'));
    const el = h('div', { id: 'gate', class: 'empty', role: 'alert' }, circle, title, text, h('div', { class: 'err-actions' }, btn));
    let busy = false;
    const view = state => {
      clear(circle).append(state === 'conn' ? h('span', { class: 'spinner' }) : icon('wifioff', 40));
      title.textContent = t(state === 'conn' ? 'net.connecting' : 'net.title');
      text.textContent = t(state === 'conn' ? 'net.connectingText' : 'net.text');
      btn.disabled = state === 'conn';
    };
    const attempt = async () => {
      if (busy) return; busy = true; view('conn');
      const [, ok] = await Promise.all([sleep(900), navigator.onLine ? api.ping() : false]);
      if (ok) { await Promise.race([prefetchHome(), sleep(4000)]); removeEventListener('online', attempt); el.remove(); busy = false; resolve(); return; }
      busy = false; view('off');
    };
    btn.addEventListener('click', attempt); addEventListener('online', attempt);
    view('off'); $('app').append(el);
  });
}

// ---------- updates (service worker "waiting" -> ask the user) ----------
let refreshing = false, prompting = false;
function workerVersion(w) {
  return new Promise(res => {
    try { const ch = new MessageChannel(); ch.port1.onmessage = e => res(String(e.data || '').replace(/^animore-v/, '')); w.postMessage('GET_VERSION', [ch.port2]); } catch { res(''); }
    setTimeout(() => res(''), 800);
  });
}
async function promptUpdate(w) {
  if (prompting || sessionStorage.getItem('animore:upd:later')) return;
  prompting = true;
  const v = await workerVersion(w);
  const s = sheet(t('upd.title'),
    v ? h('div', { class: 'vchip' }, `${APP_VERSION}  →  ${v}`) : null,
    h('p', { class: 't-body muted' }, t('upd.text')),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => { s.close(); applyUpdate(w); } }, t('upd.now')),
    h('button', { class: 'btn outline block', type: 'button', onclick: () => { sessionStorage.setItem('animore:upd:later', '1'); s.close(); } }, t('upd.later')));
}
function applyUpdate(w) {
  $('app').append(h('div', { id: 'updating', role: 'status' },
    h('div', { class: 'logo-slot' }, logo(120, 14)), h('div', { class: 'name' }, 'Animore'),
    h('div', { class: 'bar' }, h('i')), h('div', { class: 'upd-text' }, t('upd.updating')), h('div', { class: 'credit' }, 'Data by AniList')));
  sessionStorage.setItem('animore:updated', '1');
  refreshing = true;
  w.postMessage('SKIP_WAITING');
  setTimeout(() => location.reload(), 6000);   // safety net
}
async function setupSW() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing) location.reload(); });
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    const check = () => { if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting); };
    check();
    reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'installed') check(); }); });
    const poll = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
    setInterval(poll, 30 * 60 * 1000);
  } catch { /* ignore */ }
}

// ---------- boot ----------
async function boot() {
  applyTheme();
  buildTabs();
  const splash = $('splash');
  splash.querySelector('.logo-slot').append(logo(120, 14));
  const hideSplash = () => { splash.classList.add('out'); setTimeout(() => splash.remove(), 350); };
  const oauth = await handleOAuth();
  await Promise.race([Promise.all([sleep(800), prefetchHome()]), sleep(4000)]);
  if (!api.hasCache() && (!navigator.onLine || !(await api.ping()))) { hideSplash(); await offlineGate(); }
  else hideSplash();
  router.start();
  netBar();
  initSync(oauth && !!store.auth);                                       // right after sign-in: sync now (below), not on a timer
  if (oauth && store.auth) syncNow();                                    // first sync merges both lists; runs once the app is on screen
  if (sessionStorage.getItem('animore:updated')) { sessionStorage.removeItem('animore:updated'); setTimeout(() => toast(t('upd.done', { v: APP_VERSION })), 700); }
  setupSW();
  return oauth;
}
boot();
