// Data layer: bus network (stops, routes), geo helpers, arrivals and trip planner.
// Source order: built-in sample network -> data/network.json (built from OpenStreetMap by scripts/build-data.mjs) -> live Overpass fallback.

export const CENTER = { lat: 47.9186, lon: 106.9177 }; // Sukhbaatar Square
export const BBOX = [47.74, 106.62, 48.06, 107.30];    // south, west, north, east

// ---------- built-in sample network (approximate coordinates, used until real data loads) ----------
const S = {
  s1: ['Сүхбаатарын талбай', 47.9186, 106.9177], s2: ['Төв шуудан', 47.9199, 106.9165], s3: ['Төв цэнгэлдэх', 47.9208, 106.9092],
  s4: ['Баянгол зочид буудал', 47.9172, 106.9000], s5: ['Баруун дөрвөн зам', 47.9147, 106.8860], s6: ['Нарантуул', 47.9216, 106.9540],
  s7: ['Шангри-Ла', 47.9175, 106.9265], s8: ['Нарны зам', 47.9130, 106.9345], s9: ['13-р хороолол', 47.9230, 106.9590],
  s10: ['Баянзүрх', 47.9250, 107.0000], s11: ['Амгалан', 47.9100, 107.0650], s12: ['Налайх', 47.7469, 107.2594],
  s13: ['Зайсан', 47.8900, 106.9150], s14: ['Хан-Уул', 47.8960, 106.8900], s16: ['Буянт-Ухаа', 47.8430, 106.7820]
};
const R = [
  ['4', 10, ['s12', 's11', 's10', 's9', 's6', 's8', 's1', 's2']],
  ['8', 12, ['s13', 's1', 's2', 's3']],
  ['12', 9, ['s5', 's4', 's3', 's2', 's1', 's7']],
  ['15', 15, ['s12', 's11', 's8', 's1']],
  ['25', 11, ['s14', 's13', 's1', 's7', 's6']],
  ['1', 8, ['s10', 's9', 's6', 's7', 's1', 's2', 's4', 's5']],
  ['32', 14, ['s16', 's5', 's4', 's2', 's1']]
];
function seedNetwork() {
  const stops = Object.entries(S).map(([id, [name, lat, lon]]) => ({ id, name, lat, lon }));
  const routes = [];
  for (const [ref, interval, ids] of R) {
    const mk = (list, dir) => ({
      id: `${ref}:${dir}`, ref, interval, stops: list,
      from: S[list[0]][0], to: S[list[list.length - 1]][0],
      shape: [list.map(i => [S[i][1], S[i][2]])]
    });
    routes.push(mk(ids, 0), mk([...ids].reverse(), 1));
  }
  return { stops, routes, source: 'sample' };
}

// ---------- store ----------
export const Data = { stops: [], routes: [], byId: new Map(), lines: new Map(), stopRoutes: new Map(), grid: new Map(), source: 'sample', ready: false };
const listeners = new Set();
export const onData = fn => { listeners.add(fn); return () => listeners.delete(fn); };

const cell = (lat, lon) => `${Math.floor(lat / 0.002)}:${Math.floor(lon / 0.002)}`;

export function index(net) {
  Data.stops = net.stops; Data.routes = net.routes; Data.source = net.source || 'osm';
  Data.byId = new Map(net.stops.map(s => [s.id, s]));
  Data.stopRoutes = new Map(); Data.lines = new Map(); Data.grid = new Map();
  for (const s of net.stops) { const k = cell(s.lat, s.lon); (Data.grid.get(k) || Data.grid.set(k, []).get(k)).push(s); }
  for (const r of net.routes) {
    r.stops = r.stops.filter(id => Data.byId.has(id));
    r.pos = new Map(); r.stops.forEach((id, i) => { if (!r.pos.has(id)) r.pos.set(id, i); });
    r.stops.forEach((id, i) => (Data.stopRoutes.get(id) || Data.stopRoutes.set(id, []).get(id)).push({ route: r, idx: i }));
    const line = Data.lines.get(r.ref) || Data.lines.set(r.ref, { ref: r.ref, dirs: [], interval: r.interval }).get(r.ref);
    line.dirs.push(r);
  }
  Data.ready = true;
}

// ---------- geo ----------
export function dist(a, b) {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
export function nearestStops(p, max = 6, radius = 1500) {
  const out = [], dLat = radius / 111000, dLon = radius / (111000 * Math.cos(p.lat * Math.PI / 180));
  for (let la = Math.floor((p.lat - dLat) / 0.002); la <= Math.floor((p.lat + dLat) / 0.002); la++)
    for (let lo = Math.floor((p.lon - dLon) / 0.002); lo <= Math.floor((p.lon + dLon) / 0.002); lo++)
      for (const s of Data.grid.get(`${la}:${lo}`) || []) { const d = dist(p, s); if (d <= radius) out.push({ stop: s, d }); }
  if (!out.length && Data.stops.length) for (const s of Data.stops) out.push({ stop: s, d: dist(p, s) });
  return out.sort((a, b) => a.d - b.d).slice(0, max);
}
export const walkMin = m => Math.max(1, Math.round(m / 75));
export const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} м` : `${(m / 1000).toFixed(1)} км`;

// ---------- arrivals (schedule estimate until real-time data exists) ----------
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
export function arrivals(stopId, n = 6) {
  const now = Date.now() / 60000, out = [];
  for (const { route, idx } of Data.stopRoutes.get(stopId) || []) {
    if (idx === route.stops.length - 1 && route.stops.length > 1) continue; // last stop: bus terminates here
    const iv = route.interval || 12, phase = hash(route.id + stopId) % iv;
    const first = ((phase - (now % iv)) + iv) % iv;
    for (let k = 0; k < 2; k++) out.push({ route, min: Math.floor(first + k * iv), dest: route.to });
  }
  return out.sort((a, b) => a.min - b.min).slice(0, n);
}

// ---------- search ----------
const norm = s => s.toLowerCase().replace(/ё/g, 'е');
export function searchStops(q, limit = 8, near = CENTER) {
  q = norm(q.trim()); if (!q) return [];
  return Data.stops.filter(s => norm(s.name).includes(q)).map(s => ({ s, d: dist(near, s) })).sort((a, b) => a.d - b.d).slice(0, limit);
}
export function searchLines(q, limit = 8) {
  q = norm(q.trim()); if (!q) return [];
  return [...Data.lines.values()].filter(l => norm(l.ref).startsWith(q) || l.dirs.some(d => norm(`${d.from} ${d.to}`).includes(q))).sort((a, b) => parseInt(a.ref) - parseInt(b.ref) || a.ref.localeCompare(b.ref)).slice(0, limit);
}

// ---------- trip planner: direct and one transfer ----------
function rideMin(route, i, j) {
  let m = 0; for (let k = i; k < j; k++) m += dist(Data.byId.get(route.stops[k]), Data.byId.get(route.stops[k + 1]));
  return Math.max(2, Math.round(m / 380 + (j - i) * 0.3));
}
export function planTrip(from, to) {
  const A = nearestStops(from, 6, 900), B = nearestStops(to, 6, 900), bMap = new Map(B.map(x => [x.stop.id, x.d])), out = [];
  const push = (o) => out.push(o);
  for (const { stop: os, d: d1 } of A) for (const { route: r1, idx: i } of Data.stopRoutes.get(os.id) || []) {
    for (let j = i + 1; j < r1.stops.length; j++) {
      const xid = r1.stops[j], x = Data.byId.get(xid);
      if (bMap.has(xid)) { // direct
        const ride = rideMin(r1, i, j), w1 = walkMin(d1), w2 = walkMin(bMap.get(xid)), wait = Math.round((r1.interval || 12) / 2);
        push({ min: w1 + wait + ride + w2, transfers: 0, legs: [{ t: 'walk', m: d1 }, { t: 'bus', route: r1, from: os, to: x, n: j - i, min: ride, wait }, { t: 'walk', m: bMap.get(xid) }] });
        continue;
      }
      if (j - i > 25) continue;
      for (const nb of nearestStops(x, 4, 160)) for (const { route: r2, idx: k } of Data.stopRoutes.get(nb.stop.id) || []) {
        if (r2.ref === r1.ref) continue;
        for (let l = k + 1; l < r2.stops.length; l++) {
          const did = r2.stops[l]; if (!bMap.has(did)) continue;
          const ride1 = rideMin(r1, i, j), ride2 = rideMin(r2, k, l), w1 = walkMin(d1), w2 = walkMin(bMap.get(did)), tw = walkMin(nb.d);
          push({ min: w1 + Math.round((r1.interval || 12) / 2) + ride1 + tw + Math.round((r2.interval || 12) / 2) + ride2 + w2, transfers: 1,
            legs: [{ t: 'walk', m: d1 }, { t: 'bus', route: r1, from: os, to: x, n: j - i, min: ride1, wait: Math.round((r1.interval || 12) / 2) }, { t: 'walk', m: nb.d, transfer: true }, { t: 'bus', route: r2, from: nb.stop, to: Data.byId.get(did), n: l - k, min: ride2, wait: Math.round((r2.interval || 12) / 2) }, { t: 'walk', m: bMap.get(did) }] });
          break;
        }
      }
    }
  }
  const seen = new Set(), res = [];
  for (const o of out.sort((a, b) => a.min + a.transfers * 3 - (b.min + b.transfers * 3))) {
    const key = o.legs.filter(l => l.t === 'bus').map(l => l.route.id + l.from.id + l.to.id).join('>');
    const refKey = o.legs.filter(l => l.t === 'bus').map(l => l.route.ref).join('>');
    if (seen.has(key) || seen.has(refKey)) continue; seen.add(key); seen.add(refKey); res.push(o); if (res.length >= 3) break;
  }
  return res;
}

// ---------- loading real data ----------
const CACHE_KEY = 'ubt:network:v1', TTL = 7 * 864e5;
export const q = (s) => `[out:json][timeout:90];${s}`;
export const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function overpass(body) {
  let err; for (const u of OVERPASS) { try { const r = await fetch(u, { method: 'POST', body: 'data=' + encodeURIComponent(body) }); if (r.ok) return r.json(); err = new Error(r.status); } catch (e) { err = e; } }
  throw err;
}
export function fromOverpass(stopsJson, routesJson) {
  const stops = new Map();
  for (const e of stopsJson.elements) if (e.type === 'node' && e.tags && e.tags.name) stops.set(String(e.id), { id: String(e.id), name: e.tags.name, lat: e.lat, lon: e.lon });
  const routes = [];
  for (const r of routesJson.elements) {
    if (r.type !== 'relation' || !r.tags || !r.tags.ref) continue;
    const ids = [], shape = [];
    for (const m of r.members || []) {
      if (m.type === 'node' && /^(stop|stop_entry_only|stop_exit_only)$/.test(m.role)) { const id = String(m.ref); if (stops.has(id)) ids.push(id); else if (m.lat) { stops.set(id, { id, name: m.tags?.name || 'Буудал', lat: m.lat, lon: m.lon }); ids.push(id); } }
      else if (m.type === 'way' && m.geometry) shape.push(m.geometry.map(p => [p.lat, p.lon]));
    }
    if (ids.length < 2) continue;
    const first = stops.get(ids[0]), last = stops.get(ids[ids.length - 1]);
    routes.push({ id: String(r.id), ref: r.tags.ref, interval: parseInt(r.tags.interval) || parseInt(r.tags.headway) || 12, from: r.tags.from || first.name, to: r.tags.to || last.name, stops: ids, shape });
  }
  const used = new Set(routes.flatMap(r => r.stops));
  return { stops: [...stops.values()].filter(s => used.has(s.id) || true), routes, source: 'osm' };
}
async function fetchLive() {
  const b = BBOX.join(',');
  const [sj, rj] = await Promise.all([overpass(q(`node["highway"="bus_stop"](${b});out;`)), overpass(q(`relation["route"="bus"](${b});out geom;`))]);
  return fromOverpass(sj, rj);
}
export function compact(net) { return { v: 1, t: Date.now(), stops: net.stops.map(s => [s.id, s.name, +s.lat.toFixed(6), +s.lon.toFixed(6)]), routes: net.routes.map(r => ({ id: r.id, ref: r.ref, i: r.interval, f: r.from, to: r.to, s: r.stops, sh: r.shape.map(l => l.filter((_, k) => k % 2 === 0).map(p => [+p[0].toFixed(5), +p[1].toFixed(5)])) })) }; }
function expand(c, source) { return { source, stops: c.stops.map(([id, name, lat, lon]) => ({ id, name, lat, lon })), routes: c.routes.map(r => ({ id: r.id, ref: r.ref, interval: r.i, from: r.f, to: r.to, stops: r.s, shape: r.sh })) }; }

export async function loadData() {
  index(seedNetwork());
  // 1) static file prepared by scripts/build-data.mjs
  try { const r = await fetch('data/network.json', { cache: 'no-cache' }); if (r.ok) { const c = await r.json(); if (c.routes?.length > 3) { index(expand(c, 'osm')); notify(); return; } } } catch (e) { /* not built yet */ }
  // 2) cache from an earlier live fetch
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && c.routes?.length > 3) { index(expand(c, 'osm-cache')); notify(); if (Date.now() - c.t < TTL) return; } } catch (e) { /* ignore */ }
  // 3) live Overpass in the background; keep the sample/cached network meanwhile
  if (!navigator.onLine) return;
  try { const net = await fetchLive(); if (net.routes.length > 3) { index(net); try { localStorage.setItem(CACHE_KEY, JSON.stringify(compact(net))); } catch (e) { /* quota */ } notify(); } } catch (e) { /* stay on sample */ }
}
function notify() { listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
