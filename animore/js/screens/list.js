// Generic "See all" screen: recent history, trending, season, or a genre chip.
import { h, clear } from '../dom.js';
import { t, CHIPS } from '../i18n.js';
import { store } from '../store.js';
import * as api from '../api.js';
import { pcard, navbar, skeletonCards, errorState, rcard } from '../ui.js';

export function listScreen([kind, key]) {
  const root = h('div', { class: 'screen no-tab' });
  const chipDef = kind === 'chip' ? CHIPS.find(c => c.key === key) : null;
  const title = kind === 'recent' ? t('home.recent') : kind === 'season' ? t('home.newSeason') : kind === 'chip' ? t('chip.' + key) : t('home.trending');
  root.append(navbar(title, '/home'));

  if (kind === 'recent') {
    root.append(h('div', { class: 'grid2' }, store.history.map(e => rcard(e))));
    root.querySelectorAll('.rcard').forEach(c => { c.style.width = 'auto'; c.querySelector('.poster').style.height = 'auto'; c.querySelector('.poster').style.aspectRatio = '5/7'; });
    return root;
  }

  const grid = h('div', { class: 'grid2' });
  const more = h('button', { class: 'btn outline block', type: 'button', hidden: true }, t('common.loadMore'));
  const status = h('div');
  root.append(grid, status, more);
  let pageNo = 1, busy = false;

  async function load() {
    if (busy) return; busy = true; more.hidden = true; clear(status);
    if (pageNo === 1) status.append(h('div', { class: 'grid2' }, Array.from({ length: 4 }, () => h('div', { class: 'sk', style: { aspectRatio: '5/7', borderRadius: '14px' } }))));
    try {
      const o = { page: pageNo, perPage: 20 };
      const r = kind === 'season' ? await api.newSeason(o)
        : kind === 'chip' ? await api.popularBy({ genre: chipDef?.genre, tag: chipDef?.tag }, o)
        : await api.trending(o);
      clear(status);
      r.items.forEach(i => grid.append(pcard(i)));
      more.hidden = !r.hasNext; pageNo++;
    } catch (e) { clear(status).append(errorState(() => { busy = false; load(); }, true, e)); }
    busy = false;
  }
  more.addEventListener('click', load);
  load();
  return root;
}
