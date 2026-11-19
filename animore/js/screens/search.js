import { h, icon, clear } from '../dom.js';
import { t, CHIPS } from '../i18n.js';
import { store } from '../store.js';
import { go } from '../router.js';
import * as api from '../api.js';
import { arow, chip, sectionHead, skeletonRows, emptyState, errorState, errKind } from '../ui.js';

export function searchScreen() {
  const root = h('div', { class: 'screen' });
  const input = h('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: t('search.placeholder'), 'aria-label': t('search.placeholder') });
  const clearBtn = h('button', { class: 'clear', type: 'button', 'aria-label': t('common.close'), hidden: true }, icon('close', 18));
  const box = h('label', { class: 'searchbox' }, h('span', { class: 'ico' }, icon('search', 20)), input, clearBtn);
  const body = h('div', { class: 'screen-body', style: { display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 } });
  root.append(h('div', { class: 'section', style: { gap: '16px' } }, h('h1', { class: 't-detail' }, t('search.title')), box), body);

  let token = 0, timer = 0;

  function idle() {
    clear(body);
    if (store.searches.length) {
      const list = h('div', { style: { display: 'flex', flexDirection: 'column' } });
      store.searches.forEach(q => list.append(h('div', { class: 'row', style: { minHeight: '44px', gap: '12px' } },
        h('span', { style: { color: 'var(--muted)', display: 'flex' } }, icon('clock', 20)),
        h('button', { class: 't-body clamp1', type: 'button', style: { flex: 1, textAlign: 'left', padding: '10px 0' }, onclick: () => { input.value = q; onInput(); } }, q),
        h('button', { type: 'button', 'aria-label': t('common.close'), style: { color: 'var(--muted)', padding: '10px' }, onclick: () => { store.removeSearch(q); idle(); } }, icon('close', 18)))));
      body.append(h('section', { class: 'section', style: { gap: '4px' } }, sectionHead(t('search.recent'), t('search.clear'), () => { store.clearSearches(); idle(); }), list));
    }
    body.append(h('section', { class: 'section' }, sectionHead(t('search.byGenre')),
      h('div', { class: 'chips wrap' }, CHIPS.filter(c => c.key !== 'home').map(c => chip(t('chip.' + c.key), { onClick: () => go('/list/chip/' + c.key) })))));
  }

  async function run(q) {
    const mine = ++token;
    clear(body).append(skeletonRows(5));
    try {
      const r = await api.search(q);
      if (mine !== token) return;
      clear(body);
      if (!r.items.length) { body.append(emptyState({ ic: 'search', title: t('search.notFound'), text: t('search.notFoundHint', { q }) })); return; }
      body.append(h('section', { class: 'section', style: { gap: '16px' } },
        h('div', { class: 't-cap muted' }, t('search.results', { n: r.items.length + (r.hasNext ? '+' : '') })),
        h('div', { class: 'stack cols2', onclick: () => store.addSearch(q) }, r.items.map(arow))));
    } catch (e) { if (mine === token) clear(body).append((errKind(e) === 'network' ? emptyState({ ic: 'wifioff', title: t('search.needNet'), text: t('search.needNetText') }) : errorState(() => run(q), false, e))); }
  }

  function onInput() {
    const q = input.value.trim();
    clearBtn.hidden = !input.value;
    clearTimeout(timer);
    if (!q) { token++; idle(); return; }
    timer = setTimeout(() => run(q), 350);
  }
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(timer); const q = input.value.trim(); if (q) { store.addSearch(q); run(q); } input.blur(); } });
  clearBtn.addEventListener('click', () => { input.value = ''; onInput(); input.focus(); });
  idle();
  root.autofocusSearch = () => { if (matchMedia('(pointer:fine)').matches) input.focus(); };
  return root;
}
