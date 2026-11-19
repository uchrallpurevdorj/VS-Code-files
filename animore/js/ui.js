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
// ---- errors ----
// kind: network (offline / no answer) | server | rate | notfound | gen
export function errKind(err) {
  if (!navigator.onLine || err?.kind === 'network') return 'network';
  return { server: 'server', rate: 'rate', notfound: 'notfound' }[err?.kind] || 'gen';
}
const ERR = {
  network: { ic: 'wifi', t: 'common.error', b: 'common.errorText' },
  server: { ic: 'warn', t: 'err.server.t', b: 'err.server.b' },
  rate: { ic: 'clock', t: 'err.rate.t', b: 'err.rate.b' },
  notfound: { ic: 'searchx', t: 'err.nf.t', b: 'err.nf.b' },
  gen: { ic: 'alert', t: 'err.gen.t', b: 'err.gen.b' },
};
function countdown(btn, n, retry) {
  const label = () => { btn.textContent = t('common.retryIn', { n }); };
  btn.disabled = true; label();
  const iv = setInterval(() => {
    if (!btn.isConnected) { clearInterval(iv); return; }
    n--;
    if (n <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = t('common.retry'); retry(); } else label();
  }, 1000);
}
export function errorState(retry, compact = false, err = null) {
  const kind = errKind(err); const k = ERR[kind];
  const big = !compact;
  const btn = (label, primary, fn) => h('button', { class: compact ? 'chip' : 'btn ' + (primary ? 'primary' : 'outline'), type: 'button', onclick: fn }, label);
  const actions = [];
  if (kind === 'notfound') actions.push(btn(t('common.home'), true, () => go('/home')));
  else {
    const r = btn(t('common.retry'), true, retry); actions.push(r);
    if (kind === 'rate') requestAnimationFrame(() => countdown(r, 30, retry));
    if (big && (kind === 'server' || kind === 'gen')) actions.push(btn(t('common.home'), false, () => go('/home')));
  }
  return h('div', { class: compact ? 'card errcard' : 'empty' },
    compact ? icon(k.ic, 28) : h('div', { class: 'circle' }, icon(k.ic, 40)),
    h('h2', { class: 't-card' }, t(k.t)),
    h('p', { class: 't-cap muted' }, t(k.b)),
    h('div', { class: 'err-actions' }, actions));
}
// Full-screen error (route failed to render / unknown page)
export function errorScreen(err, retry) {
  const root = h('div', { class: 'screen no-tab' });
  root.append(errorState(retry || (() => location.reload()), false, err));
  return root;
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

// Centered modal card over a blurred, dimmed app (fade in/out). content(close) returns the card element.
export function modal(content) {
  const app = document.getElementById('app');
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', esc);
    ov.querySelector('iframe')?.remove();
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 170);
  };
  const esc = e => { if (e.key === 'Escape') close(); };
  const ov = h('div', { class: 'overlay center', onclick: e => { if (e.target === ov) close(); } }, content(close));
  app.append(ov); document.addEventListener('keydown', esc);
  return { close, el: ov };
}
