import { h, icon, logo, clear } from './dom.js';
import { t, lang } from './i18n.js';
import { store } from './store.js';
import * as router from './router.js';
import * as api from './api.js';
import { home, prefetchHome } from './screens/home.js';
import { notifications } from './screens/notifications.js';
import { searchScreen } from './screens/search.js';
import { saved } from './screens/saved.js';
import { detail } from './screens/detail.js';
import { listScreen } from './screens/list.js';
import { profile, appearance, language, about, legal } from './screens/profile.js';
import { toast } from './ui.js';

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

const FNS = { home, notifications, search: searchScreen, saved, profile, appearance, language, about, legal, detail, list: listScreen };
const TAB_ROOTS = new Set(['/home', '/search', '/saved', '/profile']);
let lastPath = null, lastTab = 'home';

async function onRoute(r, opts = {}) {
  const view = $('view');
  const prev = view.firstElementChild;
  if (prev && lastPath && TAB_ROOTS.has(lastPath)) router.saveScroll(lastPath, prev.scrollTop);

  const el = await FNS[r.name](r.params);
  clear(view).append(el);
  const tab = r.name === 'detail' || r.name === 'list' ? lastTab : r.tab;
  if (r.tab) lastTab = r.tab;
  setTab(tab, r.name === 'detail' || r.name === 'list');

  if (TAB_ROOTS.has(r.path) || opts.keepScroll) {
    const top = router.getScroll(r.path);
    if (top) { requestAnimationFrame(() => { el.scrollTop = top; }); setTimeout(() => { if (el.scrollTop < top - 4) el.scrollTop = top; }, 160); }
  }
  if (r.name === 'search' && el.autofocusSearch && !opts.keepScroll) el.autofocusSearch();
  const names = { home: 'nav.home', search: 'nav.search', saved: 'nav.saved', profile: 'nav.profile', notifications: 'notif.title' };
  document.title = (names[r.name] ? t(names[r.name]) + ' · ' : '') + 'Anidex';
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
    const b = h('button', { class: 'tab', type: 'button', 'aria-label': t('nav.' + key), onclick: () => tapTab(key) }, h('span', null, content));
    tabEls[key] = b; tabbar.append(b);
  });
}
function tapTab(key) {
  const path = '/' + key;
  if (router.parse().path === path) { $('view').firstElementChild?.scrollTo?.({ top: 0, behavior: 'smooth' }); return; }
  router.go(path);
}
function setTab(key, hidden) {
  const idx = Math.max(0, TABS.findIndex(x => x[0] === key));
  tabbar.style.setProperty('--i', idx);
  TABS.forEach(([k]) => { if (tabEls[k]) tabEls[k].toggleAttribute('aria-current', false), tabEls[k].removeAttribute('aria-current'); });
  if (tabEls[key]) tabEls[key].setAttribute('aria-current', 'page');
  tabbar.classList.toggle('hidden', !!hidden); fade.classList.toggle('hidden', !!hidden);
  tabbar.toggleAttribute('inert', !!hidden);
}

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
  if (!m) return false;
  const token = decodeURIComponent(m[1]);
  history.replaceState(null, '', location.pathname + location.search + '#/profile');
  try {
    const v = await api.viewer(token);
    store.setAuth({ token, name: v.name, avatar: v.avatar });
    setTimeout(() => toast(t('profile.loginOk')), 300);
  } catch { setTimeout(() => toast(t('profile.loginFail')), 300); }
  return true;
}

// ---------- offline banner ----------
function netBanner() {
  const set = () => {
    $('app').querySelector('.offline')?.remove();
    if (!navigator.onLine) $('app').append(h('div', { class: 'offline', role: 'status' }, t('common.offline')));
  };
  addEventListener('online', set); addEventListener('offline', set); set();
}

// ---------- boot ----------
async function boot() {
  applyTheme();
  buildTabs();
  const splash = $('splash');
  splash.querySelector('.logo-slot').append(logo(120, 14));
  const oauth = await handleOAuth();
  await Promise.race([Promise.all([sleep(800), prefetchHome()]), sleep(4000)]);
  router.start();
  netBanner();
  splash.classList.add('out');
  setTimeout(() => splash.remove(), 350);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  return oauth;
}
boot();
