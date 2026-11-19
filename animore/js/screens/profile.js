import { h, icon, logo } from '../dom.js';
import { syncNow } from '../sync.js';
import { t, relTime } from '../i18n.js';
import { store } from '../store.js';
import { go } from '../router.js';
import { APP_VERSION, ANILIST_CLIENT_ID } from '../config.js';
import { navbar, sheet, toast } from '../ui.js';
import { refresh } from '../router.js';
import { notificationBell } from './profile-bell.js';

const guestAvatar = size => h('div', { class: 'avatar' }, icon('user', size));

function authorize() {
  location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(ANILIST_CLIENT_ID)}&response_type=token`;
}

// Consent sheet: say what will be synced before sending the user to AniList.
function startLogin() {
  if (!navigator.onLine) { toast(t('profile.loginNeedNet')); return; }
  if (!ANILIST_CLIENT_ID) {
    sheet(t('profile.loginSoon'), h('p', { class: 't-body muted' }, t('profile.loginSoonText')));
    return;
  }
  const s = sheet(t('login.t'),
    h('p', { class: 't-body muted' }, t('login.body')),
    h('p', { class: 't-cap muted' }, t('login.token')),
    h('div', { class: 'stack', style: { gap: '12px' } },
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { s.close(); authorize(); } }, t('login.continue')),
      h('button', { class: 'btn outline block', type: 'button', onclick: () => s.close() }, t('login.cancel'))));
}

function logoutSheet() {
  const s = sheet(t('logout.t'),
    h('p', { class: 't-body muted' }, t('logout.b')),
    h('div', { class: 'stack', style: { gap: '12px' } },
      h('button', { class: 'btn primary block', type: 'button', onclick: () => { s.close(); store.setAuth(null); store.clearPendingDel(); store.setSyncState({ state: 'idle', at: null, err: null }); refresh(); } }, t('profile.logout')),
      h('button', { class: 'btn outline block', type: 'button', onclick: () => s.close() }, t('login.cancel'))));
}

function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return t('sync.justNow');
  if (m < 60) return t('sync.minAgo', { n: m });
  if (m < 1440) return t('sync.hrAgo', { n: Math.floor(m / 60) });
  return relTime(ts);
}

// Small status card under the profile header: syncing / synced / failed.
function syncCard() {
  const s = store.sync;
  if (s.state === 'syncing') {
    return h('div', { class: 'card synccard', role: 'status' },
      h('div', { class: 'srow' }, h('span', { class: 'spin' }, icon('spin', 16)), h('span', { class: 'grow clamp1' }, t('sync.ing'))),
      h('div', { class: 'bar' + (s.total ? '' : ' ind') }, h('i', { style: s.total ? { width: Math.round(s.done / s.total * 100) + '%' } : null })),
      s.total ? h('div', { class: 't-cap muted' }, t('sync.progress', { done: s.done, total: s.total })) : null);
  }
  if (s.state === 'fail') {
    return h('div', { class: 'card synccard fail', role: 'alert' },
      h('div', { class: 'srow' }, icon('warn', 16), h('span', { class: 'grow' }, t('sync.failT'))),
      h('p', { class: 't-cap muted' }, t('sync.failB')),
      h('button', { class: 'lnk', type: 'button', onclick: () => syncNow() }, t('sync.retry')));
  }
  return h('div', { class: 'card synccard ok' },
    s.at ? icon('check', 16) : null,
    h('span', { class: 'grow clamp1' }, s.at ? t('sync.done') + '  ·  ' + ago(s.at) : t('sync.never')),
    h('button', { class: 'lnk', type: 'button', onclick: () => syncNow() }, s.at ? t('sync.again') : t('sync.now')));
}

function statsCard() {
  const counts = { saved: store.saved.length, watched: store.saved.filter(s => s.status === 'watched').length, planning: store.saved.filter(s => s.status === 'planning').length };
  return h('div', { class: 'card stats' },
    h('div', null, h('b', { class: 't-section' }, counts.saved), h('span', { class: 't-cap muted' }, t('profile.stats.saved'))), h('i'),
    h('div', null, h('b', { class: 't-section' }, counts.watched), h('span', { class: 't-cap muted' }, t('profile.stats.watched'))), h('i'),
    h('div', null, h('b', { class: 't-section' }, counts.planning), h('span', { class: 't-cap muted' }, t('profile.stats.planning'))));
}

function setRow(ic, label, value, onclick) {
  return h('button', { class: 'setrow', type: 'button', onclick },
    h('span', { class: 'ico' }, icon(ic, 20)), h('span', { class: 'grow' }, label),
    value ? h('span', { class: 'val' }, value) : null, h('span', { class: 'chev' }, icon('chev', 18)));
}

export function profile() {
  const root = h('div', { class: 'screen' });
  const left = h('div', { class: 'pcol' }), right = h('div', { class: 'pcol' });
  root.append(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h1', { class: 't-detail' }, t('profile.title')), notificationBell()));

  const a = store.auth;
  if (a) {
    const syncHost = h('div', { class: 'synchost' }, syncCard()), statsHost = h('div', { class: 'statshost' }, statsCard());
    left.append(
      h('div', { class: 'row', style: { gap: '16px' } },
        h('div', { class: 'avatar ring' }, a.avatar ? h('img', { src: a.avatar, alt: '', referrerpolicy: 'no-referrer' }) : icon('user', 36)),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } }, h('div', { class: 't-section clamp1' }, a.name), h('div', { class: 't-cap muted' }, '@' + a.name))),
      syncHost, statsHost);
    // keep both cards live while this screen is on show (sync progress, list changes)
    let seen = false;
    const unsub = store.subscribe(() => {
      if (root.isConnected) seen = true; else if (seen) { unsub(); return; }
      if (!store.auth) { unsub(); refresh(); return; }   // signed out elsewhere (e.g. expired token)
      syncHost.replaceChildren(syncCard()); statsHost.replaceChildren(statsCard());
    });
  } else {
    left.append(h('div', { class: 'card guest' },
      guestAvatar(36), h('h2', { class: 't-section' }, t('profile.guest')), h('p', { class: 't-cap muted' }, t('profile.guestText')),
      h('button', { class: 'btn primary block', type: 'button', onclick: startLogin }, t('profile.login'))));
  }

  const themeLabel = { dark: t('appearance.dark'), light: t('appearance.light'), system: t('appearance.system') }[store.settings.theme] || t('appearance.dark');
  right.append(h('div', { class: 'group' },
    setRow('moon', t('profile.appearance'), themeLabel, () => go('/profile/appearance')),
    setRow('globe', t('profile.language'), store.settings.lang === 'en' ? 'English' : 'Монгол', () => go('/profile/language')),
    setRow('info', t('profile.about'), null, () => go('/profile/about'))));

  if (a) right.append(h('button', { class: 'btn danger block', type: 'button', onclick: logoutSheet }, icon('logout', 20), t('profile.logout')));
  root.append(h('div', { class: 'pcols' }, left, right));
  return root;
}

export function appearance() {
  const root = h('div', { class: 'screen narrow' }, navbar(t('profile.appearance'), '/profile'));
  const sw = (bg, bar) => h('div', { style: { background: bg } }, h('i', { style: { width: '60%', background: bar } }), h('i', { style: { width: '40%', background: '#FF0000' } }));
  const opts = [
    ['dark', t('appearance.dark'), t('appearance.darkSub'), h('div', { class: 'swatch' }, sw('#141414', '#343434'))],
    ['light', t('appearance.light'), t('appearance.lightSub'), h('div', { class: 'swatch' }, sw('#F7F7F8', '#DADADD'))],
    ['system', t('appearance.system'), t('appearance.systemSub'), h('div', { class: 'swatch' }, sw('#141414', '#343434'), sw('#F7F7F8', '#DADADD'))],
  ];
  const list = h('div', { class: 'stack', style: { gap: '12px' }, role: 'radiogroup' });
  opts.forEach(([k, label, sub, vis]) => list.append(h('button', { class: 'opt', type: 'button', role: 'radio', 'aria-checked': String(store.settings.theme === k), onclick: () => { store.setSetting('theme', k); refresh(); } },
    vis, h('span', { class: 'txt' }, h('span', { class: 't-card' }, label), h('span', { class: 't-cap muted' }, sub)), h('span', { class: 'radio' }, store.settings.theme === k ? icon('check', 14, { sw: 2.6 }) : null))));
  root.append(list);
  return root;
}

export function language() {
  const root = h('div', { class: 'screen narrow' }, navbar(t('profile.language'), '/profile'));
  const list = h('div', { class: 'stack', style: { gap: '12px' }, role: 'radiogroup' });
  [['mn', 'MN', t('lang.mn'), t('lang.mnSub')], ['en', 'EN', t('lang.en'), t('lang.enSub')]].forEach(([k, b, label, sub]) =>
    list.append(h('button', { class: 'opt', type: 'button', role: 'radio', 'aria-checked': String(store.settings.lang === k), onclick: () => { store.setSetting('lang', k); refresh(); } },
      h('span', { class: 'badge-lang' }, b), h('span', { class: 'txt' }, h('span', { class: 't-card' }, label), h('span', { class: 't-cap muted' }, sub)),
      h('span', { class: 'radio' }, store.settings.lang === k ? icon('check', 14, { sw: 2.6 }) : null))));
  root.append(list);
  return root;
}

export function about() {
  const root = h('div', { class: 'screen narrow' }, navbar(t('profile.about'), '/profile'));
  root.append(
    h('div', { class: 'about-hero' }, logo(88, 14), h('div', { class: 't-app' }, 'Animore'), h('div', { class: 't-cap muted' }, t('about.version') + ' ' + APP_VERSION),
      h('p', { class: 't-body muted' }, t('about.desc'))),
    h('div', { class: 'group' },
      h('div', { class: 'inforow' }, h('span', null, t('about.version')), h('span', { class: 'muted' }, APP_VERSION)),
      h('div', { class: 'inforow' }, h('span', null, t('about.source')), h('a', { class: 'muted', href: 'https://anilist.co', target: '_blank', rel: 'noopener noreferrer' }, 'AniList')),
      h('div', { class: 'inforow' }, h('span', null, t('about.developer')), h('span', { class: 'muted' }, 'IVE')),
      h('button', { class: 'setrow', type: 'button', onclick: () => go('/profile/legal') }, h('span', { class: 'grow' }, t('about.legal')), h('span', { class: 'chev' }, icon('chev', 18)))),
    h('p', { class: 't-cap muted', style: { textAlign: 'center' } }, t('about.credit')));
  return root;
}

export function legal() {
  const root = h('div', { class: 'screen narrow' }, navbar(t('legal.title'), '/profile/about'));
  const list = h('div', { class: 'stack', style: { gap: '12px' } });
  [1, 2, 3, 4, 5].forEach(n => list.append(h('div', { class: 'card legal' }, h('h2', { class: 't-card' }, t(`legal.${n}.t`)), h('p', { class: 't-body muted' }, t(`legal.${n}.b`)))));
  root.append(list);
  return root;
}
