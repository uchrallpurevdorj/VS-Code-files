import { h } from '../dom.js';
import { t } from '../i18n.js';
import { store } from '../store.js';
import { navbar, emptyState } from '../ui.js';

// In-app notices (app updates, news). Add new entries here for future releases.
export const NOTIFICATIONS = [
  { id: 'v1', at: new Date(2026, 10, 18, 12).getTime(), titleKey: 'notif.v1.title', bodyKey: 'notif.v1.body' },
];

function fmtDate(ts) {
  const d = new Date(ts);
  if (store.settings.lang === 'en') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export function notifications() {
  const root = h('div', { class: 'screen' }, navbar(t('notif.title'), '/home'));
  const unreadIds = new Set(NOTIFICATIONS.filter(n => !store.notifRead.includes(n.id)).map(n => n.id));
  if (!NOTIFICATIONS.length) {
    root.append(emptyState({ ic: 'bell', title: t('notif.empty'), text: t('notif.emptyText') }));
    return root;
  }
  const list = h('div', { class: 'stack', style: { gap: '12px' } });
  NOTIFICATIONS.forEach(n => list.append(h('article', { class: 'card ncard' },
    h('div', { class: 'top' }, h('h2', { class: 't-card' }, t(n.titleKey)), unreadIds.has(n.id) ? h('span', { class: 'u', 'aria-label': 'new' }) : null),
    h('p', { class: 't-body' }, t(n.bodyKey)),
    h('time', { class: 't-cap muted' }, fmtDate(n.at)))));
  root.append(list);
  // mark as read after the user has seen them
  setTimeout(() => store.markNotifRead([...unreadIds]), 600);
  return root;
}
