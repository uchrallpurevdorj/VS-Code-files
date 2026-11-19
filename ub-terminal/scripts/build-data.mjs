// Builds data/network.json from OpenStreetMap (Overpass API). Run on any computer with internet:
//   node scripts/build-data.mjs
import { writeFile } from 'node:fs/promises';
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

async function overpass(body) {
  let err;
  for (const u of OVERPASS) {
    try { console.log('  server:', new URL(u).hostname); return await post(u, body); }
    catch (e) { err = e; console.log('  failed:', e.message); }
  }
  throw err;
}

try {
  const b = BBOX.join(',');
  console.log('Fetching bus stops...');
  const stops = await overpass(q(`node["highway"="bus_stop"](${b});out;`));
  console.log(`  ${stops.elements.length} stop nodes`);
  console.log('Fetching bus route relations (can take a minute)...');
  const routes = await overpass(q(`relation["route"="bus"](${b});out geom;`));
  console.log(`  ${routes.elements.length} route relations`);
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
