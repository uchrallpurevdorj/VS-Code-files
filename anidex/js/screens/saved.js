import { h, clear } from '../dom.js';
import { t } from '../i18n.js';
import { store } from '../store.js';
import { go } from '../router.js';
import { pcard, chip, emptyState } from '../ui.js';

let filter = 'all';

export function saved() {
  const root = h('div', { class: 'screen' });
  const head = h('div', { class: 'section', style: { gap: '4px' } }, h('h1', { class: 't-detail' }, t('saved.title')));
  root.append(head);

  if (!store.saved.length) {
    root.append(emptyState({ ic: 'bookmark', title: t('saved.empty'), text: t('saved.emptyText'), btn: t('saved.emptyBtn'), onBtn: () => go('/search') }));
    return root;
  }
  head.append(h('div', { class: 't-cap muted' }, t('saved.count', { n: store.saved.length })));

  const chipRow = h('div', { class: 'chips', role: 'group' });
  const gridHost = h('div');
  root.append(chipRow, gridHost);

  const render = () => {
    clear(chipRow);
    [['all', t('saved.all')], ['planning', t('saved.planning')], ['watched', t('saved.watched')]].forEach(([k, label]) =>
      chipRow.append(chip(label, { pressed: filter === k, onClick: () => { filter = k; render(); } })));
    const list = store.saved.filter(s => filter === 'all' || s.status === filter);
    clear(gridHost);
    if (!list.length) { gridHost.append(emptyState({ ic: 'bookmark', title: t('saved.filterEmpty') })); return; }
    gridHost.append(h('div', { class: 'grid2' }, list.map(s => pcard({ ...s.m, coverSm: s.m.coverSm || s.m.cover }, { bookmark: true }))));
  };
  render();
  return root;
}
