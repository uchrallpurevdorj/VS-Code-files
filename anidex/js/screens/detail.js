import { h, icon, img, clear } from '../dom.js';
import { t, genreName, formatName, statusName, seasonName, sourceName } from '../i18n.js';
import { store } from '../store.js';
import { back } from '../router.js';
import * as api from '../api.js';
import { pcard, chip, sheet, toast, errorState, epsText, joinMeta } from '../ui.js';

export async function detail([id]) {
  const root = h('div', { class: 'screen detail no-tab' });
  const hero = h('div', { class: 'hero' });
  const bar = h('div', { class: 'hero-bar' },
    h('button', { class: 'circle-btn', type: 'button', 'aria-label': t('common.back'), onclick: () => back('/home') }, icon('back', 22)));
  hero.append(bar);
  const body = h('div', { class: 'dbody' });
  root.append(hero, body);

  const skeleton = () => clear(body).append(
    h('div', { class: 'sk', style: { height: '34px', width: '75%' } }), h('div', { class: 'sk sk-line', style: { width: '55%' } }),
    h('div', { class: 'sk', style: { height: '90px' } }), h('div', { class: 'sk', style: { height: '52px', borderRadius: '26px' } }));
  skeleton();

  async function load() {
    skeleton();
    try {
      const m = await api.detail(id);
      store.pushHistory(m);
      fill(m);
    } catch {
      clear(body).append(errorState(load));
    }
  }

  function fill(m) {
    hero.style.background = m.color || '';
    hero.querySelector('img')?.remove();
    hero.prepend(img(m.cover || m.banner, m.title));

    const saveBtn = h('button', { class: 'circle-btn', type: 'button' }, icon('bookmark', 22));
    const sync = () => {
      const on = store.isSaved(m.id);
      saveBtn.classList.toggle('on', on);
      saveBtn.setAttribute('aria-pressed', String(on));
      saveBtn.setAttribute('aria-label', t('detail.save'));
      clear(saveBtn).append(icon('bookmark', 22, { fill: on }));
    };
    saveBtn.addEventListener('click', () => { const on = store.toggleSaved(m); sync(); renderActions(); toast(on ? t('saved.added') : t('saved.removed')); });
    bar.append(saveBtn); sync();

    // title block
    const meta = h('div', { class: 'meta' },
      m.score ? h('b', { class: 'star' }, '★ ' + m.score.toFixed(1)) : null,
      epsText(m.episodes) ? h('span', null, epsText(m.episodes)) : null,
      m.year ? h('span', null, String(m.year)) : null,
      m.format ? h('span', null, formatName(m.format)) : null);

    const chipsEl = m.genres.length ? h('div', { class: 'chips wrap' }, m.genres.map(g => h('span', { class: 'chip static' }, genreName(g)))) : null;

    // next episode
    let nextEl = null;
    if (m.next && m.status === 'RELEASING') {
      const ms = m.next.at - Date.now();
      const hrs = Math.max(0, Math.floor(ms / 3600000)); const d = Math.floor(hrs / 24);
      const when = ms <= 0 ? t('detail.soon') : d > 0 ? t('detail.inDays', { d, h: hrs % 24 }) : t('detail.inHours', { h: hrs });
      nextEl = h('div', { class: 'nextep' }, h('span', { class: 'pulse' }), h('span', null, t('detail.nextEp') + ': ', h('b', null, '#' + m.next.episode), '  ·  ', when));
    }

    // description
    const desc = h('p', { class: 't-body desc' }, m.description || t('detail.noDesc'));
    let descWrap = desc;
    if (m.description && m.description.length > 220) {
      desc.classList.add('clamped');
      const more = h('button', { class: 'more', type: 'button', 'aria-expanded': 'false' }, t('detail.more'));
      more.addEventListener('click', () => { const open = desc.classList.toggle('clamped'); more.textContent = open ? t('detail.more') : t('detail.less'); more.setAttribute('aria-expanded', String(!open)); });
      descWrap = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } }, desc, more);
    }

    // actions
    const actions = h('div', { class: 'actions' });
    function renderActions() {
      clear(actions);
      actions.append(h('button', { class: 'btn primary block', type: 'button', onclick: () => whereSheet(m) }, t('detail.where')));
      actions.append(h('button', { class: 'btn outline block', type: 'button', disabled: !m.trailer, onclick: () => trailerSheet(m) }, icon('play', 18, { fill: true }), m.trailer ? t('detail.trailer') : t('detail.noTrailer')));
      if (store.isSaved(m.id)) {
        const st = store.savedStatus(m.id);
        actions.append(h('div', { class: 'seg', role: 'group' },
          h('button', { type: 'button', 'aria-pressed': String(st === 'planning'), onclick: () => { store.setStatus(m.id, 'planning'); renderActions(); } }, t('saved.planning')),
          h('button', { type: 'button', 'aria-pressed': String(st === 'watched'), onclick: () => { store.setStatus(m.id, 'watched'); renderActions(); } }, t('saved.watched'))));
      }
    }
    renderActions();

    // info grid
    const cells = [
      [t('detail.studio'), m.studio],
      [t('detail.season'), m.season ? joinMeta(seasonName(m.season), m.year) : (m.year ? String(m.year) : null)],
      [t('detail.status'), statusName(m.status)],
      [t('detail.duration'), m.duration ? t('detail.minutes', { n: m.duration }) : null],
      [t('detail.source'), sourceName(m.source)],
      [t('detail.format'), formatName(m.format)],
    ].filter(c => c[1]);
    const grid = cells.length ? h('div', { class: 'infogrid' }, cells.map(([k, v]) => h('div', null, h('span', { class: 't-cap muted' }, k), h('span', { class: 't-card' }, v)))) : null;

    const similar = m.similar.length ? h('section', { class: 'section' }, h('h2', { class: 't-section' }, t('detail.similar')), h('div', { class: 'carousel' }, m.similar.map(i => pcard(i)))) : null;

    clear(body);
    [
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('h1', { class: 't-detail' }, m.title),
        m.native && m.native !== m.title ? h('div', { class: 't-cap muted' }, m.native) : null),
      meta, chipsEl, nextEl, descWrap, actions, grid, similar,
    ].filter(Boolean).forEach(n => body.append(n));
  }

  load();
  return root;
}

function whereSheet(m) {
  const list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
  if (!m.links.length) list.append(h('p', { class: 't-body muted' }, t('detail.noLinks')));
  m.links.forEach(l => list.append(h('a', { class: 'linkrow', href: l.url, target: '_blank', rel: 'noopener noreferrer' },
    h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: /^#[0-9a-f]{3,8}$/i.test(l.color || '') ? l.color : 'var(--muted)', flex: 'none' } }),
    h('span', { style: { flex: 1 } }, l.site), icon('ext', 18))));
  sheet(t('detail.whereTitle'), list, h('p', { class: 't-cap muted' }, t('detail.whereNote')));
}

function trailerSheet(m) {
  const tr = m.trailer; if (!tr) return;
  const id = encodeURIComponent(tr.id);
  const src = tr.site === 'youtube' ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
    : tr.site === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${id}?autoplay=1` : null;
  if (!src) return;
  const s = sheet(t('detail.trailer'), h('div', { class: 'video' }, h('iframe', { src, title: m.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' })));
  return s;
}
