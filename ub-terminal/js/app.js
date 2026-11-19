import { Data, CENTER, loadData, onData, dist, nearestStops, walkMin, fmtDist, arrivals, searchStops, searchLines, planTrip } from './data.js';
import { makeT } from './i18n.js';

// ---------- state ----------
const KEY = 'ubt:state:v1';
const S = Object.assign({ lang: 'mn', onboarded: false, locAsked: false, saved: { stops: [], lines: [] }, recents: [] }, (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ lang: S.lang, onboarded: S.onboarded, locAsked: S.locAsked, saved: S.saved, recents: S.recents })); } catch (e) { /* private mode */ } };
const T = makeT(() => S.lang);
const mem = { pos: null, posReal: false, locNote: '', homeTab: 'near', trips: [], savedTab: 'stops' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $app = document.getElementById('app');

// ---------- icons ----------
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  settings: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>', arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  locate: '<circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bus: '<path d="M5 4h14a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM4 11h16M8 18v2M16 18v2"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  walk: '<circle cx="13" cy="4" r="1.8"/><path d="M11 21l2-6-3-3 1-5 4 3 3 1M9 12l-3 2"/>',
  check: '<path d="M5 12l5 5 9-10"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
  route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h6a3 3 0 0 1 0 6H10a3 3 0 0 0 0 6h6"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const LOGO = `<svg class="logo" viewBox="0 0 120 120" aria-label="UB Terminal"><rect width="120" height="120" rx="28" fill="#0B7A8A"/><path d="M60 98C60 98 32 72 32 52a28 28 0 0 1 56 0c0 20-28 46-28 46z" fill="#fff"/><circle cx="60" cy="52" r="14" fill="#0B7A8A"/><circle cx="60" cy="52" r="6" fill="#FF6B57"/></svg>`;

// ---------- helpers ----------
const badge = (ref, cls = '') => `<span class="badge ${cls}">${esc(ref)}</span>`;
const here = () => mem.pos || CENTER;
const isSaved = (kind, id) => S.saved[kind].includes(id);
function toggleSaved(kind, id) { const a = S.saved[kind], i = a.indexOf(id); i < 0 ? a.push(id) : a.splice(i, 1); save(); }
function addRecent(q) { q = q.trim(); if (!q) return; S.recents = [q, ...S.recents.filter(x => x !== q)].slice(0, 6); save(); }
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const topbar = (title, right = '') => `<div class="topbar"><button class="circle-btn" data-act="back" aria-label="Back">${ic('back')}</button><h1>${esc(title)}</h1>${right || '<span class="spacer-40"></span>'}</div>`;
const arrRow = (list) => `<div class="arrivals">${list.map(a => `<span class="arr">${badge(a.route.ref)}${a.min === 0 ? T('now') : a.min + ' ' + T('min')}</span>`).join('')}</div>`;
function stopCard(s) {
  const d = dist(here(), s), list = arrivals(s.id, 3);
  return `<button class="card" data-go="#/stop/${encodeURIComponent(s.id)}"><span class="t-card">${esc(s.name)}</span><span class="t-caption">${fmtDist(d)} · ${walkMin(d)} ${T('min')} ${T('walk')}</span>${arrRow(list)}</button>`;
}
function lineRow(l) {
  const d = l.dirs[0];
  return `<button class="row" data-go="#/line/${encodeURIComponent(l.ref)}">${badge(l.ref, 'slot')}<span class="grow"><span class="t-label ellip" style="display:block;font-size:16px;font-weight:400">${esc(d.from)} ↔ ${esc(d.to)}</span><span class="t-caption">${T('every')} ${l.interval} ${T('min')}</span></span>${ic('chev', 'chev')}</button>`;
}
const stopRow = (s, extra = '') => `<button class="row" data-go="#/stop/${encodeURIComponent(s.id)}"><span style="color:var(--primary)">${ic('pin')}</span><span class="grow"><span class="ellip" style="display:block;font-size:16px">${esc(s.name)}</span>${extra ? `<span class="t-caption">${extra}</span>` : ''}</span>${ic('chev', 'chev')}</button>`;
const dataNote = () => Data.source === 'sample' ? `<div class="banner">${ic('info')}<span>${T('sample')}</span></div>` : '';

// ---------- location ----------
function getPos(done) {
  if (!navigator.geolocation) { mem.locNote = 'locOff'; return done && done(false); }
  navigator.geolocation.getCurrentPosition(p => {
    const me = { lat: p.coords.latitude, lon: p.coords.longitude };
    if (dist(me, CENTER) > 30000) { mem.pos = null; mem.posReal = false; mem.locNote = 'locFar'; } else { mem.pos = me; mem.posReal = true; mem.locNote = ''; }
    done && done(true);
  }, () => { mem.pos = null; mem.posReal = false; mem.locNote = 'locOff'; done && done(false); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
}

// ---------- screens ----------
const screens = {};

screens.splash = () => ({ cls: 'splash', html: `${LOGO}<h1>UB Terminal</h1><p>${T('tagline')}</p><div class="loader"></div>` });

const OB = [
  () => `<div class="ob-ill"><i class="ring" style="width:300px;height:300px;opacity:.12"></i><i class="ring" style="width:210px;height:210px;opacity:.18"></i><i class="ring" style="width:120px;height:120px;opacity:.28"></i><i class="ring" style="width:84px;height:84px"></i><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff">${ic('pin').replace('class="i "', 'class="i" style="width:44px;height:44px"')}</span><div class="float" style="left:20px;top:44px">${ic('bus')}<span><b>13-р хороолол</b><small>120 ${T('m')}</small></span></div><div class="float" style="right:20px;bottom:44px">${ic('bus')}<span><b>Төв шуудан</b><small>240 ${T('m')}</small></span></div></div>`,
  () => `<div class="ob-ill" style="padding:28px 20px;display:flex;flex-direction:column;gap:12px"><div class="card" style="padding:12px 16px;flex-direction:row;align-items:center;gap:12px"><i class="dot"></i><span><small class="t-caption" style="display:block">${T('from')}</small><b style="font-weight:500">${T('myLoc')}</b></span></div><div class="card" style="padding:12px 16px;flex-direction:row;align-items:center;gap:12px"><span style="color:var(--accent)">${ic('pin')}</span><span><small class="t-caption" style="display:block">${T('to')}</small><b style="font-weight:500">Сүхбаатарын талбай</b></span></div><div class="card" style="margin-top:auto"><div style="display:flex;align-items:baseline;gap:8px"><span class="t-eta">18 ${T('min')}</span><span class="t-caption">· 1 ${T('transfer')}</span></div><div style="display:flex;align-items:center;gap:8px;color:var(--text-2)">${ic('walk')}${badge('4')}${ic('arrow')}${badge('15')}</div></div></div>`,
  () => `<div class="ob-ill" style="display:flex;flex-direction:column;justify-content:center;padding:20px;gap:20px"><div class="group" style="box-shadow:var(--shadow-float)">${[['4', 'Сүхбаатарын талбай', 2], ['15', 'Налайх', 6], ['8', 'Зайсан', 11]].map(([n, d, m]) => `<div class="row"><span>${badge(n, 'slot')}</span><span class="grow">${d}</span><span class="pill hot">${m} ${T('min')}</span></div>`).join('')}</div><div class="float" style="position:static;align-self:flex-start">${ic('clock')}<small>${T('estimated').split('.')[0]}</small></div></div>`
];
screens.onboarding = ({ n }) => {
  const i = Math.min(3, Math.max(1, +n || 1)) - 1;
  return { html: `${i < 2 ? `<button class="skip" data-act="finish-ob">${T('skip')}</button>` : '<div class="skip" style="visibility:hidden">.</div>'}${OB[i]()}<div><h1 class="t-screen" style="margin-top:8px">${T('ob' + (i + 1) + 't')}</h1><p class="t-body" style="margin-top:12px">${T('ob' + (i + 1) + 'b')}</p></div><div style="flex:1"></div><div class="dots">${[0, 1, 2].map(k => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn" data-act="${i < 2 ? 'ob-next' : 'finish-ob'}" data-n="${i + 2}">${i < 2 ? T('next') : T('start')}</button>` };
};

screens.permission = () => ({ html: `<div class="center-col"><div class="hero"><i class="r1"></i><i class="r2"></i><i class="core"></i>${ic('pin')}</div><h1 class="t-screen">${T('permT')}</h1><p class="t-body">${T('permB')}</p></div><button class="btn" data-act="allow-loc">${T('allow')}</button><button class="btn ghost" data-act="skip-loc">${T('notNow')}</button>` });

screens.offline = () => ({ html: `<div class="center-col"><div class="hero danger"><i class="r1"></i><i class="r2"></i><i class="core"></i>${ic('alert')}</div><h1 class="t-screen">${T('offlineT')}</h1><p class="t-body">${T('offlineB')}</p></div><button class="btn" data-act="retry">${T('retry')}</button><button class="btn ghost" data-go="#/saved">${T('viewSaved')}</button>` });

function homeList() {
  let list;
  if (mem.homeTab === 'saved') list = S.saved.stops.map(id => Data.byId.get(id)).filter(Boolean);
  else if (mem.homeTab === 'recent') list = (S.recents || []).flatMap(q => searchStops(q, 1).map(x => x.s)).filter((s, i, a) => a.indexOf(s) === i);
  else list = nearestStops(here(), 8, 2500).map(x => x.stop);
  return list.length ? list.slice(0, 8).map(stopCard).join('') : `<p class="t-body center" style="padding:24px 0">${T('savedEmptyB')}</p>`;
}
screens.home = () => {
  const note = !mem.posReal && mem.locNote ? `<div class="banner warn">${ic('pin')}<span>${T(mem.locNote)} <button class="link" data-go="#/permission">${T('enableLoc')}</button></span></div>` : '';
  return { tabs: 'home', html: `<div class="home-head"><span class="eyebrow">${T('city')}</span><h1 class="t-large">${T('whereTo')}</h1><button class="search" data-go="#/search">${ic('search')}<span>${T('searchPh')}</span></button></div>
  <div class="chips">${[['near', 'near'], ['saved', 'saved'], ['recent', 'recent']].map(([k, l]) => `<button class="chip ${mem.homeTab === k ? 'sel' : ''}" data-act="home-tab" data-k="${k}">${T(l)}</button>`).join('')}</div>
  <div class="sec-head"><h2 class="t-section">${T('nearStops')}</h2><button class="link" data-go="#/map">${T('seeAll')}</button></div>${note}<div id="home-list" style="display:flex;flex-direction:column;gap:16px">${homeList()}</div>${dataNote()}` };
};

screens.search = ({ q, pick }) => {
  const pop = Data.stops.slice(0, 6);
  return { html: `<div class="topbar" style="gap:12px"><button class="circle-btn" data-act="back">${ic('back')}</button><label class="search">${ic('search')}<input id="q" type="search" placeholder="${T(pick ? 'pickDest' : 'searchPh')}" value="${esc(q || '')}" autocomplete="off" enterkeyhint="search"></label></div><div id="res" data-pick="${pick || ''}">${searchBody(q || '', pick)}</div>`, after() { const el = document.getElementById('q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); el.addEventListener('input', () => { document.getElementById('res').innerHTML = searchBody(el.value, pick); }); el.addEventListener('keydown', e => { if (e.key === 'Enter') addRecent(el.value); }); } };
};
function searchBody(q, pick) {
  const go = s => pick ? `data-act="pick" data-id="${esc(s.id)}"` : `data-go="#/stop/${encodeURIComponent(s.id)}"`;
  const sRow = (s, d) => `<button class="row" ${go(s)}><span style="color:var(--primary)">${ic('pin')}</span><span class="grow"><span class="ellip" style="display:block;font-size:16px">${esc(s.name)}</span><span class="t-caption">${T('stop')} · ${fmtDist(d)}</span></span>${ic('chev', 'chev')}</button>`;
  if (!q.trim()) {
    const near = nearestStops(here(), 3, 3000);
    return `${!pick && S.recents.length ? `<h2 class="t-section" style="margin:8px 0 12px">${T('recentSearch')}</h2><div class="group">${S.recents.map(r => `<button class="row" data-act="recent" data-q="${esc(r)}"><span style="color:var(--text-2)">${ic('clock')}</span><span class="grow">${esc(r)}</span><span data-act="del-recent" data-q="${esc(r)}" style="color:var(--text-2)">${ic('close')}</span></button>`).join('')}</div>` : ''}
    <h2 class="t-section" style="margin:20px 0 12px">${T('popular')}</h2><div class="chips">${Data.stops.slice(0, 6).map(s => `<button class="chip" ${go(s)}>${esc(s.name)}</button>`).join('')}</div>
    <h2 class="t-section" style="margin:20px 0 12px">${T('nearby')}</h2><div class="group">${near.map(x => sRow(x.stop, x.d)).join('')}</div>`;
  }
  const st = searchStops(q, 8, here()), ln = pick ? [] : searchLines(q, 6);
  if (!st.length && !ln.length) return `<div class="center-col" style="min-height:420px"><div class="hero soft"><i class="r1"></i><i class="r2"></i><i class="core"></i>${ic('search')}</div><h1 class="t-screen">${T('noResults')}</h1><p class="t-body">${T('noResultsB')}</p><button class="btn secondary" data-act="clear-q" style="width:240px">${T('clear')}</button></div>`;
  return `${st.length ? `<h2 class="t-section" style="margin:8px 0 12px">${T('stops')}</h2><div class="group">${st.map(x => sRow(x.s, x.d)).join('')}</div>` : ''}${ln.length ? `<h2 class="t-section" style="margin:20px 0 12px">${T('busLines')}</h2><div class="group">${ln.map(lineRow).join('')}</div>` : ''}`;
}

screens.stop = ({ id }) => {
  const s = Data.byId.get(id); if (!s) return screens.home();
  const d = dist(here(), s), list = arrivals(s.id, 8), sv = isSaved('stops', s.id);
  return { html: `${topbar(T('stop'), `<button class="circle-btn ${sv ? 'on' : ''}" data-act="save-stop" data-id="${esc(s.id)}" aria-label="${T('save')}">${ic('star')}</button>`)}
  <div><h1 class="t-screen">${esc(s.name)}</h1><div class="t-body" style="display:flex;gap:6px;align-items:center;font-size:16px">${ic('walk')}<span>${fmtDist(d)} · ${walkMin(d)} ${T('min')} ${T('walk')}</span></div></div>
  <div class="btn-row"><button class="btn" data-go="#/route?to=${encodeURIComponent(s.id)}">${T('route')}</button><button class="btn secondary" data-go="#/map?stop=${encodeURIComponent(s.id)}">${T('map')}</button></div>
  <h2 class="t-section">${T('arriving')}</h2><div class="group" style="padding-top:4px;padding-bottom:4px">${list.map((a, k) => `<button class="row" data-go="#/line/${encodeURIComponent(a.route.ref)}?d=${Math.max(0, Data.lines.get(a.route.ref).dirs.indexOf(a.route))}&at=${encodeURIComponent(s.id)}">${badge(a.route.ref, 'slot')}<span class="grow ellip">${esc(a.dest)}</span><span class="pill ${k === 0 ? 'hot' : ''}">${a.min === 0 ? T('now') : a.min + ' ' + T('min')}</span></button>`).join('') || `<p class="t-body center" style="padding:16px">—</p>`}</div>
  <div class="t-caption center">${ic('refresh').replace('class="i "', 'class="i" style="width:14px;height:14px;vertical-align:-2px"')} ${T('estimated')}</div>` };
};

screens.lines = () => {
  const all = [...Data.lines.values()].sort((a, b) => parseInt(a.ref) - parseInt(b.ref) || a.ref.localeCompare(b.ref));
  return { html: `${topbar(T('lines'))}<label class="search">${ic('search')}<input id="lq" type="search" placeholder="${T('searchPh')}" autocomplete="off"></label><div class="group" id="lines">${all.map(lineRow).join('')}</div>`, after() { const el = document.getElementById('lq'); el.addEventListener('input', () => { const v = el.value.trim(); document.getElementById('lines').innerHTML = (v ? searchLines(v, 40) : all).map(lineRow).join(''); }); } };
};

screens.line = ({ ref, d, at }) => {
  const line = Data.lines.get(ref); if (!line) return screens.lines();
  const di = Math.min(+d || 0, line.dirs.length - 1), r = line.dirs[di];
  const me = at ? Data.byId.get(at) : nearestStops(here(), 1, 100000)[0]?.stop;
  const curId = me && r.pos.has(me.id) ? me.id : null, sv = isSaved('lines', ref);
  const rows = r.stops.map((id, k) => { const s = Data.byId.get(id), cur = id === curId, last = k === r.stops.length - 1;
    const a = cur ? arrivals(id, 20).find(x => x.route.id === r.id) : null;
    return `<div class="tl-step stoplist"><div class="tl-rail"><span class="sd ${cur ? 'cur' : ''}"></span>${last ? '' : '<span class="tl-line"></span>'}</div><button class="tl-body" data-go="#/stop/${encodeURIComponent(id)}" style="text-align:left"><span class="grow ${cur ? 't-card' : ''}" style="${cur ? '' : 'font-size:16px'}">${esc(s.name)}</span>${a ? `<span class="pill hot">${a.min === 0 ? T('now') : a.min + ' ' + T('min')}</span>` : ''}</button></div>`; }).join('');
  return { html: `${topbar(T('line'), `<button class="circle-btn ${sv ? 'on' : ''}" data-act="save-line" data-id="${esc(ref)}">${ic('star')}</button>`)}
  <div style="display:flex;align-items:center;gap:12px"><span class="badge" style="height:40px;min-width:52px;font-size:20px;border-radius:12px">${esc(ref)}</span><div><h1 class="t-screen" style="font-size:24px;line-height:28px">${esc(ref)} · ${esc(r.to)}</h1><div class="t-caption">${T('every')} ${r.interval} ${T('min')}</div></div></div>
  ${line.dirs.length > 1 ? `<div class="chips">${line.dirs.map((x, k) => `<button class="chip ${k === di ? 'sel' : ''}" data-go="#/line/${encodeURIComponent(ref)}?d=${k}">${esc(x.to)} →</button>`).join('')}</div>` : ''}
  <button class="btn secondary" data-go="#/map?line=${encodeURIComponent(ref)}&d=${di}" style="height:48px">${ic('map')} ${T('startRoute')}</button>
  <div class="card" style="padding:16px 16px 0;gap:0">${rows}</div>` };
};

screens.route = ({ from, to }) => {
  from = from || 'me'; to = to || '';
  const pt = id => id === 'me' ? { ...here(), name: T('myLoc') } : Data.byId.get(id);
  const A = pt(from), B = to ? pt(to) : null;
  let body = '';
  if (A && B && !(from === to)) {
    mem.trips = planTrip(A, B);
    body = mem.trips.length ? `<h2 class="t-section">${T('results')}</h2>` + mem.trips.map((o, n) => {
      const bus = o.legs.filter(l => l.t === 'bus'), t0 = new Date(Date.now() + (bus[0].wait || 0) * 60000), t1 = new Date(Date.now() + o.min * 60000);
      return `<button class="card" data-go="#/trip/${n}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}" style="gap:10px"><div style="display:flex;align-items:baseline;gap:8px"><span class="t-eta">${o.min} ${T('min')}</span><span class="t-caption">· ${o.transfers ? o.transfers + ' ' + T('transfer') : T('direct')}</span></div><div style="display:flex;align-items:center;gap:8px;color:var(--text-2);flex-wrap:wrap">${ic('walk', '')}${bus.map((l, k) => (k ? ic('arrow') : '') + badge(l.route.ref)).join('')}</div><span class="t-caption">${hhmm(t0)} → ${hhmm(t1)}</span></button>`;
    }).join('') : `<div class="banner">${ic('info')}<span>${T('noRoute')}</span></div>`;
  } else body = `<div class="banner">${ic('info')}<span>${T('pickDest')}</span></div>`;
  const fld = (k, label, v, icn) => `<button class="field" data-go="#/search?pick=${k}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}">${icn}<span class="grow"><small class="t-caption" style="display:block">${label}</small><span style="font-size:16px">${v ? esc(v.name) : T('pickDest')}</span></span></button>`;
  return { html: `${topbar(T('route'))}<div class="card fields" style="flex-direction:row;padding:8px 16px;gap:12px"><div class="col">${fld('from', T('from'), A, '<i class="dot"></i>')}${fld('to', T('to'), B, `<span style="color:var(--accent)">${ic('pin')}</span>`)}</div><button class="swap" data-act="swap" data-from="${esc(from)}" data-to="${esc(to)}" aria-label="swap">${ic('swap')}</button></div>${body}` };
};

screens.trip = ({ n, from, to }) => {
  if (!mem.trips.length && from && to) { const pt = id => id === 'me' ? here() : Data.byId.get(id); if (pt(from) && pt(to)) mem.trips = planTrip(pt(from), pt(to)); }
  const o = mem.trips[+n]; if (!o) return screens.home();
  const bus = o.legs.filter(l => l.t === 'bus'), t0 = new Date(Date.now() + (bus[0].wait || 0) * 60000), t1 = new Date(Date.now() + o.min * 60000);
  const steps = o.legs.map((l, k) => {
    const last = k === o.legs.length - 1;
    let node, title, sub, b = '';
    if (l.t === 'walk') { node = `<span class="tl-node">${ic('walk')}</span>`; title = l.transfer ? T('transferWalk') : T('walkLeg'); sub = `${fmtDist(l.m)} · ${walkMin(l.m)} ${T('min')}`; }
    else { node = `<span class="tl-node bus">${ic('bus')}</span>`; b = badge(l.route.ref); title = `${l.route.ref}`; sub = `${esc(l.from.name)} → ${esc(l.to.name)} · ${l.n} ${T('ride')} · ${l.min} ${T('min')}`; }
    return `<div class="tl-step"><div class="tl-rail">${node}${'<span class="tl-line"></span>'}</div><div class="tl-body"><div class="head">${b}<span class="t-card">${title}</span></div><div class="t-caption" style="margin-top:2px">${sub}</div></div></div>`;
  }).join('') + `<div class="tl-step"><div class="tl-rail"><span class="tl-node" style="color:var(--accent)">${ic('pin')}</span></div><div class="tl-body"><span class="t-card">${T('arrive')}</span></div></div>`;
  return { html: `${topbar(T('route'))}<div class="card" style="gap:4px"><div style="display:flex;align-items:baseline;gap:8px"><span class="t-eta">${o.min} ${T('min')}</span><span class="t-caption">· ${o.transfers ? o.transfers + ' ' + T('transfer') : T('direct')}</span></div><span class="t-caption">${hhmm(t0)} → ${hhmm(t1)}</span></div><div class="tl">${steps}</div><div style="flex:1"></div><button class="btn" data-go="#/map?trip=${n}">${T('startRoute')}</button><div class="t-caption center">${T('estimated')}</div>` };
};

screens.saved = () => {
  const stops = S.saved.stops.map(id => Data.byId.get(id)).filter(Boolean), lines = S.saved.lines.map(r => Data.lines.get(r)).filter(Boolean);
  const tab = mem.savedTab, empty = tab === 'stops' ? !stops.length : !lines.length;
  return { tabs: 'saved', html: `<h1 class="t-large" style="padding-top:20px">${T('saved')}</h1><div class="chips"><button class="chip ${tab === 'stops' ? 'sel' : ''}" data-act="saved-tab" data-k="stops">${T('stops')}</button><button class="chip ${tab === 'lines' ? 'sel' : ''}" data-act="saved-tab" data-k="lines">${T('route')}</button></div>${empty ? `<div class="center-col"><div class="hero soft"><i class="r1"></i><i class="r2"></i><i class="core"></i>${ic('bookmark')}</div><h1 class="t-screen">${T('savedEmpty')}</h1><p class="t-body">${T('savedEmptyB')}</p><button class="btn secondary" data-go="#/search" style="width:240px">${T('findStops')}</button></div>` : tab === 'stops' ? stops.map(stopCard).join('') : `<div class="group">${lines.map(lineRow).join('')}</div>`}` };
};

screens.settings = () => ({ tabs: 'settings', html: `<h1 class="t-large" style="padding-top:20px">${T('settings')}</h1><span class="t-label muted">${T('general')}</span><div class="group">
  <button class="row" data-go="#/language"><span class="icon-bg">${ic('globe')}</span><span class="grow">${T('language')}</span><span class="t-caption">${S.lang === 'mn' ? 'Монгол' : 'English'}</span>${ic('chev', 'chev')}</button>
  <button class="row" data-go="#/permission"><span class="icon-bg">${ic('pin')}</span><span class="grow">${T('location')}</span><span class="t-caption">${mem.posReal ? '✓' : '—'}</span>${ic('chev', 'chev')}</button>
  <button class="row" data-go="#/lines"><span class="icon-bg">${ic('route')}</span><span class="grow">${T('lines')}</span>${ic('chev', 'chev')}</button></div>
  <span class="t-label muted">${T('app')}</span><div class="group">
  <div class="row"><span class="icon-bg">${ic('route')}</span><span class="grow">${T('data')}</span><span class="t-caption">${Data.source === 'sample' ? T('sampleShort') : Data.source === 'osm-cache' ? T('osmCache') : 'OpenStreetMap'}</span></div>
  <a class="row" href="mailto:hello@uchralpurevdorj.com?subject=UB%20Terminal"><span class="icon-bg">${ic('star')}</span><span class="grow">${T('feedback')}</span>${ic('chev', 'chev')}</a>
  <button class="row" data-go="#/about"><span class="icon-bg">${ic('info')}</span><span class="grow">${T('about')}</span><span class="t-caption">v1.0</span>${ic('chev', 'chev')}</button></div>` });

screens.language = () => ({ html: `${topbar(T('language'))}<div class="group">${[['mn', 'Монгол', 'Mongolian'], ['en', 'English', 'Англи']].map(([k, a, b]) => `<button class="row" data-act="set-lang" data-k="${k}"><span class="grow"><span class="t-card" style="display:block">${a}</span><span class="t-caption">${b}</span></span>${S.lang === k ? `<span style="color:var(--primary)">${ic('check')}</span>` : ''}</button>`).join('')}</div><p class="t-caption">${T('langNote')}</p>` });

screens.about = () => ({ html: `${topbar(T('about'))}<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:16px">${LOGO.replace('class="logo"', 'class="about-logo"')}<h1 class="t-screen">UB Terminal</h1><span class="t-caption">${T('version')} 1.0</span></div><div class="group"><a class="row" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"><span class="icon-bg">${ic('route')}</span><span class="grow">${T('data')}</span><span class="t-caption">© OpenStreetMap</span>${ic('chev', 'chev')}</a><a class="row" href="mailto:hello@uchralpurevdorj.com?subject=UB%20Terminal"><span class="icon-bg">${ic('star')}</span><span class="grow">${T('feedback')}</span>${ic('chev', 'chev')}</a><a class="row" href="../"><span class="icon-bg">${ic('home')}</span><span class="grow">uchralpurevdorj.com</span>${ic('chev', 'chev')}</a></div><div style="flex:1"></div><span class="small-note">${T('made')}</span>` });

// ---------- map ----------
let map = null;
screens.map = ({ stop, line, d, trip }) => ({ tabs: 'map', cls: 'flush', html: `<div id="map"></div><div class="map-top"><button class="search" data-go="#/search">${ic('search')}<span>${T('searchPh')}</span></button><div class="chips"><button class="chip sel">${T('stops')}</button><button class="chip" data-go="#/lines">${T('busLines')}</button><button class="chip" data-go="#/route">${T('route')}</button></div></div><button class="fab" id="locate" style="bottom:calc(var(--tabbar-h) + 190px + env(safe-area-inset-bottom))" aria-label="${T('enableLoc')}">${ic('locate')}</button><div class="sheet" id="sheet"></div>`, after() { initMap({ stop, line, d, trip }); } });

function initMap({ stop, line, d, trip }) {
  if (!window.L) { document.getElementById('map').innerHTML = `<p class="t-body center" style="padding:120px 24px">${T('offlineT')}</p>`; return; }
  const start = mem.pos || CENTER; map = L.map('map', { zoomControl: false, attributionControl: true }).setView([start.lat, start.lon], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  const layer = L.layerGroup().addTo(map), over = L.layerGroup().addTo(map); let sel = null;
  const icon = (on) => L.divIcon({ className: '', html: `<div class="mk ${on ? 'sel' : ''}">${ic('bus')}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
  const sheet = document.getElementById('sheet');
  const showSheet = (s) => {
    sel = s.id; const dd = dist(here(), s), list = arrivals(s.id, 3);
    sheet.innerHTML = `<div class="handle"></div><button class="card" data-go="#/stop/${encodeURIComponent(s.id)}"><span class="t-card">${esc(s.name)}</span><span class="t-caption">${fmtDist(dd)} · ${walkMin(dd)} ${T('min')} ${T('walk')}</span>${arrRow(list)}</button><div class="btn-row"><button class="btn" style="height:48px" data-go="#/route?to=${encodeURIComponent(s.id)}">${T('route')}</button><button class="btn secondary" style="height:48px" data-act="save-stop" data-id="${esc(s.id)}">${isSaved('stops', s.id) ? T('savedBtn') : T('save')}</button></div>`;
    draw();
  };
  const draw = () => {
    layer.clearLayers(); const b = map.getBounds().pad(0.1), c = map.getCenter(); let n = 0;
    for (const s of Data.stops.filter(s => b.contains([s.lat, s.lon])).sort((a, b2) => dist({ lat: c.lat, lon: c.lng }, a) - dist({ lat: c.lat, lon: c.lng }, b2))) {
      if (n++ > 120) break;
      const m = L.marker([s.lat, s.lon], { icon: icon(s.id === sel), keyboard: false, title: s.name }).addTo(layer); m.on('click', () => showSheet(s));
    }
  };
  map.on('moveend', draw);
  if (mem.pos) L.marker([mem.pos.lat, mem.pos.lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false }).addTo(over);
  const poly = (pts, o) => L.polyline(pts, Object.assign({ color: '#0B7A8A', weight: 6, opacity: .9, lineCap: 'round' }, o)).addTo(over);
  let fit = null;
  if (line && Data.lines.get(line)) {
    const r = Data.lines.get(line).dirs[Math.min(+d || 0, Data.lines.get(line).dirs.length - 1)];
    (r.shape && r.shape.length ? r.shape : [r.stops.map(id => [Data.byId.get(id).lat, Data.byId.get(id).lon])]).forEach(l => poly(l)); fit = L.latLngBounds(r.stops.map(id => [Data.byId.get(id).lat, Data.byId.get(id).lon]));
  } else if (trip !== undefined && mem.trips[+trip]) {
    const pts = [];
    mem.trips[+trip].legs.forEach(l => { if (l.t === 'bus') { const a = l.route.pos.get(l.from.id), b = l.route.pos.get(l.to.id), ll = l.route.stops.slice(a, b + 1).map(id => [Data.byId.get(id).lat, Data.byId.get(id).lon]); poly(ll); pts.push(...ll); } });
    fit = L.latLngBounds(pts);
  }
  if (stop && Data.byId.get(stop)) { const s = Data.byId.get(stop); map.setView([s.lat, s.lon], 16); showSheet(s); }
  else if (fit) { map.fitBounds(fit.pad(0.2)); const n0 = nearestStops(here(), 1, 100000)[0]; n0 && showSheet(n0.stop); }
  else { const n0 = nearestStops(here(), 1, 100000)[0]; n0 && showSheet(n0.stop); }
  draw();
  document.getElementById('locate').addEventListener('click', () => getPos(ok => { const p = mem.pos || CENTER; map.flyTo([p.lat, p.lon], 15); if (ok) over.clearLayers(), mem.pos && L.marker([mem.pos.lat, mem.pos.lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false }).addTo(over); }));
}

// ---------- router ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, ''), [path, qs] = h.split('?'), seg = path.split('/').filter(Boolean).map(decodeURIComponent), q = Object.fromEntries(new URLSearchParams(qs || ''));
  const name = seg[0] || 'home';
  if (name === 'stop') return { name, id: seg[1], ...q }; if (name === 'line') return { name, ref: seg[1], ...q };
  if (name === 'trip') return { name, n: seg[1], ...q }; if (name === 'onboarding') return { name, n: seg[1] };
  return { name, ...q };
}
function render() {
  if (map) { map.remove(); map = null; }
  const r = parse(), fn = screens[r.name] || screens.home, sc = fn(r);
  const tabs = sc.tabs ? `<nav class="tabbar">${[['home', 'home', '#/'], ['map', 'map', '#/map'], ['saved', 'bookmark', '#/saved'], ['settings', 'settings', '#/settings']].map(([k, i, h]) => `<a class="tab ${sc.tabs === k ? 'on' : ''}" href="${h}"><span class="pill-i">${ic(i)}</span>${T(k)}</a>`).join('')}</nav>` : '';
  $app.innerHTML = `<main class="screen ${sc.cls || ''} ${sc.tabs ? 'has-tabs' : ''}">${sc.html}</main>${tabs}`;
  if (sc.cls === 'flush') $app.firstElementChild.style.overflow = 'hidden';
  sc.after && sc.after();
  document.title = 'UB Terminal';
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-go]'); if (!t) return;
  if (t.dataset.act) {
    const a = t.dataset.act, d = t.dataset;
    if (a === 'back') { history.length > 1 ? history.back() : (location.hash = '#/'); }
    else if (a === 'home-tab') { mem.homeTab = d.k; render(); }
    else if (a === 'saved-tab') { mem.savedTab = d.k; render(); }
    else if (a === 'save-stop') { toggleSaved('stops', d.id); render(); }
    else if (a === 'save-line') { toggleSaved('lines', d.id); render(); }
    else if (a === 'set-lang') { S.lang = d.k; save(); render(); }
    else if (a === 'ob-next') location.hash = '#/onboarding/' + d.n;
    else if (a === 'finish-ob') { S.onboarded = true; save(); location.hash = S.locAsked ? '#/' : '#/permission'; }
    else if (a === 'allow-loc') { S.locAsked = true; save(); getPos(() => { location.hash = '#/'; render(); }); }
    else if (a === 'skip-loc') { S.locAsked = true; mem.locNote = 'locOff'; save(); location.hash = '#/'; }
    else if (a === 'retry') { navigator.onLine ? (location.hash = '#/') : render(); }
    else if (a === 'recent') { const el = document.getElementById('q'); el.value = d.q; el.dispatchEvent(new Event('input')); }
    else if (a === 'del-recent') { e.stopPropagation(); S.recents = S.recents.filter(x => x !== d.q); save(); document.getElementById('res').innerHTML = searchBody('', ''); }
    else if (a === 'clear-q') { const el = document.getElementById('q'); el.value = ''; el.dispatchEvent(new Event('input')); el.focus(); }
    else if (a === 'swap') location.hash = `#/route?from=${encodeURIComponent(d.to || 'me')}&to=${encodeURIComponent(d.from)}`;
    else if (a === 'pick') { const q = parse(), k = q.pick; const from = q.from || 'me', to = q.to || ''; location.replace(`#/route?from=${encodeURIComponent(k === 'from' ? d.id : from)}&to=${encodeURIComponent(k === 'to' ? d.id : to)}`); }
    return;
  }
  location.hash = t.dataset.go;
});
window.addEventListener('hashchange', () => { render(); const sc = document.querySelector('.screen'); sc && sc.scrollTo(0, 0); });
window.addEventListener('offline', () => { const n = parse().name; if (n === 'map' || n === 'search') location.hash = '#/offline'; });
window.addEventListener('online', () => { if (parse().name === 'offline') location.hash = '#/'; loadData(); });
onData(() => { const n = parse().name; if (['home', 'lines', 'saved', 'settings'].includes(n)) render(); });

// ---------- boot ----------
(async function boot() {
  $app.innerHTML = `<main class="screen splash">${screens.splash().html}</main>`;
  const t0 = Date.now(); const data = loadData();
  await Promise.race([data, new Promise(r => setTimeout(r, 1500))]);
  const wait = Math.max(0, 1100 - (Date.now() - t0)); await new Promise(r => setTimeout(r, wait));
  if (S.locAsked && navigator.geolocation) getPos(() => render());
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace(S.onboarded ? '#/' : '#/onboarding/1');
  render();
})();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
