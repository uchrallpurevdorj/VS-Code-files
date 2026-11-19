import { h, icon } from '../dom.js';
import { t } from '../i18n.js';
import { store } from '../store.js';
import { go } from '../router.js';
import { NOTIFICATIONS } from './notifications.js';

// Notification bell used on Profile (same button as on Home).
export function notificationBell() {
  const unread = NOTIFICATIONS.some(n => !store.notifRead.includes(n.id));
  return h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('notif.title'), onclick: () => go('/notifications') },
    icon('bell', 26), unread ? h('span', { class: 'dot' }) : null);
}
