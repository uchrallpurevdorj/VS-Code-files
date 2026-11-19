// Builds data/network.json from OpenStreetMap (Overpass API). Run on any computer with internet:
//   node scripts/build-data.mjs
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import https from 'node:https';
import { BBOX, fromOverpass, compact, q, OVERPASS } from '../js/data.js';

function post(url, body, ms = 150000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = 'data=' + encodeURIComponent(body);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(data), 'user-agent': 'ub-terminal-build/1.0 (uchralpurevdorj.com)', accept: 'application/json' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} ${txt.slice(0, 120)}`));
        try { resolve(JSON.parse(txt)); } catch (e) { reject(new Error('Bad JSON: ' + txt.slice(0, 120))); }
      });
    });
    req.setTimeout(ms, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(data);
  });
}

const SERVERS = [...new Set([...OVERPASS, 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'])];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Tries every server, several rounds, with a pause between rounds (public servers are often busy).
async function overpass(body) {
  let err;
  for (let round = 1; round <= 4; round++) {
    for (const u of SERVERS) {
      try { const r = await post(u, body, 45000); console.log('    ok:', new URL(u).hostname); return r; }
      catch (e) { err = e; console.log('    ' + new URL(u).hostname + ' failed:', e.message.split('\n')[0].slice(0, 60)); }
    }
    if (round < 4) { console.log(`    all busy, waiting 15s (round ${round}/4)...`); await sleep(15000); }
  }
  throw err;
}

// Split the city box into a grid so every request is small and fast.
function tiles(n) {
  const [s, w, no, e] = BBOX, out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    out.push([s + (no - s) * i / n, w + (e - w) * j / n, s + (no - s) * (i + 1) / n, w + (e - w) * (j + 1) / n].map(x => +x.toFixed(5)).join(','));
  return out;
}

const CACHE = new URL('./.cache/', import.meta.url);
async function cached(key, fn) {
  const f = new URL(key + '.json', CACHE);
  try { const r = JSON.parse(await readFile(f, 'utf8')); console.log('    cached'); return r; } catch (e) { /* not cached */ }
  const r = await fn();
  await mkdir(CACHE, { recursive: true }); await writeFile(f, JSON.stringify(r));
  return r;
}

async function collect(label, n, make) {
  const seen = new Map(); let k = 0;
  for (const t of tiles(n)) {
    k++; console.log(`  ${label} ${k}/${n * n}`);
    const r = await cached(`${label}-${n}-${t}`, () => overpass(q(make(t))));
    for (const el of r.elements) seen.set(el.type + el.id, el);
  }
  return { elements: [...seen.values()] };
}

try {
  console.log('Fetching bus stops...');
  const stops = await collect('stops', 2, t => `node["highway"="bus_stop"](${t});out;`);
  console.log(`  total ${stops.elements.length} stop nodes`);
  console.log('Fetching bus routes...');
  const routes = await collect('routes', 4, t => `relation["route"="bus"](${t});out geom;`);
  console.log(`  total ${routes.elements.length} route relations`);
  const net = fromOverpass(stops, routes);
  const used = new Set(net.routes.flatMap(r => r.stops));
  net.stops = net.stops.filter(s => used.has(s.id));
  await writeFile(new URL('../data/network.json', import.meta.url), JSON.stringify(compact(net)));
  console.log(`Done: ${net.stops.length} stops used by ${net.routes.length} route directions (${new Set(net.routes.map(r => r.ref)).size} lines).`);
  console.log('Wrote data/network.json');
} catch (e) {
  console.error('ERROR:', e && e.message ? e.message : e);
  process.exitCode = 1;
}
