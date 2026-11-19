// Hash router. Screens are functions: (params) => HTMLElement | Promise<HTMLElement>
let routes = [];
let onChange = () => {};
let internalNav = 0;           // number of in-app navigations (so "back" is safe)
const scroll = new Map();      // path -> scrollTop for tab roots

export function define(list, handler) { routes = list; onChange = handler; }

export function parse(hash = location.hash) {
  const path = (hash.replace(/^#/, '') || '/home').split('?')[0];
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { name: r.name, params: m.slice(1).map(decodeURIComponent), path, tab: r.tab, sub: !!r.sub };
  }
  return { name: 'home', params: [], path: '/home', tab: 'home' };
}
export function go(path, { replace = false } = {}) {
  if (replace) { location.replace('#' + path); return; }
  internalNav++;
  location.hash = '#' + path;
}
export function back(fallback = '/home') {
  if (internalNav > 0) { internalNav--; history.back(); } else go(fallback, { replace: true });
}
export function saveScroll(path, top) { scroll.set(path, top); }
export function getScroll(path) { return scroll.get(path) || 0; }
export function start() {
  window.addEventListener('hashchange', () => onChange(parse()));
  onChange(parse());
}
export function refresh() { onChange(parse(), { keepScroll: true }); }
