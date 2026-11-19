import { h, icon, logo, clear } from '../dom.js';
import { t, CHIPS } from '../i18n.js';
import { store } from '../store.js';
import { go } from '../router.js';
import * as api from '../api.js';
import { pcard, rcard, arow, chip, sectionHead, skeletonCards, skeletonRows, errorState } from '../ui.js';
import { NOTIFICATIONS } from './notifications.js';

let selected = 'home'; // survives language changes / re-renders while the app is open

export async function home() {
  const root = h('div', { class: 'screen' });
  const unread = NOTIFICATIONS.some(n => !store.notifRead.includes(n.id));

  root.append(h('header', { class: 'home-head' },
    h('div', { class: 'brand' }, logo(44, 14),
      h('div', { class: 'greet' }, h('span', { class: 't-cap muted', style: { fontSize: '13px' } }, t('home.greeting')), h('span', { class: 't-app' }, 'Animore'))),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('notif.title'), onclick: () => go('/notifications') },
      icon('bell', 26), unread ? h('span', { class: 'dot' }) : null)));

  // Recently viewed (hidden when empty)
  if (store.history.length) {
    root.append(h('section', { class: 'section' },
      sectionHead(t('home.recent'), t('home.seeAll'), () => go('/list/recent')),
      h('div', { class: 'carousel' }, store.history.map(rcard))));
  }

  // Genre chips
  const chipRow = h('div', { class: 'chips', role: 'group', 'aria-label': t('search.byGenre') });
  const mainSec = h('section', { class: 'section' });
  const renderChips = () => {
    clear(chipRow);
    CHIPS.forEach(c => chipRow.append(chip(t('chip.' + c.key), { pressed: selected === c.key, onClick: () => { selected = c.key; renderChips(); loadMain(); } })));
  };
  root.append(chipRow, mainSec);
  renderChips();

  async function loadMain() {
    const c = CHIPS.find(x => x.key === selected) || CHIPS[0];
    const title = c.key === 'home' ? t('home.trending') : t('chip.' + c.key);
    const see = () => go('/list/' + (c.key === 'home' ? 'trending' : 'chip/' + c.key));
    clear(mainSec).append(sectionHead(title, t('home.seeAll'), see), skeletonCards());
    const mine = selected;
    try {
      const r = c.key === 'home' ? await api.trending({ perPage: 10 }) : await api.popularBy({ genre: c.genre, tag: c.tag }, { perPage: 10 });
      if (mine !== selected) return;
      clear(mainSec).append(sectionHead(title, t('home.seeAll'), see), h('div', { class: 'carousel' }, r.items.map(i => pcard(i))));
    } catch (e) { if (mine === selected) clear(mainSec).append(sectionHead(title), errorState(loadMain, true, e)); }
  }
  loadMain();

  // Random
  const randSec = h('section', { class: 'section' });
  root.append(randSec);
  const shuffleBtn = () => h('button', { class: 'link', type: 'button', style: { display: 'inline-flex', alignItems: 'center', gap: '6px' }, onclick: loadRandom }, icon('shuffle', 16), t('home.shuffle'));
  async function loadRandom() {
    clear(randSec).append(h('div', { class: 'section-head' }, h('h2', { class: 't-section' }, t('home.random')), shuffleBtn()), skeletonCards());
    try {
      const items = await api.random(8);
      clear(randSec).append(h('div', { class: 'section-head' }, h('h2', { class: 't-section' }, t('home.random')), shuffleBtn()), h('div', { class: 'carousel' }, items.map(i => pcard(i))));
    } catch (e) { clear(randSec).append(sectionHead(t('home.random')), errorState(loadRandom, true, e)); }
  }
  loadRandom();

  // New season
  const seasonSec = h('section', { class: 'section' });
  root.append(seasonSec);
  async function loadSeason() {
    clear(seasonSec).append(sectionHead(t('home.newSeason'), t('home.seeAll'), () => go('/list/season')), skeletonRows());
    try {
      const r = await api.newSeason({ perPage: 6 });
      clear(seasonSec).append(sectionHead(t('home.newSeason'), t('home.seeAll'), () => go('/list/season')), h('div', { class: 'stack' }, r.items.map(arow)));
    } catch (e) { clear(seasonSec).append(sectionHead(t('home.newSeason')), errorState(loadSeason, true, e)); }
  }
  loadSeason();
  return root;
}

// Used by the splash to warm the cache while the logo is showing.
export function prefetchHome() {
  return Promise.allSettled([api.trending({ perPage: 10 }), api.newSeason({ perPage: 6 })]);
}
