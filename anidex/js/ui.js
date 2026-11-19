import { h, icon, img, clear } from './dom.js';
import { t, genreName, formatName, relTime } from './i18n.js';
import { go, back } from './router.js';

export const epsText = n => (n ? t('common.episodes', { n }) : null);
export const joinMeta = (...p) => p.filter(Boolean).join('  ·  ');

export function poster(item, { score = true, bookmark = false, cls = '' } = {}) {
  const el = h('div', { class: 'poster ' + cls, style: item.color ? { background: item.color } : null });
  const im = img(item.coverSm || item.cover, item.title);
  el.append(im);
  if (bookmark) el.append(h('div', { class: 'badge-bm' }, icon('bookmark', 18, { fill: true })));
  if (score && item.score) el.append(h('div', { class: 'score' }, '★ ' + item.score.toFixed(1)));
  return el;
}

export function pcard(item, opts = {}) {
  return h('button', { class: 'pcard', type: 'button', onclick: () => go('/detail/' + item.id), 'aria-label': item.title },
    poster(item, opts),
    h('div', { class: 't clamp1' }, item.title),
    h('div', { class: 't-cap muted clamp1' }, joinMeta(epsText(item.episodes), item.year)),
  );
}

export function rcard(entry) {
  const m = entry.m;
  return h('button', { class: 'rcard', type: 'button', onclick: () => go('/detail/' + m.id), 'aria-label': m.title },
    poster({ ...m, coverSm: m.cover }, { score: false }),
    h('div', { class: 't-card clamp1', style: { fontSize: '14px' } }, m.title),
    h('div', { class: 't-cap muted' }, relTime(entry.at)),
  );
}

export function arow(item) {
  return h('button', { class: 'arow', type: 'button', onclick: () => go('/detail/' + item.id) },
    poster(item, { score: false }),
    h('div', { class: 'info' },
      h('div', { class: 't-card clamp1' }, item.title),
      h('div', { class: 't-cap muted' },
        item.score ? h('span', { class: 'star' }, '★ ' + item.score.toFixed(1)) : null,
        item.score && (item.episodes || item.format) ? '  ·  ' : '',
        joinMeta(epsText(item.episodes) || formatName(item.format))),
      h('div', { class: 't-cap muted clamp1' }, (item.genres || []).slice(0, 2).map(genreName).join(' · ')),
    ),
  );
}

export function chip(label, { pressed = null, onClick, cls = '' } = {}) {
  return h('button', { class: 'chip ' + cls, type: 'button', 'aria-pressed': pressed == null ? null : String(!!pressed), onclick: onClick }, label);
}

export function sectionHead(title, actionLabel, onAction, extra) {
  return h('div', { class: 'section-head' },
    h('h2', { class: 't-section' }, title),
    extra || null,
    actionLabel ? h('button', { class: 'link', type: 'button', onclick: onAction }, actionLabel) : null);
}

export function skeletonCards(n = 3) {
  return h('div', { class: 'carousel', 'aria-hidden': 'true' }, Array.from({ length: n }, () =>
    h('div', { class: 'pcard' }, h('div', { class: 'sk', style: { aspectRatio: '5/7', borderRadius: '14px' } }),
      h('div', { class: 'sk sk-line', style: { width: '80%' } }), h('div', { class: 'sk sk-line', style: { width: '50%' } }))));
}
export function skeletonRows(n = 3) {
  return h('div', { class: 'stack', 'aria-hidden': 'true' }, Array.from({ length: n }, () =>
    h('div', { class: 'arow' }, h('div', { class: 'sk', style: { width: '64px', height: '88px', borderRadius: '12px', flex: 'none' } }),
      h('div', { class: 'info' }, h('div', { class: 'sk sk-line', style: { width: '70%' } }), h('div', { class: 'sk sk-line', style: { width: '45%' } })))));
}

export function emptyState({ ic = 'search', title, text, btn, onBtn }) {
  return h('div', { class: 'empty' },
    h('div', { class: 'circle' }, icon(ic, 40)),
    h('h2', { class: 't-card' }, title),
    text ? h('p', { class: 't-cap muted' }, text) : null,
    btn ? h('button', { class: 'btn primary', type: 'button', onclick: onBtn, style: { marginTop: '8px' } }, btn) : null);
}
export function errorState(retry, compact = false) {
  const el = h('div', { class: compact ? 'card' : 'empty', style: compact ? { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' } : null },
    compact ? icon('wifi', 28) : h('div', { class: 'circle' }, icon('wifi', 40)),
    h('h2', { class: 't-card' }, t('common.error')),
    h('p', { class: 't-cap muted' }, t('common.errorText')),
    h('button', { class: compact ? 'chip' : 'btn primary', type: 'button', onclick: retry, style: compact ? null : { marginTop: '8px' } }, t('common.retry')));
  return el;
}

export function navbar(title, fallback) {
  return h('div', { class: 'navbar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.back'), onclick: () => back(fallback) }, icon('back', 24)),
    h('h1', { class: 't-section' }, title));
}

// ---- overlays ----
export function sheet(title, ...content) {
  const app = document.getElementById('app');
  const close = () => { ov.remove(); document.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'grab' }),
    h('div', { class: 'section-head' }, h('h2', { class: 't-section' }, title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), onclick: close, style: { margin: '-10px -10px -10px 0' } }, icon('close', 22))),
    ...content);
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) close(); } }, panel);
  app.append(ov); document.addEventListener('keydown', esc);
  panel.querySelector('button')?.focus?.();
  return { close, panel };
}

let toastEl;
export function toast(text) {
  toastEl?.remove();
  toastEl = h('div', { class: 'toast', role: 'status' }, text);
  document.getElementById('app').append(toastEl);
  setTimeout(() => toastEl?.remove(), 2000);
}

export { clear };
